const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../../core/errors/AppError');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { slugify } = require('../../shared/utils/slugify');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const labsRepository = require('./labs.repository');
const labTestsRepository = require('./lab-tests.repository');
const labBookingsRepository = require('./lab-bookings.repository');

const LAB_SORT_FIELDS = ['name', 'createdAt'];
const TEST_SORT_FIELDS = ['name', 'price', 'createdAt'];
const BOOKING_SORT_FIELDS = ['scheduledDate', 'createdAt', 'status'];

const toLabResponse = (lab, { testCount } = {}) => ({
  id: lab._id.toString(),
  name: lab.name,
  slug: lab.slug,
  city: lab.city,
  citySlug: lab.citySlug,
  address: lab.address,
  isActive: lab.isActive,
  ...(testCount != null && { testCount }),
  createdAt: lab.createdAt?.toISOString(),
  updatedAt: lab.updatedAt?.toISOString(),
});

const toTestResponse = (test) => ({
  id: test._id.toString(),
  labId: test.labId?._id?.toString() || test.labId?.toString(),
  name: test.name,
  description: test.description,
  price: test.price,
  currency: test.currency,
  homeCollectionAvailable: test.homeCollectionAvailable,
  isActive: test.isActive,
  createdAt: test.createdAt?.toISOString(),
  updatedAt: test.updatedAt?.toISOString(),
});

const toBookingResponse = (booking) => ({
  id: booking._id.toString(),
  labId: booking.labId?._id?.toString() || booking.labId?.toString(),
  testIds: booking.testIds.map((test) =>
    test._id ? test._id.toString() : test.toString(),
  ),
  patientId: booking.patientId?._id?.toString() || booking.patientId?.toString() || null,
  patientSnapshot: booking.patientSnapshot,
  scheduledDate: booking.scheduledDate,
  scheduledSlot: booking.scheduledSlot,
  collectionType: booking.collectionType,
  status: booking.status,
  totalPrice: booking.totalPrice,
  currency: booking.currency,
  lab: booking.labId?.name
    ? {
        id: booking.labId._id.toString(),
        name: booking.labId.name,
        slug: booking.labId.slug,
        city: booking.labId.city,
        citySlug: booking.labId.citySlug,
        address: booking.labId.address,
      }
    : undefined,
  tests: booking.testIds
    .filter((test) => test && typeof test === 'object' && test._id)
    .map(toTestResponse),
  createdAt: booking.createdAt?.toISOString(),
  updatedAt: booking.updatedAt?.toISOString(),
});

const resolveSlugs = ({ name, city, slug, citySlug }) => {
  const resolvedCitySlug = citySlug || slugify(city);
  const resolvedSlug = slug || slugify(name);

  if (!resolvedCitySlug) {
    throw new BadRequestError('City is required to generate citySlug');
  }

  if (!resolvedSlug) {
    throw new BadRequestError('Name is required to generate slug');
  }

  return { slug: resolvedSlug, citySlug: resolvedCitySlug };
};

const normalizeDateString = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const buildPublicLabFilter = (query) => {
  const filter = {};

  if (query.city) {
    filter.city = new RegExp(`^${query.city.trim()}$`, 'i');
  }

  if (query.citySlug) {
    filter.citySlug = query.citySlug.trim().toLowerCase();
  }

  return filter;
};

const buildTestSearchFilter = (search) => {
  if (!search?.trim()) {
    return {};
  }

  const term = search.trim();
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return {
    $or: [{ name: regex }, { description: regex }],
  };
};

const getLabOrThrow = async (id, { admin = false } = {}) => {
  if (!labsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Lab not found');
  }

  const lab = admin
    ? await labsRepository.findByIdAdmin(id)
    : await labsRepository.findById(id);

  if (!lab) {
    throw new NotFoundError('Lab not found');
  }

  return lab;
};

// --- Public labs ---

