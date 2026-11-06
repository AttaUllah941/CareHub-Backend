/**
 * RAG end to end against a real (throwaway) MongoDB. Embeddings come from a deterministic
 * bag-of-words test embedder — it stands in for OpenAI only so the test needs no API key; every
 * other piece (chunking, hashing, incremental ingest, similarity search, thresholds, fallbacks,
 * the searchKnowledge tool, the chat loop) is the real code.
 */
process.env.AI_RAG_MIN_SCORE = '0.2';

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { setProvider } = require('../providers');
const { tokenize } = require('../rag/lexical');

const TEST_URI = process.env.AI_TEST_MONGODB_URI_RAG || 'mongodb://127.0.0.1:27017/carehub_ai_test_rag';
const DIMS = 256;

let connected = false;
let dir;
let ingest;
let retriever;
let aiService;
let Chunk;
let HealthQuestion;
let User;

const state = { configured: true, failEmbed: false, embedded: 0 };
const calls = [];
let script = [];

const hash = (token) => {
  let h = 2166136261;
  for (const char of token) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return Math.abs(h) % DIMS;
};
const vectorFor = (text) => {
  const vector = new Array(DIMS).fill(0);
  for (const token of tokenize(text)) vector[hash(token)] += 1;
  return vector;
};

const provider = {
  isConfigured: () => state.configured,
  embed: async (texts) => {
    if (state.failEmbed) throw new Error('embeddings down');
    state.embedded += texts.length;
    return texts.map(vectorFor);
  },
  chat: async ({ messages, tools }) => {
    calls.push({ messages: JSON.parse(JSON.stringify(messages)), tools });
    const next = script.shift();
    if (!next) throw new Error('Script exhausted');
    return { message: next, usage: null };
  },
};

const write = (name, content) => fs.writeFileSync(path.join(dir, name), content);
const doc = (title, category, body) => `---\ntitle: ${title}\ncategory: ${category}\nsource: Test source\n---\n\n${body}\n`;

const FEVER = doc(
  'Managing a fever',
  'health',
  '## Home care\nRest, drink plenty of fluids and keep the room cool when a child or adult has a high temperature or fever.\n\n## When to see a doctor\nSee a doctor if a fever lasts more than three days or a baby has any fever.',
);
const CANCEL = doc(
  'Cancelling appointments',
  'policy',
  '## Cancelling\nYou can cancel your own appointment while it is pending or confirmed from My Appointments.',
);
const GARDEN = doc('Growing tomatoes', 'health', '## Soil\nTomato plants need sunlight, compost and regular watering in the garden.');

beforeAll(async () => {
  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 2500 });
    connected = true;
  } catch {
    console.warn(`[rag.integration] MongoDB not reachable at ${TEST_URI} — skipping`);
    return;
  }
  await mongoose.connection.dropDatabase();

  ({ ingest } = require('../rag/ingest.service'));
  retriever = require('../rag/retriever.service');
  aiService = require('../services/ai.service');
  Chunk = require('../rag/knowledge-chunk.model').AiKnowledgeChunk;
  HealthQuestion = require('../../health-questions/health-questions.model').HealthQuestion;
  User = require('../../users/users.model').User;
  await Promise.all([Chunk.init(), HealthQuestion.init(), User.init()]);

  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carehub-kb-'));
  setProvider(provider);
});

