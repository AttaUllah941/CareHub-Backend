const Prescription = require('../models/prescription.model');

const CONSULTATION_POPULATE = [
  {
    path: 'appointmentId',
    populate: [
      {
        path: 'patientProfileId',
        select: 'userId gender city dateOfBirth',
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

const POPULATE_FIELDS = [
  {
    path: 'consultationId',
    populate: CONSULTATION_POPULATE,
  },
  { path: 'createdByUserId', select: 'firstName lastName email' },
];

class PrescriptionRepository {
  async create(data) {
    const prescription = await Prescription.create(data);
    return prescription.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return Prescription.findById(id).populate(POPULATE_FIELDS);
  }

  async findByConsultationId(consultationId) {
    return Prescription.findOne({ consultationId, isActive: true }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return Prescription.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async softDeleteById(id) {
    return Prescription.findByIdAndUpdate(id, { isActive: false }, { new: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async findByPatientProfileId(patientProfileId) {
    return Prescription.find({ isActive: true })
      .populate({
        path: 'consultationId',
        populate: CONSULTATION_POPULATE,
      })
      .populate({ path: 'createdByUserId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 })
      .then((rows) =>
        rows.filter((r) => {
          const appt = r.consultationId?.appointmentId;
          const pid = appt?.patientProfileId?._id?.toString() || appt?.patientProfileId?.toString();
          return pid === patientProfileId.toString();
        }),
      );
  }

  async findByDoctorProfileId(doctorProfileId) {
    return Prescription.find({ isActive: true })
      .populate({
        path: 'consultationId',
        populate: CONSULTATION_POPULATE,
      })
      .populate({ path: 'createdByUserId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 })
      .then((rows) =>
        rows.filter((r) => {
          const appt = r.consultationId?.appointmentId;
          const did = appt?.doctorProfileId?._id?.toString() || appt?.doctorProfileId?.toString();
          return did === doctorProfileId.toString();
        }),
      );
  }

  async findAll({
    page = 1,
    limit = 10,
    patientProfileId,
    doctorProfileId,
    consultationId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };
    if (consultationId) filter.consultationId = consultationId;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { notes: regex },
        { 'medicines.name': regex },
        { 'medicines.dosage': regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    let prescriptions = await Prescription.find(filter)
      .sort(sort)
      .populate(POPULATE_FIELDS);

    if (patientProfileId || doctorProfileId) {
      prescriptions = prescriptions.filter((p) => {
        const appt = p.consultationId?.appointmentId;
        if (!appt) return false;
        if (patientProfileId) {
          const pid = appt.patientProfileId?._id?.toString() || appt.patientProfileId?.toString();
          if (pid !== patientProfileId) return false;
        }
        if (doctorProfileId) {
          const did = appt.doctorProfileId?._id?.toString() || appt.doctorProfileId?.toString();
          if (did !== doctorProfileId) return false;
        }
        return true;
      });
    }

    const total = prescriptions.length;
    const paginated = prescriptions.slice(skip, skip + limit);

    return {
      prescriptions: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

module.exports = PrescriptionRepository;
