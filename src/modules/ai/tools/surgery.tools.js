const { z } = require('zod');
const { BadRequestError, NotFoundError } = require('../../../core/errors/AppError');
const surgeriesService = require('../../surgeries/surgeries.service');
const hospitalsService = require('../../hospitals/hospitals.service');
const { createConsultationRequestSchema } = require('../../surgeries/surgeries.validator');
const { defineTool } = require('./tool.registry');
const { getPatientProfile } = require('./patient-profile');
const {
  citySchema,
  searchTextSchema,
  objectId,
  limitSchema,
  truncate,
  parseOrThrow,
} = require('./tool.helpers');

const compactProcedure = (procedure) => ({
  id: procedure.id,
  name: procedure.name,
  slug: procedure.slug,
  category: procedure.category,
  estimatedCostRange: procedure.estimatedCostRange,
  currency: procedure.currency,
  hospitalCount: procedure.hospitalCount,
  hospitalIds: procedure.hospitalIds.slice(0, 20),
});

const compactHospital = (hospital) => ({
  id: hospital.id,
  name: hospital.name,
  city: hospital.city,
  address: hospital.address,
  rating: hospital.rating,
  offersSurgeries: hospital.offersSurgeries,
  slug: hospital.slug,
  citySlug: hospital.citySlug,
});

const searchSurgeryProcedures = defineTool({
  name: 'searchSurgeryProcedures',
  agent: 'PATIENT',
  intent: 'surgery',
  description: 'Search surgical procedures offered through CareHub hospitals, with estimated cost ranges.',
  schema: z.object({
    search: searchTextSchema.optional(),
    category: searchTextSchema.optional(),
    limit: limitSchema(10, 6),
  }),
  execute: async ({ search, category, limit }) => {
    const { procedures } = await surgeriesService.listPublicProcedures({
      search,
      category,
      page: 1,
      limit: limit ?? 6,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const items = procedures.map(compactProcedure);
    return {
      data: { total: items.length, procedures: items },
      actions: items.length ? [{ type: 'SURGERY_RESULTS', data: { procedures: items } }] : [],
    };
  },
});

const searchHospitals = defineTool({
  name: 'searchHospitals',
  agent: 'PATIENT',
  intent: 'surgery',
  description: 'Search hospitals by city and/or name.',
  schema: z.object({
    city: citySchema.optional(),
    name: searchTextSchema.optional(),
    limit: limitSchema(8, 5),
  }),
  execute: async ({ city, name, limit }) => {
    const { hospitals } = await hospitalsService.listPublicHospitals({
      city,
      page: 1,
      limit: 50,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const needle = name?.toLowerCase();
    const items = hospitals
      .filter((hospital) => !needle || hospital.name.toLowerCase().includes(needle))
      .slice(0, limit ?? 5)
      .map(compactHospital);
    return {
      data: { total: items.length, hospitals: items },
      actions: items.length ? [{ type: 'HOSPITAL_RESULTS', data: { hospitals: items } }] : [],
    };
  },
});

const submitSurgeryConsultation = defineTool({
  name: 'submitSurgeryConsultation',
  agent: 'PATIENT',
  intent: 'surgery',
  requiresConfirmation: true,
  description:
    'Propose sending a surgery consultation request to a hospital for a procedure. The user must confirm. ' +
    'Contact details default to the patient account; ask for a phone number only if missing.',
  schema: z.object({
    procedureId: objectId('procedureId'),
    hospitalId: objectId('hospitalId'),
    phone: z.string().trim().min(7).max(20).optional(),
    notes: z.string().trim().max(500).optional().describe('Brief non-sensitive note for the hospital'),
  }),
  prepare: async (args, ctx) => {
    const profile = await getPatientProfile(ctx.user.id);
    const phone = args.phone || profile.phone;
    if (!phone) throw new BadRequestError('A contact phone number is required for the request.');

    const [{ procedures }, { hospitals }] = await Promise.all([
      surgeriesService.listPublicProcedures({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
      hospitalsService.listPublicHospitals({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
    ]);
    const procedure = procedures.find((item) => item.id === args.procedureId);
    const hospital = hospitals.find((item) => item.id === args.hospitalId);
    if (!procedure) throw new NotFoundError('Procedure not found.');
    if (!hospital) throw new NotFoundError('Hospital not found.');
    if (!procedure.hospitalIds.includes(hospital.id)) {
      throw new BadRequestError(`${hospital.name} does not offer ${procedure.name}.`);
    }

    const normalized = {
      procedureId: args.procedureId,
      hospitalId: args.hospitalId,
      patient: {
        name: profile.name,
        phone,
        email: profile.email || undefined,
        notes: args.notes,
      },
    };
    parseOrThrow(createConsultationRequestSchema, normalized);

    return {
      args: normalized,
      summary: `Send a surgery consultation request for ${procedure.name} to ${hospital.name} (${hospital.city}). The hospital will contact you on ${phone}.`,
    };
  },
  execute: async (args, ctx) => {
    const payload = parseOrThrow(createConsultationRequestSchema, args);
    const { consultationRequest } = await surgeriesService.createConsultationRequest(payload, ctx.user);
    return {
      data: { requestId: consultationRequest.id, status: consultationRequest.status },
      actions: [
        {
          type: 'ACTION_RESULT',
          data: {
            kind: 'SURGERY_REQUEST',
            title: 'Consultation request sent',
            lines: [consultationRequest.procedure?.name, `Status: ${consultationRequest.status}`].filter(Boolean),
            link: '/my-surgery-requests',
          },
        },
      ],
      outcome: 'Your surgery consultation request has been sent. Track it under My Surgery Requests.',
    };
  },
});

const getMyConsultationRequests = defineTool({
  name: 'getMyConsultationRequests',
  agent: 'PATIENT',
  intent: 'surgery',
  description: "Check the status of the patient's own surgery consultation requests.",
  schema: z.object({
    status: z.enum(['pending', 'contacted', 'scheduled', 'closed']).optional(),
  }),
  execute: async ({ status }, ctx) => {
    const { consultationRequests } = await surgeriesService.listMyConsultationRequests(ctx.user, {
      status,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    const items = consultationRequests.map((request) => ({
      id: request.id,
      status: request.status,
      procedure: request.procedure?.name || '',
      hospital: request.hospital?.name || '',
      createdAt: request.createdAt,
      note: truncate(request.patientSnapshot?.notes, 120),
    }));
    return {
      data: { total: items.length, requests: items },
      actions: items.length ? [{ type: 'CONSULTATION_REQUESTS', data: { requests: items } }] : [],
    };
  },
});

module.exports = [searchSurgeryProcedures, searchHospitals, submitSurgeryConsultation, getMyConsultationRequests];
