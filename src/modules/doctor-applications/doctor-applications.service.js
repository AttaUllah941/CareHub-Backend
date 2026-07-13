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
const clinicsRepository = require('../clinics/clinics.repository');
const schedulesRepository = require('../schedules/schedules.repository');
const { Specialty } = require('../specialties/specialties.model');
const { slugify } = require('../../shared/utils/slugify');
const { time12hTo24h } = require('../../shared/utils/timeFormat.util');
const {
  notifyApplicationApproved,
  notifyApplicationRejected,
} = require('../../shared/services/eventNotifications.service');

const SORT_FIELDS = ['createdAt', 'status', 'email', 'lastName'];

const LEGACY_SPECIALTY_SLUG_MAP = {
  cardiology: 'cardiologist',
  dermatology: 'dermatologist',
  'general-medicine': 'general-physician',
  'general-practitioner': 'general-physician',
  gynecology: 'gynecologist-obstetrician-obgyn',
  pediatrics: 'pediatrician',
};

const resolveSpecialtySlug = (slug) => {
  if (!slug) return '';
  const normalized = slug.trim().toLowerCase();
  return LEGACY_SPECIALTY_SLUG_MAP[normalized] ?? normalized;
};

const resolveSpecialty = async (specialtySlug) => {
  const slug = resolveSpecialtySlug(specialtySlug);
  if (!slug) return null;
  return Specialty.findOne({ slug, isActive: true }).lean();
};

const mapQualifications = (qualifications = []) =>
  qualifications.map((item) => ({
    degree: item.degree || '',
    institute: item.institute || item.institution || '',
    year: item.year,
  }));

const extractProfileImageUrl = (documents = []) =>
  documents.find((document) => document.type === 'profile_photo')?.url || '';

const buildApplicationProfile = (payload, specialty) => ({
  specialtySlug: resolveSpecialtySlug(payload.specialtySlug),
  specialtyName: specialty?.name || '',
  yearsOfExperience: payload.yearsOfExperience ?? 0,
  qualifications: (payload.qualifications || []).map((item) => ({
    degree: item.degree,
    institution: item.institution,
    year: item.year,
  })),
  clinicName: payload.clinicName.trim(),
  clinicAddress: payload.clinicAddress.trim(),
  clinicCity: payload.clinicCity.trim(),
  clinicPhone: payload.clinicPhone.trim(),
  consultationFee: payload.consultationFee,
  videoConsultationFee: payload.videoConsultationFee,
  availability: payload.availability || [],
});

const buildDoctorProfileData = (payload, fullName, specialty) => ({
  fullName,
  city: payload.clinicCity.trim(),
  title: specialty?.name || '',
  specialtyIds: specialty ? [specialty._id] : [],
  yearsOfExperience: payload.yearsOfExperience ?? 0,
  consultationFee: payload.consultationFee ?? 0,
  qualifications: mapQualifications(payload.qualifications),
  profileImageUrl: extractProfileImageUrl(payload.documents),
  verificationStatus: 'PENDING',
  isActive: true,
});

const buildDoctorUpdatesFromProfile = (doctor, profile, specialty, documents = []) => {
  const updates = {
    verificationStatus: 'VERIFIED',
    isActive: true,
  };

  if (!doctor.city?.trim() && profile.clinicCity?.trim()) {
    updates.city = profile.clinicCity.trim();
  }

  if ((!doctor.specialtyIds || doctor.specialtyIds.length === 0) && specialty) {
    updates.specialtyIds = [specialty._id];
    updates.title = specialty.name;
  }

  if (!doctor.yearsOfExperience && profile.yearsOfExperience != null) {
    updates.yearsOfExperience = profile.yearsOfExperience;
  }

  if (!doctor.consultationFee && profile.consultationFee) {
    updates.consultationFee = profile.consultationFee;
  }

  if ((!doctor.qualifications || doctor.qualifications.length === 0) && profile.qualifications?.length) {
    updates.qualifications = mapQualifications(profile.qualifications);
  }

  if (!doctor.profileImageUrl?.trim()) {
    const photoDoc = documents.find((document) => document.type === 'profile_photo');
    if (photoDoc?.url) {
      updates.profileImageUrl = photoDoc.url;
    }
  }

  return updates;
};

const ensureClinicForDoctor = async (doctorId, profile, consultationFee) => {
  const existingClinics = await clinicsRepository.findActiveByDoctorId(doctorId);
  if (existingClinics.length > 0) {
    return existingClinics[0];
  }

  if (!profile.clinicName?.trim() || !profile.clinicAddress?.trim() || !profile.clinicCity?.trim()) {
    return null;
  }

  return clinicsRepository.create({
    doctorId,
    name: profile.clinicName.trim(),
    address: profile.clinicAddress.trim(),
    city: profile.clinicCity.trim(),
    citySlug: slugify(profile.clinicCity),
    consultationFee: profile.consultationFee ?? consultationFee ?? 0,
    isActive: true,
  });
};

const ensureSchedulesForDoctor = async (doctorId, clinic, availability = []) => {
  if (!clinic || !availability.length) return;

  const existingSchedules = await schedulesRepository.findByDoctorId(doctorId);
  if (existingSchedules.some((schedule) => schedule.isActive)) return;

  for (const slot of availability) {
    await schedulesRepository.create({
      doctorId,
      clinicId: clinic._id,
      dayOfWeek: slot.day,
      startTime: time12hTo24h(slot.startTime),
      endTime: time12hTo24h(slot.endTime),
      slotDurationMinutes: 30,
      consultationType: 'clinic',
      isActive: true,
    });
  }
};

const activateApprovedDoctor = async (application) => {
  const doctorId = getRefId(application.doctorId);
  const doctor = await doctorsRepository.findById(doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found for this application');
  }

  const profile = application.profile || {};
  const specialty = await resolveSpecialty(profile.specialtySlug);
  const doctorUpdates = buildDoctorUpdatesFromProfile(
    doctor,
    profile,
    specialty,
    application.documents || [],
  );

  await doctorsRepository.updateById(doctorId, doctorUpdates);

  const clinic = await ensureClinicForDoctor(
    doctorId,
    profile,
    doctorUpdates.consultationFee ?? doctor.consultationFee,
  );
  await ensureSchedulesForDoctor(doctorId, clinic, profile.availability);
};

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
  const specialty = await resolveSpecialty(payload.specialtySlug);
  if (!specialty) {
    throw new BadRequestError('Selected specialty is not available');
  }

  const profile = buildApplicationProfile(payload, specialty);
  const doctorProfileData = buildDoctorProfileData(payload, fullName, specialty);

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
      ...doctorProfileData,
    });

    application = await doctorApplicationsRepository.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email,
      phone: payload.phone,
      userId: user._id,
      doctorId: doctor._id,
      documents: payload.documents,
      profile,
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
  await activateApprovedDoctor(application);

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
    applicationId: id,
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
    applicationId: id,
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
  activateApprovedDoctor,
  toApplicationResponse,
};
