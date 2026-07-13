const { enqueueEmail } = require('../../jobs/queues/email.queue');
const notificationsService = require('../../modules/notifications/notifications.service');
const config = require('../../config');

const buildFrontendUrl = (path) => {
  const base = config.frontend.url.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const sendRegistrationEmail = async ({ email, firstName }) => {
  await enqueueEmail({
    to: email,
    subject: 'Welcome to CareHub',
    text: `Hi ${firstName},\n\nYour CareHub account has been created. You can sign in at ${buildFrontendUrl('/auth/login')}.\n\n— CareHub`,
  });
};

const sendPasswordResetEmail = async ({ email, firstName, resetToken }) => {
  const resetUrl = buildFrontendUrl(`/auth/reset-password?token=${resetToken}`);

  await enqueueEmail({
    to: email,
    subject: 'Reset your CareHub password',
    text: `Hi ${firstName},\n\nWe received a request to reset your password. Use this link within 1 hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.\n\n— CareHub`,
  });
};

const sendAppointmentConfirmedEmail = async ({ email, patientName, doctorName, scheduledAt }) => {
  await enqueueEmail({
    to: email,
    subject: 'Appointment confirmed — CareHub',
    text: `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} on ${scheduledAt} has been confirmed.\n\n— CareHub`,
  });
};

const sendAppointmentCancelledEmail = async ({ email, recipientName, doctorName, scheduledAt }) => {
  await enqueueEmail({
    to: email,
    subject: 'Appointment cancelled — CareHub',
    text: `Hi ${recipientName},\n\nThe appointment with Dr. ${doctorName} scheduled for ${scheduledAt} has been cancelled.\n\n— CareHub`,
  });
};

const sendAppointmentRejectedEmail = async ({
  email,
  patientName,
  doctorName,
  scheduledAt,
  rejectionReason,
}) => {
  const reasonLine = rejectionReason ? `\n\nReason: ${rejectionReason}` : '';
  await enqueueEmail({
    to: email,
    subject: 'Appointment not accepted — CareHub',
    text: `Hi ${patientName},\n\nDr. ${doctorName} could not accept your appointment scheduled for ${scheduledAt}.${reasonLine}\n\n— CareHub`,
  });
};

const sendApplicationApprovedEmail = async ({ email, firstName }) => {
  await enqueueEmail({
    to: email,
    subject: 'Your CareHub doctor application was approved',
    text: `Hi ${firstName},\n\nCongratulations! Your doctor application has been approved. You can now sign in and complete your profile.\n\n— CareHub`,
  });
};

const sendApplicationRejectedEmail = async ({ email, firstName, rejectionReason }) => {
  await enqueueEmail({
    to: email,
    subject: 'Update on your CareHub doctor application',
    text: `Hi ${firstName},\n\nWe reviewed your doctor application and were unable to approve it at this time.\n\nReason: ${rejectionReason}\n\n— CareHub`,
  });
};

const notifyAppointmentBooked = async ({
  doctorUserId,
  adminUserIds = [],
  patientName,
  doctorName,
  scheduledAt,
  consultationType,
  appointmentId,
}) => {
  const typeLabel = consultationType === 'video' ? 'video consultation' : 'clinic appointment';
  const body = `${patientName} booked a ${typeLabel} with Dr. ${doctorName} on ${scheduledAt}.`;
  const data = {
    appointmentId: appointmentId || null,
    consultationType: consultationType || 'video',
    link: '/doctor/appointments',
  };

  if (doctorUserId) {
    await notificationsService.createNotification({
      userId: doctorUserId,
      type: 'appointment_booked',
      title: 'New appointment request',
      body,
      data: { ...data, link: '/doctor/appointments' },
    });
  }

  for (const adminUserId of adminUserIds) {
    await notificationsService.createNotification({
      userId: adminUserId,
      type: 'appointment_booked',
      title: 'New appointment booked',
      body,
      data: { ...data, link: '/admin/dashboard' },
    });
  }
};

const notifyAppointmentConfirmed = async ({
  userId,
  email,
  patientName,
  doctorName,
  scheduledAt,
  appointmentId,
}) => {
  await sendAppointmentConfirmedEmail({ email, patientName, doctorName, scheduledAt });

  if (userId) {
    await notificationsService.createNotification({
      userId,
      type: 'appointment_confirmed',
      title: 'Appointment confirmed',
      body: `Your appointment with Dr. ${doctorName} on ${scheduledAt} has been confirmed.`,
      data: {
        appointmentId: appointmentId || null,
        link: '/my-appointments',
      },
    });
  }
};

const notifyAppointmentCancelled = async ({
  patientUserId,
  doctorUserId,
  patientEmail,
  doctorEmail,
  patientName,
  doctorName,
  scheduledAt,
  appointmentId,
}) => {
  if (patientEmail) {
    await sendAppointmentCancelledEmail({
      email: patientEmail,
      recipientName: patientName,
      doctorName,
      scheduledAt,
    });
  }

  if (doctorEmail) {
    await sendAppointmentCancelledEmail({
      email: doctorEmail,
      recipientName: doctorName,
      doctorName,
      scheduledAt,
    });
  }

  const data = { appointmentId: appointmentId || null };

  if (patientUserId) {
    await notificationsService.createNotification({
      userId: patientUserId,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      body: `Your appointment with Dr. ${doctorName} on ${scheduledAt} was cancelled.`,
      data: { ...data, link: '/my-appointments' },
    });
  }

  if (doctorUserId) {
    await notificationsService.createNotification({
      userId: doctorUserId,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      body: `The appointment with ${patientName} on ${scheduledAt} was cancelled.`,
      data: { ...data, link: '/doctor/appointments' },
    });
  }
};

const notifyAppointmentRejected = async ({
  patientUserId,
  patientEmail,
  patientName,
  doctorName,
  scheduledAt,
  appointmentId,
  rejectionReason,
}) => {
  if (patientEmail) {
    await sendAppointmentRejectedEmail({
      email: patientEmail,
      patientName,
      doctorName,
      scheduledAt,
      rejectionReason,
    });
  }

  if (patientUserId) {
    const reasonSuffix = rejectionReason ? ` Reason: ${rejectionReason}` : '';
    await notificationsService.createNotification({
      userId: patientUserId,
      type: 'appointment_rejected',
      title: 'Appointment not accepted',
      body: `Dr. ${doctorName} could not accept your appointment on ${scheduledAt}.${reasonSuffix}`,
      data: {
        appointmentId: appointmentId || null,
        rejectionReason: rejectionReason || null,
        link: '/my-appointments',
      },
    });
  }
};

const notifyApplicationApproved = async ({ userId, email, firstName, applicationId }) => {
  await sendApplicationApprovedEmail({ email, firstName });

  if (userId) {
    await notificationsService.createNotification({
      userId,
      type: 'application_approved',
      title: 'Application approved',
      body: 'Your doctor application has been approved. You can now sign in and complete your profile.',
      data: {
        applicationId: applicationId || null,
        link: '/doctor/dashboard',
      },
    });
  }
};

const notifyApplicationRejected = async ({
  userId,
  email,
  firstName,
  rejectionReason,
  applicationId,
}) => {
  await sendApplicationRejectedEmail({ email, firstName, rejectionReason });

  if (userId) {
    await notificationsService.createNotification({
      userId,
      type: 'application_rejected',
      title: 'Application not approved',
      body: `Your doctor application was not approved. Reason: ${rejectionReason}`,
      data: {
        applicationId: applicationId || null,
        rejectionReason: rejectionReason || null,
        link: '/join-as-doctor',
      },
    });
  }
};

module.exports = {
  sendRegistrationEmail,
  sendPasswordResetEmail,
  notifyAppointmentBooked,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentRejected,
  notifyApplicationApproved,
  notifyApplicationRejected,
};
