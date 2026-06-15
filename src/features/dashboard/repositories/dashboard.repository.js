const DoctorProfile = require('../../doctors/models/doctorProfile.model');
const PatientProfile = require('../../patients/models/patientProfile.model');
const Appointment = require('../../appointments/models/appointment.model');
const Payment = require('../../payments/models/payment.model');
const Review = require('../../reviews/models/review.model');
const { DoctorVerificationStatus } = require('../../../shared/enums/doctorVerificationStatus.enum');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const { PaymentStatus } = require('../../../shared/enums/paymentStatus.enum');

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

class DashboardRepository {
  async getDoctorStats() {
    const monthStart = startOfMonth();
    const [total, verified, pending, rejected, newThisMonth] = await Promise.all([
      DoctorProfile.countDocuments({ isActive: true }),
      DoctorProfile.countDocuments({ isActive: true, verificationStatus: DoctorVerificationStatus.VERIFIED }),
      DoctorProfile.countDocuments({ isActive: true, verificationStatus: DoctorVerificationStatus.PENDING }),
      DoctorProfile.countDocuments({ isActive: true, verificationStatus: DoctorVerificationStatus.REJECTED }),
      DoctorProfile.countDocuments({ isActive: true, createdAt: { $gte: monthStart } }),
    ]);
    return { total, verified, pending, rejected, newThisMonth };
  }

  async getPatientStats() {
    const monthStart = startOfMonth();
    const [total, active, newThisMonth] = await Promise.all([
      PatientProfile.countDocuments({}),
      PatientProfile.countDocuments({ isActive: true }),
      PatientProfile.countDocuments({ createdAt: { $gte: monthStart } }),
    ]);
    return { total, active, newThisMonth };
  }

  async getAppointmentStats() {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const monthStart = startOfMonth();

    const [total, pending, confirmed, completed, cancelled, today, thisMonth] = await Promise.all([
      Appointment.countDocuments({ isActive: true }),
      Appointment.countDocuments({ isActive: true, status: AppointmentStatus.PENDING }),
      Appointment.countDocuments({ isActive: true, status: AppointmentStatus.CONFIRMED }),
      Appointment.countDocuments({ isActive: true, status: AppointmentStatus.COMPLETED }),
      Appointment.countDocuments({ isActive: true, status: AppointmentStatus.CANCELLED }),
      Appointment.countDocuments({
        isActive: true,
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
      }),
      Appointment.countDocuments({ isActive: true, createdAt: { $gte: monthStart } }),
    ]);

    return { total, pending, confirmed, completed, cancelled, today, thisMonth };
  }

  async getRevenueStats() {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

    const baseMatch = { status: PaymentStatus.SUCCEEDED, isActive: true };

    const [allTime, thisMonth, lastMonth] = await Promise.all([
      Payment.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            refunded: { $sum: '$refundAmount' },
            currency: { $first: '$currency' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { ...baseMatch, paidAt: { $gte: thisMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { ...baseMatch, paidAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const all = allTime[0] || { total: 0, refunded: 0, currency: 'PKR' };
    return {
      total: all.total || 0,
      refunded: all.refunded || 0,
      net: (all.total || 0) - (all.refunded || 0),
      currency: all.currency || 'PKR',
      thisMonth: thisMonth[0]?.total || 0,
      lastMonth: lastMonth[0]?.total || 0,
    };
  }

  async getPendingApprovalStats() {
    const [doctors, reviews, appointments] = await Promise.all([
      DoctorProfile.countDocuments({ isActive: true, verificationStatus: DoctorVerificationStatus.PENDING }),
      Review.countDocuments({ isActive: true, status: 'FLAGGED' }),
      Appointment.countDocuments({ isActive: true, status: AppointmentStatus.PENDING }),
    ]);
    return { doctors, reviews, appointments, total: doctors + reviews + appointments };
  }

  async getRecentPendingDoctors(limit = 5) {
    return DoctorProfile.find({ isActive: true, verificationStatus: DoctorVerificationStatus.PENDING })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: 'userId', select: 'firstName lastName email' })
      .populate({ path: 'specialtyIds', select: 'name' })
      .select('title yearsOfExperience consultationFee verificationStatus createdAt');
  }

  async getRecentAppointments(limit = 5) {
    return Appointment.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'patientProfileId',
        select: 'userId',
        populate: { path: 'userId', select: 'firstName lastName' },
      })
      .populate({
        path: 'doctorProfileId',
        select: 'userId title',
        populate: { path: 'userId', select: 'firstName lastName' },
      })
      .populate({ path: 'clinicId', select: 'name' })
      .select('appointmentDate startTime status consultationFee currency createdAt');
  }
}

module.exports = DashboardRepository;
