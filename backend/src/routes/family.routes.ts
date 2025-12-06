import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireParent } from '../middleware/auth.js';
import { successResponse, errorResponse, generateFamilyCode } from '../utils/helpers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const updateFamilySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

/**
 * GET /api/family
 * Get family details
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const family = await prisma.family.findUnique({
      where: { id: req.user!.familyId },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!family) {
      res.status(404).json(errorResponse('FAMILY_NOT_FOUND', 'Family not found'));
      return;
    }

    res.json(successResponse({
      ...family,
      memberCount: family._count.users,
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/family
 * Update family details (parent only)
 */
router.put('/', requireParent, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateFamilySchema.parse(req.body);

    const family = await prisma.family.update({
      where: { id: req.user!.familyId },
      data: { name: input.name },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        createdAt: true,
      },
    });

    res.json(successResponse(family));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/family/regenerate-code
 * Generate a new invite code (parent only)
 */
router.post('/regenerate-code', requireParent, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newCode = generateFamilyCode();

    const family = await prisma.family.update({
      where: { id: req.user!.familyId },
      data: { inviteCode: newCode },
      select: {
        id: true,
        name: true,
        inviteCode: true,
      },
    });

    res.json(successResponse(family));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/family/stats
 * Get family statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const familyId = req.user!.familyId;

    // Get counts
    const [
      parentCount,
      childCount,
      pendingChores,
      completedChores,
      pendingVerifications,
      pendingRedemptions,
    ] = await Promise.all([
      prisma.user.count({
        where: { familyId, role: 'PARENT', isActive: true },
      }),
      prisma.user.count({
        where: { familyId, role: 'CHILD', isActive: true },
      }),
      prisma.chore.count({
        where: { familyId, status: 'PENDING' },
      }),
      prisma.chore.count({
        where: { familyId, status: 'VERIFIED' },
      }),
      prisma.chore.count({
        where: { familyId, status: 'COMPLETED' },
      }),
      prisma.redemption.count({
        where: {
          child: { familyId },
          status: 'PENDING',
        },
      }),
    ]);

    res.json(successResponse({
      parents: parentCount,
      children: childCount,
      chores: {
        pending: pendingChores,
        awaitingVerification: pendingVerifications,
        completed: completedChores,
      },
      pendingRedemptions,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
