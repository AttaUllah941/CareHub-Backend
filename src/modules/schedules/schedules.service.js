const AppError = require('../../shared/errors/AppError');
const doctorContextService = require('../../shared/services/doctorContext.service');
const { generateTimeSlots, normalizeDateString } = require('../../shared/utils/timeSlots.util');
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

const getAvailability = async (doctorId, dateQuery) => {
  if (!schedulesRepository.isValidObjectId(doctorId)) {
    throw new AppError('Doctor not found', 404);
  }

  const doctor = await doctorsRepository.findById(doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const dateString = normalizeDateString(dateQuery);
  if (!dateString) {
    throw new AppError('Invalid date. Use YYYY-MM-DD format', 422);
  }

  const dayOfWeek = new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
  const schedules = await schedulesRepository.findActiveForDoctorAndDate(
    doctorId,
    dayOfWeek,
    dateString,
  );

  const generatedSlots = schedules.flatMap((schedule) =>
    generateTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDurationMinutes).map(
      (timeSlot) => ({
        timeSlot,
        consultationType: schedule.consultationType,
        clinicId: schedule.clinicId ? schedule.clinicId.toString() : null,
      }),
    ),
  );

  const bookedAppointments = await appointmentsRepository.findBookedSlotsByDoctorAndDate(
    doctorId,
    dateString,
  );
  const bookedSet = new Set(bookedAppointments.map((appointment) => appointment.timeSlot));

  const availableSlots = generatedSlots.filter((slot) => !bookedSet.has(slot.timeSlot));

  const uniqueTimeSlots = [...new Set(availableSlots.map((slot) => slot.timeSlot))].sort(
    (a, b) => a.localeCompare(b),
  );

  return {
    doctorId,
    date: dateString,
    timeSlots: uniqueTimeSlots,
    slots: availableSlots,
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
    schedules: schedules.map(toScheduleResponse),
  };
};

module.exports = {
  getAvailability,
  createSchedule,
  listMySchedules,
  toScheduleResponse,
};
