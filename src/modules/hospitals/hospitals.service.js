const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../../core/errors/AppError');
const { slugify } = require('../../shared/utils/slugify');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const doctorsRepository = require('../doctors/doctors.repository');
const hospitalsRepository = require('./hospitals.repository');

const SORT_FIELDS = ['name', 'rating', 'reviewCount', 'createdAt'];

const toDoctorSummary = (doctor) => {
  if (!doctor) return null;

  return {
    id: doctor._id.toString(),
    fullName: doctor.fullName,
    verificationStatus: doctor.verificationStatus,
    averageRating: doctor.averageRating,
    reviewCount: doctor.reviewCount,
  };
};

const toHospitalResponse = (hospital, { includeDoctors = false } = {}) => {
  const response = {
    id: hospital._id.toString(),
    name: hospital.name,
    slug: hospital.slug,
    city: hospital.city,
    citySlug: hospital.citySlug,
    description: hospital.description,
    address: hospital.address,
    location: hospital.location?.coordinates
      ? {
          type: hospital.location.type,
          coordinates: hospital.location.coordinates,
        }
      : null,
    images: hospital.images,
    facilities: hospital.facilities,
    doctorIds: hospital.doctorIds.map((doctorId) =>
      doctorId._id ? doctorId._id.toString() : doctorId.toString(),
    ),
    doctorCount: hospital.doctorIds.length,
    rating: hospital.rating,
    reviewCount: hospital.reviewCount,
    isActive: hospital.isActive,
    createdAt: hospital.createdAt?.toISOString(),
    updatedAt: hospital.updatedAt?.toISOString(),
  };

  if (includeDoctors) {
    response.doctors = hospital.doctorIds
      .filter((doctor) => doctor && typeof doctor === 'object' && doctor._id)
      .map(toDoctorSummary);
  }

  return response;
};

const buildLocation = (locationInput) => {
  if (!locationInput) {
    return undefined;
  }

  const { coordinates } = locationInput;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new BadRequestError('Location coordinates must be an array of [longitude, latitude]');
  }

  const [longitude, latitude] = coordinates;
  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new BadRequestError('Invalid location coordinates');
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
};

const resolveSlugs = ({ name, city, slug, citySlug }) => {
  const resolvedCitySlug = citySlug || slugify(city);
  const resolvedSlug = slug || slugify(name);

  if (!resolvedCitySlug) {
    throw new BadRequestError('City is required to generate citySlug');
  }

  if (!resolvedSlug) {
    throw new BadRequestError('Name is required to generate slug');
  }

  return {
    slug: resolvedSlug,
    citySlug: resolvedCitySlug,
  };
};

const buildPublicListFilter = (query) => {
  const filter = {};

  if (query.city) {
    filter.city = new RegExp(`^${query.city.trim()}$`, 'i');
  }

  if (query.citySlug) {
    filter.citySlug = query.citySlug.trim().toLowerCase();
  }

  return filter;
};

