const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const {
  validateWeeklySchedule,
  validateVacationDates,
  generateSlotsForDate,
  DEFAULT_WEEKLY_SCHEDULE,
} = require('../utils/availabilityConflict.util');

class DoctorAvailabilityService {
  constructor(doctorAvailabilityRepository, doctorProfileRepository) {
    this.doctorAvailabilityRepository = doctorAvailabilityRepository;
    this.doctorProfileRepository = doctorProfileRepository;
  }

  _format(availability) {
    return availability.toJSON();
  }

  _validateAvailabilityData(data) {
    const slotDuration = data.slotDurationMinutes ?? 30;
    try {
      validateWeeklySchedule(data.weeklySchedule, slotDuration);
      validateVacationDates(data.vacationDates);
    } catch (err) {
      throw new BadRequestError(err.message);
    }
  }

  async _resolveDoctorProfile(doctorProfileId, requestedBy) {
    const profile = await this.doctorProfileRepository.findById(doctorProfileId);
    if (!profile) throw new NotFoundError('Doctor profile not found');

    const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy?.role);
    const userId = profile.userId?._id?.toString() || profile.userId?.toString();
    const isOwner = requestedBy?.role === UserRole.DOCTOR && userId === requestedBy.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return profile;
  }

  async _resolveDoctorProfileByUser(userId) {
    const profile = await this.doctorProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Doctor profile not found');
    return profile;
  }

  async getMyAvailability(requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access this resource');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    let availability = await this.doctorAvailabilityRepository.findByDoctorProfileId(profile._id);

    if (!availability) {
      availability = await this.doctorAvailabilityRepository.create({
        doctorProfileId: profile._id,
        slotDurationMinutes: 30,
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
        vacationDates: [],
      });
    }

    return this._format(availability);
  }

  async getAvailabilityByDoctorProfileId(doctorProfileId, requestedBy) {
    await this._resolveDoctorProfile(doctorProfileId, requestedBy);
    const availability = await this.doctorAvailabilityRepository.findByDoctorProfileId(doctorProfileId);
    if (!availability) throw new NotFoundError('Availability not configured');
    return this._format(availability);
  }

  async updateMyAvailability(data, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can update availability');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    this._validateAvailabilityData(data);

    const availability = await this.doctorAvailabilityRepository.upsertByDoctorProfileId(
      profile._id,
      data,
    );
    return this._format(availability);
  }

  async updateAvailabilityByDoctorProfileId(doctorProfileId, data, requestedBy) {
    await this._resolveDoctorProfile(doctorProfileId, requestedBy);
    if (![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy?.role)) {
      throw new ForbiddenError('Only admins can update doctor availability');
    }

    this._validateAvailabilityData(data);

    const availability = await this.doctorAvailabilityRepository.upsertByDoctorProfileId(
      doctorProfileId,
      data,
    );
    return this._format(availability);
  }

  async getSlots(doctorProfileId, date, requestedBy) {
    await this._resolveDoctorProfile(doctorProfileId, requestedBy);
    const availability = await this.doctorAvailabilityRepository.findByDoctorProfileId(doctorProfileId);
    if (!availability) throw new NotFoundError('Availability not configured');

    const slots = generateSlotsForDate(availability.toJSON(), date);
    return { date, slots, slotDurationMinutes: availability.slotDurationMinutes };
  }

  async getMySlots(date, requestedBy) {
    if (!requestedBy || requestedBy.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only doctors can access slots');
    }

    const profile = await this._resolveDoctorProfileByUser(requestedBy.id);
    let availability = await this.doctorAvailabilityRepository.findByDoctorProfileId(profile._id);

    if (!availability) {
      availability = await this.doctorAvailabilityRepository.create({
        doctorProfileId: profile._id,
        slotDurationMinutes: 30,
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
        vacationDates: [],
      });
    }

    const slots = generateSlotsForDate(availability.toJSON(), date);
    return { date, slots, slotDurationMinutes: availability.slotDurationMinutes };
  }
}

module.exports = DoctorAvailabilityService;
