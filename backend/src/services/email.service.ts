import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Initialize SendGrid if API key is available
if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
}

export class EmailService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(
      env.SENDGRID_API_KEY &&
      env.SENDGRID_FROM_EMAIL
    );

    if (!this.isConfigured) {
      logger.warn('Email service not configured - emails will be logged only');
    }
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, text, html, templateId, dynamicTemplateData } = options;

    // Log in development or if not configured
    if (!this.isConfigured) {
      logger.info('Email (mock):', { to, subject, text: text?.substring(0, 100) });
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const msg: sgMail.MailDataRequired = {
        to,
        from: {
          email: env.SENDGRID_FROM_EMAIL!,
          name: env.SENDGRID_FROM_NAME || 'ChoreChomper',
        },
        subject,
      };

      if (templateId) {
        msg.templateId = templateId;
        msg.dynamicTemplateData = dynamicTemplateData;
      } else {
        msg.text = text || '';
        msg.html = html || text || '';
      }

      const [response] = await sgMail.send(msg);
      
      logger.info('Email sent successfully', { to, subject, messageId: response.headers['x-message-id'] });
      return { 
        success: true, 
        messageId: response.headers['x-message-id'] as string 
      };
    } catch (error: any) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Convenience methods for common notification types
  async sendChoreCompletedNotification(parentEmail: string, childName: string, choreName: string): Promise<{ success: boolean }> {
    return this.send({
      to: parentEmail,
      subject: `${childName} completed: ${choreName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">🎉 Chore Completed!</h2>
          <p><strong>${childName}</strong> has completed the chore: <strong>${choreName}</strong></p>
          <p>Log in to ChoreChomper to review and verify the completion.</p>
          <a href="https://chore-chomper.com/parent" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Review Now
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            - The ChoreChomper Team 🦷
          </p>
        </div>
      `,
    });
  }

  async sendChoreVerifiedNotification(childEmail: string, choreName: string, pointsAwarded: number): Promise<{ success: boolean }> {
    return this.send({
      to: childEmail,
      subject: `Great job! ${choreName} verified ✅`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">✅ Chore Verified!</h2>
          <p>Your chore <strong>${choreName}</strong> has been verified!</p>
          <p style="font-size: 24px; color: #6366f1;">+${pointsAwarded} points</p>
          <a href="https://chore-chomper.com/child" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            View My Points
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Keep up the great work! 🌟
          </p>
        </div>
      `,
    });
  }

  async sendChoreRejectedNotification(childEmail: string, choreName: string, reason?: string): Promise<{ success: boolean }> {
    return this.send({
      to: childEmail,
      subject: `Chore needs attention: ${choreName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">⚠️ Chore Needs More Work</h2>
          <p>Your chore <strong>${choreName}</strong> needs a bit more attention.</p>
          ${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ''}
          <p>Please try again - you've got this!</p>
          <a href="https://chore-chomper.com/child" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            View My Chores
          </a>
        </div>
      `,
    });
  }

  async sendRedemptionRequestNotification(parentEmail: string, childName: string, rewardName: string, pointCost: number): Promise<{ success: boolean }> {
    return this.send({
      to: parentEmail,
      subject: `${childName} wants to redeem: ${rewardName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">🎁 Reward Request!</h2>
          <p><strong>${childName}</strong> wants to redeem:</p>
          <p style="font-size: 20px; font-weight: bold;">${rewardName}</p>
          <p style="color: #666;">Cost: ${pointCost} points</p>
          <a href="https://chore-chomper.com/parent/requests" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Review Request
          </a>
        </div>
      `,
    });
  }

  async sendRedemptionApprovedNotification(childEmail: string, rewardName: string): Promise<{ success: boolean }> {
    return this.send({
      to: childEmail,
      subject: `🎉 Reward approved: ${rewardName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">🎉 Reward Approved!</h2>
          <p>Your reward request for <strong>${rewardName}</strong> has been approved!</p>
          <p>Ask your parent when you can claim it.</p>
          <a href="https://chore-chomper.com/child/rewards" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            View My Rewards
          </a>
        </div>
      `,
    });
  }

  async sendChoreReminderNotification(childEmail: string, choreName: string, dueDate: string): Promise<{ success: boolean }> {
    return this.send({
      to: childEmail,
      subject: `Reminder: ${choreName} is due soon!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⏰ Chore Reminder</h2>
          <p>Don't forget! <strong>${choreName}</strong> is due on <strong>${dueDate}</strong>.</p>
          <a href="https://chore-chomper.com/child" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            View My Chores
          </a>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
