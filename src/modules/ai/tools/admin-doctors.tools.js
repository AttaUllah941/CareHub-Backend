const { z } = require('zod');
const { BadRequestError } = require('../../../core/errors/AppError');
const doctorApplicationsService = require('../../doctor-applications/doctor-applications.service');
const doctorsService = require('../../doctors/doctors.service');
const { defineTool } = require('./tool.registry');
const { objectId, searchTextSchema, limitSchema, formatDateTime, truncate } = require('./tool.helpers');
const ui = require('./ui.helpers');

const applicantName = (application) => `${application.firstName} ${application.lastName}`.trim();

const applicationItem = (application) => ({
  id: application.id,
  title: applicantName(application),
  subtitle: `${application.email} · applied ${application.createdAt ? formatDateTime(application.createdAt) : ''}`,
  badge: application.status,
  lines: [
    `${(application.documents || []).length} document(s) uploaded`,
    application.rejectionReason ? `Reason: ${truncate(application.rejectionReason, 120)}` : '',
  ],
  actions:
    application.status === 'pending'
      ? [
          { label: 'Approve', message: `Approve doctor application of ${applicantName(application)} (application id ${application.id}).` },
          { label: 'Reject', message: `Reject doctor application of ${applicantName(application)} (application id ${application.id}).` },
        ]
      : [],
});

const requirePending = async (applicationId) => {
  const { application } = await doctorApplicationsService.getApplicationById(applicationId);
  if (application.status !== 'pending') {
    throw new BadRequestError(`This application was already ${application.status}.`);
  }
  return application;
};

const listDoctorApplications = defineTool({
  name: 'listDoctorApplications',
  agent: 'ADMIN',
  intent: 'applications',
  description: 'List doctor applications, by default the pending ones awaiting review.',
  schema: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: limitSchema(15, 8),
  }),
  execute: async ({ status, limit }) => {
    const { applications, pagination } = await doctorApplicationsService.listApplications({
      status: status || 'pending',
      page: 1,
      limit: limit ?? 8,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      data: {
        total: pagination.total,
        applications: applications.map((a) => ({ id: a.id, name: applicantName(a), email: a.email, status: a.status, documents: (a.documents || []).length })),
      },
      actions: applications.length ? [ui.list(`Doctor applications (${status || 'pending'})`, applications.map(applicationItem))] : [],
    };
  },
});

const getDoctorApplication = defineTool({
  name: 'getDoctorApplication',
  agent: 'ADMIN',
  intent: 'applications',
  description: 'Review one doctor application: applicant details, status and uploaded document types.',
  schema: z.object({ applicationId: objectId('applicationId') }),
  execute: async ({ applicationId }) => {
    const { application } = await doctorApplicationsService.getApplicationById(applicationId);
    return {
      data: {
        id: application.id,
        name: applicantName(application),
        email: application.email,
        phone: application.phone,
        status: application.status,
        documents: (application.documents || []).map((d) => d.type),
        rejectionReason: application.rejectionReason,
        reviewedAt: application.reviewedAt,
      },
      actions: [ui.list('Application', [applicationItem(application)])],
    };
  },
});

const approveApplication = defineTool({
  name: 'approveApplication',
  agent: 'ADMIN',
  intent: 'applications',
  requiresConfirmation: true,
  description: 'Propose approving a pending doctor application (activates the account and verifies the doctor). The admin must confirm.',
  schema: z.object({ applicationId: objectId('applicationId') }),
  prepare: async ({ applicationId }) => {
    const application = await requirePending(applicationId);
    return {
      args: { applicationId },
      summary: `Approve ${applicantName(application)}'s doctor application (${application.email}). Their account will be activated and the doctor verified.`,
    };
  },
  execute: async ({ applicationId }, ctx) => {
    await requirePending(applicationId);
    const { application } = await doctorApplicationsService.approveApplication(applicationId, ctx.user);
    return {
      data: { status: application.status },
      actions: [ui.list('Application approved', [applicationItem(application)])],
      outcome: `${applicantName(application)} has been approved and notified.`,
    };
  },
});

