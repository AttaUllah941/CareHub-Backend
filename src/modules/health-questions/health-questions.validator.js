const { z } = require('zod');

const HEALTH_QUESTION_CATEGORIES = [
  'Fever & Infections',
  'Pregnancy',
  'Heart & BP',
  'Skin & Hair',
  'Child Health',
  'Mental Health',
  'General Health',
];

const createHealthQuestionSchema = z.object({
  question: z.string().trim().min(10).max(1000),
  category: z.enum(HEALTH_QUESTION_CATEGORIES),
  city: z.string().trim().max(100).optional(),
  isAnonymous: z.boolean().optional(),
  askerName: z.string().trim().max(150).optional(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
});

const listPublicHealthQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

const listMyHealthQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

module.exports = {
  HEALTH_QUESTION_CATEGORIES,
  createHealthQuestionSchema,
  listPublicHealthQuestionsQuerySchema,
  listMyHealthQuestionsQuerySchema,
};
