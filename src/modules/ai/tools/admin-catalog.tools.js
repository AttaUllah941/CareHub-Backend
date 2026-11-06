const { z } = require('zod');
const { BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const labsService = require('../../labs/labs.service');
const medicinesService = require('../../medicines/medicines.service');
const {
  createLabSchema,
  createLabTestBodySchema,
  updateLabTestSchema,
} = require('../../labs/labs.validator');
const { createMedicineBodySchema, updateMedicineSchema, updatePharmacySchema } = require('../../medicines/medicines.validator');
const { defineTool } = require('./tool.registry');
const { citySchema, searchTextSchema, objectId, limitSchema, pkr, parseOrThrow } = require('./tool.helpers');
const ui = require('./ui.helpers');

const diff = (label, before, after, format = String) =>
  before === after ? null : { label, value: `${format(before)} → ${format(after)}` };

// ---------------- Labs ----------------

const listLabs = defineTool({
  name: 'listLabs',
  agent: 'ADMIN',
  intent: 'catalog',
  description: 'List active laboratories, optionally by city or name (use to get lab ids).',
  schema: z.object({ city: citySchema.optional(), name: searchTextSchema.optional(), limit: limitSchema(15, 8) }),
  execute: async ({ city, name, limit }) => {
    const { labs } = await labsService.listPublicLabs({ city, page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
    const needle = name?.toLowerCase();
    const rows = labs.filter((lab) => !needle || lab.name.toLowerCase().includes(needle)).slice(0, limit ?? 8);
    return {
      data: { total: rows.length, labs: rows.map((l) => ({ id: l.id, name: l.name, city: l.city })) },
      actions: rows.length ? [ui.table('Laboratories', ['Name', 'City', 'Rating'], rows.map((l) => [l.name, l.city, l.rating]))] : [],
    };
  },
});

const listLabTests = defineTool({
  name: 'listLabTests',
  agent: 'ADMIN',
  intent: 'catalog',
  description: 'List the active tests and prices of one laboratory (use to get test ids).',
  schema: z.object({ labId: objectId('labId'), search: searchTextSchema.optional(), limit: limitSchema(25, 15) }),
  execute: async ({ labId, search, limit }) => {
    const { tests } = await labsService.listPublicLabTests(labId, { search, page: 1, limit: limit ?? 15, sortBy: 'name', sortOrder: 'asc' });
    return {
      data: { total: tests.length, tests: tests.map((t) => ({ id: t.id, name: t.name, price: t.price, homeCollection: t.homeCollectionAvailable })) },
      actions: tests.length ? [ui.table('Lab tests', ['Test', 'Price', 'Home collection'], tests.map((t) => [t.name, pkr(t.price, t.currency), t.homeCollectionAvailable ? 'Yes' : 'No']))] : [],
    };
  },
});

const createLab = defineTool({
  name: 'createLab',
  agent: 'ADMIN',
  intent: 'catalog',
  requiresConfirmation: true,
  description: 'Propose adding a new laboratory (name, city and address required). The admin must confirm.',
  schema: z.object({
    name: z.string().trim().min(2).max(200),
    city: citySchema,
    address: z.string().trim().min(1).max(500),
    phone: z.string().trim().max(30).optional(),
    timings: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
  }),
  prepare: async (args) => {
    const payload = parseOrThrow(createLabSchema, args);
    return {
      args: payload,
      summary: `Add laboratory "${payload.name}" in ${payload.city}.`,
      details: [{ label: 'Address', value: payload.address }, ...(payload.phone ? [{ label: 'Phone', value: payload.phone }] : []), ...(payload.timings ? [{ label: 'Timings', value: payload.timings }] : [])],
    };
  },
  execute: async (args) => {
    const { lab } = await labsService.createLab(parseOrThrow(createLabSchema, args));
    return { data: { labId: lab.id }, outcome: `Laboratory "${lab.name}" was added (id ${lab.id}).` };
  },
});

const createLabTest = defineTool({
  name: 'createLabTest',
  agent: 'ADMIN',
  intent: 'catalog',
  requiresConfirmation: true,
  description: 'Propose adding a test to a laboratory with a price. The admin must confirm.',
  schema: z.object({
    labId: objectId('labId'),
    name: z.string().trim().min(2).max(200),
    price: z.number().min(0),
    homeCollectionAvailable: z.boolean().optional(),
    description: z.string().trim().max(2000).optional(),
  }),
  prepare: async ({ labId, ...rest }) => {
    const payload = parseOrThrow(createLabTestBodySchema, rest);
    const { labs } = await labsService.listPublicLabs({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
    const lab = labs.find((item) => item.id === labId);
    if (!lab) throw new NotFoundError('Lab not found.');
    return { args: { labId, ...payload }, summary: `Add test "${payload.name}" at ${lab.name} for ${pkr(payload.price)}.` };
  },
  execute: async ({ labId, ...rest }) => {
    const { test } = await labsService.createLabTest(labId, parseOrThrow(createLabTestBodySchema, rest));
    return { data: { testId: test.id }, outcome: `Test "${test.name}" was added at ${pkr(test.price, test.currency)}.` };
  },
});

const updateLabTest = defineTool({
  name: 'updateLabTest',
  agent: 'ADMIN',
  intent: 'catalog',
  requiresConfirmation: true,
  description: 'Propose changing a lab test\'s price, name, home-collection flag or active status. The admin must confirm.',
  schema: z.object({
    labId: objectId('labId'),
    testId: objectId('testId'),
    price: z.number().min(0).optional(),
    name: z.string().trim().min(2).max(200).optional(),
    homeCollectionAvailable: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
  prepare: async ({ labId, testId, ...changes }) => {
    const update = parseOrThrow(updateLabTestSchema, changes);
    if (!Object.keys(update).length) throw new BadRequestError('Nothing to change was specified.');

    const { tests } = await labsService.listPublicLabTests(labId, { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
    const current = tests.find((test) => test.id === testId);
    if (!current) throw new NotFoundError('Active test not found at that lab.');

    const changesList = [
      update.price != null && diff('Price', current.price, update.price, pkr),
      update.name != null && diff('Name', current.name, update.name),
      update.homeCollectionAvailable != null && diff('Home collection', current.homeCollectionAvailable, update.homeCollectionAvailable),
      update.isActive != null && { label: 'Active', value: `${current.isActive} → ${update.isActive}` },
    ].filter(Boolean);
    if (!changesList.length) throw new BadRequestError('That would not change anything.');

    return { args: { labId, testId, ...update }, summary: `Update lab test "${current.name}".`, details: changesList };
  },
  execute: async ({ labId, testId, ...changes }) => {
    const { test } = await labsService.updateLabTest(labId, testId, parseOrThrow(updateLabTestSchema, changes));
    return { data: { testId: test.id }, outcome: `"${test.name}" updated (price ${pkr(test.price, test.currency)}, ${test.isActive ? 'active' : 'inactive'}).` };
  },
});

// ---------------- Pharmacies & medicines ----------------

const listPharmacies = defineTool({
  name: 'listPharmacies',
  agent: 'ADMIN',
  intent: 'catalog',
  description: 'List active pharmacies, optionally by city or name (use to get pharmacy ids).',
  schema: z.object({ city: citySchema.optional(), search: searchTextSchema.optional(), limit: limitSchema(15, 8) }),
  execute: async ({ city, search, limit }) => {
    const { pharmacies } = await medicinesService.listPublicPharmacies({ city, search, page: 1, limit: limit ?? 8, sortBy: 'name', sortOrder: 'asc' });
    return {
      data: { total: pharmacies.length, pharmacies: pharmacies.map((p) => ({ id: p.id, name: p.name, city: p.city })) },
      actions: pharmacies.length ? [ui.table('Pharmacies', ['Name', 'City', 'Delivery'], pharmacies.map((p) => [p.name, p.city, p.isHomeDelivery ? 'Yes' : 'No']))] : [],
    };
  },
});

const listMedicines = defineTool({
  name: 'listMedicines',
  agent: 'ADMIN',
  intent: 'catalog',
  description: 'List active medicines with price and stock, optionally by name or pharmacy (use to get medicine ids).',
  schema: z.object({ search: searchTextSchema.optional(), pharmacyId: objectId('pharmacyId').optional(), limit: limitSchema(25, 12) }),
  execute: async ({ search, pharmacyId, limit }) => {
    const { medicines } = await medicinesService.listPublicMedicines({ search, pharmacyId, page: 1, limit: limit ?? 12, sortBy: 'name', sortOrder: 'asc' });
    return {
      data: { total: medicines.length, medicines: medicines.map((m) => ({ id: m.id, pharmacyId: m.pharmacyId, name: m.name, price: m.price, stock: m.stock })) },
      actions: medicines.length ? [ui.table('Medicines', ['Name', 'Pharmacy', 'Price', 'Stock'], medicines.map((m) => [m.name, m.pharmacy?.name || '', pkr(m.price, m.currency), m.stock]))] : [],
    };
  },
});

const createMedicine = defineTool({
  name: 'createMedicine',
  agent: 'ADMIN',
  intent: 'catalog',
  requiresConfirmation: true,
  description: 'Propose adding a medicine to a pharmacy\'s inventory. The admin must confirm.',
  schema: z.object({
    pharmacyId: objectId('pharmacyId'),
    name: z.string().trim().min(2).max(200),
    manufacturer: z.string().trim().min(2).max(150),
    price: z.number().min(0),
    stock: z.number().int().min(0).optional(),
    requiresPrescription: z.boolean().optional(),
    description: z.string().trim().max(2000).optional(),
  }),
  prepare: async ({ pharmacyId, ...rest }) => {
    const payload = parseOrThrow(createMedicineBodySchema, rest);
    const { pharmacies } = await medicinesService.listPublicPharmacies({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
    const pharmacy = pharmacies.find((item) => item.id === pharmacyId);
    if (!pharmacy) throw new NotFoundError('Pharmacy not found.');
    return {
      args: { pharmacyId, ...payload },
      summary: `Add "${payload.name}" (${payload.manufacturer}) to ${pharmacy.name} at ${pkr(payload.price)}.`,
      details: [{ label: 'Stock', value: String(payload.stock ?? 0) }, { label: 'Prescription required', value: payload.requiresPrescription ? 'Yes' : 'No' }],
    };
  },
  execute: async ({ pharmacyId, ...rest }) => {
    const { medicine } = await medicinesService.createMedicine(pharmacyId, parseOrThrow(createMedicineBodySchema, rest));
    return { data: { medicineId: medicine.id }, outcome: `"${medicine.name}" was added to the inventory.` };
  },
});

const updateMedicine = defineTool({
  name: 'updateMedicine',
  agent: 'ADMIN',
  intent: 'catalog',
  requiresConfirmation: true,
  description: 'Propose changing a medicine\'s price, stock, prescription flag or active status. The admin must confirm.',
  schema: z.object({
    pharmacyId: objectId('pharmacyId'),
    medicineId: objectId('medicineId'),
    price: z.number().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    requiresPrescription: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
  prepare: async ({ pharmacyId, medicineId, ...changes }) => {
    const update = parseOrThrow(updateMedicineSchema, changes);
    if (!Object.keys(update).length) throw new BadRequestError('Nothing to change was specified.');

    const { medicine } = await medicinesService.getPublicMedicineDetail(medicineId);
    if (medicine.pharmacyId !== pharmacyId) throw new NotFoundError('That medicine does not belong to this pharmacy.');

    const details = [
      update.price != null && diff('Price', medicine.price, update.price, pkr),
      update.stock != null && diff('Stock', medicine.stock, update.stock),
      update.requiresPrescription != null && diff('Prescription required', medicine.requiresPrescription, update.requiresPrescription),
      update.isActive != null && { label: 'Active', value: `${medicine.isActive} → ${update.isActive}` },
    ].filter(Boolean);
    if (!details.length) throw new BadRequestError('That would not change anything.');

    return { args: { pharmacyId, medicineId, ...update }, summary: `Update "${medicine.name}" at ${medicine.pharmacy?.name || 'the pharmacy'}.`, details };
  },
  execute: async ({ pharmacyId, medicineId, ...changes }) => {
    const { medicine } = await medicinesService.updateMedicine(pharmacyId, medicineId, parseOrThrow(updateMedicineSchema, changes));
    return { data: { medicineId: medicine.id }, outcome: `"${medicine.name}" updated (price ${pkr(medicine.price, medicine.currency)}, stock ${medicine.stock}).` };
  },
});

const setPharmacyActive = defineTool({
  name: 'setPharmacyActive',
  agent: 'ADMIN',
  intent: 'catalog',
  requiresConfirmation: true,
  description: 'Propose activating or deactivating a pharmacy. The admin must confirm.',
  schema: z.object({ pharmacyId: objectId('pharmacyId'), isActive: z.boolean() }),
  prepare: async ({ pharmacyId, isActive }) => {
    const { pharmacies } = await medicinesService.listPublicPharmacies({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
    const pharmacy = pharmacies.find((item) => item.id === pharmacyId);
    if (!pharmacy && isActive) {
      return { args: { pharmacyId, isActive }, summary: `Activate pharmacy ${pharmacyId}.` };
    }
    if (!pharmacy) throw new NotFoundError('Active pharmacy not found.');
    return { args: { pharmacyId, isActive }, summary: `${isActive ? 'Activate' : 'Deactivate'} pharmacy "${pharmacy.name}" (${pharmacy.city}). ${isActive ? '' : 'Its medicines will disappear from public listings.'}`.trim() };
  },
  execute: async ({ pharmacyId, isActive }) => {
    const { pharmacy } = await medicinesService.updatePharmacy(pharmacyId, parseOrThrow(updatePharmacySchema, { isActive }));
    return { data: { pharmacyId: pharmacy.id }, outcome: `"${pharmacy.name}" is now ${pharmacy.isActive ? 'active' : 'inactive'}.` };
  },
});

module.exports = [listLabs, listLabTests, createLab, createLabTest, updateLabTest, listPharmacies, listMedicines, createMedicine, updateMedicine, setPharmacyActive];
