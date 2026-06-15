const mongoose = require('mongoose');
const DoctorProfile = require('../../doctors/models/doctorProfile.model');
const PatientProfile = require('../../patients/models/patientProfile.model');
const Appointment = require('../../appointments/models/appointment.model');
const Payment = require('../../payments/models/payment.model');
const { PaymentStatus } = require('../../../shared/enums/paymentStatus.enum');

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildDateRange(fromDate, toDate, field = 'createdAt') {
  if (!fromDate && !toDate) return {};
  const range = {};
  range[field] = {};
  if (fromDate) range[field].$gte = new Date(fromDate);
  if (toDate) range[field].$lte = endOfDay(new Date(toDate));
  return range;
}

class ReportRepository {
  async getRevenueReport({ fromDate, toDate } = {}) {
    const match = { status: PaymentStatus.SUCCEEDED, isActive: true, ...buildDateRange(fromDate, toDate, 'paidAt') };

    const [summaryAgg, byGateway, byMonth, rows] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            refundAmount: { $sum: '$refundAmount' },
            count: { $sum: 1 },
            currency: { $first: '$currency' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: '$gateway', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
      ]),
      Payment.aggregate([
        { $match: { ...match, paidAt: { $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Payment.find(match)
        .sort({ paidAt: -1 })
        .limit(500)
        .populate({ path: 'bookedByUserId', select: 'firstName lastName email' })
        .populate({
          path: 'appointmentId',
          select: 'appointmentDate startTime',
          populate: {
            path: 'doctorProfileId',
            select: 'title userId',
            populate: { path: 'userId', select: 'firstName lastName' },
          },
        }),
    ]);

    const summary = summaryAgg[0] || { totalAmount: 0, refundAmount: 0, count: 0, currency: 'PKR' };
    return {
      summary: {
        totalAmount: summary.totalAmount,
        refundAmount: summary.refundAmount,
        netAmount: summary.totalAmount - summary.refundAmount,
        transactionCount: summary.count,
        currency: summary.currency || 'PKR',
      },
      byGateway: byGateway.map((g) => ({ gateway: g._id, amount: g.amount, count: g.count })),
      byMonth: byMonth.map((m) => ({ period: m._id, amount: m.amount, count: m.count })),
      rows,
    };
  }

  async getDoctorReport({ fromDate, toDate, verificationStatus } = {}) {
    const filter = { isActive: true, ...buildDateRange(fromDate, toDate) };
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const [byStatus, bySpecialty, rows] = await Promise.all([
      DoctorProfile.aggregate([
        { $match: { isActive: true, ...buildDateRange(fromDate, toDate) } },
        { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
      ]),
      DoctorProfile.aggregate([
        { $match: filter },
        { $unwind: '$specialtyIds' },
        { $group: { _id: '$specialtyIds', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'specialties',
            localField: '_id',
            foreignField: '_id',
            as: 'specialty',
          },
        },
        { $unwind: { path: '$specialty', preserveNullAndEmptyArrays: true } },
        { $project: { specialtyId: '$_id', name: '$specialty.name', count: 1 } },
      ]),
      DoctorProfile.find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .populate({ path: 'userId', select: 'firstName lastName email phone isActive' })
        .populate({ path: 'specialtyIds', select: 'name' }),
    ]);

    const total = rows.length;
    const verified = byStatus.find((s) => s._id === 'VERIFIED')?.count || 0;
    const pending = byStatus.find((s) => s._id === 'PENDING')?.count || 0;
    const rejected = byStatus.find((s) => s._id === 'REJECTED')?.count || 0;
    const avgFee =
      rows.length > 0
        ? rows.reduce((sum, d) => sum + (d.consultationFee || 0), 0) / rows.length
        : 0;

    const doctorIds = rows.map((d) => d._id);
    const appointmentCounts = doctorIds.length
      ? await Appointment.aggregate([
          { $match: { doctorProfileId: { $in: doctorIds }, isActive: true } },
          { $group: { _id: '$doctorProfileId', count: { $sum: 1 } } },
        ])
      : [];
    const apptMap = Object.fromEntries(appointmentCounts.map((a) => [a._id.toString(), a.count]));

    return {
      summary: { total, verified, pending, rejected, avgConsultationFee: Math.round(avgFee * 100) / 100 },
      byVerificationStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      bySpecialty: bySpecialty.map((s) => ({
        specialtyId: s.specialtyId?.toString(),
        name: s.name || 'Unknown',
        count: s.count,
      })),
      rows,
      appointmentCountMap: apptMap,
    };
  }

  async getPatientReport({ fromDate, toDate } = {}) {
    const dateFilter = buildDateRange(fromDate, toDate);
    const filter = Object.keys(dateFilter).length ? dateFilter : {};

    const [byCity, rows] = await Promise.all([
      PatientProfile.aggregate([
        { $match: filter },
        { $group: { _id: { $ifNull: ['$city', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      PatientProfile.find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .populate({ path: 'userId', select: 'firstName lastName email phone isActive createdAt' }),
    ]);

    const active = rows.filter((p) => p.isActive).length;
    const patientIds = rows.map((p) => p._id);
    const appointmentCounts = patientIds.length
      ? await Appointment.aggregate([
          { $match: { patientProfileId: { $in: patientIds }, isActive: true } },
          { $group: { _id: '$patientProfileId', count: { $sum: 1 } } },
        ])
      : [];
    const apptMap = Object.fromEntries(appointmentCounts.map((a) => [a._id.toString(), a.count]));

    return {
      summary: { total: rows.length, active, inactive: rows.length - active },
      byCity: byCity.map((c) => ({ city: c._id, count: c.count })),
      rows,
      appointmentCountMap: apptMap,
    };
  }

  async getAppointmentReport({ fromDate, toDate, status } = {}) {
    const filter = { isActive: true, ...buildDateRange(fromDate, toDate, 'appointmentDate') };
    if (status) filter.status = status;

    const [byStatus, byMonth, rows] = await Promise.all([
      Appointment.aggregate([
        { $match: { isActive: true, ...buildDateRange(fromDate, toDate, 'appointmentDate') } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$appointmentDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Appointment.find(filter)
        .sort({ appointmentDate: -1 })
        .limit(500)
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
        .populate({ path: 'clinicId', select: 'name city' }),
    ]);

    const total = byStatus.reduce((sum, s) => sum + s.count, 0);

    return {
      summary: {
        total,
        pending: byStatus.find((s) => s._id === 'PENDING')?.count || 0,
        confirmed: byStatus.find((s) => s._id === 'CONFIRMED')?.count || 0,
        completed: byStatus.find((s) => s._id === 'COMPLETED')?.count || 0,
        cancelled: byStatus.find((s) => s._id === 'CANCELLED')?.count || 0,
      },
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      byMonth: byMonth.map((m) => ({ period: m._id, count: m.count })),
      rows,
    };
  }
}

module.exports = ReportRepository;
