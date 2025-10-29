/**
 * Email Reminder Service
 * Handles sending email reminders for upcoming events
 * Uses Web3Forms API for serverless email functionality
 */

export interface EventReminder {
  userEmail: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  ticketNumber: string;
  contractId: string;
}

// Web3Forms public access key (free tier)
// Get your own key at https://web3forms.com
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || 'YOUR_WEB3FORMS_KEY';

/**
 * Schedule email reminder for an event
 * @param reminder - Event reminder details
 * @param reminderType - When to send: '2days', '1day', '1week', '1hour'
 */
export async function scheduleEventReminder(
  reminder: EventReminder,
  reminderType: '2days' | '1day' | '1week' | '1hour' = '1day'
): Promise<{ success: boolean; message: string }> {
  try {
    const eventDateTime = new Date(`${reminder.eventDate} ${reminder.eventTime}`);
    const now = new Date();

    // Calculate time until event
    const timeUntilEvent = eventDateTime.getTime() - now.getTime();
    const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

    // Determine when to send reminder
    let shouldSendNow = false;
    let reminderTime = '';

    switch (reminderType) {
      case '1hour':
        shouldSendNow = hoursUntilEvent <= 1 && hoursUntilEvent > 0;
        reminderTime = '1 hour';
        break;
      case '1day':
        shouldSendNow = hoursUntilEvent <= 24 && hoursUntilEvent > 0;
        reminderTime = '1 day';
        break;
      case '2days':
        shouldSendNow = hoursUntilEvent <= 48 && hoursUntilEvent > 24;
        reminderTime = '2 days';
        break;
      case '1week':
        shouldSendNow = hoursUntilEvent <= 168 && hoursUntilEvent > 0;
        reminderTime = '1 week';
        break;
    }

    if (!shouldSendNow) {
      return {
        success: false,
        message: `Reminder will be sent ${reminderTime} before the event`,
      };
    }

    // Send email via Web3Forms
    const result = await sendReminderEmail(reminder, reminderTime);

    // Store in localStorage to prevent duplicate reminders
    const sentReminders = JSON.parse(localStorage.getItem('sent-reminders') || '[]');
    sentReminders.push({
      contractId: reminder.contractId,
      email: reminder.userEmail,
      reminderType,
      sentAt: new Date().toISOString(),
    });
    localStorage.setItem('sent-reminders', JSON.stringify(sentReminders));

    return result;

  } catch (error) {
    console.error('❌ Error scheduling reminder:', error);
    return {
      success: false,
      message: 'Failed to schedule reminder',
    };
  }
}

/**
 * Send reminder email using Web3Forms
 */
async function sendReminderEmail(
  reminder: EventReminder,
  reminderTime: string
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', `Reminder: ${reminder.eventName} in ${reminderTime}`);
    formData.append('from_name', 'INTIC - Event Ticketing');
    formData.append('email', reminder.userEmail);

    // Email body with HTML
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FE5C02 0%, #FF7A33 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .detail-row { display: flex; margin: 10px 0; }
          .detail-label { font-weight: bold; width: 140px; color: #666; }
          .detail-value { color: #333; }
          .cta-button { display: inline-block; background: #FE5C02; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎟️ Event Reminder</h1>
            <p>Your event is coming up soon!</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>This is a friendly reminder that your event <strong>${reminder.eventName}</strong> is starting in ${reminderTime}!</p>

            <div class="event-details">
              <h3 style="margin-top: 0; color: #FE5C02;">Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">📅 Date & Time:</span>
                <span class="detail-value">${reminder.eventDate} at ${reminder.eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${reminder.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎫 Ticket:</span>
                <span class="detail-value">${reminder.ticketNumber}</span>
              </div>
            </div>

            <p><strong>Don't forget to:</strong></p>
            <ul>
              <li>Bring your QR code ticket (accessible in the app)</li>
              <li>Arrive early to avoid queues</li>
              <li>Check the venue's entry requirements</li>
            </ul>

            <center>
              <a href="${window.location.origin}/app/my-tickets" class="cta-button">View Your Tickets</a>
            </center>

            <div class="footer">
              <p>This is an automated reminder from INTIC Event Ticketing Platform</p>
              <p>Powered by blockchain technology on Stacks</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    formData.append('message', emailBody);
    formData.append('reply_to', 'noreply@intic.app');

    // Important: Tell Web3Forms this is HTML content
    formData.append('redirect', 'false');
    formData.append('content_type', 'text/html');

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {

      return {
        success: true,
        message: `Reminder sent to ${reminder.userEmail}`,
      };
    } else {
      console.error('❌ Failed to send email:', result);
      return {
        success: false,
        message: result.message || 'Failed to send email',
      };
    }

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      message: 'Network error while sending email',
    };
  }
}

/**
 * Check if reminder has already been sent
 */
export function hasReminderBeenSent(
  contractId: string,
  email: string,
  reminderType: string
): boolean {
  try {
    const sentReminders = JSON.parse(localStorage.getItem('sent-reminders') || '[]');
    return sentReminders.some(
      (r: any) =>
        r.contractId === contractId &&
        r.email === email &&
        r.reminderType === reminderType
    );
  } catch {
    return false;
  }
}

/**
 * Get upcoming events that need reminders
 */
export function getEventsNeedingReminders(
  tickets: any[],
  userEmail: string
): EventReminder[] {
  const now = new Date();
  const reminders: EventReminder[] = [];

  tickets.forEach((ticket) => {
    try {
      const eventDateTime = new Date(`${ticket.eventDate} ${ticket.eventTime}`);
      const timeUntilEvent = eventDateTime.getTime() - now.getTime();
      const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

      // Check if event is upcoming (within 7 days) and not past
      if (hoursUntilEvent > 0 && hoursUntilEvent <= 168) {
        reminders.push({
          userEmail,
          eventName: ticket.eventName,
          eventDate: ticket.eventDate,
          eventTime: ticket.eventTime,
          location: ticket.location,
          ticketNumber: ticket.ticketNumber,
          contractId: ticket.contractId,
        });
      }
    } catch (error) {
      console.warn('⚠️ Invalid date for ticket:', ticket);
    }
  });

  return reminders;
}

/**
 * Batch send reminders for all upcoming events
 */
export async function sendBatchReminders(
  tickets: any[],
  userEmail: string
): Promise<{ sent: number; failed: number }> {
  const reminders = getEventsNeedingReminders(tickets, userEmail);
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    // Check if already sent
    if (hasReminderBeenSent(reminder.contractId, userEmail, '1day')) {
      continue;
    }

    const result = await scheduleEventReminder(reminder, '1day');
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { sent, failed };
}
