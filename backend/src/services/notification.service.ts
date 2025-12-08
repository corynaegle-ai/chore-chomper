import { PrismaClient, NotificationType, NotificationChannel, NotificationStatus, User, UserRole } from '@prisma/client';
import { emailService } from './email.service.js';
import { smsService } from './sms.service.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  push: boolean;
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  channels?: NotificationChannel[];
}

export class NotificationService {
  private getDefaultChannels(user: User, type: NotificationType): NotificationChannel[] {
    const prefs = user.notificationPreferences as NotificationPreferences;
    const channels: NotificationChannel[] = [];

    // Check user preferences
    if (prefs.email && user.email) channels.push('EMAIL');
    if (prefs.sms && user.phoneNumber) channels.push('SMS');
    // Push notifications require separate setup
    if (prefs.push && user.pushSubscription) channels.push('PUSH');

    return channels;
  }

  async createAndSend(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, body, relatedEntityType, relatedEntityId, channels: requestedChannels } = payload;

    // Get user with their preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn('Notification skipped - user not found', { userId });
      return;
    }

    // Determine which channels to use
    const channels = requestedChannels || this.getDefaultChannels(user, type);

    if (channels.length === 0) {
      logger.info('Notification skipped - no channels available', { userId, type });
      return;
    }

    // Create notification records and send
    for (const channel of channels) {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          channel,
          title,
          body,
          status: 'PENDING',
          relatedEntityType,
          relatedEntityId,
        },
      });

      // Send via appropriate channel
      let result: { success: boolean; messageId?: string; error?: string };

      try {
        switch (channel) {
          case 'EMAIL':
            if (user.email) {
              result = await emailService.send({
                to: user.email,
                subject: title,
                html: this.formatHtmlBody(type, title, body),
              });
            } else {
              result = { success: false, error: 'No email address' };
            }
            break;

          case 'SMS':
            if (user.phoneNumber) {
              result = await smsService.send({
                to: user.phoneNumber,
                body: this.formatSmsBody(title, body),
              });
            } else {
              result = { success: false, error: 'No phone number' };
            }
            break;

          case 'PUSH':
            // TODO: Implement web push notifications
            result = { success: false, error: 'Push not implemented' };
            break;

          default:
            result = { success: false, error: 'Unknown channel' };
        }

        // Update notification status
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: result.success ? 'SENT' : 'FAILED',
            sentAt: result.success ? new Date() : null,
            errorMessage: result.error || null,
          },
        });

        logger.info('Notification processed', {
          notificationId: notification.id,
          channel,
          success: result.success,
        });
      } catch (error: any) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
          },
        });
        logger.error('Notification send error', { notificationId: notification.id, error: error.message });
      }
    }
  }

  private formatHtmlBody(type: NotificationType, title: string, body: string): string {
    const iconMap: Record<NotificationType, string> = {
      CHORE_REMINDER: '⏰',
      CHORE_COMPLETED: '🎉',
      CHORE_VERIFIED: '✅',
      CHORE_REJECTED: '⚠️',
      REDEMPTION_REQUEST: '🎁',
      REDEMPTION_APPROVED: '🎉',
      REDEMPTION_REJECTED: '❌',
      POINTS_AWARDED: '🌟',
      KUDOS_RECEIVED: '💫',
    };

    const icon = iconMap[type] || '📢';

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">${icon} ${title}</h2>
        <p style="font-size: 16px; line-height: 1.6;">${body}</p>
        <a href="https://chore-chomper.com" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Open ChoreChomper
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">
          This notification was sent by ChoreChomper. 
          <a href="https://chore-chomper.com/settings" style="color: #6366f1;">Manage notification preferences</a>
        </p>
      </div>
    `;
  }

  private formatSmsBody(title: string, body: string): string {
    // Keep SMS short
    const combined = `${title}: ${body}`;
    return combined.length > 140 ? combined.substring(0, 137) + '...' : combined;
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
      await this.createAndSend({
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

    await this.createAndSend({
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

    await this.createAndSend({
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
      await this.createAndSend({
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

    await this.createAndSend({
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

    await this.createAndSend({
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

    await this.createAndSend({
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
    // We'll use sentAt as null to indicate unread in-app
    // For now, just return pending + recent sent notifications
    return prisma.notification.count({
      where: {
        userId,
        status: { in: ['PENDING', 'SENT'] },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        // We could add a readAt field, but for now just acknowledge
      },
    });
  }

  // Update user notification preferences
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const currentPrefs = user.notificationPreferences as NotificationPreferences;
    const newPrefs = { ...currentPrefs, ...preferences };

    await prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: newPrefs },
    });
  }

  // Get user preferences
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return user.notificationPreferences as NotificationPreferences;
  }
}

export const notificationService = new NotificationService();
