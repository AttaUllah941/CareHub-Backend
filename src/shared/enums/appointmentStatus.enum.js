const AppointmentStatus = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
});

const APPOINTMENT_STATUSES = Object.values(AppointmentStatus);

const ACTIVE_APPOINTMENT_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

const CANCELLABLE_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

const RESCHEDULABLE_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

module.exports = {
  AppointmentStatus,
  APPOINTMENT_STATUSES,
  ACTIVE_APPOINTMENT_STATUSES,
  CANCELLABLE_STATUSES,
  RESCHEDULABLE_STATUSES,
};
