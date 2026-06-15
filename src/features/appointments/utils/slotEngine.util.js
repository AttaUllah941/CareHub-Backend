/**
 * Appointment Slot Engine
 * Generates bookable slots from recurring weekly schedules, prevents overlaps,
 * validates availability (doctor + optional clinic), and projects future dates.
 */

const {
  TIME_REGEX,
  timeToMinutes,
  minutesToTime,
  validateWeeklySchedule,
  validateVacationDates,
  isDateOnVacation,
} = require('../../doctor-availability/utils/availabilityConflict.util');

const DEFAULT_RECURRING_HORIZON_DAYS = 30;
const MAX_RECURRING_HORIZON_DAYS = 90;

function normalizeDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(date) {
  const d = normalizeDate(date);
  return d ? d.toISOString().slice(0, 10) : null;
}

function timeRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function slotsOverlap(slotA, slotB) {
  return timeRangesOverlap(
    timeToMinutes(slotA.startTime),
    timeToMinutes(slotA.endTime),
    timeToMinutes(slotB.startTime),
    timeToMinutes(slotB.endTime),
  );
}

function slotOverlapsBooking(slot, booking) {
  return slotsOverlap(slot, { startTime: booking.startTime, endTime: booking.endTime });
}

function overlapsBreaks(slot, breaks) {
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);

  return (breaks ?? []).some((br) => {
    const bStart = timeToMinutes(br.startTime);
    const bEnd = timeToMinutes(br.endTime);
    return timeRangesOverlap(slotStart, slotEnd, bStart, bEnd);
  });
}

function generateSlotsFromWindow({ startTime, endTime, breaks = [], slotDurationMinutes }) {
  if (!slotDurationMinutes || slotDurationMinutes < 1) return [];

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots = [];

  for (let cursor = start; cursor + slotDurationMinutes <= end; cursor += slotDurationMinutes) {
    const slot = {
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + slotDurationMinutes),
    };

    if (!overlapsBreaks(slot, breaks)) {
      slots.push(slot);
    }
  }

  return slots;
}

function getDaySchedule(weeklySchedule, dayOfWeek) {
  return (weeklySchedule ?? []).find((d) => d.dayOfWeek === dayOfWeek && d.isAvailable);
}

function getClinicDaySchedule(workingHours, dayOfWeek) {
  return (workingHours ?? []).find((d) => d.dayOfWeek === dayOfWeek && d.isOpen);
}

function intersectSlotWithClinic(slot, clinicDay) {
  if (!clinicDay?.isOpen) return null;

  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);
  const open = timeToMinutes(clinicDay.openTime);
  const close = timeToMinutes(clinicDay.closeTime);

  if (slotStart < open || slotEnd > close) return null;
  if (overlapsBreaks(slot, clinicDay.breaks)) return null;

  return slot;
}

function filterSlotsByClinic(slots, clinic) {
  if (!clinic?.workingHours?.length) return slots;

  return slots
    .map((slot) => {
      const dayOfWeek = null; // caller must pass clinic day - refactor
      return slot;
    });
}

function filterSlotsByClinicForDate(slots, clinic, date) {
  if (!clinic?.workingHours?.length) return slots;

  const dayOfWeek = normalizeDate(date).getDay();
  const clinicDay = getClinicDaySchedule(clinic.workingHours, dayOfWeek);
  if (!clinicDay) return [];

  return slots
    .map((slot) => intersectSlotWithClinic(slot, clinicDay))
    .filter(Boolean);
}

function generateSlotsForDate(availability, dateInput, options = {}) {
  const date = normalizeDate(dateInput);
  if (!date) return [];

  if (!availability?.isActive && options.requireActive !== false) return [];
  if (isDateOnVacation(date, availability?.vacationDates)) return [];

  const daySchedule = getDaySchedule(availability?.weeklySchedule, date.getDay());
  if (!daySchedule) return [];

  const slots = generateSlotsFromWindow({
    startTime: daySchedule.startTime,
    endTime: daySchedule.endTime,
    breaks: daySchedule.breaks,
    slotDurationMinutes: availability.slotDurationMinutes,
  });

  if (options.clinic) {
    return filterSlotsByClinicForDate(slots, options.clinic, date);
  }

  return slots;
}

function filterPastSlots(slots, dateInput, now = new Date()) {
  const target = normalizeDate(dateInput);
  if (!target) return [];

  const today = normalizeDate(now);
  if (target.getTime() > today.getTime()) return slots;
  if (target.getTime() < today.getTime()) return [];

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => timeToMinutes(slot.startTime) > nowMinutes);
}

function subtractBookedSlots(slots, bookedAppointments) {
  if (!bookedAppointments?.length) return slots;
  return slots.filter((slot) => !bookedAppointments.some((booking) => slotOverlapsBooking(slot, booking)));
}

function getAvailableSlotsForDate({ availability, date, bookedAppointments = [], clinic = null, now = new Date() }) {
  const generated = generateSlotsForDate(availability, date, { clinic });
  const future = filterPastSlots(generated, date, now);
  const available = subtractBookedSlots(future, bookedAppointments);

  return {
    date: toDateKey(date),
    slots: available,
    slotDurationMinutes: availability?.slotDurationMinutes ?? 30,
    totalGenerated: generated.length,
    bookedCount: bookedAppointments.length,
  };
}

