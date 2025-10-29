/**
 * Calendar Service
 * Generates calendar files (.ics) for events
 * Supports Google Calendar, Apple Calendar, Outlook
 */

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  url?: string;
  organizer?: string;
}

/**
 * Generate ICS (iCalendar) file content
 */
export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const escapeString = (str: string): string => {
    return str.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//INTIC//Event Ticketing//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `UID:${Date.now()}-${Math.random().toString(36).substring(7)}@intic.app`,
    `SUMMARY:${escapeString(event.title)}`,
    `DESCRIPTION:${escapeString(event.description)}`,
    `LOCATION:${escapeString(event.location)}`,
    event.url ? `URL:${event.url}` : '',
    event.organizer ? `ORGANIZER:${event.organizer}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder - 1 hour before',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder - 1 day before',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT48H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder - 2 days before',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return icsContent;
}

/**
 * Download ICS file
 */
export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `${event.title.replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Add to Google Calendar
 */
export function addToGoogleCalendar(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    details: event.description,
    location: event.location,
  });

  if (event.url) {
    params.append('sprop', `website:${event.url}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Add to Outlook Calendar
 */
export function addToOutlookCalendar(event: CalendarEvent): string {
  const formatOutlookDate = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    location: event.location,
    startdt: formatOutlookDate(event.startDate),
    enddt: formatOutlookDate(event.endDate),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Add to Yahoo Calendar
 */
export function addToYahooCalendar(event: CalendarEvent): string {
  const formatYahooDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  // Calculate duration in format HHMM
  const duration = Math.floor((event.endDate.getTime() - event.startDate.getTime()) / 1000 / 60);
  const hours = Math.floor(duration / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (duration % 60).toString().padStart(2, '0');

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatYahooDate(event.startDate),
    dur: `${hours}${minutes}`,
    desc: event.description,
    in_loc: event.location,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Parse event date and time to Date objects
 */
export function parseEventDateTime(
  eventDate: string,
  eventTime: string,
  durationHours: number = 3
): { startDate: Date; endDate: Date } {
  try {
    // Parse the date string
    const dateStr = eventDate;
    const timeStr = eventTime;

    // Create start date
    const startDate = new Date(`${dateStr} ${timeStr}`);

    // Create end date (default 3 hours after start)
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    return { startDate, endDate };
  } catch (error) {
    console.error('❌ Error parsing event date/time:', error);
    // Return default dates (now + 1 hour)
    const now = new Date();
    return {
      startDate: now,
      endDate: new Date(now.getTime() + 3600000),
    };
  }
}

/**
 * Create calendar event from ticket data
 */
export function createCalendarEventFromTicket(ticket: any): CalendarEvent {
  const { startDate, endDate } = parseEventDateTime(
    ticket.eventDate,
    ticket.eventTime,
    3 // Default 3 hours duration
  );

  return {
    title: ticket.eventName,
    description: `Event: ${ticket.eventName}\nTicket: ${ticket.ticketNumber}\nCategory: ${ticket.category || 'General'}\n\nPowered by INTIC - Blockchain Event Ticketing`,
    location: ticket.location,
    startDate,
    endDate,
    url: `${window.location.origin}/app/ticket/${ticket.id}`,
    organizer: 'INTIC Event Ticketing',
  };
}

/**
 * Open calendar picker modal
 */
export function openCalendarPicker(event: CalendarEvent, onClose?: () => void): void {
  const modal = document.createElement('div');
  modal.className = 'calendar-picker-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  `;

  content.innerHTML = `
    <h3 style="color: white; margin: 0 0 24px 0; font-size: 24px;">Add to Calendar</h3>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <button class="cal-btn" data-type="google" style="
        background: #4285F4;
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,4H17V2H15V4H9V2H7V4H5A2,2 0 0,0 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20Z"/>
        </svg>
        Google Calendar
      </button>

      <button class="cal-btn" data-type="outlook" style="
        background: #0078D4;
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,4H17V2H15V4H9V2H7V4H5A2,2 0 0,0 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20Z"/>
        </svg>
        Outlook Calendar
      </button>

      <button class="cal-btn" data-type="yahoo" style="
        background: #6001D2;
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,4H17V2H15V4H9V2H7V4H5A2,2 0 0,0 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20Z"/>
        </svg>
        Yahoo Calendar
      </button>

      <button class="cal-btn" data-type="ics" style="
        background: #FE5C02;
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        Download .ics file
      </button>
    </div>
    <button class="cal-close" style="
      background: transparent;
      color: #999;
      border: 1px solid #333;
      padding: 12px;
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
      margin-top: 16px;
      transition: all 0.2s;
    ">
      Cancel
    </button>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Add hover effects
  const buttons = content.querySelectorAll('.cal-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      (btn as HTMLElement).style.transform = 'translateY(-2px)';
      (btn as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });
    btn.addEventListener('mouseleave', () => {
      (btn as HTMLElement).style.transform = 'translateY(0)';
      (btn as HTMLElement).style.boxShadow = 'none';
    });
  });

  // Handle calendar selection
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      let url = '';

      switch (type) {
        case 'google':
          url = addToGoogleCalendar(event);
          window.open(url, '_blank');
          break;
        case 'outlook':
          url = addToOutlookCalendar(event);
          window.open(url, '_blank');
          break;
        case 'yahoo':
          url = addToYahooCalendar(event);
          window.open(url, '_blank');
          break;
        case 'ics':
          downloadICS(event);
          break;
      }

      // Close modal
      document.body.removeChild(modal);
      if (onClose) onClose();
    });
  });

  // Close on background click or close button
  const closeBtn = content.querySelector('.cal-close');
  closeBtn?.addEventListener('click', () => {
    document.body.removeChild(modal);
    if (onClose) onClose();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      if (onClose) onClose();
    }
  });
}
