const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../../core/errors/AppError');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { slugify } = require('../../shared/utils/slugify');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const hospitalsRepository = require('../hospitals/hospitals.repository');
const surgeryProceduresRepository = require('./surgery-procedures.repository');
const surgeryConsultationRequestsRepository = require('./surgery-consultation-requests.repository');

const PROCEDURE_SORT_FIELDS = ['name', 'category', 'createdAt'];
const REQUEST_SORT_FIELDS = ['createdAt', 'status'];

const toHospitalSummary = (hospital) => ({
  id: hospital._id.toString(),
  name: hospital.name,
  slug: hospital.slug,
  city: hospital.city,
  citySlug: hospital.citySlug,
  address: hospital.address,
  phone: hospital.phone || '',
  email: hospital.email || '',
  website: hospital.website || '',
  images: hospital.images || [],
  rating: hospital.rating,
  offersSurgeries: hospital.offersSurgeries,
});

const toProcedureResponse = (procedure, { hospitals } = {}) => ({
  id: procedure._id.toString(),
  name: procedure.name,
  slug: procedure.slug,
  description: procedure.description,
  category: procedure.category,
  estimatedCostRange: procedure.estimatedCostRange,
  currency: procedure.currency,
  hospitalIds: procedure.hospitalIds.map((id) => id.toString()),
  hospitalCount: procedure.hospitalIds.length,
  isActive: procedure.isActive,
  ...(hospitals && { hospitals }),
  createdAt: procedure.createdAt?.toISOString(),
  updatedAt: procedure.updatedAt?.toISOString(),
});

const toConsultationRequestResponse = (request) => ({
  id: request._id.toString(),
  procedureId: request.procedureId?._id?.toString() || request.procedureId?.toString(),
  hospitalId: request.hospitalId?._id?.toString() || request.hospitalId?.toString(),
  patientId: request.patientId?._id?.toString() || request.patientId?.toString() || null,
  patientSnapshot: request.patientSnapshot,
  status: request.status,
  procedure: request.procedureId?.name
    ? {
        id: request.procedureId._id.toString(),
        name: request.procedureId.name,
        slug: request.procedureId.slug,
        category: request.procedureId.category,
        estimatedCostRange: request.procedureId.estimatedCostRange,
        currency: request.procedureId.currency,
      }
    : undefined,
  hospital: request.hospitalId?.name
    ? toHospitalSummary(request.hospitalId)
    : undefined,
  createdAt: request.createdAt?.toISOString(),
  updatedAt: request.updatedAt?.toISOString(),
});

const buildProcedureSearchFilter = (search) => {
  if (!search?.trim()) {
    return {};
  }

  const term = search.trim();
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return {
    $or: [{ name: regex }, { description: regex }, { category: regex }],
  };
};

const validateCostRange = (range) => {
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
    throw new BadRequestError('estimatedCostRange with min and max is required');
  }

  if (range.min < 0 || range.max < 0 || range.min > range.max) {
    throw new BadRequestError('estimatedCostRange min must be <= max and both non-negative');
  }
};

const normalizeHospitalIds = (hospitalIds = []) => {
  const unique = [...new Set(hospitalIds.map((id) => id.toString()))];
  return unique;
};

const validateHospitalIds = async (hospitalIds) => {
  if (!hospitalIds.length) {
    return [];
  }

  const hospitals = await hospitalsRepository.findActiveByIds(hospitalIds);
  if (hospitals.length !== hospitalIds.length) {
    throw new BadRequestError('One or more hospitalIds are invalid or inactive');
  }

  return hospitalIds;
};

const refreshHospitalSurgeryFlags = async (hospitalIds) => {
  const uniqueIds = [...new Set(hospitalIds.map((id) => id.toString()))];

  await Promise.all(
    uniqueIds.map(async (hospitalId) => {
      const count = await surgeryProceduresRepository.countActiveByHospital(hospitalId);
      await hospitalsRepository.updateOffersSurgeries(hospitalId, count > 0);
    }),
  );
};

const getProcedureBySlugOrThrow = async (slug) => {
  const procedure = await surgeryProceduresRepository.findBySlug(slug);
  if (!procedure) {
    throw new NotFoundError('Surgery procedure not found');
  }
  return procedure;
};

const getProcedureAdminOrThrow = async (id) => {
  if (!surgeryProceduresRepository.isValidObjectId(id)) {
    throw new NotFoundError('Surgery procedure not found');
  }

  const procedure = await surgeryProceduresRepository.findByIdAdmin(id);
  if (!procedure) {
    throw new NotFoundError('Surgery procedure not found');
  }

  return procedure;
};

// --- Public procedures ---

