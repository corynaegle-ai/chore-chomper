import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, requireParent } from '../middleware/auth';
import { AuthRequest } from '../types';
import { ChoreStatus } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===================
// VALIDATION SCHEMAS
// ===================

const createChoreSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  assignedToId: z.string().uuid(),
  pointValue: z.number().int().min(0).default(0),
  dueDate: z.string().datetime().optional(),
  templateId: z.string().uuid().optional(),
});

const updateChoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().optional(),
  pointValue: z.number().int().min(0).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

const completeChoreSchema = z.object({
  photoUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

const addPhotoSchema = z.object({
  photoUrl: z.string().url(),
});

const verifyChoreSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().max(500).optional(), // Notes to child explaining approval or what needs to be fixed
  pointsPenalty: z.number().int().min(0).optional(), // Optional points to deduct on rejection
});

// ===================
// ROUTES
// ===================

/**
 * GET /api/chores
 * List all chores for the family
 * Query params: status, assignedToId, categoryId, dueBefore, dueAfter
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, assignedToId, categoryId, dueBefore, dueAfter } = req.query;

    const where: any = {
      familyId: req.user!.familyId,
    };

    if (status) {
      where.status = status as ChoreStatus;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId as string;
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (dueBefore || dueAfter) {
      where.dueDate = {};
      if (dueBefore) where.dueDate.lte = new Date(dueBefore as string);
      if (dueAfter) where.dueDate.gte = new Date(dueAfter as string);
    }

    const chores = await prisma.chore.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarPreset: true, avatarUrl: true },
        },
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
        verifiedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: chores,
    });
  } catch (error) {
    console.error('Get chores error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch chores' },
    });
  }
});

/**
 * GET /api/chores/my
 * Get chores assigned to the current user (for children)
 */
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {
      familyId: req.user!.familyId,
      assignedToId: req.user!.id,
    };

    if (status) {
      where.status = status as ChoreStatus;
    }

    const chores = await prisma.chore.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { dueDate: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: chores,
    });
  } catch (error) {
    console.error('Get my chores error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch chores' },
    });
  }
});

/**
 * GET /api/chores/pending-verification
 * Get chores awaiting parent verification (parents only)
 */
router.get('/pending-verification', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const chores = await prisma.chore.findMany({
      where: {
        familyId: req.user!.familyId,
        status: ChoreStatus.COMPLETED,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarPreset: true, avatarUrl: true },
        },
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    res.json({
      success: true,
      data: chores,
    });
  } catch (error) {
    console.error('Get pending verification error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch chores' },
    });
  }
});

/**
 * GET /api/chores/:id
 * Get a single chore by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const chore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarPreset: true, avatarUrl: true },
        },
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
        verifiedBy: {
          select: { id: true, name: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
    });

    if (!chore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    res.json({
      success: true,
      data: chore,
    });
  } catch (error) {
    console.error('Get chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch chore' },
    });
  }
});

/**
 * POST /api/chores
 * Create a new chore (parents only)
 */
router.post('/', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = createChoreSchema.parse(req.body);

    // Verify assigned user belongs to the family
    const assignee = await prisma.user.findFirst({
      where: {
        id: data.assignedToId,
        familyId: req.user!.familyId,
      },
    });

    if (!assignee) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSIGNEE', message: 'Assigned user not found in family' },
      });
    }

    // Verify category belongs to the family (if provided)
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          familyId: req.user!.familyId,
        },
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Category not found' },
        });
      }
    }

    const chore = await prisma.chore.create({
      data: {
        familyId: req.user!.familyId,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        assignedToId: data.assignedToId,
        pointValue: data.pointValue,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        requiresPhoto: data.requiresPhoto,
        templateId: data.templateId,
        status: ChoreStatus.PENDING,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarPreset: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        familyId: req.user!.familyId,
        userId: req.user!.id,
        action: 'CHORE_CREATED',
        targetType: 'CHORE',
        targetId: chore.id,
        details: { choreName: chore.name, assignedTo: assignee.name },
      },
    });

    res.status(201).json({
      success: true,
      data: chore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Create chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create chore' },
    });
  }
});

/**
 * PUT /api/chores/:id
 * Update a chore (parents only)
 */
router.put('/:id', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateChoreSchema.parse(req.body);

    // Find existing chore
    const existingChore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!existingChore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    // Can't update verified/rejected chores
    if (existingChore.status === ChoreStatus.VERIFIED || existingChore.status === ChoreStatus.REJECTED) {
      return res.status(400).json({
        success: false,
        error: { code: 'CHORE_FINALIZED', message: 'Cannot update a finalized chore' },
      });
    }

    // Verify new assignee if changing
    if (data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: data.assignedToId,
          familyId: req.user!.familyId,
        },
      });

      if (!assignee) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ASSIGNEE', message: 'Assigned user not found in family' },
        });
      }
    }

    // Verify category if changing
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          familyId: req.user!.familyId,
        },
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Category not found' },
        });
      }
    }

    const chore = await prisma.chore.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarPreset: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    res.json({
      success: true,
      data: chore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Update chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update chore' },
    });
  }
});

