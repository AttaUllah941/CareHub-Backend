const config = require('../../../config');
const logger = require('../../../core/utils/logger');
const { AiKnowledgeChunk } = require('./knowledge-chunk.model');
const { canEmbed, currentModelId, embedTexts, dot } = require('./embedding.service');
const { buildLexicalIndex, lexicalSearch } = require('./lexical');

/**
 * Retriever interface (swap the implementation to move to Atlas Vector Search later):
 *   search(query, { topic, k, minScore }) -> { mode: 'semantic'|'keyword'|'none', passages[] }
 *
 * The corpus (a few hundred short chunks) is cached in memory. Semantic search ranks by cosine
 * similarity (vectors are pre-normalised); if embeddings are unavailable it degrades to keyword
 * retrieval instead of failing. `mode: 'none'` means nothing has been ingested at all.
 */
const INDEX_TTL_MS = 5 * 60 * 1000;
const QUERY_CACHE_TTL_MS = 10 * 60 * 1000;
const QUERY_CACHE_MAX = 200;
const MAX_CHUNKS_PER_SOURCE = 2;

let cache = null;
const queryCache = new Map();

const invalidate = () => {
  cache = null;
  queryCache.clear();
};

const loadIndex = async () => {
  if (cache && Date.now() - cache.loadedAt < INDEX_TTL_MS) return cache;

  const docs = await AiKnowledgeChunk.find().select('+embedding').lean();
  const chunks = docs.map((doc) => ({
    id: doc._id.toString(),
    sourceKey: doc.sourceKey,
    sourceType: doc.sourceType,
    category: doc.category,
    title: doc.title,
    section: doc.section,
    sourceLabel: doc.sourceLabel,
    text: doc.text,
    vector: doc.embedding?.length ? doc.embedding : null,
    embeddingModel: doc.embeddingModel,
  }));

  cache = { loadedAt: Date.now(), chunks, lexical: buildLexicalIndex(chunks) };
  return cache;
};

const matchesTopic = (chunk, topic) => {
  if (topic === 'policy') return chunk.category === 'policy';
  if (topic === 'health') return chunk.category !== 'policy';
  return true;
};

const kindOf = (chunk) => {
  if (chunk.sourceType === 'health_question') return 'doctor_answer';
  return chunk.category === 'policy' ? 'policy' : 'article';
};

const toPassage = (chunk, score) => ({
  id: chunk.id,
  title: chunk.title,
  section: chunk.section,
  text: chunk.text,
  kind: kindOf(chunk),
  source: chunk.sourceLabel,
  score: Math.round(score * 100) / 100,
});

/** Keeps the best chunks while capping how many may come from one source. */
const diversify = (ranked, k) => {
  const perSource = new Map();
  const picked = [];
  for (const item of ranked) {
    const used = perSource.get(item.chunk.sourceKey) || 0;
    if (used >= MAX_CHUNKS_PER_SOURCE) continue;
    perSource.set(item.chunk.sourceKey, used + 1);
    picked.push(item);
    if (picked.length === k) break;
  }
  return picked;
};

const embedQuery = async (query) => {
  const key = query.trim().toLowerCase();
  const hit = queryCache.get(key);
  if (hit && Date.now() - hit.at < QUERY_CACHE_TTL_MS) return hit.vector;

  const [vector] = await embedTexts([query]);
  if (queryCache.size >= QUERY_CACHE_MAX) queryCache.delete(queryCache.keys().next().value);
  queryCache.set(key, { vector, at: Date.now() });
  return vector;
};

const search = async (
  query,
  { topic = 'any', k = config.ai.rag.topK, minScore = config.ai.rag.minScore } = {},
) => {
  const index = await loadIndex();
  const candidates = index.chunks.filter((chunk) => matchesTopic(chunk, topic));
  if (!candidates.length) return { mode: 'none', passages: [] };

  const modelId = currentModelId();
  const embedded = candidates.filter((chunk) => chunk.vector && chunk.embeddingModel === modelId);

  if (embedded.length && canEmbed()) {
    try {
      const queryVector = await embedQuery(query);
      const ranked = embedded
        .map((chunk) => ({ chunk, score: dot(queryVector, chunk.vector) }))
        .filter((item) => item.score >= minScore)
        .sort((a, b) => b.score - a.score);
      return { mode: 'semantic', passages: diversify(ranked, k).map((item) => toPassage(item.chunk, item.score)) };
    } catch (error) {
      logger.warn(`RAG semantic search failed, using keyword search: ${error.message}`);
    }
  }

  const allowed = new Set(candidates.map((chunk) => chunk.id));
  const ranked = lexicalSearch(index.lexical, query, { k: k * 3 }).filter((item) => allowed.has(item.chunk.id));
  return { mode: 'keyword', passages: diversify(ranked, k).map((item) => toPassage(item.chunk, item.score)) };
};

module.exports = { search, invalidate };