const listPublicProcedures = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, PROCEDURE_SORT_FIELDS);
  const filter = buildProcedureSearchFilter(query.search);

  if (query.category) {
    filter.category = new RegExp(`^${query.category.trim()}$`, 'i');
  }

  const [procedures, total] = await Promise.all([
    surgeryProceduresRepository.findPublic(filter, { skip, limit, sort }),
    surgeryProceduresRepository.countPublic(filter),
  ]);

  return {
    procedures: procedures.map((procedure) => toProcedureResponse(procedure)),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getPublicProcedureDetail = async (slug) => {
  const procedure = await getProcedureBySlugOrThrow(slug);
  const hospitals = await hospitalsRepository.findActiveByIds(procedure.hospitalIds);

  return {
    procedure: toProcedureResponse(procedure, {
      hospitals: hospitals.map(toHospitalSummary),
    }),
  };
};

// --- Admin procedures ---

const createProcedure = async (payload) => {
  validateCostRange(payload.estimatedCostRange);

  const slug = payload.slug || slugify(payload.name);
  if (!slug) {
    throw new BadRequestError('Name is required to generate slug');
  }

  const hospitalIds = normalizeHospitalIds(payload.hospitalIds ?? []);
  await validateHospitalIds(hospitalIds);

  try {
    const procedure = await surgeryProceduresRepository.create({
      name: payload.name,
      slug,
      description: payload.description ?? '',
      category: payload.category,
      estimatedCostRange: payload.estimatedCostRange,
      currency: payload.currency ?? 'PKR',
      hospitalIds,
      isActive: payload.isActive ?? true,
    });

    await refreshHospitalSurgeryFlags(hospitalIds);
    return { procedure: toProcedureResponse(procedure) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A surgery procedure with this slug already exists');
    }
    throw error;
  }
};

const updateProcedure = async (id, payload) => {
  const existing = await getProcedureAdminOrThrow(id);
  const previousHospitalIds = existing.hospitalIds.map((hospitalId) => hospitalId.toString());

  const updateData = {};
  if (payload.name != null) updateData.name = payload.name;
  if (payload.description != null) updateData.description = payload.description;
  if (payload.category != null) updateData.category = payload.category;
  if (payload.currency != null) updateData.currency = payload.currency;
  if (payload.isActive != null) updateData.isActive = payload.isActive;

  if (payload.estimatedCostRange != null) {
    validateCostRange(payload.estimatedCostRange);
    updateData.estimatedCostRange = payload.estimatedCostRange;
  }

  if (payload.slug != null) {
    updateData.slug = payload.slug;
  } else if (payload.name != null) {
    updateData.slug = slugify(payload.name);
  }

  if (payload.hospitalIds != null) {
    const hospitalIds = normalizeHospitalIds(payload.hospitalIds);
    await validateHospitalIds(hospitalIds);
    updateData.hospitalIds = hospitalIds;
  }

  try {
    const procedure = await surgeryProceduresRepository.updateById(id, updateData);

    const affectedHospitalIds = [
      ...previousHospitalIds,
      ...procedure.hospitalIds.map((hospitalId) => hospitalId.toString()),
    ];
    await refreshHospitalSurgeryFlags(affectedHospitalIds);

    return { procedure: toProcedureResponse(procedure) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A surgery procedure with this slug already exists');
    }
    throw error;
  }
};

const deleteProcedure = async (id) => {
  const existing = await getProcedureAdminOrThrow(id);
  const procedure = await surgeryProceduresRepository.softDeleteById(id);

  await refreshHospitalSurgeryFlags(
    existing.hospitalIds.map((hospitalId) => hospitalId.toString()),
  );

  return { procedure: toProcedureResponse(procedure) };
};

// --- Consultation requests ---

const assertProcedureHospitalLink = (procedure, hospitalId) => {
  const linked = procedure.hospitalIds.some(
    (id) => id.toString() === hospitalId.toString(),
  );

  if (!linked) {
    throw new BadRequestError('The selected hospital does not offer this procedure');
  }
};

const createConsultationRequest = async (payload, user) => {
  if (!surgeryProceduresRepository.isValidObjectId(payload.procedureId)) {
    throw new NotFoundError('Surgery procedure not found');
  }

  const procedure = await surgeryProceduresRepository.findById(payload.procedureId);
  if (!procedure) {
    throw new NotFoundError('Surgery procedure not found');
  }

  if (!hospitalsRepository.isValidObjectId(payload.hospitalId)) {
    throw new NotFoundError('Hospital not found');
  }

  const hospital = await hospitalsRepository.findById(payload.hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found');
  }

  assertProcedureHospitalLink(procedure, hospital._id);

  const patientId = user?.role === UserRole.PATIENT ? user.id : null;

  const request = await surgeryConsultationRequestsRepository.create({
    procedureId: procedure._id,
    hospitalId: hospital._id,
    patientId,
    patientSnapshot: {
      name: payload.patient.name,
      phone: payload.patient.phone,
      email: payload.patient.email || '',
      notes: payload.patient.notes || '',
    },
    status: 'pending',
  });

  const populated = await surgeryConsultationRequestsRepository.findById(request._id);
  return { consultationRequest: toConsultationRequestResponse(populated) };
};

const listMyConsultationRequests = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, REQUEST_SORT_FIELDS);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [requests, total] = await Promise.all([
    surgeryConsultationRequestsRepository.findByPatient(user.id, filter, { skip, limit, sort }),
    surgeryConsultationRequestsRepository.countByPatient(user.id, filter),
  ]);

  return {
    consultationRequests: requests.map(toConsultationRequestResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const listAdminConsultationRequests = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, REQUEST_SORT_FIELDS);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [requests, total] = await Promise.all([
    surgeryConsultationRequestsRepository.findAll(filter, { skip, limit, sort }),
    surgeryConsultationRequestsRepository.count(filter),
  ]);

  return {
    consultationRequests: requests.map(toConsultationRequestResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const updateConsultationRequestStatus = async (id, status) => {
  if (!surgeryConsultationRequestsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Consultation request not found');
  }

  const existing = await surgeryConsultationRequestsRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('Consultation request not found');
  }

  const updated = await surgeryConsultationRequestsRepository.updateById(id, { status });
  return { consultationRequest: toConsultationRequestResponse(updated) };
};

module.exports = {
  listPublicProcedures,
  getPublicProcedureDetail,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  createConsultationRequest,
  listMyConsultationRequests,
  listAdminConsultationRequests,
  updateConsultationRequestStatus,
};
