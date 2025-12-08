import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { authenticate, requireParent, requireChild } from "../middleware/auth.js";
import { AuthRequest } from "../types/index.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===================
// VALIDATION SCHEMAS
// ===================

const requestRedemptionSchema = z.object({
  rewardId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const reviewRedemptionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(500).optional(),
});

// ===================
// ROUTES
// ===================

/**
 * GET /api/redemptions
 * List redemptions - filtered by role
 * Parents see all family redemptions, children see only their own
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const isParent = req.user!.role === "PARENT";

    const redemptions = await prisma.redemption.findMany({
      where: {
        child: { familyId: req.user!.familyId },
        ...(isParent ? {} : { childId: req.user!.id }),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        child: {
          select: { id: true, name: true, avatarUrl: true },
        },
        reward: {
          select: { id: true, name: true, pointCost: true, imageUrl: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    res.json({
      success: true,
      data: redemptions,
    });
  } catch (error) {
    console.error("Get redemptions error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch redemptions" },
    });
  }
});

/**
 * GET /api/redemptions/pending
 * Get count of pending redemptions (for dashboard)
 */
router.get("/pending", requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.redemption.count({
      where: {
        child: { familyId: req.user!.familyId },
        status: "PENDING",
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Get pending count error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch pending count" },
    });
  }
});

/**
 * POST /api/redemptions
 * Request a reward redemption (children only)
 */
router.post("/", requireChild, async (req: AuthRequest, res: Response) => {
  try {
    const data = requestRedemptionSchema.parse(req.body);

    // Get the reward
    const reward = await prisma.reward.findFirst({
      where: {
        id: data.rewardId,
        familyId: req.user!.familyId,
        isActive: true,
      },
    });

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Reward not found or inactive" },
      });
    }

    // Check quantity available
    if (reward.quantityAvailable !== null && reward.quantityAvailable <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: "OUT_OF_STOCK", message: "This reward is out of stock" },
      });
    }

    // Check child has enough points
    const child = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { points: true },
    });

    if (!child || child.points < reward.pointCost) {
      return res.status(400).json({
        success: false,
        error: { 
          code: "INSUFFICIENT_POINTS", 
          message: `You need ${reward.pointCost} points but only have ${child?.points || 0}` 
        },
      });
    }

    // Create redemption and deduct points in a transaction
    const redemption = await prisma.$transaction(async (tx) => {
      // Deduct points from child
      await tx.user.update({
        where: { id: req.user!.id },
        data: { points: { decrement: reward.pointCost } },
      });

      // Decrease quantity if limited
      if (reward.quantityAvailable !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { quantityAvailable: { decrement: 1 } },
        });
      }

      // Create redemption record
      return tx.redemption.create({
        data: {
          childId: req.user!.id,
          rewardId: reward.id,
          pointsSpent: reward.pointCost,
          status: "PENDING",
          notes: data.notes,
        },
        include: {
          reward: { select: { name: true, pointCost: true } },
        },
      });
    });

    res.status(201).json({
      success: true,
      data: redemption,
      message: `Requested "${reward.name}" for ${reward.pointCost} points!`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors },
      });
    }
    console.error("Request redemption error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to request redemption" },
    });
  }
});

/**
 * PUT /api/redemptions/:id/review
 * Approve or reject a redemption (parents only)
 */
router.put("/:id/review", requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const data = reviewRedemptionSchema.parse(req.body);

    const redemption = await prisma.redemption.findFirst({
      where: {
        id: req.params.id,
        child: { familyId: req.user!.familyId },
        status: "PENDING",
      },
      include: {
        reward: true,
        child: { select: { id: true, name: true } },
      },
    });

    if (!redemption) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Pending redemption not found" },
      });
    }

    // If rejecting, refund the points
    if (data.status === "REJECTED") {
      await prisma.$transaction(async (tx) => {
        // Refund points to child
        await tx.user.update({
          where: { id: redemption.childId },
          data: { points: { increment: redemption.pointsSpent } },
        });

        // Restore quantity if limited
        if (redemption.reward.quantityAvailable !== null) {
          await tx.reward.update({
            where: { id: redemption.rewardId },
            data: { quantityAvailable: { increment: 1 } },
          });
        }

        // Update redemption status
        await tx.redemption.update({
          where: { id: req.params.id },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            reviewedById: req.user!.id,
            notes: data.notes,
          },
        });
      });

      return res.json({
        success: true,
        message: `Redemption rejected. ${redemption.pointsSpent} points refunded to ${redemption.child.name}.`,
      });
    }

    // Approving
    const updated = await prisma.redemption.update({
      where: { id: req.params.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        notes: data.notes,
      },
      include: {
        reward: { select: { name: true } },
        child: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `Approved "${updated.reward.name}" for ${updated.child.name}!`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.errors },
      });
    }
    console.error("Review redemption error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to review redemption" },
    });
  }
});

/**
 * PUT /api/redemptions/:id/fulfill
 * Mark a redemption as fulfilled (parents only)
 */
router.put("/:id/fulfill", requireParent, async (req: AuthRequest, res: Response) => {
  try {
    const redemption = await prisma.redemption.findFirst({
      where: {
        id: req.params.id,
        child: { familyId: req.user!.familyId },
        status: "APPROVED",
      },
    });

    if (!redemption) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Approved redemption not found" },
      });
    }

    const updated = await prisma.redemption.update({
      where: { id: req.params.id },
      data: {
        status: "FULFILLED",
        fulfilledAt: new Date(),
      },
      include: {
        reward: { select: { name: true } },
        child: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `"${updated.reward.name}" fulfilled for ${updated.child.name}!`,
    });
  } catch (error) {
    console.error("Fulfill redemption error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fulfill redemption" },
    });
  }
});

export default router;
