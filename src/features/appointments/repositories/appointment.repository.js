const Appointment = require('../models/appointment.model');
const { ACTIVE_APPOINTMENT_STATUSES } = require('../../../shared/enums/appointmentStatus.enum');
const { slotOverlapsBooking } = require('../utils/slotEngine.util');

const POPULATE_FIELDS = [
  {
    path: 'patientProfileId',
    select: 'userId gender city',
    populate: { path: 'userId', select: 'firstName lastName email phone' },
  },
  {
    path: 'doctorProfileId',
    select: 'userId title consultationFee currency specialtyIds',
    populate: [
      { path: 'userId', select: 'firstName lastName email phone' },
      { path: 'specialtyIds', select: 'name slug' },
    ],
  },
  { path: 'clinicId', select: 'name city address phone' },
  { path: 'familyMemberId', select: 'firstName lastName relationship' },
  { path: 'bookedByUserId', select: 'firstName lastName email' },
  { path: 'cancelledBy', select: 'firstName lastName' },
];

class AppointmentRepository {
  async create(data) {
    const appointment = await Appointment.create(data);
    return appointment.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Appointment.findById(id).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Appointment.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findBookedSlots(doctorProfileId, appointmentDate) {
    return Appointment.find({
      doctorProfileId,
      appointmentDate,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
      isActive: true,
    })
      .select('startTime endTime status appointmentDate')
      .lean();
  }

  async findBookedSlotsInRange(doctorProfileId, fromDate, toDate) {
    return Appointment.find({
      doctorProfileId,
      appointmentDate: { $gte: fromDate, $lte: toDate },
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
      isActive: true,
    })
      .select('startTime endTime status appointmentDate')
      .lean();
  }

  async findConflict(doctorProfileId, appointmentDate, startTime, endTime, excludeId = null) {
    const booked = await this.findBookedSlots(doctorProfileId, appointmentDate);
    const candidate = { startTime, endTime };

    return booked.find((b) => {
      if (excludeId && b._id?.toString() === excludeId) return false;
      return slotOverlapsBooking(candidate, b);
    }) ?? null;
  }

  async findAll({
    page = 1,
    limit = 10,
    patientProfileId,
    doctorProfileId,
    clinicId,
    status,
    fromDate,
    toDate,
    search,
    sortBy = 'appointmentDate',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };
    if (patientProfileId) filter.patientProfileId = patientProfileId;
    if (doctorProfileId) filter.doctorProfileId = doctorProfileId;
    if (clinicId) filter.clinicId = clinicId;
    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.appointmentDate = {};
      if (fromDate) filter.appointmentDate.$gte = fromDate;
      if (toDate) filter.appointmentDate.$lte = toDate;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ reason: regex }, { notes: regex }];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [appointments, total] = await Promise.all([
      Appointment.find(filter).populate(POPULATE_FIELDS).sort(sort).skip(skip).limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return {
      appointments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findByPatientProfileId(patientProfileId, { status, fromDate } = {}) {
    const filter = { patientProfileId, isActive: true };
    if (status) filter.status = status;
    if (fromDate) filter.appointmentDate = { $gte: fromDate };

    return Appointment.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ appointmentDate: -1, startTime: -1 });
  }

  async findByDoctorProfileId(doctorProfileId, { status, fromDate } = {}) {
    const filter = { doctorProfileId, isActive: true };
    if (status) filter.status = status;
    if (fromDate) filter.appointmentDate = { $gte: fromDate };

    return Appointment.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ appointmentDate: 1, startTime: 1 });
  }

  async existsBetweenProfiles(doctorProfileId, patientProfileId) {
    const count = await Appointment.countDocuments({
      doctorProfileId,
      patientProfileId,
      isActive: true,
      status: { $ne: 'CANCELLED' },
    });
    return count > 0;
  }
}

module.exports = AppointmentRepository;