const listPublicHospitals = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, SORT_FIELDS);
  const filter = buildPublicListFilter(query);

  const [hospitals, total] = await Promise.all([
    hospitalsRepository.findPublic(filter, { skip, limit, sort }),
    hospitalsRepository.countPublic(filter),
  ]);

  return {
    hospitals: hospitals.map((hospital) => toHospitalResponse(hospital)),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getPublicHospitalDetail = async (citySlug, slug) => {
  const hospital = await hospitalsRepository.findByCitySlugAndSlug(
    citySlug.toLowerCase(),
    slug.toLowerCase(),
  );

  if (!hospital) {
    throw new NotFoundError('Hospital not found');
  }

  return { hospital: toHospitalResponse(hospital, { includeDoctors: true }) };
};

const createHospital = async (payload) => {
  const slugs = resolveSlugs(payload);
  const location = buildLocation(payload.location);

  try {
    const hospital = await hospitalsRepository.create({
      name: payload.name,
      city: payload.city,
      ...slugs,
      description: payload.description ?? '',
      address: payload.address,
      ...(location && { location }),
      images: payload.images ?? [],
      facilities: payload.facilities ?? [],
      doctorIds: payload.doctorIds ?? [],
      rating: payload.rating ?? 0,
      reviewCount: payload.reviewCount ?? 0,
      isActive: payload.isActive ?? true,
    });

    const populated = await hospitalsRepository.findByIdAdmin(hospital._id);
    return { hospital: toHospitalResponse(populated, { includeDoctors: true }) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A hospital with this slug already exists in the selected city');
    }
    throw error;
  }
};

const updateHospital = async (id, payload) => {
  if (!hospitalsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Hospital not found');
  }

  const existing = await hospitalsRepository.findByIdAdmin(id);
  if (!existing) {
    throw new NotFoundError('Hospital not found');
  }

  const updateData = {};

  if (payload.name != null) updateData.name = payload.name;
  if (payload.city != null) updateData.city = payload.city;
  if (payload.description != null) updateData.description = payload.description;
  if (payload.address != null) updateData.address = payload.address;
  if (payload.images != null) updateData.images = payload.images;
  if (payload.facilities != null) updateData.facilities = payload.facilities;
  if (payload.doctorIds != null) updateData.doctorIds = payload.doctorIds;
  if (payload.rating != null) updateData.rating = payload.rating;
  if (payload.reviewCount != null) updateData.reviewCount = payload.reviewCount;
  if (payload.isActive != null) updateData.isActive = payload.isActive;

  if (payload.location !== undefined) {
    if (payload.location === null) {
      updateData.$unset = { location: '' };
    } else {
      updateData.location = buildLocation(payload.location);
    }
  }

  if (payload.name != null || payload.city != null || payload.slug != null || payload.citySlug != null) {
    Object.assign(
      updateData,
      resolveSlugs({
        name: payload.name ?? existing.name,
        city: payload.city ?? existing.city,
        slug: payload.slug,
        citySlug: payload.citySlug,
      }),
    );
  }

  try {
    const unset = updateData.$unset;
    delete updateData.$unset;

    let updateQuery = updateData;
    if (unset) {
      updateQuery = Object.keys(updateData).length
        ? { $set: updateData, $unset: unset }
        : { $unset: unset };
    }

    const hospital = await hospitalsRepository.updateById(id, updateQuery);
    return { hospital: toHospitalResponse(hospital, { includeDoctors: true }) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A hospital with this slug already exists in the selected city');
    }
    throw error;
  }
};

const deleteHospital = async (id) => {
  if (!hospitalsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Hospital not found');
  }

  const hospital = await hospitalsRepository.findByIdAdmin(id);
  if (!hospital) {
    throw new NotFoundError('Hospital not found');
  }

  const deleted = await hospitalsRepository.softDeleteById(id);
  return { hospital: toHospitalResponse(deleted, { includeDoctors: true }) };
};

const assertDoctorExists = async (doctorId) => {
  if (!doctorsRepository.isValidObjectId(doctorId)) {
    throw new NotFoundError('Doctor not found');
  }

  const doctor = await doctorsRepository.findById(doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  return doctor;
};

const getAdminHospitalOrThrow = async (id) => {
  if (!hospitalsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Hospital not found');
  }

  const hospital = await hospitalsRepository.findByIdAdmin(id);
  if (!hospital) {
    throw new NotFoundError('Hospital not found');
  }

  return hospital;
};

const linkDoctor = async (hospitalId, doctorId) => {
  await getAdminHospitalOrThrow(hospitalId);
  await assertDoctorExists(doctorId);

  const hospital = await hospitalsRepository.addDoctor(hospitalId, doctorId);
  return { hospital: toHospitalResponse(hospital, { includeDoctors: true }) };
};

const unlinkDoctor = async (hospitalId, doctorId) => {
  await getAdminHospitalOrThrow(hospitalId);

  if (!doctorsRepository.isValidObjectId(doctorId)) {
    throw new NotFoundError('Doctor not found');
  }

  const hospital = await hospitalsRepository.removeDoctor(hospitalId, doctorId);
  return { hospital: toHospitalResponse(hospital, { includeDoctors: true }) };
};

module.exports = {
  listPublicHospitals,
  getPublicHospitalDetail,
  createHospital,
  updateHospital,
  deleteHospital,
  linkDoctor,
  unlinkDoctor,
  toHospitalResponse,
};
