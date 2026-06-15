/**
 * Time helpers and conflict detection for doctor availability.
 */

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function assertValidTime(time, label) {
  if (!TIME_REGEX.test(time)) {
    throw new Error(`${label} must be in HH:mm format`);
  }
}

function validateBreaks(breaks, dayStart, dayEnd, dayLabel) {
  if (!breaks?.length) return;

  const sorted = [...breaks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (let i = 0; i < sorted.length; i += 1) {
    const br = sorted[i];
    assertValidTime(br.startTime, `${dayLabel} break start`);
    assertValidTime(br.endTime, `${dayLabel} break end`);

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

function validateWeeklySchedule(weeklySchedule, slotDurationMinutes) {
  if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
    throw new Error('Weekly schedule is required');
  }

  const seenDays = new Set();

  for (const day of weeklySchedule) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
    }
    if (seenDays.has(day.dayOfWeek)) {
      throw new Error(`Duplicate schedule entry for day ${day.dayOfWeek}`);
    }
    seenDays.add(day.dayOfWeek);

    if (!day.isAvailable) continue;

    assertValidTime(day.startTime, `Day ${day.dayOfWeek} start`);
    assertValidTime(day.endTime, `Day ${day.dayOfWeek} end`);

    const start = timeToMinutes(day.startTime);
    const end = timeToMinutes(day.endTime);

    if (start >= end) {
      throw new Error(`Day ${day.dayOfWeek}: end time must be after start time`);
    }

    validateBreaks(day.breaks, start, end, `Day ${day.dayOfWeek}`);

    const breakMinutes = (day.breaks ?? []).reduce(
      (sum, br) => sum + (timeToMinutes(br.endTime) - timeToMinutes(br.startTime)),
      0,
    );
    const available = end - start - breakMinutes;

    if (available < slotDurationMinutes) {
      throw new Error(
        `Day ${day.dayOfWeek}: slot duration does not fit in available time after breaks`,
      );
    }
  }
}

function validateVacationDates(vacationDates) {
  if (!vacationDates?.length) return;

  const sorted = [...vacationDates].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  for (let i = 0; i < sorted.length; i += 1) {
    const v = sorted[i];
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start > end) {
      throw new Error('Vacation end date must be on or after start date');
    }

    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].endDate);
      prevEnd.setHours(0, 0, 0, 0);
      if (start <= prevEnd) {
        throw new Error('Vacation date ranges cannot overlap');
      }
    }
  }
}

function isDateOnVacation(date, vacationDates) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return (vacationDates ?? []).some((v) => {
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return target >= start && target <= end;
  });
}

function isInBreak(minutes, breaks) {
  return (breaks ?? []).some((br) => {
    const bStart = timeToMinutes(br.startTime);
    const bEnd = timeToMinutes(br.endTime);
    return minutes >= bStart && minutes < bEnd;
  });
}

function generateSlotsForDate(availability, dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return [];

  if (isDateOnVacation(date, availability.vacationDates)) return [];

  const dayOfWeek = date.getDay();
  const daySchedule = (availability.weeklySchedule ?? []).find(
    (d) => d.dayOfWeek === dayOfWeek && d.isAvailable,
  );

  if (!daySchedule) return [];

  const slotDuration = availability.slotDurationMinutes;
  const start = timeToMinutes(daySchedule.startTime);
  const end = timeToMinutes(daySchedule.endTime);
  const slots = [];

  for (let cursor = start; cursor + slotDuration <= end; cursor += slotDuration) {
    if (!isInBreak(cursor, daySchedule.breaks) && !isInBreak(cursor + slotDuration - 1, daySchedule.breaks)) {
      const overlapsBreak = (daySchedule.breaks ?? []).some((br) => {
        const bStart = timeToMinutes(br.startTime);
        const bEnd = timeToMinutes(br.endTime);
        return cursor < bEnd && cursor + slotDuration > bStart;
      });
      if (!overlapsBreak) {
        slots.push({
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(cursor + slotDuration),
        });
      }
    }
  }

  return slots;
}

const DEFAULT_WEEKLY_SCHEDULE = [
  { dayOfWeek: 0, isAvailable: false, startTime: '09:00', endTime: '17:00', breaks: [] },
  { dayOfWeek: 1, isAvailable: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 2, isAvailable: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 3, isAvailable: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 4, isAvailable: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 5, isAvailable: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
  { dayOfWeek: 6, isAvailable: false, startTime: '09:00', endTime: '17:00', breaks: [] },
];

module.exports = {
  TIME_REGEX,
  timeToMinutes,
  minutesToTime,
  validateWeeklySchedule,
  validateVacationDates,
  isDateOnVacation,
  generateSlotsForDate,
  DEFAULT_WEEKLY_SCHEDULE,
};
