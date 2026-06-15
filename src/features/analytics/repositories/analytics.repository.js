const DoctorProfile = require('../../doctors/models/doctorProfile.model');
const PatientProfile = require('../../patients/models/patientProfile.model');
const Appointment = require('../../appointments/models/appointment.model');
const Payment = require('../../payments/models/payment.model');
const { PaymentStatus } = require('../../../shared/enums/paymentStatus.enum');
const {
  buildDateRange,
  defaultDateRange,
  resolveGranularity,
  dateFormat,
  fillTrendSeries,
} = require('../utils/analytics.util');

class AnalyticsRepository {
  _resolveParams({ fromDate, toDate, granularity } = {}) {
    const defaults = defaultDateRange();
    const resolvedFrom = fromDate || defaults.fromDate;
    const resolvedTo = toDate || defaults.toDate;
    const resolvedGranularity = resolveGranularity(resolvedFrom, resolvedTo, granularity);
    return { fromDate: resolvedFrom, toDate: resolvedTo, granularity: resolvedGranularity };
  }

  async _aggregateTrend(Model, dateField, matchExtra, { fromDate, toDate, granularity }) {
    const format = dateFormat(granularity);
    const match = { ...matchExtra, ...buildDateRange(fromDate, toDate, dateField) };

    const raw = await Model.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: `$${dateField}` } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const points = raw.map((r) => ({ period: r._id, count: r.count }));
    return fillTrendSeries(points, fromDate, toDate, granularity);
  }

  async getRevenueTrends(params = {}) {
    const { fromDate, toDate, granularity } = this._resolveParams(params);
    const format = dateFormat(granularity);
    const match = {
      status: PaymentStatus.SUCCEEDED,
      isActive: true,
      paidAt: { $ne: null },
      ...buildDateRange(fromDate, toDate, 'paidAt'),
    };

    const [raw, summaryAgg] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format, date: '$paidAt' } },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            currency: { $first: '$currency' },
          },
        },
      ]),
    ]);

    const points = raw.map((r) => ({ period: r._id, count: r.count, amount: r.amount }));
    const series = fillTrendSeries(points, fromDate, toDate, granularity, { amountKey: 'amount' });
    const summary = summaryAgg[0] || { totalAmount: 0, totalTransactions: 0, currency: 'PKR' };

    return {
      fromDate,
      toDate,
      granularity,
      summary: {
        totalAmount: summary.totalAmount,
        totalTransactions: summary.totalTransactions,
        currency: summary.currency || 'PKR',
      },
      series,
    };
  }

  async getDoctorGrowthTrends(params = {}) {
    const { fromDate, toDate, granularity } = this._resolveParams(params);
    const series = await this._aggregateTrend(
      DoctorProfile,
      'createdAt',
      { isActive: true },
      { fromDate, toDate, granularity },
    );

    const total = await DoctorProfile.countDocuments({ isActive: true });
    const newInRange = series.reduce((sum, p) => sum + p.count, 0);

    return { fromDate, toDate, granularity, summary: { total, newInRange }, series };
  }

  async getPatientGrowthTrends(params = {}) {
    const { fromDate, toDate, granularity } = this._resolveParams(params);
    const series = await this._aggregateTrend(
      PatientProfile,
      'createdAt',
      {},
      { fromDate, toDate, granularity },
    );

    const total = await PatientProfile.countDocuments({});
    const newInRange = series.reduce((sum, p) => sum + p.count, 0);

    return { fromDate, toDate, granularity, summary: { total, newInRange }, series };
  }

  async getAppointmentGrowthTrends(params = {}) {
    const { fromDate, toDate, granularity } = this._resolveParams(params);
    const series = await this._aggregateTrend(
      Appointment,
      'createdAt',
      { isActive: true },
      { fromDate, toDate, granularity },
    );

    const total = await Appointment.countDocuments({ isActive: true });
    const newInRange = series.reduce((sum, p) => sum + p.count, 0);

    return { fromDate, toDate, granularity, summary: { total, newInRange }, series };
  }

  async getOverview(params = {}) {
    const [revenue, doctors, patients, appointments] = await Promise.all([
      this.getRevenueTrends(params),
      this.getDoctorGrowthTrends(params),
      this.getPatientGrowthTrends(params),
      this.getAppointmentGrowthTrends(params),
    ]);

    return { revenue, doctors, patients, appointments };
  }
}

module.exports = AnalyticsRepository;
