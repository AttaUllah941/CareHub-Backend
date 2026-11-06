const { z } = require('zod');
const { BadRequestError } = require('../../../core/errors/AppError');
const medicinesService = require('../../medicines/medicines.service');
const { createOrderSchema } = require('../../medicines/medicines.validator');
const { DELIVERY_TYPES, PAYMENT_METHODS } = require('../../medicines/medicine-orders.model');
const { defineTool } = require('./tool.registry');
const { getPatientProfile } = require('./patient-profile');
const {
  citySchema,
  searchTextSchema,
  objectId,
  limitSchema,
  pkr,
  parseOrThrow,
} = require('./tool.helpers');

const compactMedicine = (medicine) => ({
  id: medicine.id,
  name: medicine.name,
  manufacturer: medicine.manufacturer,
  price: medicine.price,
  currency: medicine.currency,
  requiresPrescription: medicine.requiresPrescription,
  inStock: medicine.stock > 0,
  stock: medicine.stock,
  pharmacy: medicine.pharmacy
    ? { id: medicine.pharmacy.id, name: medicine.pharmacy.name, city: medicine.pharmacy.city }
    : { id: medicine.pharmacyId, name: '', city: '' },
});

const searchMedicines = defineTool({
  name: 'searchMedicines',
  agent: 'PATIENT',
  intent: 'medicines',
  description:
    'Search medicines by name/description with price, pharmacy and stock availability. Optionally restrict to one pharmacy.',
  schema: z.object({
    search: searchTextSchema,
    pharmacyId: objectId('pharmacyId').optional(),
    limit: limitSchema(10, 6),
  }),
  execute: async ({ search, pharmacyId, limit }) => {
    const { medicines } = await medicinesService.listPublicMedicines({
      search,
      pharmacyId,
      page: 1,
      limit: limit ?? 6,
      sortBy: 'price',
      sortOrder: 'asc',
    });
    const items = medicines.map(compactMedicine);
    return {
      data: { total: items.length, medicines: items },
      actions: items.length ? [{ type: 'MEDICINE_RESULTS', data: { medicines: items } }] : [],
    };
  },
});

const findPharmacies = defineTool({
  name: 'findPharmacies',
  agent: 'PATIENT',
  intent: 'medicines',
  description: 'Find pharmacies, optionally by city or name, with delivery info.',
  schema: z.object({
    city: citySchema.optional(),
    search: searchTextSchema.optional(),
    limit: limitSchema(8, 5),
  }),
  execute: async ({ city, search, limit }) => {
    const { pharmacies } = await medicinesService.listPublicPharmacies({
      city,
      search,
      page: 1,
      limit: limit ?? 5,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const items = pharmacies.map((pharmacy) => ({
      id: pharmacy.id,
      name: pharmacy.name,
      city: pharmacy.city,
      address: pharmacy.address,
      timings: pharmacy.timings,
      rating: pharmacy.rating,
      isHomeDelivery: pharmacy.isHomeDelivery,
      deliveryFee: pharmacy.deliveryFee,
      deliveryTime: pharmacy.deliveryTime,
      slug: pharmacy.slug,
      citySlug: pharmacy.citySlug,
    }));
    return {
      data: { total: items.length, pharmacies: items },
      actions: items.length ? [{ type: 'PHARMACY_RESULTS', data: { pharmacies: items } }] : [],
    };
  },
});

const createMedicineOrder = defineTool({
  name: 'createMedicineOrder',
  agent: 'PATIENT',
  intent: 'medicines',
  requiresConfirmation: true,
  description:
    'Propose placing a medicine order. The user must confirm. Prices always come from the catalog, never from the user. ' +
    'Prescription-only medicines cannot be ordered through chat. Ask for any missing delivery type, address and payment method first.',
  schema: z.object({
    items: z
      .array(z.object({ medicineId: objectId('medicineId'), quantity: z.number().int().min(1).max(20) }))
      .min(1)
      .max(10),
    deliveryType: z.enum(DELIVERY_TYPES),
    address: z.string().trim().min(5).max(500).describe('Delivery address, or pharmacy pickup note'),
    paymentMethod: z.enum(PAYMENT_METHODS),
    phone: z.string().trim().min(10).max(20).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  prepare: async (args, ctx) => {
    const profile = await getPatientProfile(ctx.user.id);
    const phone = args.phone || profile.phone;
    if (!phone) throw new BadRequestError('A contact phone number is required for the order.');

    const items = [];
    const lines = [];
    let total = 0;
    for (const item of args.items) {
      const { medicine } = await medicinesService.getPublicMedicineDetail(item.medicineId);
      if (medicine.requiresPrescription) {
        throw new BadRequestError(
          `${medicine.name} needs a prescription. Please upload it at checkout on the Medicines page (/medicines/cart) — I can't place prescription orders in chat.`,
        );
      }
      if (medicine.stock < item.quantity) {
        throw new BadRequestError(`Only ${medicine.stock} unit(s) of ${medicine.name} are in stock.`);
      }
      items.push({
        medicineId: medicine.id,
        pharmacyId: medicine.pharmacyId,
        quantity: item.quantity,
        unitPrice: medicine.price,
      });
      lines.push(`${item.quantity} × ${medicine.name}`);
      total += medicine.price * item.quantity;
    }

    const normalized = {
      items,
      deliveryType: args.deliveryType,
      address: args.address,
      paymentMethod: args.paymentMethod,
      patientName: profile.name,
      patientPhone: phone,
      notes: args.notes,
    };
    parseOrThrow(createOrderSchema, normalized);

    return {
      args: normalized,
      summary:
        `Order ${lines.join(', ')} — ${pkr(total)} (${args.deliveryType === 'home_delivery' ? 'home delivery' : 'store pickup'}, ` +
        `pay by ${args.paymentMethod.toUpperCase()}). Delivery charges may apply.`,
    };
  },
  execute: async (args, ctx) => {
    const payload = parseOrThrow(createOrderSchema, args);
    const { order } = await medicinesService.createOrder(payload, ctx.user);
    return {
      data: { orderRef: order.orderRef, status: order.status, totalAmount: order.totalAmount },
      actions: [
        {
          type: 'ACTION_RESULT',
          data: {
            kind: 'MEDICINE_ORDER',
            title: 'Order placed',
            lines: [`Reference ${order.orderRef}`, `Total ${pkr(order.totalAmount, order.currency)}`, `Status: ${order.status}`],
            link: `/medicines/orders/${order.id}`,
          },
        },
      ],
      outcome: `Your order ${order.orderRef} has been placed.`,
    };
  },
});

module.exports = [searchMedicines, findPharmacies, createMedicineOrder];
