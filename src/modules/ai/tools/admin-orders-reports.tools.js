const { z } = require('zod');
const { BadRequestError } = require('../../../core/errors/AppError');
const medicinesService = require('../../medicines/medicines.service');
const adminService = require('../../admin/admin.service');
const reportsService = require('../../reports/reports.service');
const { ORDER_STATUSES, STATUS_TRANSITIONS } = require('../../medicines/medicine-orders.model');
const { defineTool } = require('./tool.registry');
const { objectId, searchTextSchema, dateSchema, limitSchema, pkr, formatDateTime } = require('./tool.helpers');
const ui = require('./ui.helpers');

const rangeSchema = {
  from: dateSchema.optional().describe('Start date YYYY-MM-DD (default: 30 days ago)'),
  to: dateSchema.optional().describe('End date YYYY-MM-DD (default: today)'),
};

const orderItem = (order) => {
  const next = (STATUS_TRANSITIONS[order.status] || []).find((status) => status !== 'cancelled');
  return {
    id: order.id,
    title: order.orderRef,
    subtitle: `${order.patientName || 'Guest'} · ${pkr(order.totalAmount, order.currency)}`,
    badge: order.status,
    lines: [formatDateTime(order.createdAt), `${order.items.length} item(s) · ${order.paymentMethod.toUpperCase()}`],
    actions: next ? [{ label: `Mark ${next.replace(/_/g, ' ')}`, message: `Update order ${order.orderRef} (order id ${order.id}) to ${next}.` }] : [],
  };
};

const searchOrders = defineTool({
  name: 'searchOrders',
  agent: 'ADMIN',
  intent: 'orders',
  description: 'Search medicine orders by status, order reference or creation date range.',
  schema: z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    search: searchTextSchema.optional().describe('Order reference, e.g. ORD-2026…'),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    limit: limitSchema(15, 8),
  }),
  execute: async ({ status, search, from, to, limit }) => {
    const { orders, pagination } = await medicinesService.listAdminOrders({
      status,
      search,
      from: from ? `${from}T00:00:00+05:00` : undefined,
      to: to ? `${to}T23:59:59+05:00` : undefined,
      page: 1,
      limit: limit ?? 8,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      data: {
        total: pagination.total,
        orders: orders.map((o) => ({ id: o.id, ref: o.orderRef, patient: o.patientName, total: o.totalAmount, status: o.status, createdAt: o.createdAt })),
      },
      actions: orders.length ? [ui.list(`Orders (${pagination.total})`, orders.map(orderItem))] : [],
    };
  },
});

