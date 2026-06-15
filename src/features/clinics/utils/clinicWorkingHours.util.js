const { TIME_REGEX, timeToMinutes } = require('../../doctor-availability/utils/availabilityConflict.util');

function validateBreaks(breaks, dayStart, dayEnd, dayLabel) {
  if (!breaks?.length) return;

  const sorted = [...breaks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (let i = 0; i < sorted.length; i += 1) {
    const br = sorted[i];
    if (!TIME_REGEX.test(br.startTime) || !TIME_REGEX.test(br.endTime)) {
      throw new Error(`${dayLabel}: break times must be in HH:mm format`);
    }

    const bStart = timeToMinutes(br.startTime);
    const bEnd = timeToMinutes(br.endTime);

    if (bStart >= bEnd) {
      throw new Error(`${dayLabel}: break end must be after break start`);
    }
    if (bStart < dayStart || bEnd > dayEnd) {
      throw new Error(`${dayLabel}: break must be within working hours`);
    }
    if (i > 0) {
      const prevEnd = timeToMinutes(sorted[i - 1].endTime);
      if (bStart < prevEnd) {
        throw new Error(`${dayLabel}: breaks cannot overlap`);
      }
    }
  }
}

function validateClinicWorkingHours(workingHours) {
  if (!Array.isArray(workingHours) || workingHours.length === 0) {
    throw new Error('Working hours are required');
  }

  const seenDays = new Set();

  for (const day of workingHours) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
    }
    if (seenDays.has(day.dayOfWeek)) {
      throw new Error(`Duplicate working hours entry for day ${day.dayOfWeek}`);
    }
    seenDays.add(day.dayOfWeek);

    if (!day.isOpen) continue;

    if (!TIME_REGEX.test(day.openTime) || !TIME_REGEX.test(day.closeTime)) {
      throw new Error(`Day ${day.dayOfWeek}: times must be in HH:mm format`);
    }

    const start = timeToMinutes(day.openTime);
    const end = timeToMinutes(day.closeTime);

    if (start >= end) {
      throw new Error(`Day ${day.dayOfWeek}: close time must be after open time`);
    }

    validateBreaks(day.breaks, start, end, `Day ${day.dayOfWeek}`);
  }
}

const DEFAULT_CLINIC_WORKING_HOURS = [
  { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '17:00', breaks: [] },
  { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 6, isOpen: false, openTime: '09:00', closeTime: '17:00', breaks: [] },
];

module.exports = {
  validateClinicWorkingHours,
  DEFAULT_CLINIC_WORKING_HOURS,
};
