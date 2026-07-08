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
}) => {
  const typeLabel = consultationType === 'video' ? 'video consultation' : 'clinic appointment';
  const body = `${patientName} booked a ${typeLabel} with Dr. ${doctorName} on ${scheduledAt}.`;

  if (doctorUserId) {
    await notificationsService.createNotification({
      userId: doctorUserId,
      type: 'appointment_booked',
      title: 'New appointment request',
      body,
    });
  }

  for (const adminUserId of adminUserIds) {
    await notificationsService.createNotification({
      userId: adminUserId,
      type: 'appointment_booked',
      title: 'New appointment booked',
      body,
    });
  }
};

const notifyAppointmentConfirmed = async ({ userId, email, patientName, doctorName, scheduledAt }) => {
  await sendAppointmentConfirmedEmail({ email, patientName, doctorName, scheduledAt });

  if (userId) {
    await notificationsService.createNotification({
      userId,
      type: 'appointment_confirmed',
      title: 'Appointment confirmed',
      body: `Your appointment with Dr. ${doctorName} on ${scheduledAt} has been confirmed.`,
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

  if (patientUserId) {
    await notificationsService.createNotification({
      userId: patientUserId,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      body: `Your appointment with Dr. ${doctorName} on ${scheduledAt} was cancelled.`,
    });
  }

  if (doctorUserId) {
    await notificationsService.createNotification({
      userId: doctorUserId,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      body: `The appointment with ${patientName} on ${scheduledAt} was cancelled.`,
    });
  }
};

const notifyApplicationApproved = async ({ userId, email, firstName }) => {
  await sendApplicationApprovedEmail({ email, firstName });

  if (userId) {
    await notificationsService.createNotification({
      userId,
      type: 'application_approved',
      title: 'Application approved',
      body: 'Your doctor application has been approved. You can now sign in and complete your profile.',
    });
  }
};

const notifyApplicationRejected = async ({ userId, email, firstName, rejectionReason }) => {
  await sendApplicationRejectedEmail({ email, firstName, rejectionReason });

  if (userId) {
    await notificationsService.createNotification({
      userId,
      type: 'application_rejected',
      title: 'Application not approved',
      body: `Your doctor application was not approved. Reason: ${rejectionReason}`,
    });
  }
};

module.exports = {
  sendRegistrationEmail,
  sendPasswordResetEmail,
  notifyAppointmentBooked,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyApplicationApproved,
  notifyApplicationRejected,
};
