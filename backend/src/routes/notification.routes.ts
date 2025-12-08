import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { notificationService } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// GET /api/notifications - List user's notifications
// =============================================================================
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        channel: true,
        title: true,
        body: true,
        status: true,
        sentAt: true,
        readAt: true,
        relatedEntityType: true,
        relatedEntityId: true,
        createdAt: true,
      },
    });

    const total = await prisma.notification.count({ where: { userId } });
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + notifications.length < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// GET /api/notifications/unread-count - Get count of unread notifications
// =============================================================================
router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PUT /api/notifications/read-all - Mark all notifications as read
// =============================================================================
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PUT /api/notifications/:id/read - Mark a notification as read
// =============================================================================
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// DELETE /api/notifications/:id - Delete a notification
// =============================================================================
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    await notificationService.delete(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// DELETE /api/notifications - Clear all notifications
// =============================================================================
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: 'Deleted ' + result.count + ' notifications',
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// POST /api/notifications/test - Create a test notification (parent only)
// =============================================================================
router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    if (user.role !== 'PARENT') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only parents can send test notifications',
        },
      });
    }

    await notificationService.create({
      userId: user.userId,
      type: 'CHORE_REMINDER',
      title: 'Test Notification',
      body: 'This is a test notification from ChoreChomper. If you see this, in-app notifications are working!',
    });

    res.json({
      success: true,
      message: 'Test notification created',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
