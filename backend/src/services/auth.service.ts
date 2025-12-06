import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateFamilyCode, isValidPin } from '../utils/helpers.js';
import type {
  RegisterInput,
  LoginInput,
  ChildLoginInput,
  AuthTokens,
  JwtPayload,
} from '../types/index.js';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 12;

/**
 * Generate JWT tokens
 */
function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): AuthTokens {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

/**
 * Register a new parent and create a family
 */
export async function registerParent(input: RegisterInput): Promise<{
  user: { id: string; name: string; email: string; role: UserRole };
  family: { id: string; name: string; inviteCode: string };
  tokens: AuthTokens;
}> {
  const { email, password, name, familyName } = input;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create family and user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create family
    const family = await tx.family.create({
      data: {
        name: familyName,
        inviteCode: generateFamilyCode(),
      },
    });

    // Create parent user
    const user = await tx.user.create({
      data: {
        familyId: family.id,
        role: UserRole.PARENT,
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    return { user, family };
  });

  // Generate tokens
  const tokens = generateTokens({
    userId: result.user.id,
    familyId: result.family.id,
    role: UserRole.PARENT,
  });

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email!,
      role: result.user.role,
    },
    family: {
      id: result.family.id,
      name: result.family.name,
      inviteCode: result.family.inviteCode,
    },
    tokens,
  };
}

/**
 * Login as parent
 */
export async function loginParent(input: LoginInput): Promise<{
  user: { id: string; name: string; email: string; role: UserRole };
  familyId: string;
  tokens: AuthTokens;
}> {
  const { email, password } = input;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { family: true },
  });

  if (!user || user.role !== UserRole.PARENT) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    familyId: user.familyId,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email!,
      role: user.role,
    },
    familyId: user.familyId,
    tokens,
  };
}

/**
 * Login as child with family code and PIN
 */
export async function loginChild(input: ChildLoginInput): Promise<{
  user: {
    id: string;
    name: string;
    role: UserRole;
    avatarUrl: string | null;
    avatarPreset: string | null;
    pointsBalance: number;
  };
  familyId: string;
  tokens: AuthTokens;
}> {
  const { familyCode, pin } = input;

  if (!isValidPin(pin)) {
    throw new AppError(400, 'INVALID_PIN', 'PIN must be 4 digits');
  }

  // Find family by invite code
  const family = await prisma.family.findUnique({
    where: { inviteCode: familyCode.toUpperCase() },
    include: {
      users: {
        where: { role: UserRole.CHILD, isActive: true },
      },
    },
  });

  if (!family) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid family code or PIN');
  }

  // Find child with matching PIN
  let matchedChild = null;
  for (const child of family.users) {
    if (child.pinHash) {
      const isValid = await bcrypt.compare(pin, child.pinHash);
      if (isValid) {
        matchedChild = child;
        break;
      }
    }
  }

  if (!matchedChild) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid family code or PIN');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: matchedChild.id,
    familyId: family.id,
    role: UserRole.CHILD,
  });

  return {
    user: {
      id: matchedChild.id,
      name: matchedChild.name,
      role: matchedChild.role,
      avatarUrl: matchedChild.avatarUrl,
      avatarPreset: matchedChild.avatarPreset,
      pointsBalance: matchedChild.pointsBalance,
    },
    familyId: family.id,
    tokens,
  };
}

/**
 * Refresh access token
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }

    // Generate new tokens
    return generateTokens({
      userId: user.id,
      familyId: user.familyId,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
  }
}

/**
 * Join family as additional parent
 */
export async function joinFamily(
  email: string,
  password: string,
  name: string,
  inviteCode: string
): Promise<{
  user: { id: string; name: string; email: string; role: UserRole };
  family: { id: string; name: string };
  tokens: AuthTokens;
}> {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  // Find family
  const family = await prisma.family.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
  });

  if (!family) {
    throw new AppError(404, 'FAMILY_NOT_FOUND', 'Invalid invite code');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create parent user
  const user = await prisma.user.create({
    data: {
      familyId: family.id,
      role: UserRole.PARENT,
      name,
      email: email.toLowerCase(),
      passwordHash,
    },
  });

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    familyId: family.id,
    role: UserRole.PARENT,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email!,
      role: user.role,
    },
    family: {
      id: family.id,
      name: family.name,
    },
    tokens,
  };
}

/**
 * Hash a PIN for child account
 */
export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) {
    throw new AppError(400, 'INVALID_PIN', 'PIN must be 4 digits');
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}
