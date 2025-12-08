import { PrismaClient, NotificationType, User, UserRole } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export class NotificationService {
  /**
   * Create an in-app notification
   * Email/SMS notifications are disabled - will be enabled when Twilio/SendGrid are configured
   */
  async create(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, body, relatedEntityType, relatedEntityId } = payload;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn('Notification skipped - user not found', { userId });
      return;
    }

    // Create in-app notification only
    await prisma.notification.create({
      data: {
        userId,
        type,
        channel: 'IN_APP',
        title,
        body,
        status: 'SENT', // In-app notifications are immediately "sent"
        sentAt: new Date(),
        relatedEntityType,
        relatedEntityId,
      },
    });

    logger.info('In-app notification created', { userId, type, title });
  }

  // High-level notification methods for specific events
  async notifyChoreCompleted(choreId: string): Promise<void> {
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      include: {
        assignedTo: true,
        family: {
          include: {
            users: {
              where: { role: 'PARENT' },
            },
          },
        },
      },
    });

    if (!chore) return;

    // Notify all parents in the family
    for (const parent of chore.family.users) {
      await this.create({
        userId: parent.id,
        type: 'CHORE_COMPLETED',
        title: 'Chore Completed!',
        body: `${chore.assignedTo.name} has completed "${chore.name}". Ready for your review!`,
        relatedEntityType: 'chore',
        relatedEntityId: choreId,
      });
    }
  }

  async notifyChoreVerified(choreId: string): Promise<void> {
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      include: { assignedTo: true },
    });

    if (!chore) return;

    await this.create({
      userId: chore.assignedToId,
      type: 'CHORE_VERIFIED',
      title: 'Great job! Chore verified!',
      body: `Your chore "${chore.name}" was verified! You earned ${chore.pointValue} points!`,
      relatedEntityType: 'chore',
      relatedEntityId: choreId,
    });
  }

  async notifyChoreRejected(choreId: string, reason?: string): Promise<void> {
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      include: { assignedTo: true },
    });

    if (!chore) return;

    const body = reason
      ? `Your chore "${chore.name}" needs more work. Feedback: ${reason}`
      : `Your chore "${chore.name}" needs more work. Check the app for details.`;

    await this.create({
      userId: chore.assignedToId,
      type: 'CHORE_REJECTED',
      title: 'Chore needs attention',
      body,
      relatedEntityType: 'chore',
      relatedEntityId: choreId,
    });
  }

  async notifyRedemptionRequest(redemptionId: string): Promise<void> {
    const redemption = await prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: {
        child: {
          include: {
            family: {
              include: {
                users: {
                  where: { role: 'PARENT' },
                },
              },
            },
          },
        },
        reward: true,
      },
    });

    if (!redemption) return;

    // Notify all parents
    for (const parent of redemption.child.family.users) {
      await this.create({
        userId: parent.id,
        type: 'REDEMPTION_REQUEST',
        title: 'New Reward Request!',
        body: `${redemption.child.name} wants to redeem "${redemption.reward.name}" for ${redemption.pointsSpent} points.`,
        relatedEntityType: 'redemption',
        relatedEntityId: redemptionId,
      });
    }
  }

  async notifyRedemptionApproved(redemptionId: string): Promise<void> {
    const redemption = await prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { child: true, reward: true },
    });

    if (!redemption) return;

    await this.create({
      userId: redemption.childId,
      type: 'REDEMPTION_APPROVED',
      title: 'Reward Approved! 🎉',
      body: `Your reward "${redemption.reward.name}" was approved! Ask your parent when you can claim it.`,
      relatedEntityType: 'redemption',
      relatedEntityId: redemptionId,
    });
  }

  async notifyRedemptionRejected(redemptionId: string, reason?: string): Promise<void> {
    const redemption = await prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { child: true, reward: true },
    });

    if (!redemption) return;

    const body = reason
      ? `Your request for "${redemption.reward.name}" was not approved. Reason: ${reason}`
      : `Your request for "${redemption.reward.name}" was not approved. Ask your parent for more details.`;

    await this.create({
      userId: redemption.childId,
      type: 'REDEMPTION_REJECTED',
      title: 'Reward Request Update',
      body,
      relatedEntityType: 'redemption',
      relatedEntityId: redemptionId,
    });
  }

  async notifyKudosReceived(kudosId: string): Promise<void> {
    const kudos = await prisma.kudos.findUnique({
      where: { id: kudosId },
      include: { child: true, sentBy: true },
    });

    if (!kudos) return;

    await this.create({
      userId: kudos.childId,
      type: 'KUDOS_RECEIVED',
      title: 'You got a kudos! 💫',
      body: `${kudos.sentBy.name} says: "${kudos.message}"${kudos.pointsAwarded > 0 ? ` (+${kudos.pointsAwarded} bonus points!)` : ''}`,
      relatedEntityType: 'kudos',
      relatedEntityId: kudosId,
    });
  }

  // Get user's notifications
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  // Delete a notification
  async delete(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }
}

export const notificationService = new NotificationService();
