import { Calendar } from "lucide-react";

interface EventData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  description?: string;
  ticketId?: string;
}

export const addToGoogleCalendar = (event: EventData) => {
  const startDate = new Date(`${event.eventDate} ${event.eventTime}`);
  
  // Set end time 3 hours after start by default
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  
  // Format dates for Google Calendar (yyyyMMddTHHmmss)
  const formatDateForGoogle = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };
  
  const startDateFormatted = formatDateForGoogle(startDate);
  const endDateFormatted = formatDateForGoogle(endDate);
  
  // Build description with ticket info
  let description = event.description || `Ticket purchased for ${event.eventName}`;
  if (event.ticketId) {
    description += `\n\nTicket ID: ${event.ticketId}`;
    description += `\nView your ticket: ${window.location.origin}/app/my-tickets`;
  }
  
  // Build Google Calendar URL
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.eventName,
    dates: `${startDateFormatted}/${endDateFormatted}`,
    details: description,
    location: event.location,
    // Add reminder 1 day before
    trp: 'true'
  });
  
  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  
  // Open in new window
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const addToAppleCalendar = (event: EventData) => {
  const startDate = new Date(`${event.eventDate} ${event.eventTime}`);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  
  // Format for iCal
  const formatDateForICal = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };
  
  const startDateFormatted = formatDateForICal(startDate);
  const endDateFormatted = formatDateForICal(endDate);
  
  let description = event.description || `Ticket purchased for ${event.eventName}`;
  if (event.ticketId) {
    description += `\\nTicket ID: ${event.ticketId}`;
  }
  
  // Create iCal file content
  const icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InTicket//Event Ticket//EN',
    'BEGIN:VEVENT',
    `DTSTART:${startDateFormatted}`,
    `DTEND:${endDateFormatted}`,
    `SUMMARY:${event.eventName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${event.location}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'DESCRIPTION:Event reminder',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  // Create blob and download
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${event.eventName.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const addToOutlookCalendar = (event: EventData) => {
  const startDate = new Date(`${event.eventDate} ${event.eventTime}`);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  
  // Format dates for Outlook
  const formatDateForOutlook = (date: Date) => {
    return date.toISOString();
  };
  
  let description = event.description || `Ticket purchased for ${event.eventName}`;
  if (event.ticketId) {
    description += `\n\nTicket ID: ${event.ticketId}`;
  }
  
  // Build Outlook Calendar URL
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.eventName,
    startdt: formatDateForOutlook(startDate),
    enddt: formatDateForOutlook(endDate),
    body: description,
    location: event.location
  });
  
  const url = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
