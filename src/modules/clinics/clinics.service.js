const AppError = require('../../shared/errors/AppError');
const slugify = require('../../shared/utils/slugify');
const doctorsRepository = require('../doctors/doctors.repository');
const clinicsRepository = require('./clinics.repository');

const toClinicResponse = (clinic) => ({
  id: clinic._id.toString(),
  doctorId: clinic.doctorId.toString(),
  name: clinic.name,
  address: clinic.address,
  city: clinic.city,
  citySlug: clinic.citySlug,
  location: clinic.location?.coordinates
    ? {
        type: 'Point',
        coordinates: clinic.location.coordinates,
      }
    : undefined,
  consultationFee: clinic.consultationFee,
  isActive: clinic.isActive,
  createdAt: clinic.createdAt?.toISOString(),
  updatedAt: clinic.updatedAt?.toISOString(),
});

const listByDoctorId = async (doctorId) => {
  if (!clinicsRepository.isValidObjectId(doctorId)) {
    throw new AppError('Doctor not found', 404);
  }

  const doctor = await doctorsRepository.findById(doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const clinics = await clinicsRepository.findActiveByDoctorId(doctorId);

  return {
    clinics: clinics.map(toClinicResponse),
  };
};

const createForDoctor = async (doctor, payload) => {
  const clinic = await clinicsRepository.create({
    doctorId: doctor._id,
    name: payload.name,
    address: payload.address,
    city: payload.city,
    citySlug: slugify(payload.city),
    ...(payload.location
      ? {
          location: {
            type: 'Point',
            coordinates: payload.location.coordinates,
          },
        }
      : {}),
    consultationFee: payload.consultationFee,
    isActive: true,
  });

  return { clinic: toClinicResponse(clinic) };
};

const updateClinic = async (clinic, payload) => {
  const updates = { ...payload };

  if (payload.city) {
    updates.citySlug = slugify(payload.city);
  }

  if (payload.location) {
    updates.location = {
      type: 'Point',
      coordinates: payload.location.coordinates,
    };
  }

  const updated = await clinicsRepository.updateById(clinic._id, updates);
  return { clinic: toClinicResponse(updated) };
};

const deleteClinic = async (clinic) => {
  if (!clinic.isActive) {
    throw new AppError('Clinic is already inactive', 400);
  }

  const updated = await clinicsRepository.softDeleteById(clinic._id);
  return { clinic: toClinicResponse(updated) };
};

const listForDoctor = async (doctor) => {
  const clinics = await clinicsRepository.findActiveByDoctorId(doctor._id);
  return { clinics: clinics.map(toClinicResponse) };
};

module.exports = {
  toClinicResponse,
  listByDoctorId,
  listForDoctor,
  createForDoctor,
  updateClinic,
  deleteClinic,
};
