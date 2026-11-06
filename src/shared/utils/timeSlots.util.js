/**
 * Generates time slot strings between start and end (HH:mm, 24-hour).
 */
const parseTimeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatMinutesTo12Hour = (totalMinutes) => {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const generateTimeSlots = (startTime, endTime, slotDurationMinutes) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const slots = [];

  if (slotDurationMinutes <= 0 || start >= end) {
    return slots;
  }

  for (let current = start; current + slotDurationMinutes <= end; current += slotDurationMinutes) {
    slots.push(formatMinutesTo12Hour(current));
  }

  return slots;
};

const normalizeDateString = (dateInput) => {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

/** Clinic-local timezone offset (Pakistan, no DST). Slot labels are interpreted in this zone. */
const CLINIC_UTC_OFFSET = process.env.CLINIC_UTC_OFFSET || '+05:00';

/**
 * Converts a calendar date (YYYY-MM-DD) and a 12-hour label ("10:30 AM") into the absolute Date.
 * Returns null when the label is malformed.
 */
const slotToInstant = (dateString, timeLabel, offset = CLINIC_UTC_OFFSET) => {
  const match = String(timeLabel).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes > 59) return null;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const date = new Date(
    `${dateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${offset}`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

module.exports = {
  CLINIC_UTC_OFFSET,
  slotToInstant,
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  generateTimeSlots,
  normalizeDateString,
};
