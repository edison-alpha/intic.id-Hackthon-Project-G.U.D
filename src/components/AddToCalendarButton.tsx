/**
 * Add to Calendar Button Component
 * Opens modal with Google Calendar option
 */

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToGoogleCalendar, type CalendarEvent } from '@/services/calendarService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddToCalendarButtonProps {
  event: CalendarEvent;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
  iconOnly?: boolean;
}

export default function AddToCalendarButton({
  event,
  variant = 'default',
  size = 'default',
  className = '',
  label = 'Add to Calendar',
  iconOnly = false,
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddToGoogle = () => {
    const url = addToGoogleCalendar(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <Calendar className={iconOnly ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
        {!iconOnly && label}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#d548ec]" />
              Add to Calendar
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add this event to your Google Calendar with automatic reminders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event Details Preview */}
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 space-y-2">
              <div className="text-white font-semibold">{event.title}</div>
              <div className="text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {event.startDate.toLocaleDateString()} at {event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {event.location}
                </div>
              </div>
            </div>

            {/* Reminder Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="text-sm text-blue-400 font-medium mb-2">📅 Automatic Reminders:</div>
              <ul className="text-xs text-blue-300 space-y-1 ml-4">
                <li>• 2 days before event</li>
                <li>• 1 day before event</li>
                <li>• 1 hour before event</li>
              </ul>
            </div>

            {/* Add to Google Calendar Button */}
            <Button
              onClick={handleAddToGoogle}
              className="w-full bg-gradient-to-r from-[#4285F4] to-[#357AE8] hover:from-[#357AE8] hover:to-[#2A5FCF] text-white font-semibold py-6"
              size="lg"
            >
              <svg
                className="h-5 w-5 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 4H17V2H15V4H9V2H7V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20Z"/>
              </svg>
              Add to Google Calendar
            </Button>

            <div className="text-center text-xs text-gray-500">
              Opens in a new tab. You can review before saving.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
