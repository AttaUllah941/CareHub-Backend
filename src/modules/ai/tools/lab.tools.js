const { z } = require('zod');
const { BadRequestError } = require('../../../core/errors/AppError');
const labsService = require('../../labs/labs.service');
const { createBookingSchema } = require('../../labs/labs.validator');
const { defineTool } = require('./tool.registry');
const { getPatientProfile } = require('./patient-profile');
const {
  citySchema,
  searchTextSchema,
  objectId,
  dateSchema,
  limitSchema,
  pkr,
  formatDate,
  parseOrThrow,
} = require('./tool.helpers');

const compactLab = (lab) => ({
  id: lab.id,
  name: lab.name,
  city: lab.city,
  address: lab.address,
  rating: lab.rating,
  timings: lab.timings,
  phone: lab.phone,
  slug: lab.slug,
  citySlug: lab.citySlug,
});

const compactTest = (test) => ({
  id: test.id,
  name: test.name,
  price: test.price,
  currency: test.currency,
  homeCollectionAvailable: test.homeCollectionAvailable,
});

const searchLabs = defineTool({
  name: 'searchLabs',
  agent: 'PATIENT',
  intent: 'labs',
  description: 'Search diagnostic laboratories by city and/or name.',
  schema: z.object({
    city: citySchema.optional(),
    name: searchTextSchema.optional(),
    limit: limitSchema(8, 5),
  }),
  execute: async ({ city, name, limit }) => {
    const { labs } = await labsService.listPublicLabs({ city, page: 1, limit: 50, sortBy: 'name', sortOrder: 'asc' });
    const needle = name?.toLowerCase();
    const items = labs
      .filter((lab) => !needle || lab.name.toLowerCase().includes(needle))
      .slice(0, limit ?? 5)
      .map(compactLab);
    return {
      data: { total: items.length, labs: items },
      actions: items.length ? [{ type: 'LAB_RESULTS', data: { labs: items } }] : [],
    };
  },
});

const getLabTests = defineTool({
  name: 'getLabTests',
  agent: 'PATIENT',
  intent: 'labs',
  description: 'List the tests (with prices) offered by one laboratory, optionally filtered by a search term.',
  schema: z.object({
    labId: objectId('labId'),
    search: searchTextSchema.optional(),
    limit: limitSchema(20, 10),
  }),
  execute: async ({ labId, search, limit }) => {
    const { tests } = await labsService.listPublicLabTests(labId, {
      search,
      page: 1,
      limit: limit ?? 10,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const items = tests.map(compactTest);
    return {
      data: { labId, total: items.length, tests: items },
      actions: items.length ? [{ type: 'LAB_TESTS', data: { labId, tests: items } }] : [],
    };
  },
});

const compareTestPrices = defineTool({
  name: 'compareTestPrices',
  agent: 'PATIENT',
  intent: 'labs',
  description: 'Compare the price of a named lab test (e.g. "CBC") across laboratories in a city, cheapest first.',
  schema: z.object({
    testName: searchTextSchema,
    city: citySchema.optional(),
  }),
  execute: async ({ testName, city }) => {
    const { labs } = await labsService.listPublicLabs({ city, page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' });

    const perLab = await Promise.all(
      labs.map(async (lab) => {
        const { tests } = await labsService.listPublicLabTests(lab.id, {
          search: testName,
          page: 1,
          limit: 3,
          sortBy: 'price',
          sortOrder: 'asc',
        });
        return tests.map((test) => ({
          labId: lab.id,
          labName: lab.name,
          city: lab.city,
          ...compactTest(test),
        }));
      }),
    );

    const rows = perLab.flat().sort((a, b) => a.price - b.price).slice(0, 10);
    return {
      data: { testName, rows },
      actions: rows.length ? [{ type: 'LAB_PRICE_COMPARISON', data: { testName, rows } }] : [],
    };
  },
});

const createLabBooking = defineTool({
  name: 'createLabBooking',
  agent: 'PATIENT',
  intent: 'labs',
  requiresConfirmation: true,
  description:
    'Propose a lab test booking. The user must confirm. Needs the lab, the chosen test ids, a date, a time slot and collection type. ' +
    "Contact details default to the patient's account; ask only for what is missing (phone, and address for home collection).",
  schema: z.object({
    labId: objectId('labId'),
    testIds: z.array(objectId('testId')).min(1).max(10),
    date: dateSchema,
    timeSlot: z.string().trim().min(3).max(20).describe('e.g. "09:00 AM"'),
    collectionType: z.enum(['lab_visit', 'home']),
    phone: z.string().trim().min(7).max(20).optional(),
    address: z.string().trim().max(500).optional().describe('Required for home collection'),
  }),
  prepare: async (args, ctx) => {
    const profile = await getPatientProfile(ctx.user.id);
    const phone = args.phone || profile.phone;
    if (!phone) throw new BadRequestError('A contact phone number is required for the booking.');
    if (args.collectionType === 'home' && !args.address) {
      throw new BadRequestError('A collection address is required for home sample collection.');
    }

    const normalized = {
      labId: args.labId,
      testIds: args.testIds,
      scheduledDate: args.date,
      scheduledSlot: args.timeSlot,
      collectionType: args.collectionType,
      patient: {
        name: profile.name,
        phone,
        email: profile.email || undefined,
        address: args.address,
      },
    };
    // Reuse the existing request rules (phone format, date, ids).
    parseOrThrow(createBookingSchema, normalized);

    const { tests } = await labsService.listPublicLabTests(args.labId, { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
    const chosen = tests.filter((test) => args.testIds.includes(test.id));
    if (chosen.length !== args.testIds.length) {
      throw new BadRequestError('One or more tests do not belong to this lab.');
    }
    const total = chosen.reduce((sum, test) => sum + test.price, 0);

    return {
      args: normalized,
      summary:
        `Book ${chosen.map((test) => test.name).join(', ')} on ${formatDate(args.date)} at ${args.timeSlot} ` +
        `(${args.collectionType === 'home' ? 'home collection' : 'visit the lab'}). Estimated total ${pkr(total, chosen[0]?.currency)}.`,
    };
  },
  execute: async (args, ctx) => {
    const payload = parseOrThrow(createBookingSchema, args);
    const { booking } = await labsService.createBooking(payload, ctx.user);
    return {
      data: { bookingId: booking.id, status: booking.status, totalPrice: booking.totalPrice },
      actions: [
        {
          type: 'ACTION_RESULT',
          data: {
            kind: 'LAB_BOOKING',
            title: 'Lab booking requested',
            lines: [
              booking.lab?.name,
              `${formatDate(booking.scheduledDate)} · ${booking.scheduledSlot}`,
              `Total ${pkr(booking.totalPrice, booking.currency)}`,
            ].filter(Boolean),
            link: '/my-lab-tests',
          },
        },
      ],
      outcome: 'Your lab booking has been requested. You can follow it under My Lab Tests.',
    };
  },
});

module.exports = [searchLabs, getLabTests, compareTestPrices, createLabBooking];
