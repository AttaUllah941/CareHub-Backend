const Consultation = require('../models/consultation.model');

const POPULATE_FIELDS = [
  {
    path: 'appointmentId',
    populate: [
      {
        path: 'patientProfileId',
        select: 'userId gender city',
        populate: { path: 'userId', select: 'firstName lastName email phone' },
      },
      {
        path: 'doctorProfileId',
        select: 'userId title specialtyIds',
        populate: { path: 'userId', select: 'firstName lastName email phone' },
      },
      { path: 'clinicId', select: 'name city address phone' },
      { path: 'familyMemberId', select: 'firstName lastName relationship' },
    ],
  },
  { path: 'createdByUserId', select: 'firstName lastName email' },
];

class ConsultationRepository {
  async create(data) {
    const consultation = await Consultation.create(data);
    return consultation.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Consultation.findById(id).populate(POPULATE_FIELDS);
  }

  async findByAppointmentId(appointmentId) {
    return Consultation.findOne({ appointmentId, isActive: true }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Consultation.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return Consultation.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findByPatientProfileId(patientProfileId) {
    return Consultation.find({ isActive: true })
      .populate({
        path: 'appointmentId',
        match: { patientProfileId, isActive: true },
        populate: POPULATE_FIELDS[0].populate,
      })
      .populate({ path: 'createdByUserId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 })
      .then((rows) => rows.filter((r) => r.appointmentId));
  }

  async findByDoctorProfileId(doctorProfileId) {
    return Consultation.find({ isActive: true })
      .populate({
        path: 'appointmentId',
        match: { doctorProfileId, isActive: true },
        populate: POPULATE_FIELDS[0].populate,
      })
      .populate({ path: 'createdByUserId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 })
      .then((rows) => rows.filter((r) => r.appointmentId));
  }

  async findAll({
    page = 1,
    limit = 10,
    patientProfileId,
    doctorProfileId,
    appointmentId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const appointmentFilter = { isActive: true };
    if (patientProfileId) appointmentFilter.patientProfileId = patientProfileId;
    if (doctorProfileId) appointmentFilter.doctorProfileId = doctorProfileId;
    if (appointmentId) appointmentFilter._id = appointmentId;

    const Appointment = require('../../appointments/models/appointment.model');
    const matchingAppointments = await Appointment.find(appointmentFilter).select('_id').lean();
    const appointmentIds = matchingAppointments.map((a) => a._id);

    const filter = { isActive: true };
    if (patientProfileId || doctorProfileId || appointmentId) {
      filter.appointmentId = { $in: appointmentIds };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { diagnosis: regex },
        { observations: regex },
        { doctorNotes: regex },
        { recommendations: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [consultations, total] = await Promise.all([
      Consultation.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE_FIELDS),
      Consultation.countDocuments(filter),
    ]);

    return {
      consultations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = ConsultationRepository;
