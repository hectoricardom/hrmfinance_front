import type { Appointment, EventType } from '../types';
import { schedulingService } from './schedulingService';
import { devLog } from '../../../services/utils';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  // Email service configuration (e.g., SendGrid, AWS SES, etc.)
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // These would come from environment variables
    this.apiKey = import.meta.env.VITE_EMAIL_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'noreply@yourdomain.com';
    this.fromName = import.meta.env.VITE_FROM_NAME || 'Your Scheduling App';
  }

  // Generate confirmation email template
  generateConfirmationEmail(appointment: Appointment, eventType: EventType): EmailTemplate {
    const dateStr = schedulingService.formatDateTime(appointment.startTime, 'full');
    const cancelLink = `${window.location.origin}/cancel/${appointment.id}`;
    const rescheduleLink = `${window.location.origin}/reschedule/${appointment.id}`;
    
    const locationInfo = this.getLocationInfo(appointment);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e9ecef; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .button.secondary { background: #6c757d; }
            .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${appointment.guestName},</p>
              <p>Your appointment has been confirmed with ${appointment.hostName}.</p>
              
              <div class="details">
                <h2 style="margin-top: 0;">📅 Appointment Details</h2>
                <p><strong>What:</strong> ${eventType.name}</p>
                <p><strong>When:</strong> ${dateStr}</p>
                <p><strong>Duration:</strong> ${appointment.duration} minutes</p>
                <p><strong>Where:</strong> ${locationInfo}</p>
                ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${rescheduleLink}" class="button secondary">Reschedule</a>
                <a href="${cancelLink}" class="button secondary">Cancel</a>
              </div>

              <h3>Need to make changes?</h3>
              <p>You can reschedule or cancel your appointment anytime using the buttons above.</p>

              ${eventType.confirmationMessage ? `
                <div style="border-left: 4px solid #007bff; padding-left: 20px; margin: 20px 0;">
                  <p><strong>Message from ${appointment.hostName}:</strong></p>
                  <p>${eventType.confirmationMessage}</p>
                </div>
              ` : ''}

              <p>We've sent you a calendar invitation that you can add to your calendar.</p>
            </div>
            <div class="footer">
              <p>If you have any questions, please contact ${appointment.hostEmail}</p>
              <p>&copy; ${new Date().getFullYear()} ${this.fromName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Appointment Confirmed!

Hi ${appointment.guestName},

Your appointment has been confirmed with ${appointment.hostName}.

APPOINTMENT DETAILS:
What: ${eventType.name}
When: ${dateStr}
Duration: ${appointment.duration} minutes
Where: ${locationInfo}
${appointment.notes ? `Notes: ${appointment.notes}` : ''}

To reschedule: ${rescheduleLink}
To cancel: ${cancelLink}

If you have any questions, please contact ${appointment.hostEmail}

${eventType.confirmationMessage ? `\nMessage from ${appointment.hostName}:\n${eventType.confirmationMessage}` : ''}
    `.trim();

    return {
      subject: `Confirmed: ${eventType.name} with ${appointment.hostName} on ${schedulingService.formatDateTime(appointment.startTime, 'short')}`,
      html,
      text
    };
  }

  // Generate reminder email template
  generateReminderEmail(appointment: Appointment, eventType: EventType, hoursUntil: number): EmailTemplate {
    const dateStr = schedulingService.formatDateTime(appointment.startTime, 'full');
    const cancelLink = `${window.location.origin}/cancel/${appointment.id}`;
    const rescheduleLink = `${window.location.origin}/reschedule/${appointment.id}`;
    
    const locationInfo = this.getLocationInfo(appointment);
    const timeUntil = hoursUntil >= 24 ? `${Math.floor(hoursUntil / 24)} day${hoursUntil >= 48 ? 's' : ''}` : `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ffc107; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e9ecef; }
            .details { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .button.secondary { background: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Reminder: Appointment in ${timeUntil}</h1>
            </div>
            <div class="content">
              <p>Hi ${appointment.guestName},</p>
              <p>This is a friendly reminder about your upcoming appointment.</p>
              
              <div class="details">
                <h2 style="margin-top: 0;">📅 Appointment Details</h2>
                <p><strong>What:</strong> ${eventType.name}</p>
                <p><strong>With:</strong> ${appointment.hostName}</p>
                <p><strong>When:</strong> ${dateStr}</p>
                <p><strong>Duration:</strong> ${appointment.duration} minutes</p>
                <p><strong>Where:</strong> ${locationInfo}</p>
              </div>

              ${appointment.locationType === 'video' ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appointment.meetingLink}" class="button">Join Video Call</a>
                </div>
              ` : ''}

              <p>Need to make changes?</p>
              <div style="text-align: center;">
                <a href="${rescheduleLink}" class="button secondary">Reschedule</a>
                <a href="${cancelLink}" class="button secondary">Cancel</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Reminder: Appointment in ${timeUntil}

Hi ${appointment.guestName},

This is a friendly reminder about your upcoming appointment.

APPOINTMENT DETAILS:
What: ${eventType.name}
With: ${appointment.hostName}
When: ${dateStr}
Duration: ${appointment.duration} minutes
Where: ${locationInfo}

${appointment.locationType === 'video' ? `Join Video Call: ${appointment.meetingLink}` : ''}

To reschedule: ${rescheduleLink}
To cancel: ${cancelLink}
    `.trim();

    return {
      subject: `Reminder: ${eventType.name} with ${appointment.hostName} in ${timeUntil}`,
      html,
      text
    };
  }

  // Generate cancellation email template
  generateCancellationEmail(appointment: Appointment, eventType: EventType, cancelledBy: 'host' | 'guest', reason?: string): EmailTemplate {
    const dateStr = schedulingService.formatDateTime(appointment.startTime, 'full');
    const rebookLink = `${window.location.origin}/book/${appointment.hostId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e9ecef; }
            .details { background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${appointment.guestName},</p>
              <p>Your appointment has been cancelled${cancelledBy === 'host' ? ` by ${appointment.hostName}` : ''}.</p>
              
              <div class="details">
                <h2 style="margin-top: 0;">Cancelled Appointment Details</h2>
                <p><strong>What:</strong> ${eventType.name}</p>
                <p><strong>When:</strong> ${dateStr}</p>
                <p><strong>With:</strong> ${appointment.hostName}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>

              ${cancelledBy === 'host' ? `
                <p>We apologize for any inconvenience. Would you like to schedule a new appointment?</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${rebookLink}" class="button">Book New Appointment</a>
                </div>
              ` : `
                <p>If you'd like to schedule a new appointment, you can do so at any time.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${rebookLink}" class="button">Book New Appointment</a>
                </div>
              `}
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Appointment Cancelled

Hi ${appointment.guestName},

Your appointment has been cancelled${cancelledBy === 'host' ? ` by ${appointment.hostName}` : ''}.

CANCELLED APPOINTMENT:
What: ${eventType.name}
When: ${dateStr}
With: ${appointment.hostName}
${reason ? `Reason: ${reason}` : ''}

To book a new appointment: ${rebookLink}
    `.trim();

    return {
      subject: `Cancelled: ${eventType.name} on ${schedulingService.formatDateTime(appointment.startTime, 'short')}`,
      html,
      text
    };
  }

  // Generate ICS calendar file
  generateICSFile(appointment: Appointment, eventType: EventType): string {
    const dtstart = this.formatICSDate(appointment.startTime);
    const dtend = this.formatICSDate(appointment.endTime);
    const dtstamp = this.formatICSDate(new Date());
    const uid = `${appointment.id}@${window.location.hostname}`;
    
    const locationInfo = this.getLocationInfo(appointment);
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${this.fromName}//Appointment Scheduler//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${eventType.name} with ${appointment.hostName}
DESCRIPTION:${eventType.description || eventType.name}\\n\\nWith: ${appointment.hostName}\\n${appointment.notes ? `Notes: ${appointment.notes}` : ''}
LOCATION:${locationInfo}
ORGANIZER;CN="${appointment.hostName}":mailto:${appointment.hostEmail}
ATTENDEE;CN="${appointment.guestName}";RSVP=TRUE:mailto:${appointment.guestEmail}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`.trim();

    return ics;
  }

  // Helper functions
  private getLocationInfo(appointment: Appointment): string {
    switch (appointment.locationType) {
      case 'video':
        return appointment.meetingLink || 'Video call (link will be provided)';
      case 'phone':
        return appointment.location || 'Phone call (number will be provided)';
      case 'in-person':
        return appointment.location || 'In-person (address will be provided)';
      default:
        return appointment.location || 'TBD';
    }
  }

  private formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  // Send email using your preferred email service
  async sendEmail(to: string, template: EmailTemplate, attachments?: Array<{filename: string; content: string}>): Promise<void> {
    // Implementation depends on your email service
    // Example for SendGrid:
    /*
    const msg = {
      to,
      from: { email: this.fromEmail, name: this.fromName },
      subject: template.subject,
      text: template.text,
      html: template.html,
      attachments: attachments?.map(att => ({
        content: Buffer.from(att.content).toString('base64'),
        filename: att.filename,
        type: 'text/calendar',
        disposition: 'attachment'
      }))
    };
    
    await sgMail.send(msg);
    */
    
    // For now, just log
    devLog('Email would be sent to:', to);
    devLog('Subject:', template.subject);
  }
}

export const emailService = new EmailService();