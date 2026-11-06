const { z } = require('zod');
const healthQuestionsService = require('../../health-questions/health-questions.service');
const retriever = require('../rag/retriever.service');
const { tokenize } = require('../rag/lexical');
const { defineTool } = require('./tool.registry');
const { searchTextSchema, limitSchema, truncate } = require('./tool.helpers');

const MAX_PASSAGE_CHARS = 700;

/** Instruction the model receives with every retrieval result. */
const GUIDANCE =
  'Answer using ONLY these passages for factual claims and name the source titles you used. ' +
  'This is general information, not a diagnosis or treatment plan — say so, and recommend seeing a doctor when appropriate. ' +
  'If the passages do not answer the question, say you have no CareHub source for it and keep any general guidance very brief.';

/**
 * Fallback used only when nothing has been ingested yet: the existing doctor-answered questions,
 * matched by keyword through the existing service.
 */
const fallbackToAnsweredQuestions = async (query, limit) => {
  // The existing search matches its input as ONE phrase, so search per significant term
  // (longest first) and rank questions by how many terms found them.
  const terms = [...new Set(tokenize(query))].sort((a, b) => b.length - a.length).slice(0, 4);
  const hits = new Map();

  for (const term of terms) {
    const { questions } = await healthQuestionsService.listPublicAnswered({
      search: term,
      page: 1,
      limit: 20,
      sortBy: 'views',
      sortOrder: 'desc',
    });
    for (const item of questions) {
      const entry = hits.get(item.id) || { item, matches: 0 };
      entry.matches += 1;
      hits.set(item.id, entry);
    }
  }

  // Require a majority of terms so loosely related questions are not presented as sources.
  const needed = Math.max(1, Math.ceil(terms.length / 2));
  const questions = [...hits.values()]
    .filter((entry) => entry.matches >= needed)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, limit)
    .map((entry) => entry.item);

  return questions.map((item) => ({
    id: item.id,
    title: truncate(item.question, 120),
    section: item.specialty || '',
    text: truncate(item.answer, MAX_PASSAGE_CHARS),
    kind: 'doctor_answer',
    source: `CareHub doctor answer${item.doctorName ? ` — ${item.doctorName}` : ''}`,
  }));
};

const searchKnowledge = defineTool({
  name: 'searchKnowledge',
  agent: 'PATIENT',
  intent: 'health',
  description:
    "Search CareHub's reviewed health articles, doctor-answered questions and CareHub policies/FAQ " +
    '(booking, cancellation, lab tests, medicine orders, privacy, the AI assistant, joining as a doctor). ' +
    'Use it for general health questions and for "how does CareHub work / what is your policy" questions. ' +
    'Do NOT use it to book, cancel, order or look up personal data — use the dedicated tools for that.',
  schema: z.object({
    query: searchTextSchema.describe('The question or topic, in plain words'),
    topic: z.enum(['health', 'policy', 'any']).optional().describe('health = medical info, policy = CareHub rules/FAQ'),
    limit: limitSchema(6, 4),
  }),
  execute: async ({ query, topic, limit }) => {
    const wanted = topic || 'any';
    let { mode, passages } = await retriever.search(query, { topic: wanted, k: limit ?? undefined });

    if (mode === 'none' && wanted !== 'policy') {
      passages = await fallbackToAnsweredQuestions(query, limit ?? 4);
      mode = 'keyword';
    }

    const trimmed = passages.map((passage) => ({ ...passage, text: truncate(passage.text, MAX_PASSAGE_CHARS) }));

    return {
      data: {
        retrieval: mode,
        total: trimmed.length,
        passages: trimmed.map(({ title, section, text, kind, source }) => ({ title, section, text, kind, source })),
        guidance: GUIDANCE,
        note: trimmed.length ? undefined : 'No CareHub source matched this question.',
      },
      actions: trimmed.length
        ? [
            {
              type: 'KNOWLEDGE',
              data: {
                topic: wanted,
                passages: trimmed.map(({ id, title, section, text, kind, source }) => ({
                  id,
                  title,
                  section,
                  excerpt: truncate(text, 220),
                  kind,
                  source,
                })),
              },
            },
          ]
        : [],
    };
  },
});

module.exports = [searchKnowledge];
