import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, requireParent, requireChild } from '../middleware/auth';
import { AuthRequest } from '../types';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===================
// VALIDATION SCHEMAS
// ===================

const sendKudosSchema = z.object({
  childId: z.string().uuid(),
  message: z.string().min(1).max(500),
  pointsAwarded: z.number().int().min(0).max(1000).default(0),
  badge: z.enum(['star', 'heart', 'trophy', 'thumbsup', 'sparkle', 'rocket']).default('star'),
});

// ===================
// ROUTES
// ===================

/**
 * GET /api/kudos
 * List all kudos for the family (parents see all, children see their own)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '20', offset = '0' } = req.query;

    const where: any = {
      familyId: req.user!.familyId,
    };

    // Children can only see their own kudos
    if (req.user!.role === UserRole.CHILD) {
      where.childId = req.user!.id;
    }

    const [kudos, total] = await Promise.all([
      prisma.kudos.findMany({
        where,
        include: {
          child: {
            select: { id: true, name: true, avatarPreset: true, avatarUrl: true },
          },
          sentBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.kudos.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        kudos,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get kudos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch kudos' },
    });
  }
});

/**
 * GET /api/kudos/unread
 * Get unread kudos count for current child
 */
router.get('/unread', requireChild, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.kudos.count({
      where: {
        childId: req.user!.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error('Get unread kudos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch unread count' },
    });
  }
});

/**
 * GET /api/kudos/my
 * Get kudos received by current child
 */
router.get('/my', requireChild, async (req: AuthRequest, res: Response) => {
  try {
    const kudos = await prisma.kudos.findMany({
      where: {
        childId: req.user!.id,
      },
      include: {
        sentBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: kudos,
    });
  } catch (error) {
    console.error('Get my kudos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch kudos' },
    });
  }
});

/**
 * GET /api/kudos/:id
 * Get a single kudos by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const kudos = await prisma.kudos.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
        // Children can only see their own
        ...(req.user!.role === UserRole.CHILD && { childId: req.user!.id }),
      },
      include: {
        child: {
          select: { id: true, name: true, avatarPreset: true, avatarUrl: true },
        },
        sentBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!kudos) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kudos not found' },
      });
    }

    res.json({
      success: true,
      data: kudos,
    });
  } catch (error) {
    console.error('Get kudos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch kudos' },
    });
  }
});

/**
 * POST /api/kudos
 * Send a "Good Job" kudos to a child (parents only)
 */
router.post('/', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendKudosSchema.parse(req.body);

    // Verify child belongs to the family
    const child = await prisma.user.findFirst({
      where: {
        id: data.childId,
        familyId: req.user!.familyId,
        role: UserRole.CHILD,
      },
    });

    if (!child) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CHILD', message: 'Child not found in family' },
      });
    }

    // Create kudos and award points in a transaction
    const [kudos] = await prisma.$transaction([
      prisma.kudos.create({
        data: {
          familyId: req.user!.familyId,
          childId: data.childId,
          sentById: req.user!.id,
          message: data.message,
          pointsAwarded: data.pointsAwarded,
          badge: data.badge,
        },
        include: {
          child: {
            select: { id: true, name: true, avatarPreset: true },
          },
          sentBy: {
            select: { id: true, name: true },
          },
        },
      }),
      // Award points if any
      ...(data.pointsAwarded > 0
        ? [
            prisma.user.update({
              where: { id: data.childId },
              data: {
                pointsBalance: {
                  increment: data.pointsAwarded,
                },
              },
            }),
          ]
        : []),
    ]);

    // Log activity
    await prisma.activityLog.create({
      data: {
        familyId: req.user!.familyId,
        userId: req.user!.id,
        action: 'KUDOS_SENT',
        targetType: 'KUDOS',
        targetId: kudos.id,
        details: {
          childName: child.name,
          message: data.message,
          pointsAwarded: data.pointsAwarded,
          badge: data.badge,
        },
      },
    });

    let responseMessage = `Good job badge sent to ${child.name}!`;
    if (data.pointsAwarded > 0) {
      responseMessage += ` ${data.pointsAwarded} points awarded.`;
    }

    res.status(201).json({
      success: true,
      data: kudos,
      message: responseMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Send kudos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to send kudos' },
    });
  }
});

/**
 * POST /api/kudos/:id/read
 * Mark a kudos as read (child only)
 */
router.post('/:id/read', requireChild, async (req: AuthRequest, res: Response) => {
  try {
    const kudos = await prisma.kudos.findFirst({
      where: {
        id: req.params.id,
        childId: req.user!.id,
      },
    });

    if (!kudos) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kudos not found' },
      });
    }

    const updatedKudos = await prisma.kudos.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: updatedKudos,
    });
  } catch (error) {
    console.error('Mark kudos read error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to mark kudos as read' },
    });
  }
});

/**
 * POST /api/kudos/read-all
 * Mark all kudos as read for current child
 */
router.post('/read-all', requireChild, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.kudos.updateMany({
      where: {
        childId: req.user!.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'All kudos marked as read',
    });
  } catch (error) {
    console.error('Mark all kudos read error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to mark kudos as read' },
    });
  }
});

/**
 * DELETE /api/kudos/:id
 * Delete a kudos (parents only, does NOT refund points)
 */
router.delete('/:id', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const kudos = await prisma.kudos.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!kudos) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kudos not found' },
      });
    }

    await prisma.kudos.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Kudos deleted (points were not refunded)',
    });
  } catch (error) {
    console.error('Delete kudos error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete kudos' },
    });
  }
});

export default router;
