const { BadRequestError } = require('../../core/errors/AppError');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const usersRepository = require('../users/users.repository');
const prescriptionsRepository = require('./prescriptions.repository');

const toPrescriptionResponse = (prescription) => ({
  id: prescription._id.toString(),
  doctorId: prescription.doctorId?._id?.toString() || prescription.doctorId?.toString(),
  doctorName: prescription.doctorId?.fullName || prescription.doctorId?.title || '',
  patientId: prescription.patientId ? prescription.patientId.toString() : null,
  patientName: prescription.patientName,
  diagnosis: prescription.diagnosis,
  medicines: (prescription.medicines || []).map((item) => ({
    name: item.name,
    dosage: item.dosage || '',
    duration: item.duration || '',
  })),
  notes: prescription.notes || '',
  createdAt: prescription.createdAt?.toISOString(),
  updatedAt: prescription.updatedAt?.toISOString(),
});

const listForDoctor = async (doctor, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, ['createdAt', 'patientName']);

  const [prescriptions, total] = await Promise.all([
    prescriptionsRepository.findByDoctorId(doctor._id, { skip, limit, sort }),
    prescriptionsRepository.countByDoctorId(doctor._id),
  ]);

  return {
    prescriptions: prescriptions.map(toPrescriptionResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const createForDoctor = async (doctor, payload) => {
  let patientId = null;

  if (payload.patientId) {
    if (!prescriptionsRepository.isValidObjectId(payload.patientId)) {
      throw new BadRequestError('Invalid patient id');
    }

    const patient = await usersRepository.findById(payload.patientId);
    if (!patient) {
      throw new BadRequestError('Patient not found');
    }

    patientId = patient._id;
  }

  const prescription = await prescriptionsRepository.create({
    doctorId: doctor._id,
    patientId,
    patientName: payload.patientName.trim(),
    diagnosis: payload.diagnosis.trim(),
    medicines: payload.medicines.map((item) => ({
      name: item.name.trim(),
      dosage: item.dosage?.trim() || '',
      duration: item.duration?.trim() || '',
    })),
    notes: payload.notes?.trim() || '',
  });

  return { prescription: toPrescriptionResponse(prescription) };
};

const listForPatient = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, ['createdAt', 'patientName']);

  const [prescriptions, total] = await Promise.all([
    prescriptionsRepository.findByPatientId(user.id, { skip, limit, sort }),
    prescriptionsRepository.countByPatientId(user.id),
  ]);

  return {
    prescriptions: prescriptions.map(toPrescriptionResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

module.exports = {
  listForDoctor,
  listForPatient,
  createForDoctor,
  toPrescriptionResponse,
};
