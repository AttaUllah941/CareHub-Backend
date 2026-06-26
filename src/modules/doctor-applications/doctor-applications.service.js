const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../../core/errors/AppError');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { parsePaginationQuery, buildPaginationMeta } = require('../../core/utils/pagination.util');
const config = require('../../config');
const bcrypt = require('bcryptjs');
const usersRepository = require('../users/users.repository');
const doctorsRepository = require('../doctors/doctors.repository');
const doctorApplicationsRepository = require('./doctor-applications.repository');
const {
  notifyApplicationApproved,
  notifyApplicationRejected,
} = require('../../shared/services/eventNotifications.service');

const SORT_FIELDS = ['createdAt', 'status', 'email', 'lastName'];

const toUserSummary = (user) => {
  if (!user) return undefined;

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };
};

const toDoctorSummary = (doctor) => {
  if (!doctor) return undefined;

  return {
    id: doctor._id.toString(),
    fullName: doctor.fullName,
    verificationStatus: doctor.verificationStatus,
  };
};

const toReviewerSummary = (reviewer) => {
  if (!reviewer) return null;

  return {
    id: reviewer._id.toString(),
    firstName: reviewer.firstName,
    lastName: reviewer.lastName,
    email: reviewer.email,
  };
};

const toApplicationResponse = (application) => ({
  id: application._id.toString(),
  firstName: application.firstName,
  lastName: application.lastName,
  email: application.email,
  phone: application.phone,
  documents: application.documents,
  status: application.status,
  userId: application.userId?._id?.toString() || application.userId?.toString(),
  doctorId: application.doctorId?._id?.toString() || application.doctorId?.toString(),
  user: toUserSummary(application.userId),
  doctor: toDoctorSummary(application.doctorId),
  reviewedBy: toReviewerSummary(application.reviewedBy),
  reviewedAt: application.reviewedAt?.toISOString() || null,
  rejectionReason: application.rejectionReason || null,
  createdAt: application.createdAt?.toISOString(),
  updatedAt: application.updatedAt?.toISOString(),
});

const assertPending = (application) => {
  if (application.status !== 'pending') {
    throw new BadRequestError(`Application has already been ${application.status}`);
  }
};

const buildListFilter = (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  return filter;
};

const cleanupCreatedRecords = async ({ userId, doctorId, applicationId }) => {
  const tasks = [];

  if (applicationId) {
    tasks.push(doctorApplicationsRepository.deleteById(applicationId));
  }
  if (doctorId) {
    tasks.push(doctorsRepository.deleteById(doctorId));
  }
  if (userId) {
    tasks.push(usersRepository.deleteById(userId));
  }

  await Promise.allSettled(tasks);
};

const createApplication = async (payload) => {
  const email = payload.email.toLowerCase();

  const existingUser = await usersRepository.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  const existingApplication = await doctorApplicationsRepository.findByEmail(email);
  if (existingApplication) {
    throw new ConflictError('A doctor application with this email already exists');
  }

  const passwordHash = await bcrypt.hash(payload.password, config.bcrypt.saltRounds);
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();

  let user;
  let doctor;
  let application;

  try {
    user = await usersRepository.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email,
      phone: payload.phone,
      passwordHash,
      role: UserRole.DOCTOR,
      isActive: false,
      isEmailVerified: false,
    });

    doctor = await doctorsRepository.create({
      userId: user._id,
      fullName,
      verificationStatus: 'PENDING',
    });

    application = await doctorApplicationsRepository.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email,
      phone: payload.phone,
      userId: user._id,
      doctorId: doctor._id,
      documents: payload.documents,
      status: 'pending',
    });
  } catch (error) {
    await cleanupCreatedRecords({
      userId: user?._id,
      doctorId: doctor?._id,
      applicationId: application?._id,
    });

    if (error.code === 11000) {
      throw new ConflictError('A doctor application with this email already exists');
    }

    throw error;
  }

  const populated = await doctorApplicationsRepository.findById(application._id);
  return { application: toApplicationResponse(populated) };
};

const listApplications = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, SORT_FIELDS);
  const filter = buildListFilter(query);

  const [applications, total] = await Promise.all([
    doctorApplicationsRepository.findAll(filter, { skip, limit, sort }),
    doctorApplicationsRepository.count(filter),
  ]);

  return {
    applications: applications.map(toApplicationResponse),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getApplicationById = async (id) => {
  if (!doctorApplicationsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Doctor application not found');
  }

  const application = await doctorApplicationsRepository.findById(id);
  if (!application) {
    throw new NotFoundError('Doctor application not found');
  }

  return { application: toApplicationResponse(application) };
};

const getRefId = (value) => (value?._id ? value._id : value);

const approveApplication = async (id, adminUser) => {
  const application = await getApplicationRecord(id);
  assertPending(application);

  await usersRepository.updateById(getRefId(application.userId), { isActive: true });
  await doctorsRepository.updateById(getRefId(application.doctorId), {
    verificationStatus: 'VERIFIED',
  });

  const updated = await doctorApplicationsRepository.updateById(id, {
    status: 'approved',
    reviewedBy: adminUser.id,
    reviewedAt: new Date(),
    rejectionReason: null,
  });

  const userId = getRefId(application.userId)?.toString();

  await notifyApplicationApproved({
    userId,
    email: application.email,
    firstName: application.firstName,
  });

  return { application: toApplicationResponse(updated) };
};

const rejectApplication = async (id, adminUser, rejectionReason) => {
  const application = await getApplicationRecord(id);
  assertPending(application);

  await doctorsRepository.updateById(getRefId(application.doctorId), {
    verificationStatus: 'REJECTED',
  });

  const updated = await doctorApplicationsRepository.updateById(id, {
    status: 'rejected',
    reviewedBy: adminUser.id,
    reviewedAt: new Date(),
    rejectionReason,
  });

  const userId = getRefId(application.userId)?.toString();

  await notifyApplicationRejected({
    userId,
    email: application.email,
    firstName: application.firstName,
    rejectionReason,
  });

  return { application: toApplicationResponse(updated) };
};

const getApplicationRecord = async (id) => {
  if (!doctorApplicationsRepository.isValidObjectId(id)) {
    throw new NotFoundError('Doctor application not found');
  }

  const application = await doctorApplicationsRepository.findById(id);
  if (!application) {
    throw new NotFoundError('Doctor application not found');
  }

  return application;
};

module.exports = {
  createApplication,
  listApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  toApplicationResponse,
};
