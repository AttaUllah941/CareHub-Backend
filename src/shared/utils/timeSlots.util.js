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

module.exports = {
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  generateTimeSlots,
  normalizeDateString,
};