/**
 * POST /api/chores/:id/complete
 * Mark a chore as completed (assigned child only)
 */
router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const data = completeChoreSchema.parse(req.body);

    const chore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!chore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    // Only assigned user can complete
    if (chore.assignedToId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only complete chores assigned to you' },
      });
    }

    // Can complete PENDING chores or resubmit REJECTED chores
    if (chore.status !== ChoreStatus.PENDING && chore.status !== ChoreStatus.REJECTED) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_STATUS', 
          message: chore.status === ChoreStatus.COMPLETED 
            ? 'Chore is already submitted and waiting for verification'
            : 'Chore has already been verified'
        },
      });
    }

    const isResubmission = chore.status === ChoreStatus.REJECTED;

    // Photo is always optional - helps speed up parent verification but not required
    const updatedChore = await prisma.chore.update({
      where: { id: req.params.id },
      data: {
        status: ChoreStatus.COMPLETED,
        completedAt: new Date(),
        photoUrl: data.photoUrl || chore.photoUrl, // Keep existing photo if not providing new one
        completionNotes: data.notes,
        // Clear rejection data on resubmission
        verifiedAt: null,
        verifiedById: null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        familyId: req.user!.familyId,
        userId: req.user!.id,
        action: isResubmission ? 'CHORE_RESUBMITTED' : 'CHORE_COMPLETED',
        targetType: 'CHORE',
        targetId: chore.id,
        details: { choreName: chore.name, isResubmission },
      },
    });

    res.json({
      success: true,
      data: updatedChore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Complete chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to complete chore' },
    });
  }
});

/**
 * POST /api/chores/:id/add-photo
 * Add or update photo on a completed chore (assigned child only)
 * Child can add photo even after marking chore complete
 */
router.post('/:id/add-photo', async (req: AuthRequest, res: Response) => {
  try {
    const data = addPhotoSchema.parse(req.body);

    const chore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!chore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    // Only assigned user can add photo
    if (chore.assignedToId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only add photos to your own chores' },
      });
    }

    // Can only add photo to COMPLETED or REJECTED chores (not PENDING or VERIFIED)
    if (chore.status !== ChoreStatus.COMPLETED && chore.status !== ChoreStatus.REJECTED) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_STATUS', 
          message: chore.status === ChoreStatus.PENDING 
            ? 'Please mark the chore as complete first' 
            : 'Cannot add photo to a verified chore'
        },
      });
    }

    const updatedChore = await prisma.chore.update({
      where: { id: req.params.id },
      data: {
        photoUrl: data.photoUrl,
      },
    });

    res.json({
      success: true,
      data: updatedChore,
      message: 'Photo added successfully!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Add photo error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add photo' },
    });
  }
});

/**
 * POST /api/chores/:id/verify
 * Verify or reject a completed chore (parents only)
 * On rejection: sends chore back to child with notes, optional points penalty
 */