const listPublicLabs = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, LAB_SORT_FIELDS);
  const filter = buildPublicLabFilter(query);

  const [labs, total] = await Promise.all([
    labsRepository.findPublic(filter, { skip, limit, sort }),
    labsRepository.countPublic(filter),
  ]);

  return {
    labs: labs.map((lab) => toLabResponse(lab)),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getPublicLabDetail = async (id) => {
  const lab = await getLabOrThrow(id);
  const tests = await labTestsRepository.findByLab(
    lab._id,
    {},
    { skip: 0, limit: 500, sort: { name: 1 } },
  );

  return {
    lab: {
      ...toLabResponse(lab, { testCount: tests.length }),
      tests: tests.map(toTestResponse),
    },
  };
};

const listPublicLabTests = async (labId, query) => {
  await getLabOrThrow(labId);

  const { page, limit, skip, sort } = parsePaginationQuery(query, TEST_SORT_FIELDS);
  const filter = buildTestSearchFilter(query.search);

  const [tests, total] = await Promise.all([
    labTestsRepository.findByLab(labId, filter, { skip, limit, sort }),
    labTestsRepository.countByLab(labId, filter),
  ]);

  return {
    tests: tests.map(toTestResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

// --- Admin labs ---

const createLab = async (payload) => {
  const slugs = resolveSlugs(payload);

  try {
    const lab = await labsRepository.create({
      name: payload.name,
      city: payload.city,
      address: payload.address,
      ...slugs,
      isActive: payload.isActive ?? true,
    });

    return { lab: toLabResponse(lab) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A lab with this slug already exists in the selected city');
    }
    throw error;
  }
};

const updateLab = async (id, payload) => {
  const existing = await getLabOrThrow(id, { admin: true });
  const updateData = {};

  if (payload.name != null) updateData.name = payload.name;
  if (payload.city != null) updateData.city = payload.city;
  if (payload.address != null) updateData.address = payload.address;
  if (payload.isActive != null) updateData.isActive = payload.isActive;

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
    const lab = await labsRepository.updateById(id, updateData);
    return { lab: toLabResponse(lab) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ConflictError('A lab with this slug already exists in the selected city');
    }
    throw error;
  }
};

const deleteLab = async (id) => {
  await getLabOrThrow(id, { admin: true });
  const lab = await labsRepository.softDeleteById(id);
  return { lab: toLabResponse(lab) };
};

// --- Admin lab tests ---

const createLabTest = async (labId, payload) => {
  await getLabOrThrow(labId, { admin: true });

  const test = await labTestsRepository.create({
    labId,
    name: payload.name,
    description: payload.description ?? '',
    price: payload.price,
    currency: payload.currency ?? 'PKR',
    homeCollectionAvailable: payload.homeCollectionAvailable ?? false,
    isActive: payload.isActive ?? true,
  });

  return { test: toTestResponse(test) };
};

const updateLabTest = async (labId, testId, payload) => {
  await getLabOrThrow(labId, { admin: true });

  if (!labTestsRepository.isValidObjectId(testId)) {
    throw new NotFoundError('Lab test not found');
  }

  const existing = await labTestsRepository.findByIdAndLab(testId, labId, { includeInactive: true });
  if (!existing) {
    throw new NotFoundError('Lab test not found');
  }

  const updateData = {};
  if (payload.name != null) updateData.name = payload.name;
  if (payload.description != null) updateData.description = payload.description;
  if (payload.price != null) updateData.price = payload.price;
  if (payload.currency != null) updateData.currency = payload.currency;
  if (payload.homeCollectionAvailable != null) {
    updateData.homeCollectionAvailable = payload.homeCollectionAvailable;
  }
  if (payload.isActive != null) updateData.isActive = payload.isActive;

  const test = await labTestsRepository.updateById(testId, updateData);
  return { test: toTestResponse(test) };
};

const deleteLabTest = async (labId, testId) => {
  await getLabOrThrow(labId, { admin: true });

  if (!labTestsRepository.isValidObjectId(testId)) {
    throw new NotFoundError('Lab test not found');
  }

  const existing = await labTestsRepository.findByIdAndLab(testId, labId, { includeInactive: true });
  if (!existing) {
    throw new NotFoundError('Lab test not found');
  }

  const test = await labTestsRepository.softDeleteById(testId);
  return { test: toTestResponse(test) };
};

// --- Lab bookings ---

const validateTestsForBooking = async (labId, testIds, collectionType) => {
  const uniqueIds = [...new Set(testIds.map((id) => id.toString()))];

  if (uniqueIds.length === 0) {
    throw new BadRequestError('At least one test is required');
  }

  const tests = await labTestsRepository.findActiveByIdsForLab(labId, uniqueIds);

  if (tests.length !== uniqueIds.length) {
    throw new BadRequestError('One or more selected tests are invalid or inactive');
  }

  if (collectionType === 'home') {
    const unsupported = tests.filter((test) => !test.homeCollectionAvailable);
    if (unsupported.length > 0) {
      throw new BadRequestError(
        'Home collection is not available for one or more selected tests',
      );
    }
  }

  const totalPrice = tests.reduce((sum, test) => sum + test.price, 0);
  const currency = tests[0]?.currency || 'PKR';

  return { tests, totalPrice, currency };
};

const createBooking = async (payload, user) => {
  const scheduledDate = normalizeDateString(payload.scheduledDate);
  if (!scheduledDate) {
    throw new BadRequestError('Invalid scheduledDate. Use YYYY-MM-DD format');
  }

  if (!labsRepository.isValidObjectId(payload.labId)) {
    throw new NotFoundError('Lab not found');
  }

  const lab = await labsRepository.findById(payload.labId);
  if (!lab) {
    throw new NotFoundError('Lab not found');
  }

  const { tests, totalPrice, currency } = await validateTestsForBooking(
    lab._id,
    payload.testIds,
    payload.collectionType,
  );

  const patientId = user?.role === UserRole.PATIENT ? user.id : null;

  const booking = await labBookingsRepository.create({
    labId: lab._id,
    testIds: tests.map((test) => test._id),
    patientId,
    patientSnapshot: {
      name: payload.patient.name,
      phone: payload.patient.phone,
      email: payload.patient.email || '',
      address: payload.patient.address || '',
    },
    scheduledDate,
    scheduledSlot: payload.scheduledSlot,
    collectionType: payload.collectionType,
    status: 'pending',
    totalPrice,
    currency,
  });

  const populated = await labBookingsRepository.findById(booking._id);
  return { booking: toBookingResponse(populated) };
};

const listMyBookings = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, BOOKING_SORT_FIELDS);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [bookings, total] = await Promise.all([
    labBookingsRepository.findByPatient(user.id, filter, { skip, limit, sort }),
    labBookingsRepository.countByPatient(user.id, filter),
  ]);

  return {
    bookings: bookings.map(toBookingResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const cancelBooking = async (id, user) => {
  if (!labBookingsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Lab booking not found');
  }

  const booking = await labBookingsRepository.findById(id);
  if (!booking) {
    throw new NotFoundError('Lab booking not found');
  }

  const patientId = booking.patientId?._id?.toString() || booking.patientId?.toString();
  if (!patientId || patientId !== user.id) {
    throw new ForbiddenError('You do not have permission to cancel this booking');
  }

  if (booking.status === 'cancelled') {
    throw new BadRequestError('Booking is already cancelled');
  }

  if (['sample_collected', 'report_ready'].includes(booking.status)) {
    throw new BadRequestError('This booking can no longer be cancelled');
  }

  const updated = await labBookingsRepository.updateById(id, { status: 'cancelled' });
  return { booking: toBookingResponse(updated) };
};

module.exports = {
  listPublicLabs,
  getPublicLabDetail,
  listPublicLabTests,
  createLab,
  updateLab,
  deleteLab,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  createBooking,
  listMyBookings,
  cancelBooking,
};
