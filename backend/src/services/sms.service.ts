import twilio from 'twilio';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Initialize Twilio client if credentials are available
const twilioClient = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

export interface SMSOptions {
  to: string;
  body: string;
}

export class SMSService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(
      env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN &&
      env.TWILIO_PHONE_NUMBER
    );

    if (!this.isConfigured) {
      logger.warn('SMS service not configured - SMS will be logged only');
    }
  }

  // Format phone number to E.164 format
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If starts with 1 and has 11 digits, it's US with country code
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }
    
    // If 10 digits, assume US and add +1
    if (cleaned.length === 10) {
      return '+1' + cleaned;
    }
    
    // Otherwise, add + if not present
    return phone.startsWith('+') ? phone : '+' + cleaned;
  }

  async send(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, body } = options;
    const formattedTo = this.formatPhoneNumber(to);

    // Log in development or if not configured
    if (!this.isConfigured || !twilioClient) {
      logger.info('SMS (mock):', { to: formattedTo, body: body.substring(0, 50) + '...' });
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const message = await twilioClient.messages.create({
        body,
        from: env.TWILIO_PHONE_NUMBER!,
        to: formattedTo,
      });

      logger.info('SMS sent successfully', { to: formattedTo, messageId: message.sid });
      return { 
        success: true, 
        messageId: message.sid 
      };
    } catch (error: any) {
      logger.error('Failed to send SMS', { to: formattedTo, error: error.message });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Convenience methods for common notification types
  async sendChoreCompletedNotification(parentPhone: string, childName: string, choreName: string): Promise<{ success: boolean }> {
    return this.send({
      to: parentPhone,
      body: `🎉 ChoreChomper: ${childName} completed "${choreName}"! Log in to verify.`,
    });
  }

  async sendChoreVerifiedNotification(childPhone: string, choreName: string, pointsAwarded: number): Promise<{ success: boolean }> {
    return this.send({
      to: childPhone,
      body: `✅ ChoreChomper: Great job! "${choreName}" verified! +${pointsAwarded} points`,
    });
  }

  async sendChoreRejectedNotification(childPhone: string, choreName: string, reason?: string): Promise<{ success: boolean }> {
    const message = reason 
      ? `⚠️ ChoreChomper: "${choreName}" needs more work. Feedback: ${reason}`
      : `⚠️ ChoreChomper: "${choreName}" needs more work. Check the app for details.`;
    return this.send({
      to: childPhone,
      body: message,
    });
  }

  async sendRedemptionRequestNotification(parentPhone: string, childName: string, rewardName: string): Promise<{ success: boolean }> {
    return this.send({
      to: parentPhone,
      body: `🎁 ChoreChomper: ${childName} wants to redeem "${rewardName}"! Review in the app.`,
    });
  }

  async sendRedemptionApprovedNotification(childPhone: string, rewardName: string): Promise<{ success: boolean }> {
    return this.send({
      to: childPhone,
      body: `🎉 ChoreChomper: Your reward "${rewardName}" was approved! 🌟`,
    });
  }

  async sendChoreReminderNotification(childPhone: string, choreName: string, dueDate: string): Promise<{ success: boolean }> {
    return this.send({
      to: childPhone,
      body: `⏰ ChoreChomper: Reminder! "${choreName}" is due ${dueDate}.`,
    });
  }
}

export const smsService = new SMSService();
