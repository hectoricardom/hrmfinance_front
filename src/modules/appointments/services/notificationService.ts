/**
 * Notification Service for Appointment System
 * Handles email and SMS notifications for appointments
 * 
 * NOTE: This is a stub implementation. In production, you would integrate with:
 * - Email services: SendGrid, AWS SES, Mailgun, etc.
 * - SMS services: Twilio, AWS SNS, etc.
 */

import type { Appointment, EventType } from '../types';
import { schedulingService } from './schedulingService';
import { devLog } from '../../../services/utils';

export interface NotificationConfig {
  emailProvider?: 'sendgrid' | 'ses' | 'mailgun';
  smsProvider?: 'twilio' | 'sns';
  apiKey?: string;
  fromEmail?: string;
  fromPhone?: string;
}

export const notificationService = {
  config: {} as NotificationConfig,

  /**
   * Initialize notification service with configuration
   */
  initialize(config: NotificationConfig) {
    this.config = config;
  },

  /**
   * Send booking confirmation email to guest
   */
  async sendBookingConfirmation(appointment: Appointment, eventType: EventType): Promise<void> {
    devLog('Sending booking confirmation email...');
    devLog('To:', appointment.guestEmail);
    devLog('Subject: Appointment Confirmed');
    
    const emailContent = this.generateConfirmationEmail(appointment, eventType);
    
    // TODO: Integrate with your email service provider
    // Example with SendGrid:
    // await sendGridClient.send({
    //   to: appointment.guestEmail,
    //   from: this.config.fromEmail,
    //   subject: 'Appointment Confirmed',
    //   html: emailContent
    // });
    
    devLog('Email content:', emailContent);
    return Promise.resolve();
  },

  /**
   * Send booking confirmation email to host
   */
  async sendHostNotification(appointment: Appointment, eventType: EventType): Promise<void> {
    devLog('Sending host notification email...');
    devLog('To:', appointment.hostEmail);
    devLog('Subject: New Appointment Booked');

    const emailContent = this.generateHostNotificationEmail(appointment, eventType);

    // TODO: Integrate with your email service provider
    devLog('Email content:', emailContent);
    return Promise.resolve();
  },

  /**
   * Send reminder email before appointment
   */
  async sendReminder(appointment: Appointment, eventType: EventType, hoursBefore: number = 24): Promise<void> {
    devLog(`Sending ${hoursBefore}h reminder email...`);
    devLog('To:', appointment.guestEmail);
    devLog('Subject: Appointment Reminder');

    const emailContent = this.generateReminderEmail(appointment, eventType, hoursBefore);

    // TODO: Integrate with your email service provider
    devLog('Email content:', emailContent);
    return Promise.resolve();
  },

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(
    appointment: Appointment, 
    eventType: EventType,
    cancelledBy: 'host' | 'guest'
  ): Promise<void> {
    devLog('Sending cancellation notification...');

    const recipientEmail = cancelledBy === 'host' ? appointment.guestEmail : appointment.hostEmail;
    devLog('To:', recipientEmail);
    devLog('Subject: Appointment Cancelled');

    const emailContent = this.generateCancellationEmail(appointment, eventType, cancelledBy);

    // TODO: Integrate with your email service provider
    devLog('Email content:', emailContent);
    return Promise.resolve();
  },

  /**
   * Send SMS notification (optional)
   */
  async sendSMS(phone: string, message: string): Promise<void> {
    devLog('Sending SMS...');
    devLog('To:', phone);
    devLog('Message:', message);
    
    // TODO: Integrate with your SMS service provider
    // Example with Twilio:
    // await twilioClient.messages.create({
    //   to: phone,
    //   from: this.config.fromPhone,
    //   body: message
    // });
    
    return Promise.resolve();
  },

  /**
   * Generate confirmation email HTML
   */
  generateConfirmationEmail(appointment: Appointment, eventType: EventType): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${eventType.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .detail strong { display: inline-block; width: 120px; }
            .button { display: inline-block; padding: 12px 24px; background: ${eventType.color}; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Appointment Confirmed</h1>
            </div>
            <div class="content">
              <p>Hi ${appointment.guestName},</p>
              <p>Your appointment has been confirmed! Here are the details:</p>
              
              <div class="detail">
                <strong>Event:</strong> ${eventType.name}
              </div>
              <div class="detail">
                <strong>Date & Time:</strong> ${schedulingService.formatDateTime(appointment.startTime, 'long')}
              </div>
              <div class="detail">
                <strong>Duration:</strong> ${schedulingService.formatDuration(appointment.duration)}
              </div>
              <div class="detail">
                <strong>Location:</strong> ${appointment.locationType}
              </div>
              <div class="detail">
                <strong>With:</strong> ${appointment.hostName}
              </div>
              
              ${eventType.locationType === 'video' ? `
                <a href="#" class="button">Join Video Call</a>
              ` : ''}
              
              <p style="margin-top: 20px;">
                Need to reschedule or cancel? 
                <a href="#">Click here</a>
              </p>
              
              <p>Looking forward to meeting with you!</p>
            </div>
            <div class="footer">
              <p>This email was sent by ${appointment.hostName}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generate host notification email HTML
   */
  generateHostNotificationEmail(appointment: Appointment, eventType: EventType): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .detail strong { display: inline-block; width: 120px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Appointment Booked</h1>
            </div>
            <div class="content">
              <p>A new appointment has been scheduled:</p>
              
              <div class="detail">
                <strong>Event:</strong> ${eventType.name}
              </div>
              <div class="detail">
                <strong>Guest:</strong> ${appointment.guestName}
              </div>
              <div class="detail">
                <strong>Email:</strong> ${appointment.guestEmail}
              </div>
              ${appointment.guestPhone ? `
              <div class="detail">
                <strong>Phone:</strong> ${appointment.guestPhone}
              </div>
              ` : ''}
              <div class="detail">
                <strong>Date & Time:</strong> ${schedulingService.formatDateTime(appointment.startTime, 'long')}
              </div>
              <div class="detail">
                <strong>Duration:</strong> ${schedulingService.formatDuration(appointment.duration)}
              </div>
              ${appointment.notes ? `
              <div class="detail">
                <strong>Notes:</strong><br>${appointment.notes}
              </div>
              ` : ''}
              
              ${eventType.requiresApproval ? `
                <p style="background: #FEF3C7; padding: 12px; border-radius: 4px; margin-top: 20px;">
                  ⚠️ This appointment requires your approval.
                  <a href="#">Click here to review</a>
                </p>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generate reminder email HTML
   */
  generateReminderEmail(appointment: Appointment, eventType: EventType, hoursBefore: number): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Appointment Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${appointment.guestName},</p>
              <p>This is a reminder about your upcoming appointment in ${hoursBefore} hours:</p>
              
              <div class="detail">
                <strong>Event:</strong> ${eventType.name}
              </div>
              <div class="detail">
                <strong>Date & Time:</strong> ${schedulingService.formatDateTime(appointment.startTime, 'long')}
              </div>
              <div class="detail">
                <strong>With:</strong> ${appointment.hostName}
              </div>
              
              ${eventType.locationType === 'video' ? `
                <a href="#" class="button">Join Video Call</a>
              ` : ''}
              
              <p>See you soon!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generate cancellation email HTML
   */
  generateCancellationEmail(
    appointment: Appointment, 
    eventType: EventType,
    cancelledBy: 'host' | 'guest'
  ): string {
    const isCancelledByHost = cancelledBy === 'host';
    const recipientName = isCancelledByHost ? appointment.guestName : appointment.hostName;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✕ Appointment Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>Your appointment has been cancelled${isCancelledByHost ? ' by the host' : ''}:</p>
              
              <div class="detail">
                <strong>Event:</strong> ${eventType.name}
              </div>
              <div class="detail">
                <strong>Date & Time:</strong> ${schedulingService.formatDateTime(appointment.startTime, 'long')}
              </div>
              ${appointment.cancellationReason ? `
              <div class="detail">
                <strong>Reason:</strong> ${appointment.cancellationReason}
              </div>
              ` : ''}
              
              ${isCancelledByHost ? `
                <p>We apologize for any inconvenience. If you'd like to reschedule, 
                <a href="#">click here to book a new appointment</a>.</p>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Schedule reminder notifications
   * This should be called by a cron job or scheduled function
   */
  async scheduleReminders(appointments: Appointment[], eventTypes: Map<string, EventType>): Promise<void> {
    const now = new Date();
    const reminderWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    for (const appointment of appointments) {
      const eventType = eventTypes.get(appointment.eventTypeId);
      if (!eventType || !eventType.reminderEnabled) continue;
      
      const timeUntilAppointment = appointment.startTime.getTime() - now.getTime();
      
      // Send reminder if appointment is within the reminder window and not yet sent
      if (
        timeUntilAppointment > 0 && 
        timeUntilAppointment <= reminderWindow && 
        !appointment.reminderSentAt &&
        appointment.status === 'confirmed'
      ) {
        await this.sendReminder(appointment, eventType, 24);
        // Update appointment to mark reminder as sent
        // await appointmentStore.updateAppointment(appointment.id, { reminderSentAt: new Date() });
      }
    }
  }
};

export default notificationService;