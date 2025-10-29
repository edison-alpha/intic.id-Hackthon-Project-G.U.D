/**
 * Hook for automatic event reminders
 * Checks for upcoming events and sends email reminders at 2 days and 1 day before
 */

import { useEffect } from 'react';
import {
  scheduleEventReminder,
  hasReminderBeenSent,
  getEventsNeedingReminders,
  type EventReminder
} from '@/services/emailReminderService';


/**
 * Custom hook to automatically check and send event reminders
 * @param tickets - Array of user's tickets
 * @param enabled - Whether to enable automatic checking (default: true)
 */
export function useEventReminders(tickets: any[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !tickets || tickets.length === 0) {
      return;
    }

    const checkAndSendReminders = async () => {
      // Mock email - in a real app, this might come from user profile context
      const userEmail = 'user@example.com';

      if (!userEmail) {
        console.log('📧 No email stored, skipping reminder checks');
        return;
      }

      console.log('📅 Checking for upcoming event reminders...');

      // Get events that need reminders
      const eventsNeedingReminders = getEventsNeedingReminders(tickets, userEmail);

      if (eventsNeedingReminders.length === 0) {
        console.log('✅ No upcoming events need reminders');
        return;
      }

      console.log(`📋 Found ${eventsNeedingReminders.length} events to check for reminders`);

      for (const reminder of eventsNeedingReminders) {
        // Check 2 days reminder
        if (!hasReminderBeenSent(reminder.contractId, userEmail, '2days')) {
          const result = await scheduleEventReminder(reminder, '2days');
          if (result.success) {
            console.log(`✅ 2-day reminder sent for ${reminder.eventName}`);
          }
        }

        // Check 1 day reminder
        if (!hasReminderBeenSent(reminder.contractId, userEmail, '1day')) {
          const result = await scheduleEventReminder(reminder, '1day');
          if (result.success) {
            console.log(`✅ 1-day reminder sent for ${reminder.eventName}`);
          }
        }

        // Check 1 hour reminder
        if (!hasReminderBeenSent(reminder.contractId, userEmail, '1hour')) {
          const result = await scheduleEventReminder(reminder, '1hour');
          if (result.success) {
            console.log(`✅ 1-hour reminder sent for ${reminder.eventName}`);
          }
        }

        // Add small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };

    // Check immediately on mount
    checkAndSendReminders();

    // Check every hour for new reminders to send
    const interval = setInterval(checkAndSendReminders, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [tickets, enabled]);
}

/**
 * Manual trigger for checking reminders
 * Useful for testing or manual refresh
 */
export async function checkRemindersManually(tickets: any[]): Promise<{
  checked: number;
  sent: number;
  failed: number;
}> {
  // Mock email - in a real app, this might come from user profile context
  const userEmail = 'user@example.com';

  if (!userEmail) {
    return { checked: 0, sent: 0, failed: 0 };
  }

  const eventsNeedingReminders = getEventsNeedingReminders(tickets, userEmail);
  let sent = 0;
  let failed = 0;

  for (const reminder of eventsNeedingReminders) {
    const reminderTypes: Array<'2days' | '1day' | '1hour'> = ['2days', '1day', '1hour'];

    for (const reminderType of reminderTypes) {
      if (!hasReminderBeenSent(reminder.contractId, userEmail, reminderType)) {
        const result = await scheduleEventReminder(reminder, reminderType);
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return {
    checked: eventsNeedingReminders.length,
    sent,
    failed
  };
}
