function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
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

function defaultDateRange() {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 11);
  fromDate.setDate(1);
  return { fromDate: fromDate.toISOString().slice(0, 10), toDate: toDate.toISOString().slice(0, 10) };
}

function resolveGranularity(fromDate, toDate, requested) {
  if (requested === 'daily' || requested === 'monthly') return requested;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.ceil((to - from) / 86400000);
  return days <= 90 ? 'daily' : 'monthly';
}

function dateFormat(granularity) {
  return granularity === 'daily' ? '%Y-%m-%d' : '%Y-%m';
}

function addPeriod(date, granularity) {
  const d = new Date(date);
  if (granularity === 'daily') {
    d.setDate(d.getDate() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

function formatPeriod(date, granularity) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  if (granularity === 'daily') {
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return `${y}-${m}`;
}

function fillTrendSeries(rawPoints, fromDate, toDate, granularity, { countKey = 'count', amountKey } = {}) {
  const map = Object.fromEntries(
    rawPoints.map((p) => [p.period, p]),
  );

  const series = [];
  let cursor = startOfDay(new Date(fromDate));
  const end = endOfDay(new Date(toDate));
  let cumulative = 0;

  while (cursor <= end) {
    const period = formatPeriod(cursor, granularity);
    const point = map[period];
    const count = point?.count ?? 0;
    const amount = point?.amount ?? 0;
    cumulative += count;

    const entry = { period, count, cumulative };
    if (amountKey !== undefined) entry.amount = amount;
    series.push(entry);

    cursor = addPeriod(cursor, granularity);
  }

  return series;
}

module.exports = {
  endOfDay,
  startOfDay,
  buildDateRange,
  defaultDateRange,
  resolveGranularity,
  dateFormat,
  fillTrendSeries,
};
