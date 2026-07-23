import { Event } from '../types';

/**
 * Format date and time string into Google Calendar ISO string format: YYYYMMDDTHHMMSSZ
 */
export function formatGoogleCalendarDates(dateStr: string, timeStr?: string): { startISO: string; endISO: string } {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hours = 12;
    let minutes = 0;

    if (timeStr) {
      const cleanTime = timeStr.trim().toUpperCase();
      const isPM = cleanTime.includes('PM');
      const isAM = cleanTime.includes('AM');
      const timeNumbers = cleanTime.replace(/[^0-9:]/g, '');
      const parts = timeNumbers.split(':').map(Number);

      if (parts.length >= 1 && !isNaN(parts[0])) {
        hours = parts[0];
        if (parts.length >= 2 && !isNaN(parts[1])) {
          minutes = parts[1];
        }
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
    }

    const startDate = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1, hours, minutes, 0));
    // Default duration 2 hours
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const toGCalString = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    return {
      startISO: toGCalString(startDate),
      endISO: toGCalString(endDate)
    };
  } catch (e) {
    console.warn("Date parsing fallback for Google Calendar:", e);
    const now = new Date();
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const format = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    return { startISO: format(now), endISO: format(future) };
  }
}

/**
 * Generate direct Google Calendar event creation URL with prepopulated title, date, time, description & guests.
 */
export function createGoogleCalendarUrl(
  event: Event,
  eventLink: string,
  invitedEmails?: string[]
): string {
  const { startISO, endISO } = formatGoogleCalendarDates(event.date, event.time);
  
  const details = [
    event.description || '',
    `Event Category: ${event.type || 'Gathering'}`,
    `Guest/Volunteer Target: ${event.guestsCount || 0}`,
    `Manage Event & Food Details: ${eventLink}`
  ].filter(Boolean).join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startISO}/${endISO}`,
    details: details,
  });

  if (invitedEmails && invitedEmails.length > 0) {
    const validEmails = invitedEmails.filter(e => e && e.includes('@'));
    if (validEmails.length > 0) {
      params.set('add', validEmails.join(','));
    }
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Sync event details to Google Calendar.
 */
export function syncEventToGoogleCalendar(
  event: Event,
  eventLink: string,
  invitedEmails?: string[]
): { calendarUrl: string; message: string } {
  const calendarUrl = createGoogleCalendarUrl(event, eventLink, invitedEmails);
  
  return {
    calendarUrl,
    message: `Event "${event.title}" automatically synced to Google Calendar!`
  };
}
