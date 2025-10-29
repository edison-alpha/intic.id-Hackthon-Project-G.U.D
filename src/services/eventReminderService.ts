/**
 * Event Reminder Service
 * Manages scheduling and sending event reminder emails
 * Tracks reminder status in localStorage
 */

import { sendEventReminder, EventAlertData } from './emailAlertService';

export interface ReminderSchedule {
  eventId: string;
  userEmail: string;
  eventDate: string; // ISO date string
  eventTime: string;
  reminders: {
    '3-days': { sent: boolean; scheduledFor: string };
    '2-days': { sent: boolean; scheduledFor: string };
    '1-day': { sent: boolean; scheduledFor: string };
    '5-hours': { sent: boolean; scheduledFor: string };
  };
}

/**
 * Calculate reminder send times based on event date
 */
export function calculateReminderTimes(eventDateStr: string, eventTimeStr: string): ReminderSchedule['reminders'] {
  try {
    // Parse event date and time
    const eventDateTime = new Date(`${eventDateStr} ${eventTimeStr}`);
    
    if (isNaN(eventDateTime.getTime())) {
      console.error('Invalid event date/time:', eventDateStr, eventTimeStr);
      throw new Error('Invalid date');
    }

    const threeDaysBefore = new Date(eventDateTime.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysBefore = new Date(eventDateTime.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayBefore = new Date(eventDateTime.getTime() - 1 * 24 * 60 * 60 * 1000);
    const fiveHoursBefore = new Date(eventDateTime.getTime() - 5 * 60 * 60 * 1000);

    return {
      '3-days': { sent: false, scheduledFor: threeDaysBefore.toISOString() },
      '2-days': { sent: false, scheduledFor: twoDaysBefore.toISOString() },
      '1-day': { sent: false, scheduledFor: oneDayBefore.toISOString() },
      '5-hours': { sent: false, scheduledFor: fiveHoursBefore.toISOString() }
    };
  } catch (error) {
    console.error('Error calculating reminder times:', error);
    // Return far future dates as fallback
    const farFuture = new Date('2099-12-31').toISOString();
    return {
      '3-days': { sent: false, scheduledFor: farFuture },
      '2-days': { sent: false, scheduledFor: farFuture },
      '1-day': { sent: false, scheduledFor: farFuture },
      '5-hours': { sent: false, scheduledFor: farFuture }
    };
  }
}

/**
 * Register a new ticket purchase for reminder tracking
 */
export function registerTicketForReminders(
  eventId: string,
  userEmail: string,
  eventDate: string,
  eventTime: string,
  eventName: string,
  location: string,
  ticketCount: number
): void {
  try {
    const storageKey = `event-reminders-${userEmail.replace('@', '-at-')}`;
    
    // Get existing reminders
    const existingData = localStorage.getItem(storageKey);
    const reminders: { [eventId: string]: ReminderSchedule & { eventName: string; location: string; ticketCount: number } } = 
      existingData ? JSON.parse(existingData) : {};

    // Calculate reminder times
    const reminderTimes = calculateReminderTimes(eventDate, eventTime);

    // Add or update reminder schedule
    reminders[eventId] = {
      eventId,
      userEmail,
      eventDate,
      eventTime,
      eventName,
      location,
      ticketCount,
      reminders: reminderTimes
    };

    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(reminders));
    
    console.log('✅ Registered reminders for event:', eventId);
    console.log('📧 Email:', userEmail);
    console.log('📅 Reminder schedule:', reminderTimes);
  } catch (error) {
    console.error('❌ Error registering reminders:', error);
  }
}

/**
 * Check and send due reminders
 * Should be called on app load and periodically
 */
export async function checkAndSendDueReminders(
  userEmail: string,
  contractAddress: string
): Promise<void> {
  try {
    const storageKey = `event-reminders-${userEmail.replace('@', '-at-')}`;
    const existingData = localStorage.getItem(storageKey);
    
    if (!existingData) {
      return; // No reminders registered
    }

    const reminders: { [eventId: string]: ReminderSchedule & { eventName: string; location: string; ticketCount: number } } = 
      JSON.parse(existingData);

    const now = new Date();
    let updated = false;

    // Check each event's reminders
    for (const [eventId, schedule] of Object.entries(reminders)) {
      // Only check reminders for events that match the contract address
      if (eventId !== contractAddress) {
        continue;
      }

      const reminderTypes: Array<'3-days' | '2-days' | '1-day' | '5-hours'> = ['3-days', '2-days', '1-day', '5-hours'];
      
      for (const type of reminderTypes) {
        const reminder = schedule.reminders[type];
        const scheduledTime = new Date(reminder.scheduledFor);
        
        // Check if reminder is due and not yet sent
        if (!reminder.sent && now >= scheduledTime) {
          console.log(`⏰ Sending ${type} reminder for:`, schedule.eventName);
          
          // Calculate time until event
          const eventDateTime = new Date(`${schedule.eventDate} ${schedule.eventTime}`);
          const timeUntil = calculateTimeUntilEvent(eventDateTime);
          
          // Send reminder email
          const result = await sendEventReminder({
            userEmail: schedule.userEmail,
            eventName: schedule.eventName,
            eventDate: schedule.eventDate,
            eventTime: schedule.eventTime,
            location: schedule.location,
            ticketCount: schedule.ticketCount,
            totalAmount: '0', // Not needed for reminders
            contractAddress: eventId,
            reminderType: type,
            timeUntilEvent: timeUntil
          });
          
          if (result.success) {
            // Mark reminder as sent
            reminder.sent = true;
            updated = true;
            console.log(`✅ ${type} reminder sent successfully`);
          } else {
            console.error(`❌ Failed to send ${type} reminder:`, result.message);
          }
          
          // Small delay between reminder types
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Save updated reminder status
    if (updated) {
      localStorage.setItem(storageKey, JSON.stringify(reminders));
      console.log('✅ Reminder status updated');
    }
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
  }
}

/**
 * Calculate human-readable time until event
 */
function calculateTimeUntilEvent(eventDate: Date): string {
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  
  if (diff < 0) {
    return 'Event has started';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

/**
 * Get all scheduled reminders for a user
 */
export function getUserReminders(userEmail: string): { [eventId: string]: ReminderSchedule } | null {
  try {
    const storageKey = `event-reminders-${userEmail.replace('@', '-at-')}`;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user reminders:', error);
    return null;
  }
}

/**
 * Cancel all reminders for a specific event
 */
export function cancelEventReminders(userEmail: string, eventId: string): void {
  try {
    const storageKey = `event-reminders-${userEmail.replace('@', '-at-')}`;
    const existingData = localStorage.getItem(storageKey);
    
    if (!existingData) {
      return;
    }

    const reminders = JSON.parse(existingData);
    delete reminders[eventId];
    
    localStorage.setItem(storageKey, JSON.stringify(reminders));
    console.log('✅ Cancelled reminders for event:', eventId);
  } catch (error) {
    console.error('Error cancelling reminders:', error);
  }
}
