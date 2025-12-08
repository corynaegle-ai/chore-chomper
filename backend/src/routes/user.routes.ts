import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireParent } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPin } from '../services/auth.service.js';
import { successResponse, errorResponse, isValidPin } from '../utils/helpers.js';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createChildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be 4 digits'),
  phoneNumber: z.string().optional(),
  avatarPreset: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  avatarPreset: z.string().nullable().optional(),
});

const updatePinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const updateNotificationPrefsSchema = z.object({
  sms: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

/**
 * GET /api/users/me
 * Get current authenticated user's profile
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }

    res.json(successResponse(user));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me
 * Update current authenticated user's profile
 */
router.put('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.avatarPreset !== undefined && { avatarPreset: data.avatarPreset }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        avatarPreset: true,
        phoneNumber: true,
        notificationPreferences: true,
      },
    });

    res.json(successResponse(updatedUser, 'Profile updated successfully'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid data', error.errors));
    }
    next(error);
  }
});

/**
 * GET /api/users
 * List all family members
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { familyId: req.user!.familyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        avatarPreset: true,
        pointsBalance: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    res.json(successResponse(users));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/children
 * List only children in the family
 */
router.get('/children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const children = await prisma.user.findMany({
      where: {
        familyId: req.user!.familyId,
        role: UserRole.CHILD,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarPreset: true,
        pointsBalance: true,
        phoneNumber: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(successResponse(children));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/child
 * Create a new child account (parent only)
 */
router.post('/child', requireParent, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createChildSchema.parse(req.body);

    // Hash the PIN
    const pinHash = await hashPin(input.pin);

    const child = await prisma.user.create({
      data: {
        familyId: req.user!.familyId,
        role: UserRole.CHILD,
        name: input.name,
        pinHash,
        phoneNumber: input.phoneNumber,
        avatarPreset: input.avatarPreset,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarPreset: true,
        pointsBalance: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    res.status(201).json(successResponse(child));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
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
        isActive: true,
        createdAt: true,
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
 * PUT /api/users/:id
 * Update user details
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateUserSchema.parse(req.body);

    // Check if user exists in same family
    const existingUser = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!existingUser) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    // Parents can update anyone in family, children can only update themselves
    if (req.user!.role === UserRole.CHILD && req.user!.userId !== req.params.id) {
      res.status(403).json(errorResponse('FORBIDDEN', 'You can only update your own profile'));
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: input,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        avatarPreset: true,
        pointsBalance: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    res.json(successResponse(user));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:id/reset-pin
 * Reset child's PIN (parent only)
 */
router.post('/:id/reset-pin', requireParent, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = updatePinSchema.parse(req.body);

    // Check if user is a child in same family
    const child = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
        role: UserRole.CHILD,
      },
    });

    if (!child) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', 'Child not found'));
      return;
    }

    const pinHash = await hashPin(pin);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { pinHash },
    });

    res.json(successResponse({ message: 'PIN updated successfully' }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id/notifications
 * Update notification preferences
 */
router.put('/:id/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateNotificationPrefsSchema.parse(req.body);

    // Users can only update their own preferences
    if (req.user!.userId !== req.params.id) {
      res.status(403).json(errorResponse('FORBIDDEN', 'You can only update your own preferences'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    const currentPrefs = user.notificationPreferences as Record<string, boolean>;
    const newPrefs = { ...currentPrefs, ...input };

    await prisma.user.update({
      where: { id: req.params.id },
      data: { notificationPreferences: newPrefs },
    });

    res.json(successResponse({ notificationPreferences: newPrefs }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate user (parent only, cannot deactivate self)
 */
router.delete('/:id', requireParent, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Cannot deactivate yourself
    if (req.user!.userId === req.params.id) {
      res.status(400).json(errorResponse('INVALID_REQUEST', 'You cannot deactivate yourself'));
      return;
    }

    // Check if user exists in same family
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!user) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json(successResponse({ message: 'User deactivated successfully' }));
  } catch (error) {
    next(error);
  }
});

export default router;
