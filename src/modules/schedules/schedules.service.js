const AppError = require('../../shared/errors/AppError');
const doctorContextService = require('../../shared/services/doctorContext.service');
const {
  generateTimeSlots,
  normalizeDateString,
  slotToInstant,
} = require('../../shared/utils/timeSlots.util');
const { DEFAULT_TIME_SLOTS } = require('../doctors/doctors.public.mapper');
const doctorsRepository = require('../doctors/doctors.repository');
const appointmentsRepository = require('../appointments/appointments.repository');
const clinicsRepository = require('../clinics/clinics.repository');
const schedulesRepository = require('./schedules.repository');

const toScheduleResponse = (schedule) => ({
  id: schedule._id.toString(),
  doctorId: schedule.doctorId.toString(),
  clinicId: schedule.clinicId ? schedule.clinicId.toString() : null,
  dayOfWeek: schedule.dayOfWeek ?? null,
  specificDate: schedule.specificDate ?? null,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  slotDurationMinutes: schedule.slotDurationMinutes,
  consultationType: schedule.consultationType,
  isActive: schedule.isActive,
  createdAt: schedule.createdAt?.toISOString(),
  updatedAt: schedule.updatedAt?.toISOString(),
});

/**
 * Slots for a doctor on a given date.
 * - Uses the doctor's configured schedules; falls back to the platform default slot list
 *   (the same list the booking modals offer) when none are configured.
 * - Marks slots that are already booked (pending/confirmed) or in the past as unavailable.
 */
const getAvailability = async (doctorId, dateQuery) => {
  if (!schedulesRepository.isValidObjectId(doctorId)) {
    throw new AppError('Doctor not found', 404);
  }

  const doctor = await doctorsRepository.findVerifiedLeanById(doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const dateString = normalizeDateString(dateQuery);
  if (!dateString) {
    throw new AppError('Invalid date. Use YYYY-MM-DD format', 422);
  }

  const dayOfWeek = new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
  const schedules = await schedulesRepository.findActiveForDoctorAndDate(
    doctor._id,
    dayOfWeek,
    dateString,
  );

  const baseSlots = schedules.length
    ? schedules.flatMap((schedule) =>
        generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDurationMinutes).map(
          (timeSlot) => ({
            timeSlot,
            consultationType: schedule.consultationType,
            clinicId: schedule.clinicId ? schedule.clinicId.toString() : null,
          }),
        ),
      )
    : DEFAULT_TIME_SLOTS.map((timeSlot) => ({
        timeSlot,
        consultationType: 'any',
        clinicId: null,
      }));

  const dayStart = slotToInstant(dateString, '12:00 AM');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const booked = await appointmentsRepository.findActiveScheduledBetween(
    doctor._id,
    dayStart,
    dayEnd,
  );
  const bookedInstants = new Set(booked.map((appointment) => appointment.scheduledAt.toISOString()));
  const now = new Date();

  const seen = new Set();
  const slots = [];
  for (const slot of baseSlots) {
    const instant = slotToInstant(dateString, slot.timeSlot);
    if (!instant) continue;

    const key = `${slot.timeSlot}|${slot.consultationType}`;
    if (seen.has(key)) continue;
    seen.add(key);

    slots.push({
      ...slot,
      scheduledAt: instant.toISOString(),
      available: instant > now && !bookedInstants.has(instant.toISOString()),
    });
  }
  slots.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const timeSlots = [
    ...new Set(slots.filter((slot) => slot.available).map((slot) => slot.timeSlot)),
  ];

  return {
    doctorId: doctor._id.toString(),
    date: dateString,
    source: schedules.length ? 'schedule' : 'default',
    timeSlots,
    slots,
  };
};

const createSchedule = async (doctor, payload) => {
  if (payload.consultationType === 'clinic') {
    const clinic = await clinicsRepository.findById(payload.clinicId);

    if (!clinic || !clinic.isActive) {
      throw new AppError('Clinic not found', 404);
    }

    doctorContextService.assertDoctorOwnsResource(doctor, clinic.doctorId, 'Clinic not found');
  }

  const schedule = await schedulesRepository.create({
    doctorId: doctor._id,
    clinicId: payload.consultationType === 'clinic' ? payload.clinicId : null,
    dayOfWeek: payload.specificDate != null ? undefined : payload.dayOfWeek,
    specificDate: payload.specificDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    slotDurationMinutes: payload.slotDurationMinutes ?? 30,
    consultationType: payload.consultationType,
    isActive: payload.isActive ?? true,
  });

  return { schedule: toScheduleResponse(schedule) };
};

const listMySchedules = async (doctor) => {
  const schedules = await schedulesRepository.findByDoctorId(doctor._id);

  return {
    schedules: schedules.filter((schedule) => schedule.isActive).map(toScheduleResponse),
  };
};

const deactivateSchedule = async (doctor, scheduleId) => {
  if (!schedulesRepository.isValidObjectId(scheduleId)) {
    throw new AppError('Schedule not found', 404);
  }

  const schedule = await schedulesRepository.findById(scheduleId);
  if (!schedule || schedule.doctorId.toString() !== doctor._id.toString()) {
    throw new AppError('Schedule not found', 404);
  }

  const updated = await schedulesRepository.updateById(scheduleId, { isActive: false });
  return { schedule: toScheduleResponse(updated) };
};

module.exports = {
  getAvailability,
  createSchedule,
  listMySchedules,
  deactivateSchedule,
  toScheduleResponse,
};
