import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  familyName: z.string().min(1, 'Family name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const childLoginSchema = z.object({
  familyCode: z.string().length(6, 'Family code must be 6 characters'),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const joinFamilySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  inviteCode: z.string().length(6, 'Invite code must be 6 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /api/auth/register
 * Register a new parent and create a family
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerParent(input);
    res.status(201).json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login as parent
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.loginParent(input);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/child-login
 * Login as child with family code and PIN
 */
router.post('/child-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = childLoginSchema.parse(req.body);
    const result = await authService.loginChild(input);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/join
 * Join an existing family as a parent
 */
router.post('/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = joinFamilySchema.parse(req.body);
    const result = await authService.joinFamily(
      input.email,
      input.password,
      input.name,
      input.inviteCode
    );
    res.status(201).json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshTokens(refreshToken);
    res.json(successResponse(tokens));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        avatarPreset: true,
        pointsBalance: true,
        phoneNumber: true,
        notificationPreferences: true,
        family: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    res.json(successResponse(user));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should discard tokens)
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  // In a stateless JWT setup, logout is handled client-side
  // If needed, we could implement token blacklisting with Redis
  res.json(successResponse({ message: 'Logged out successfully' }));
});

export default router;
