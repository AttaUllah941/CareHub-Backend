const {
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const {
  DEFAULT_RECURRING_HORIZON_DAYS,
  MAX_RECURRING_HORIZON_DAYS,
  getAvailableSlotsForDate,
  generateRecurringSlots,
  validateSlotBooking,
  validateAvailabilityConfig,
  normalizeDate,
  groupBookingsByDate,
  slotOverlapsBooking,
} = require('../utils/slotEngine.util');

class SlotEngineService {
  constructor(appointmentRepository, doctorAvailabilityRepository, clinicRepository) {
    this.appointmentRepository = appointmentRepository;
    this.doctorAvailabilityRepository = doctorAvailabilityRepository;
    this.clinicRepository = clinicRepository;
  }

  async _loadAvailability(doctorProfileId) {
    const availability = await this.doctorAvailabilityRepository.findByDoctorProfileId(doctorProfileId);
    if (!availability) throw new NotFoundError('Availability not configured');
    return availability.toJSON ? availability.toJSON() : availability;
  }

  async _loadClinic(clinicId) {
    if (!clinicId) return null;
    const clinic = await this.clinicRepository.findById(clinicId);
    if (!clinic) throw new NotFoundError('Clinic not found');
    return clinic.toJSON ? clinic.toJSON() : clinic;
  }

  async getSlotsForDate(doctorProfileId, date, { clinicId = null } = {}) {
    const [availability, clinic] = await Promise.all([
      this._loadAvailability(doctorProfileId),
      this._loadClinic(clinicId),
    ]);

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) throw new BadRequestError('Invalid date');

    const booked = await this.appointmentRepository.findBookedSlots(doctorProfileId, normalizedDate);

    return getAvailableSlotsForDate({
      availability,
      date: normalizedDate,
      bookedAppointments: booked,
      clinic,
    });
  }

  async getRecurringSlots(doctorProfileId, fromDate, toDate, { clinicId = null, maxDays } = {}) {
    const [availability, clinic] = await Promise.all([
      this._loadAvailability(doctorProfileId),
      this._loadClinic(clinicId),
    ]);

    const from = normalizeDate(fromDate);
    const to = normalizeDate(toDate);
    if (!from || !to) throw new BadRequestError('Invalid date range');
    if (from > to) throw new BadRequestError('fromDate must be on or before toDate');

    const horizon = Math.min(maxDays ?? DEFAULT_RECURRING_HORIZON_DAYS, MAX_RECURRING_HORIZON_DAYS);
    const bookedInRange = await this.appointmentRepository.findBookedSlotsInRange(
      doctorProfileId,
      from,
      to,
    );

    return generateRecurringSlots({
      availability,
      fromDate: from,
      toDate: to,
      bookedAppointmentsByDate: groupBookingsByDate(bookedInRange),
      clinic,
      maxDays: horizon,
    });
  }

  async validateAndResolveSlot({
    doctorProfileId,
    appointmentDate,
    startTime,
    clinicId = null,
    excludeId = null,
  }) {
    const [availability, clinic] = await Promise.all([
      this._loadAvailability(doctorProfileId),
      this._loadClinic(clinicId),
    ]);

    if (!availability.isActive) {
      throw new BadRequestError('Doctor availability is inactive');
    }

    const configCheck = validateAvailabilityConfig(availability);
    if (!configCheck.valid) {
      throw new BadRequestError(configCheck.errors.join('; '));
    }

    const normalizedDate = normalizeDate(appointmentDate);
    if (!normalizedDate) throw new BadRequestError('Invalid appointment date');

    const booked = await this.appointmentRepository.findBookedSlots(doctorProfileId, normalizedDate);

    const validation = validateSlotBooking({
      availability,
      date: normalizedDate,
      startTime,
      bookedAppointments: booked,
      clinic,
      excludeBooking: excludeId,
    });

    if (!validation.valid) {
      throw new ConflictError(validation.errors.join('; '));
    }

    const overlap = booked.find(
      (b) =>
        (!excludeId || b._id?.toString() !== excludeId) &&
        slotOverlapsBooking(validation.slot, b),
    );

    if (overlap) {
      throw new ConflictError('This slot overlaps with an existing booking');
    }

    return {
      appointmentDate: validation.appointmentDate,
      startTime: validation.slot.startTime,
      endTime: validation.slot.endTime,
      slotDurationMinutes: validation.slotDurationMinutes,
    };
  }
}

module.exports = SlotEngineService;