function iterateDates(fromInput, toInput, maxDays = DEFAULT_RECURRING_HORIZON_DAYS) {
  const from = normalizeDate(fromInput);
  const to = normalizeDate(toInput);
  if (!from || !to || from > to) return [];

  const dates = [];
  const cursor = new Date(from);
  const limit = Math.min(maxDays, MAX_RECURRING_HORIZON_DAYS);

  while (cursor <= to && dates.length < limit) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Projects recurring weekly schedule across a date range (future recurring availability).
 */
function generateRecurringSlots({
  availability,
  fromDate,
  toDate,
  bookedAppointmentsByDate = {},
  clinic = null,
  maxDays = DEFAULT_RECURRING_HORIZON_DAYS,
  now = new Date(),
}) {
  const dates = iterateDates(fromDate, toDate, maxDays);
  const schedule = [];

  for (const date of dates) {
    const dateKey = toDateKey(date);
    const booked = bookedAppointmentsByDate[dateKey] ?? bookedAppointmentsByDate[date.toISOString()] ?? [];
    const dayResult = getAvailableSlotsForDate({
      availability,
      date,
      bookedAppointments: booked,
      clinic,
      now,
    });

    schedule.push({
      ...dayResult,
      dayOfWeek: date.getDay(),
      isRecurring: true,
    });
  }

  const totalAvailable = schedule.reduce((sum, day) => sum + day.slots.length, 0);

  return {
    fromDate: toDateKey(fromDate),
    toDate: toDateKey(toDate),
    slotDurationMinutes: availability?.slotDurationMinutes ?? 30,
    days: schedule,
    totalDays: schedule.length,
    totalAvailableSlots: totalAvailable,
  };
}

function validateAvailabilityConfig(availability) {
  if (!availability) {
    return { valid: false, errors: ['Availability configuration is missing'] };
  }

  if (!availability.isActive) {
    return { valid: false, errors: ['Availability is inactive'] };
  }

  const errors = [];

  try {
    validateWeeklySchedule(availability.weeklySchedule, availability.slotDurationMinutes ?? 30);
  } catch (err) {
    errors.push(err.message);
  }

  try {
    validateVacationDates(availability.vacationDates);
  } catch (err) {
    errors.push(err.message);
  }

  if (!availability.slotDurationMinutes || availability.slotDurationMinutes < 5) {
    errors.push('Slot duration must be at least 5 minutes');
  }

  return { valid: errors.length === 0, errors };
}

function validateSlotBooking({
  availability,
  date,
  startTime,
  endTime,
  bookedAppointments = [],
  clinic = null,
  excludeBooking = null,
  now = new Date(),
}) {
  const configCheck = validateAvailabilityConfig(availability);
  if (!configCheck.valid) {
    return { valid: false, errors: configCheck.errors };
  }

  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return { valid: false, errors: ['Invalid appointment date'] };
  }

  const today = normalizeDate(now);
  if (normalizedDate < today) {
    return { valid: false, errors: ['Cannot book appointments in the past'] };
  }

  if (!TIME_REGEX.test(startTime)) {
    return { valid: false, errors: ['Invalid start time format'] };
  }

  const requestedSlot = {
    startTime,
    endTime: endTime || minutesToTime(timeToMinutes(startTime) + (availability.slotDurationMinutes ?? 30)),
  };

  const available = getAvailableSlotsForDate({
    availability,
    date: normalizedDate,
    bookedAppointments: bookedAppointments.filter(
      (b) => !excludeBooking || b._id?.toString() !== excludeBooking || b.id !== excludeBooking,
    ),
    clinic,
    now,
  });

  const matchingSlot = available.slots.find((s) => s.startTime === requestedSlot.startTime);

  if (!matchingSlot) {
    const generated = generateSlotsForDate(availability, normalizedDate, { clinic });
    const inSchedule = generated.some((s) => s.startTime === startTime);

    if (!inSchedule) {
      return { valid: false, errors: ['Selected time is outside doctor availability or clinic hours'] };
    }

    if (isDateOnVacation(normalizedDate, availability.vacationDates)) {
      return { valid: false, errors: ['Doctor is on vacation for this date'] };
    }

    const hasOverlap = bookedAppointments.some(
      (b) =>
        (!excludeBooking || b._id?.toString() !== excludeBooking) &&
        slotOverlapsBooking(requestedSlot, b),
    );

    if (hasOverlap) {
      return { valid: false, errors: ['Selected slot overlaps with an existing booking'] };
    }

    if (filterPastSlots([requestedSlot], normalizedDate, now).length === 0) {
      return { valid: false, errors: ['Selected slot is in the past'] };
    }

    return { valid: false, errors: ['Selected slot is not available'] };
  }

  return {
    valid: true,
    slot: matchingSlot,
    appointmentDate: normalizedDate,
    slotDurationMinutes: availability.slotDurationMinutes,
  };
}

function groupBookingsByDate(bookedAppointments) {
  const map = {};
  for (const booking of bookedAppointments ?? []) {
    const key = toDateKey(booking.appointmentDate);
    if (!key) continue;
    if (!map[key]) map[key] = [];
    map[key].push(booking);
  }
  return map;
}

module.exports = {
  DEFAULT_RECURRING_HORIZON_DAYS,
  MAX_RECURRING_HORIZON_DAYS,
  normalizeDate,
  toDateKey,
  timeRangesOverlap,
  slotsOverlap,
  slotOverlapsBooking,
  generateSlotsFromWindow,
  generateSlotsForDate,
  filterPastSlots,
  subtractBookedSlots,
  getAvailableSlotsForDate,
  iterateDates,
  generateRecurringSlots,
  validateAvailabilityConfig,
  validateSlotBooking,
  groupBookingsByDate,
  filterSlotsByClinicForDate,
};
