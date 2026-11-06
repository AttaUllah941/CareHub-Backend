const { Appointment } = require('../appointments/appointments.model');
const { MedicineOrder } = require('../medicines/medicine-orders.model');
const { LabBooking } = require('../labs/lab-bookings.model');
const { User } = require('../users/users.model');

/** Read-only aggregations. Day buckets use the clinic timezone so "today" matches what users see. */
const TZ = 'Asia/Karachi';

const dayBucket = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } });

// ---- Doctor-scoped (always filtered by an explicit doctorId) ----

const appointmentsByStatus = (doctorId, from, to) =>
  Appointment.aggregate([
    { $match: { doctorId, scheduledAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

const appointmentsByType = (doctorId, from, to) =>
  Appointment.aggregate([
    { $match: { doctorId, scheduledAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$consultationType', count: { $sum: 1 } } },
  ]);

const appointmentsByDay = (doctorId, from, to) =>
  Appointment.aggregate([
    { $match: { doctorId, scheduledAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: dayBucket('$scheduledAt'),
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const countCompleted = (doctorId, from, to) =>
  Appointment.countDocuments({
    doctorId,
    status: 'completed',
    ...(from && to ? { scheduledAt: { $gte: from, $lte: to } } : {}),
  });

const countUpcomingConfirmed = (doctorId, now) =>
  Appointment.countDocuments({ doctorId, status: 'confirmed', scheduledAt: { $gte: now } });

/** Completed appointments with a known patient, newest first (used for follow-up detection). */
const recentCompletedWithPatient = (doctorId, since, limit = 500) =>
  Appointment.find({ doctorId, status: 'completed', patientId: { $ne: null }, scheduledAt: { $gte: since } })
    .sort({ scheduledAt: -1 })
    .limit(limit)
    .select('patientId patientName scheduledAt')
    .lean();

const activeForPatients = (doctorId, patientIds) =>
  Appointment.find({ doctorId, patientId: { $in: patientIds }, status: { $in: ['pending', 'confirmed'] } })
    .select('patientId')
    .lean();

const countPending = (doctorId) => Appointment.countDocuments({ doctorId, status: 'pending' });

// ---- Platform-wide (admin only; callers must be authorised by the AI permission layer) ----

const usersByRole = () =>
  User.aggregate([{ $group: { _id: { role: '$role', isActive: '$isActive' }, count: { $sum: 1 } } }]);

const newUsersInRange = (from, to) =>
  User.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

const platformAppointmentsByStatus = (from, to) =>
  Appointment.aggregate([
    { $match: { scheduledAt: { $gte: from, $lte: to } } },
    { $group: { _id: { status: '$status', type: '$consultationType' }, count: { $sum: 1 } } },
  ]);

const topDoctorsByCompleted = (from, to, limit = 5) =>
  Appointment.aggregate([
    { $match: { status: 'completed', scheduledAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$doctorId', completed: { $sum: 1 } } },
    { $sort: { completed: -1 } },
    { $limit: limit },
    { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
    { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
    { $project: { completed: 1, name: '$doctor.fullName', fee: '$doctor.consultationFee' } },
  ]);

const ordersByStatus = (from, to) =>
  MedicineOrder.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$status', orders: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
  ]);

const labBookingsByStatus = (from, to) =>
  LabBooking.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$status', bookings: { $sum: 1 }, amount: { $sum: '$totalPrice' } } },
  ]);

/** Consultation fees of completed appointments, using each doctor's CURRENT fee (fees aren't stored per booking). */
const completedAppointmentFees = (from, to) =>
  Appointment.aggregate([
    { $match: { status: 'completed', scheduledAt: { $gte: from, $lte: to } } },
    { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'doctor' } },
    { $unwind: '$doctor' },
    { $group: { _id: null, completed: { $sum: 1 }, fees: { $sum: '$doctor.consultationFee' } } },
  ]);

module.exports = {
  appointmentsByStatus,
  appointmentsByType,
  appointmentsByDay,
  countCompleted,
  countUpcomingConfirmed,
  recentCompletedWithPatient,
  activeForPatients,
  countPending,
  usersByRole,
  newUsersInRange,
  platformAppointmentsByStatus,
  topDoctorsByCompleted,
  ordersByStatus,
  labBookingsByStatus,
  completedAppointmentFees,
};
