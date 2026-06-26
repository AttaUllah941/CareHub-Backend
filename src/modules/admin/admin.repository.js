const mongoose = require('mongoose');
const { User } = require('../users/users.model');
const { Doctor } = require('../doctors/doctors.model');
const { Appointment } = require('../appointments/appointments.model');
const { MedicineOrder } = require('../medicines/medicine-orders.model');
const { LabBooking } = require('../labs/lab-bookings.model');

const countUsers = () => User.countDocuments();

const countDoctorsByVerificationStatus = async () => {
  const rows = await Doctor.aggregate([
    { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
  ]);

  return rows.reduce(
    (acc, row) => {
      acc[row._id] = row.count;
      return acc;
    },
    { PENDING: 0, VERIFIED: 0, REJECTED: 0 },
  );
};

const countAppointmentsByStatusSince = async (sinceDate) => {
  const rows = await Appointment.aggregate([
    { $match: { createdAt: { $gte: sinceDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
  const result = Object.fromEntries(statuses.map((status) => [status, 0]));

  rows.forEach((row) => {
    result[row._id] = row.count;
  });

  return result;
};

const countOrdersByStatusSince = async (sinceDate) => {
  const rows = await MedicineOrder.aggregate([
    { $match: { createdAt: { $gte: sinceDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statuses = [
    'placed',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];
  const result = Object.fromEntries(statuses.map((status) => [status, 0]));

  rows.forEach((row) => {
    result[row._id] = row.count;
  });

  return result;
};

const countPendingLabBookings = () => LabBooking.countDocuments({ status: 'pending' });

module.exports = {
  countUsers,
  countDoctorsByVerificationStatus,
  countAppointmentsByStatusSince,
  countOrdersByStatusSince,
  countPendingLabBookings,
};