const getOrder = defineTool({
  name: 'getOrder',
  agent: 'ADMIN',
  intent: 'orders',
  description: 'Show the details of one medicine order (items, delivery, payment, status).',
  schema: z.object({ orderId: objectId('orderId') }),
  execute: async ({ orderId }, ctx) => {
    const { order } = await medicinesService.getOrderById(orderId, ctx.user);
    return {
      data: {
        ref: order.orderRef,
        status: order.status,
        patient: order.patientName,
        phone: order.patientPhone,
        total: order.totalAmount,
        delivery: order.deliveryType,
        payment: order.paymentMethod,
        items: order.items.map((i) => ({ medicine: i.medicine?.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      },
      actions: [
        ui.list('Order', [orderItem(order)]),
        ui.table('Items', ['Medicine', 'Qty', 'Unit price'], order.items.map((i) => [i.medicine?.name || i.medicineId, i.quantity, pkr(i.unitPrice, order.currency)])),
      ],
    };
  },
});

const updateOrderStatus = defineTool({
  name: 'updateOrderStatus',
  agent: 'ADMIN',
  intent: 'orders',
  requiresConfirmation: true,
  description: 'Propose moving an order to its next status (placed → confirmed → preparing → out_for_delivery → delivered, or cancelled). The admin must confirm.',
  schema: z.object({ orderId: objectId('orderId'), status: z.enum(ORDER_STATUSES) }),
  prepare: async ({ orderId, status }, ctx) => {
    const { order } = await medicinesService.getOrderById(orderId, ctx.user);
    if (!(STATUS_TRANSITIONS[order.status] || []).includes(status)) {
      throw new BadRequestError(`An order that is "${order.status}" cannot move to "${status}".`);
    }
    return {
      args: { orderId, status },
      summary: `Change order ${order.orderRef} from ${order.status} to ${status}.`,
      details: status === 'cancelled' ? [{ label: 'Note', value: 'Cancelling does not automatically refund or restock.' }] : [],
    };
  },
  execute: async ({ orderId, status }) => {
    const { order } = await medicinesService.updateOrderStatus(orderId, status);
    return { data: { status: order.status }, actions: [ui.list('Order updated', [orderItem(order)])], outcome: `Order ${order.orderRef} is now ${order.status}.` };
  },
});

const getDashboardSummary = defineTool({
  name: 'getDashboardSummary',
  agent: 'ADMIN',
  intent: 'reports',
  description: 'Platform snapshot: total users, doctor verification counts, appointments this week, orders today, pending lab bookings.',
  schema: z.object({}),
  execute: async () => {
    const stats = await adminService.getDashboardStats();
    const doctors = stats.doctorsByVerificationStatus || {};
    return {
      data: stats,
      actions: [
        ui.stats('Platform snapshot', [
          { label: 'Users', value: stats.totalUsers },
          { label: 'Doctors verified', value: doctors.VERIFIED ?? 0 },
          { label: 'Doctors pending', value: doctors.PENDING ?? 0 },
          { label: 'Pending lab bookings', value: stats.labBookingsPending },
        ]),
      ],
    };
  },
});

const getUsersReport = defineTool({
  name: 'getUsersReport',
  agent: 'ADMIN',
  intent: 'reports',
  description: 'User report: totals by role and active status, and new signups in a date range.',
  schema: z.object(rangeSchema),
  execute: async (args) => {
    const report = await reportsService.adminUsersReport(args);
    return {
      data: report,
      actions: [
        ui.stats(`Users · ${report.range.from} to ${report.range.to}`, [
          { label: 'Total users', value: report.totalUsers },
          { label: 'New in period', value: report.newInRangeTotal },
        ]),
        ui.table('By role', ['Role', 'Active', 'Inactive', 'New in period'], Object.entries(report.byRole).map(([role, c]) => [role, c.active, c.inactive, report.newInRange[role] || 0])),
      ],
    };
  },
});

const getAppointmentsReport = defineTool({
  name: 'getAppointmentsReport',
  agent: 'ADMIN',
  intent: 'reports',
  description: 'Appointment report: totals by status and type, and top doctors by completed visits.',
  schema: z.object(rangeSchema),
  execute: async (args) => {
    const report = await reportsService.adminAppointmentsReport(args);
    return {
      data: report,
      actions: [
        ui.stats(`Appointments · ${report.range.from} to ${report.range.to}`, [
          { label: 'Total', value: report.total },
          ...Object.entries(report.byStatus).map(([status, count]) => ({ label: status, value: count })),
          ...Object.entries(report.byType).map(([type, count]) => ({ label: `${type} visits`, value: count })),
        ]),
        ...(report.topDoctors.length ? [ui.table('Top doctors (completed)', ['Doctor', 'Completed'], report.topDoctors.map((d) => [d.name, d.completed]))] : []),
      ],
    };
  },
});

const getOrdersReport = defineTool({
  name: 'getOrdersReport',
  agent: 'ADMIN',
  intent: 'reports',
  description: 'Medicine order report: counts and value by status for a date range.',
  schema: z.object(rangeSchema),
  execute: async (args) => {
    const report = await reportsService.adminOrdersReport(args);
    return {
      data: report,
      actions: [
        ui.stats(`Orders · ${report.range.from} to ${report.range.to}`, [
          { label: 'Orders', value: report.totalOrders },
          { label: 'Value (excl. cancelled)', value: pkr(report.orderValueExcludingCancelled) },
          { label: 'Delivered value', value: pkr(report.deliveredValue) },
        ]),
        ...(Object.keys(report.byStatus).length
          ? [ui.table('By status', ['Status', 'Orders', 'Value'], Object.entries(report.byStatus).map(([status, v]) => [status, v.orders, pkr(v.amount)]))]
          : []),
      ],
    };
  },
});

const getRevenueReport = defineTool({
  name: 'getRevenueReport',
  agent: 'ADMIN',
  intent: 'reports',
  description:
    'Revenue report as gross booking value: medicine orders + lab bookings (both excluding cancelled) + completed consultation fees (estimated from each doctor\'s current fee). Not net revenue.',
  schema: z.object(rangeSchema),
  execute: async (args) => {
    const report = await reportsService.adminRevenueReport(args);
    return {
      data: report,
      actions: [
        ui.stats(`Booking value · ${report.range.from} to ${report.range.to}`, [
          { label: 'Total', value: pkr(report.totalBookingValue), hint: 'gross, not net revenue' },
          { label: 'Medicine orders', value: pkr(report.medicines.amount), hint: `${report.medicines.orders} orders` },
          { label: 'Lab bookings', value: pkr(report.labs.amount), hint: `${report.labs.bookings} bookings` },
          { label: 'Consultations (est.)', value: pkr(report.consultations.estimatedFees), hint: `${report.consultations.completed} completed` },
        ]),
      ],
    };
  },
});

module.exports = [searchOrders, getOrder, updateOrderStatus, getDashboardSummary, getUsersReport, getAppointmentsReport, getOrdersReport, getRevenueReport];