router.post('/:id/verify', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = verifyChoreSchema.parse(req.body);

    const chore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
      include: {
        assignedTo: true,
      },
    });

    if (!chore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    // Can only verify completed chores
    if (chore.status !== ChoreStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Chore must be in completed status to verify' },
      });
    }

    // Validate points penalty doesn't exceed child's balance
    const pointsPenalty = data.pointsPenalty || 0;
    if (!data.approved && pointsPenalty > 0) {
      if (pointsPenalty > chore.assignedTo.pointsBalance) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'INSUFFICIENT_POINTS', 
            message: `Cannot deduct ${pointsPenalty} points. ${chore.assignedTo.name} only has ${chore.assignedTo.pointsBalance} points.` 
          },
        });
      }
    }

    if (data.approved) {
      // APPROVE: Mark as verified and award points
      const [updatedChore] = await prisma.$transaction([
        prisma.chore.update({
          where: { id: req.params.id },
          data: {
            status: ChoreStatus.VERIFIED,
            verifiedAt: new Date(),
            verifiedById: req.user!.id,
            verificationNotes: data.feedback,
          },
        }),
        // Award points if any
        ...(chore.pointValue > 0
          ? [
              prisma.user.update({
                where: { id: chore.assignedToId },
                data: {
                  pointsBalance: {
                    increment: chore.pointValue,
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
          action: 'CHORE_VERIFIED',
          targetType: 'CHORE',
          targetId: chore.id,
          details: {
            choreName: chore.name,
            childName: chore.assignedTo.name,
            pointsAwarded: chore.pointValue,
          },
        },
      });

      res.json({
        success: true,
        data: updatedChore,
        message: `Chore verified! ${chore.pointValue} points awarded to ${chore.assignedTo.name}.`,
      });
    } else {
      // REJECT: Send back to child with feedback, apply optional penalty
      const [updatedChore] = await prisma.$transaction([
        prisma.chore.update({
          where: { id: req.params.id },
          data: {
            status: ChoreStatus.REJECTED,
            verifiedAt: new Date(),
            verifiedById: req.user!.id,
            verificationNotes: data.feedback,
            // Clear completion data so child can redo
            completedAt: null,
            // Keep the photo - child might want to update it
          },
        }),
        // Deduct penalty points if specified
        ...(pointsPenalty > 0
          ? [
              prisma.user.update({
                where: { id: chore.assignedToId },
                data: {
                  pointsBalance: {
                    decrement: pointsPenalty,
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
          action: 'CHORE_REJECTED',
          targetType: 'CHORE',
          targetId: chore.id,
          details: {
            choreName: chore.name,
            childName: chore.assignedTo.name,
            feedback: data.feedback,
            pointsPenalty: pointsPenalty,
          },
        },
      });

      let message = `Chore sent back to ${chore.assignedTo.name} for redo.`;
      if (pointsPenalty > 0) {
        message += ` ${pointsPenalty} points deducted.`;
      }

      res.json({
        success: true,
        data: updatedChore,
        message,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Verify chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to verify chore' },
    });
  }
});

/**
 * POST /api/chores/:id/reset
 * Reset a rejected chore back to pending (parents only)
 */
router.post('/:id/reset', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const chore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!chore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    // Can only reset rejected chores
    if (chore.status !== ChoreStatus.REJECTED) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Can only reset rejected chores' },
      });
    }

    const updatedChore = await prisma.chore.update({
      where: { id: req.params.id },
      data: {
        status: ChoreStatus.PENDING,
        completedAt: null,
        photoUrl: null,
        completionNotes: null,
        verifiedAt: null,
        verifiedById: null,
        verificationNotes: null,
      },
    });

    res.json({
      success: true,
      data: updatedChore,
    });
  } catch (error) {
    console.error('Reset chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reset chore' },
    });
  }
});

/**
 * DELETE /api/chores/:id
 * Delete a chore (parents only)
 * Can delete any chore that isn't already verified
 */
router.delete('/:id', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const chore = await prisma.chore.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!chore) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Chore not found' },
      });
    }

    // Prevent deleting verified chores (points already awarded)
    if (chore.status === ChoreStatus.VERIFIED) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'CANNOT_DELETE_VERIFIED', 
          message: 'Cannot delete a verified chore. Points have already been awarded.' 
        },
      });
    }

    // Delete the chore
    await prisma.chore.delete({
      where: { id: req.params.id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        familyId: req.user!.familyId,
        userId: req.user!.id,
        action: 'CHORE_DELETED',
        targetType: 'CHORE',
        targetId: chore.id,
        details: { choreName: chore.name, previousStatus: chore.status },
      },
    });

    res.json({
      success: true,
      message: 'Chore deleted successfully',
    });
  } catch (error) {
    console.error('Delete chore error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete chore' },
    });
  }
});

/**
 * DELETE /api/chores/bulk
 * Delete multiple chores at once (parents only)
 */
router.delete('/bulk', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide an array of chore IDs' },
      });
    }

    // Find all chores to delete
    const chores = await prisma.chore.findMany({
      where: {
        id: { in: ids },
        familyId: req.user!.familyId,
      },
    });

    // Check for verified chores
    const verifiedChores = chores.filter(c => c.status === ChoreStatus.VERIFIED);
    if (verifiedChores.length > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'CANNOT_DELETE_VERIFIED', 
          message: `Cannot delete ${verifiedChores.length} verified chore(s). Points have already been awarded.` 
        },
      });
    }

    // Delete all non-verified chores
    const deleteResult = await prisma.chore.deleteMany({
      where: {
        id: { in: ids },
        familyId: req.user!.familyId,
        status: { not: ChoreStatus.VERIFIED },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        familyId: req.user!.familyId,
        userId: req.user!.id,
        action: 'CHORES_BULK_DELETED',
        targetType: 'CHORE',
        targetId: null,
        details: { count: deleteResult.count, choreIds: ids },
      },
    });

    res.json({
      success: true,
      message: `${deleteResult.count} chore(s) deleted successfully`,
      data: { deletedCount: deleteResult.count },
    });
  } catch (error) {
    console.error('Bulk delete chores error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete chores' },
    });
  }
});

export default router;
