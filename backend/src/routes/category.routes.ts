import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, requireParent } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===================
// VALIDATION SCHEMAS
// ===================

const createCategorySchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  icon: z.string().min(1).max(50).default('clipboard'),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).max(50).optional(),
});

// ===================
// ROUTES
// ===================

/**
 * GET /api/categories
 * List all categories for the family
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        familyId: req.user!.familyId,
      },
      include: {
        _count: {
          select: {
            chores: true,
            choreTemplates: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch categories' },
    });
  }
});

/**
 * GET /api/categories/:id
 * Get a single category by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
      include: {
        _count: {
          select: {
            chores: true,
            choreTemplates: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch category' },
    });
  }
});

/**
 * POST /api/categories
 * Create a new category (parents only)
 */
router.post('/', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);

    // Check for duplicate name in family
    const existing = await prisma.category.findFirst({
      where: {
        familyId: req.user!.familyId,
        name: { equals: data.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_NAME', message: 'A category with this name already exists' },
      });
    }

    const category = await prisma.category.create({
      data: {
        familyId: req.user!.familyId,
        name: data.name,
        color: data.color,
        icon: data.icon,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create category' },
    });
  }
});


/**
 * PUT /api/categories/:id
 * Update a category (parents only)
 */
router.put('/:id', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCategorySchema.parse(req.body);

    // Verify category belongs to family
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await prisma.category.findFirst({
        where: {
          familyId: req.user!.familyId,
          name: { equals: data.name, mode: 'insensitive' },
          id: { not: req.params.id },
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_NAME', message: 'A category with this name already exists' },
        });
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.color && { color: data.color }),
        ...(data.icon && { icon: data.icon }),
      },
    });

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
      });
    }
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update category' },
    });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (parents only)
 * Note: Chores using this category will have their categoryId set to null
 */
router.delete('/:id', requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
      include: {
        _count: {
          select: { chores: true, choreTemplates: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: `Category "${category.name}" deleted. ${category._count.chores + category._count.choreTemplates} items will be uncategorized.`,
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete category' },
    });
  }
});

export default router;