afterAll(async () => {
  setProvider(null);
  delete process.env.AI_RAG_MIN_SCORE;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  if (connected) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(() => {
  calls.length = 0;
  script = [];
  state.configured = true;
  state.failEmbed = false;
});

const guard = (name, fn) =>
  it(name, async () => {
    if (!connected) return;
    await fn();
  });

const run = (options = {}) => ingest({ dir, includeQuestions: false, ...options });

describe('ingestion', () => {
  guard('chunks, embeds and stores documents', async () => {
    write('fever.md', FEVER);
    write('cancel.md', CANCEL);
    write('garden.md', GARDEN);

    const summary = await run();
    expect(summary).toMatchObject({ sources: 3, added: 3, updated: 0, unchanged: 0, mode: 'semantic' });
    expect(summary.chunks).toBeGreaterThanOrEqual(4);
    expect(summary.embedded).toBe(summary.chunks);

    const stored = await Chunk.find({ sourceKey: 'doc:fever.md' }).select('+embedding').lean();
    expect(stored.map((chunk) => chunk.section)).toEqual(['Home care', 'When to see a doctor']);
    expect(stored[0].embedding).toHaveLength(DIMS);
    expect(Math.hypot(...stored[0].embedding)).toBeCloseTo(1); // stored normalised
  });

  guard('is incremental: unchanged sources cost nothing, changes re-embed only that source', async () => {
    const before = state.embedded;
    expect(await run()).toMatchObject({ unchanged: 3, added: 0, updated: 0, chunks: 0 });
    expect(state.embedded).toBe(before); // no embedding calls at all

    write('cancel.md', CANCEL.replace('pending or confirmed', 'pending, confirmed or rescheduled'));
    const summary = await run();
    expect(summary).toMatchObject({ unchanged: 2, updated: 1 });
    expect(state.embedded - before).toBe(summary.chunks); // only the edited doc was embedded
  });

  guard('removes chunks of deleted files', async () => {
    fs.rmSync(path.join(dir, 'garden.md'));
    expect(await run()).toMatchObject({ removed: 1 });
    expect(await Chunk.countDocuments({ sourceKey: 'doc:garden.md' })).toBe(0);
    write('garden.md', GARDEN);
    await run();
  });

  guard('force re-embeds everything', async () => {
    const before = state.embedded;
    const summary = await run({ force: true });
    expect(summary.updated).toBe(3);
    expect(state.embedded - before).toBe(summary.chunks);
  });
});

describe('retrieval', () => {
  guard('finds the relevant passage semantically and cites it', async () => {
    const { mode, passages } = await retriever.search('my child has a high temperature');
    expect(mode).toBe('semantic');
    expect(passages[0]).toMatchObject({ title: 'Managing a fever', kind: 'article', source: 'Test source' });
  });

  guard('returns nothing for unrelated questions (no hallucinated sources)', async () => {
    const { passages } = await retriever.search('quantum chromodynamics lattice simulation');
    expect(passages).toEqual([]);
  });

  guard('filters by topic', async () => {
    const policy = await retriever.search('can I cancel my appointment', { topic: 'policy' });
    expect(policy.passages.length).toBeGreaterThan(0);
    expect(policy.passages.every((passage) => passage.kind === 'policy')).toBe(true);

    const health = await retriever.search('cancel appointment pending confirmed', { topic: 'health' });
    expect(health.passages.every((passage) => passage.kind !== 'policy')).toBe(true);
  });

  guard('degrades to keyword retrieval when embeddings fail', async () => {
    state.failEmbed = true;
    const { mode, passages } = await retriever.search('tomato plants sunlight watering');
    expect(mode).toBe('keyword');
    expect(passages[0].title).toBe('Growing tomatoes');
  });

  guard('upgrades keyword-only chunks to vectors once a provider is available', async () => {
    // Index with no provider first (as before an API key exists)…
    state.configured = false;
    const keywordRun = await run({ force: true });
    expect(keywordRun).toMatchObject({ mode: 'keyword', embedded: 0 });
    expect((await retriever.search('fever fluids rest')).mode).toBe('keyword');

    // …then run again with a provider: content hash includes the model, so everything upgrades.
    state.configured = true;
    const upgrade = await run();
    expect(upgrade).toMatchObject({ mode: 'semantic', updated: 3 });
    expect(upgrade.embedded).toBe(upgrade.chunks);
    expect((await retriever.search('fever fluids rest')).mode).toBe('semantic');
  });

  guard('indexes doctor-answered questions too', async () => {
    await HealthQuestion.create({
      question: 'Is it safe to exercise with mild asthma?',
      category: 'respiratory',
      status: 'answered',
      answer: 'Light regular exercise is usually fine with well controlled asthma; keep your reliever inhaler nearby.',
      doctorName: 'Dr. Test',
      specialty: 'Pulmonology',
    });
    const summary = await ingest({ dir, includeQuestions: true });
    expect(summary.added).toBe(1);

    const { passages } = await retriever.search('exercise with asthma inhaler');
    expect(passages[0]).toMatchObject({ kind: 'doctor_answer' });
    expect(passages[0].source).toMatch(/Dr\. Test/);
  });
});

describe('searchKnowledge tool through the chat loop', () => {
  let patient;

  beforeAll(async () => {
    if (!connected) return;
    const user = await User.create({
      firstName: 'Rag', lastName: 'Patient', email: 'rag@t.dev', phone: '+923001110000', passwordHash: 'x', role: 'PATIENT',
    });
    patient = { id: user._id.toString(), role: 'PATIENT' };
  });

  const toolCall = (args) => ({
    role: 'assistant',
    content: null,
    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'searchKnowledge', arguments: JSON.stringify(args) } }],
  });

  guard('returns cited passages, guidance and a Sources card', async () => {
    script = [toolCall({ query: 'what should I do for a fever', topic: 'health' }), { role: 'assistant', content: 'According to Managing a fever…' }];
    const reply = await aiService.chat({ user: patient, message: 'What should I do for a fever?' });

    const tool = JSON.parse(calls[1].messages.find((m) => m.role === 'tool').content);
    expect(tool).toMatchObject({ ok: true, retrieval: 'semantic' });
    expect(tool.passages[0].title).toBe('Managing a fever');
    expect(tool.guidance).toMatch(/ONLY these passages/);

    const card = reply.actions.find((action) => action.type === 'KNOWLEDGE');
    expect(card.data.passages[0]).toMatchObject({ title: 'Managing a fever', kind: 'article' });
    expect(card.data.passages[0].excerpt.length).toBeLessThanOrEqual(221);
  });

  guard('tells the model when no source matches', async () => {
    script = [toolCall({ query: 'quantum chromodynamics lattice simulation', topic: 'any' }), { role: 'assistant', content: 'I have no CareHub source for that.' }];
    const reply = await aiService.chat({ user: patient, message: 'Tell me about a health condition: quantum lattice' });

    const tool = JSON.parse(calls[1].messages.find((m) => m.role === 'tool').content);
    expect(tool).toMatchObject({ ok: true, total: 0 });
    expect(tool.note).toMatch(/No CareHub source/);
    expect(reply.actions.find((action) => action.type === 'KNOWLEDGE')).toBeUndefined();
  });

  guard('falls back to doctor-answered questions when nothing has been ingested', async () => {
    await Chunk.deleteMany({});
    retriever.invalidate();

    script = [toolCall({ query: 'asthma exercise', topic: 'health' }), { role: 'assistant', content: 'A CareHub doctor answered this.' }];
    await aiService.chat({ user: patient, message: 'Can I exercise with asthma? health advice' });

    const tool = JSON.parse(calls[1].messages.find((m) => m.role === 'tool').content);
    expect(tool.retrieval).toBe('keyword');
    expect(tool.passages[0]).toMatchObject({ kind: 'doctor_answer' });
  });
});