const rejectApplication = defineTool({
  name: 'rejectApplication',
  agent: 'ADMIN',
  intent: 'applications',
  requiresConfirmation: true,
  description: 'Propose rejecting a pending doctor application. A reason (shown to the applicant) is required. The admin must confirm.',
  schema: z.object({ applicationId: objectId('applicationId'), reason: z.string().trim().min(3).max(1000) }),
  prepare: async ({ applicationId, reason }) => {
    const application = await requirePending(applicationId);
    return {
      args: { applicationId, reason },
      summary: `Reject ${applicantName(application)}'s doctor application (${application.email}).`,
      details: [{ label: 'Reason sent to applicant', value: reason }],
    };
  },
  execute: async ({ applicationId, reason }, ctx) => {
    await requirePending(applicationId);
    const { application } = await doctorApplicationsService.rejectApplication(applicationId, ctx.user, reason);
    return {
      data: { status: application.status },
      actions: [ui.list('Application rejected', [applicationItem(application)])],
      outcome: `${applicantName(application)}'s application was rejected and they were notified.`,
    };
  },
});

const doctorLabel = (doctor) =>
  [doctor.user?.firstName, doctor.user?.lastName].filter(Boolean).join(' ') || doctor.title || 'Doctor';

const listDoctors = defineTool({
  name: 'listDoctors',
  agent: 'ADMIN',
  intent: 'applications',
  description: 'List doctor profiles with their verification status, optionally filtered by status or name.',
  schema: z.object({
    verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
    search: searchTextSchema.optional(),
    limit: limitSchema(15, 8),
  }),
  execute: async ({ verificationStatus, search, limit }) => {
    const { doctors, pagination } = await doctorsService.listAdmin({
      verificationStatus,
      search,
      page: 1,
      limit: limit ?? 8,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      data: {
        total: pagination.total,
        doctors: doctors.map((d) => ({ id: d.id, name: doctorLabel(d), city: d.city, status: d.verificationStatus })),
      },
      actions: doctors.length
        ? [
            ui.list(
              `Doctors (${pagination.total})`,
              doctors.map((d) => ({
                id: d.id,
                title: `Dr. ${doctorLabel(d)}`,
                subtitle: [d.title, d.city].filter(Boolean).join(' · '),
                badge: d.verificationStatus,
                actions:
                  d.verificationStatus === 'VERIFIED'
                    ? []
                    : [{ label: 'Verify', message: `Set verification of Dr. ${doctorLabel(d)} (doctor id ${d.id}) to VERIFIED.` }],
              })),
            ),
          ]
        : [],
    };
  },
});

const setDoctorVerification = defineTool({
  name: 'setDoctorVerification',
  agent: 'ADMIN',
  intent: 'applications',
  requiresConfirmation: true,
  description: 'Propose changing a doctor\'s verification status (VERIFIED, PENDING or REJECTED). A reason is required when rejecting. The admin must confirm.',
  schema: z.object({
    doctorId: objectId('doctorId'),
    status: z.enum(['VERIFIED', 'PENDING', 'REJECTED']),
    reason: z.string().trim().min(3).max(1000).optional(),
  }),
  prepare: async ({ doctorId, status, reason }) => {
    if (status === 'REJECTED' && !reason) throw new BadRequestError('A reason is required when rejecting a doctor.');
    const { doctors } = await doctorsService.listAdmin({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
    const doctor = doctors.find((item) => item.id === doctorId);
    if (!doctor) throw new BadRequestError('Doctor not found in the most recent 100 doctors. Search by name first.');
    return {
      args: { doctorId, status, reason },
      summary: `Change Dr. ${doctorLabel(doctor)}'s verification from ${doctor.verificationStatus} to ${status}.`,
      details: reason ? [{ label: 'Reason', value: reason }] : [],
    };
  },
  execute: async ({ doctorId, status, reason }) => {
    const { doctor } = await doctorsService.updateVerification(doctorId, { status, rejectionReason: reason });
    return {
      data: { status: doctor.verificationStatus },
      actions: [ui.list('Verification updated', [{ id: doctor.id, title: `Dr. ${doctorLabel(doctor)}`, badge: doctor.verificationStatus }])],
      outcome: `Dr. ${doctorLabel(doctor)} is now ${doctor.verificationStatus}.`,
    };
  },
});

module.exports = [listDoctorApplications, getDoctorApplication, approveApplication, rejectApplication, listDoctors, setDoctorVerification];
