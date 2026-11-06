const { BadRequestError } = require('../../core/errors/AppError');
const { CLINIC_UTC_OFFSET } = require('../../shared/utils/timeSlots.util');
const reportsRepository = require('./reports.repository');

/**
 * Read-only analytics for doctors and admins. There are deliberately no HTTP routes yet — the
 * AI agents consume these functions; doctor functions take an explicit doctor and only ever
 * query that doctor's data.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

const todayString = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T12:00:00${CLINIC_UTC_OFFSET}`);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(
    new Date(date.getTime() + days * DAY_MS),
  );
};

/** Resolves an inclusive date range in clinic time; defaults to the last 30 days. */
const resolveRange = ({ from, to } = {}) => {
  const toDate = to || todayString();
  const fromDate = from || addDays(toDate, -29);

  const start = new Date(`${fromDate}T00:00:00.000${CLINIC_UTC_OFFSET}`);
  const end = new Date(`${toDate}T23:59:59.999${CLINIC_UTC_OFFSET}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestError('Dates must use the YYYY-MM-DD format.');
  }
  if (start > end) throw new BadRequestError('The start date must not be after the end date.');
  if ((end - start) / DAY_MS > MAX_RANGE_DAYS) {
    throw new BadRequestError(`The date range cannot exceed ${MAX_RANGE_DAYS} days.`);
  }

  return { from: fromDate, to: toDate, start, end };
};

const toCountMap = (rows, keyField = '_id') =>
  Object.fromEntries(rows.map((row) => [row[keyField], row.count]));

const sum = (rows, field) => rows.reduce((total, row) => total + (row[field] || 0), 0);

// ---------------- Doctor ----------------

const doctorAppointmentStats = async (doctor, rangeInput) => {
  const range = resolveRange(rangeInput);
  const [byStatus, byType, byDay] = await Promise.all([
    reportsRepository.appointmentsByStatus(doctor._id, range.start, range.end),
    reportsRepository.appointmentsByType(doctor._id, range.start, range.end),
    reportsRepository.appointmentsByDay(doctor._id, range.start, range.end),
  ]);

  const status = toCountMap(byStatus);
  const total = sum(byStatus, 'count');
  const decided = (status.completed || 0) + (status.cancelled || 0) + (status.rejected || 0);

  return {
    range: { from: range.from, to: range.to },
    total,
    byStatus: status,
    byType: toCountMap(byType),
    completionRate: decided ? Math.round(((status.completed || 0) / decided) * 100) : null,
    daily: byDay.map((row) => ({ date: row._id, total: row.total, completed: row.completed })),
  };
};

/** Earnings = completed appointments × the doctor's current consultation fee (same rule as the portal). */
const doctorEarnings = async (doctor, rangeInput) => {
  const range = resolveRange(rangeInput);
  const [completedInRange, completedAllTime, upcomingConfirmed] = await Promise.all([
    reportsRepository.countCompleted(doctor._id, range.start, range.end),
    reportsRepository.countCompleted(doctor._id),
    reportsRepository.countUpcomingConfirmed(doctor._id, new Date()),
  ]);
  const fee = doctor.consultationFee || 0;

  return {
    range: { from: range.from, to: range.to },
    currency: doctor.currency || 'PKR',
    consultationFee: fee,
    completedInRange,
    earningsInRange: completedInRange * fee,
    completedAllTime,
    earningsAllTime: completedAllTime * fee,
    upcomingConfirmed,
    expectedFromUpcoming: upcomingConfirmed * fee,
  };
};

/**
 * Follow-up candidates: patients whose latest completed visit was at least `minDaysSince` days ago
 * (within `lookbackDays`) and who have no pending/confirmed appointment with this doctor.
 */
const doctorFollowUps = async (doctor, { minDaysSince = 7, lookbackDays = 90 } = {}) => {
  const since = new Date(Date.now() - lookbackDays * DAY_MS);
  const completed = await reportsRepository.recentCompletedWithPatient(doctor._id, since);

  const byPatient = new Map();
  for (const visit of completed) {
    const key = visit.patientId.toString();
    const entry = byPatient.get(key) || { patientId: key, patientName: visit.patientName, visits: 0, lastVisit: visit.scheduledAt };
    entry.visits += 1;
    byPatient.set(key, entry);
  }

  const patientIds = [...byPatient.keys()];
  const active = patientIds.length ? await reportsRepository.activeForPatients(doctor._id, patientIds) : [];
  const hasActive = new Set(active.map((row) => row.patientId.toString()));
  const cutoff = Date.now() - minDaysSince * DAY_MS;

  const followUps = [...byPatient.values()]
    .filter((entry) => !hasActive.has(entry.patientId) && entry.lastVisit.getTime() <= cutoff)
    .sort((a, b) => a.lastVisit - b.lastVisit)
    .map((entry) => ({
      patientId: entry.patientId,
      patientName: entry.patientName || 'Patient',
      visits: entry.visits,
      lastVisit: entry.lastVisit.toISOString(),
      daysSinceLastVisit: Math.floor((Date.now() - entry.lastVisit.getTime()) / DAY_MS),
    }));

  return {
    criteria: { minDaysSince, lookbackDays },
    followUps,
    pendingRequests: await reportsRepository.countPending(doctor._id),
  };
};

// ---------------- Admin ----------------

const adminUsersReport = async (rangeInput) => {
  const range = resolveRange(rangeInput);
  const [byRole, created] = await Promise.all([
    reportsRepository.usersByRole(),
    reportsRepository.newUsersInRange(range.start, range.end),
  ]);

  const roles = {};
  for (const row of byRole) {
    const entry = (roles[row._id.role] ||= { active: 0, inactive: 0 });
    entry[row._id.isActive ? 'active' : 'inactive'] += row.count;
  }

  return {
    range: { from: range.from, to: range.to },
    totalUsers: sum(byRole, 'count'),
    byRole: roles,
    newInRange: toCountMap(created),
    newInRangeTotal: sum(created, 'count'),
  };
};

const adminAppointmentsReport = async (rangeInput) => {
  const range = resolveRange(rangeInput);
  const [rows, topDoctors] = await Promise.all([
    reportsRepository.platformAppointmentsByStatus(range.start, range.end),
    reportsRepository.topDoctorsByCompleted(range.start, range.end),
  ]);

  const byStatus = {};
  const byType = {};
  for (const row of rows) {
    byStatus[row._id.status] = (byStatus[row._id.status] || 0) + row.count;
    byType[row._id.type] = (byType[row._id.type] || 0) + row.count;
  }

  return {
    range: { from: range.from, to: range.to },
    total: sum(rows, 'count'),
    byStatus,
    byType,
    topDoctors: topDoctors.map((doctor) => ({ name: doctor.name || 'Unknown', completed: doctor.completed })),
  };
};

const adminOrdersReport = async (rangeInput) => {
  const range = resolveRange(rangeInput);
  const rows = await reportsRepository.ordersByStatus(range.start, range.end);
  const byStatus = Object.fromEntries(rows.map((row) => [row._id, { orders: row.orders, amount: row.amount }]));
  const active = rows.filter((row) => row._id !== 'cancelled');

  return {
    range: { from: range.from, to: range.to },
    totalOrders: sum(rows, 'orders'),
    byStatus,
    orderValueExcludingCancelled: sum(active, 'amount'),
    deliveredValue: byStatus.delivered?.amount || 0,
    currency: 'PKR',
  };
};

/**
 * "Revenue" here is gross booking value flowing through the platform (CareHub has no commission
 * model yet): non-cancelled medicine orders + non-cancelled lab bookings + completed consultation
 * fees (estimated from each doctor's current fee).
 */
const adminRevenueReport = async (rangeInput) => {
  const range = resolveRange(rangeInput);
  const [orders, labs, fees] = await Promise.all([
    reportsRepository.ordersByStatus(range.start, range.end),
    reportsRepository.labBookingsByStatus(range.start, range.end),
    reportsRepository.completedAppointmentFees(range.start, range.end),
  ]);

  const orderRows = orders.filter((row) => row._id !== 'cancelled');
  const labRows = labs.filter((row) => row._id !== 'cancelled');
  const medicines = sum(orderRows, 'amount');
  const labAmount = sum(labRows, 'amount');
  const consultations = fees[0]?.fees || 0;

  return {
    range: { from: range.from, to: range.to },
    currency: 'PKR',
    medicines: { orders: sum(orderRows, 'orders'), amount: medicines },
    labs: { bookings: sum(labRows, 'bookings'), amount: labAmount },
    consultations: { completed: fees[0]?.completed || 0, estimatedFees: consultations },
    totalBookingValue: medicines + labAmount + consultations,
    note: 'Gross booking value, not net revenue. Consultation fees use each doctor\'s current fee.',
  };
};

module.exports = {
  resolveRange,
  doctorAppointmentStats,
  doctorEarnings,
  doctorFollowUps,
  adminUsersReport,
  adminAppointmentsReport,
  adminOrdersReport,
  adminRevenueReport,
};
