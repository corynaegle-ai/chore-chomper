import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { authenticate, requireParent } from "../middleware/auth.js";
import { AuthRequest } from "../types/index.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===================
// VALIDATION SCHEMAS
// ===================

const createRewardSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  pointCost: z.number().int().min(1).max(100000),
  imageUrl: z.string().url().optional().nullable(),
  quantityAvailable: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateRewardSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  pointCost: z.number().int().min(1).max(100000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  quantityAvailable: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ===================
// ROUTES
// ===================

/**
 * GET /api/rewards
 * List all rewards for the family
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    
    const rewards = await prisma.reward.findMany({
      where: {
        familyId: req.user!.familyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { pointCost: "asc" },
    });

    res.json({
      success: true,
      data: rewards,
    });
  } catch (error) {
    console.error("Get rewards error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch rewards" },
    });
  }
});

/**
 * GET /api/rewards/:id
 * Get a single reward by ID
 */
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const reward = await prisma.reward.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Reward not found" },
      });
    }

    res.json({
      success: true,
      data: reward,
    });
  } catch (error) {
    console.error("Get reward error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch reward" },
    });
  }
});

/**
 * POST /api/rewards
 * Create a new reward (parents only)
 */
router.post("/", requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = createRewardSchema.parse(req.body);

    const reward = await prisma.reward.create({
      data: {
        familyId: req.user!.familyId,
        name: data.name,
        description: data.description,
        pointCost: data.pointCost,
        imageUrl: data.imageUrl,
        quantityAvailable: data.quantityAvailable,
        isActive: data.isActive,
      },
    });

    res.status(201).json({
      success: true,
      data: reward,
      message: "Reward created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors },
      });
    }
    console.error("Create reward error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to create reward" },
    });
  }
});

/**
 * PUT /api/rewards/:id
 * Update a reward (parents only)
 */
router.put("/:id", requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateRewardSchema.parse(req.body);

    const reward = await prisma.reward.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
    });

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Reward not found" },
      });
    }

    const updatedReward = await prisma.reward.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.pointCost !== undefined && { pointCost: data.pointCost }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.quantityAvailable !== undefined && { quantityAvailable: data.quantityAvailable }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({
      success: true,
      data: updatedReward,
      message: "Reward updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors },
      });
    }
    console.error("Update reward error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to update reward" },
    });
  }
});

/**
 * DELETE /api/rewards/:id
 * Delete a reward (parents only)
 */
router.delete("/:id", requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const reward = await prisma.reward.findFirst({
      where: {
        id: req.params.id,
        familyId: req.user!.familyId,
      },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Reward not found" },
      });
    }

    // If there are redemptions, soft delete by setting isActive = false
    if (reward._count.redemptions > 0) {
      await prisma.reward.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      
      return res.json({
        success: true,
        message: `Reward "${reward.name}" deactivated (has ${reward._count.redemptions} redemptions)`,
      });
    }

    // No redemptions, safe to hard delete
    await prisma.reward.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: `Reward "${reward.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Delete reward error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to delete reward" },
    });
  }
});

export default router;
