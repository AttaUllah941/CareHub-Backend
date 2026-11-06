const crypto = require('crypto');
const config = require('../../../config');
const logger = require('../../../core/utils/logger');
const healthQuestionsService = require('../../health-questions/health-questions.service');
const { AiKnowledgeChunk } = require('./knowledge-chunk.model');
const { chunkMarkdown } = require('./chunker');
const { loadDocuments } = require('./document.loader');
const { canEmbed, currentModelId, embedTexts } = require('./embedding.service');
const retriever = require('./retriever.service');

const sha = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Text that is actually embedded: title and section give each chunk its context. */
const embeddingInput = (source, part) => `${source.title}\n${part.section}\n${part.text}`.trim();

const documentSources = (dir) =>
  loadDocuments(dir).map((doc) => ({
    key: doc.key,
    type: 'document',
    title: doc.title,
    category: doc.category,
    label: doc.source,
    parts: chunkMarkdown(doc.body),
  }));

/** Doctor-answered questions already on the platform become retrievable too (one chunk each). */
const questionSources = async () => {
  const sources = [];
  for (let page = 1; page <= 20; page += 1) {
    const { questions } = await healthQuestionsService.listPublicAnswered({
      page,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    for (const item of questions) {
      sources.push({
        key: `hq:${item.id}`,
        type: 'health_question',
        title: item.question.length > 120 ? `${item.question.slice(0, 117)}…` : item.question,
        category: 'health',
        label: `CareHub doctor answer${item.doctorName ? ` — ${item.doctorName}` : ''}`,
        parts: [{ section: item.specialty || 'Answer', text: `Question: ${item.question}\nAnswer: ${item.answer}` }],
      });
    }
    if (questions.length < 100) break;
  }
  return sources;
};

/**
 * Incremental ingestion. Unchanged sources are skipped (so re-running costs nothing), changed
 * sources are re-chunked and re-embedded, and sources that disappeared are deleted.
 * Without an embedding provider chunks are stored for keyword retrieval and upgraded to vectors
 * by the next run that has one.
 *
 * @returns {Promise<object>} summary counts
 */
const ingest = async ({ dir = config.ai.rag.knowledgeDir, includeQuestions = true, force = false } = {}) => {
  const modelId = canEmbed() ? currentModelId() : null;

  const sources = [
    ...documentSources(dir),
    ...(includeQuestions ? await questionSources() : []),
  ].filter((source) => source.parts.length > 0);

  const existingRows = await AiKnowledgeChunk.aggregate([
    { $group: { _id: '$sourceKey', hash: { $first: '$contentHash' }, type: { $first: '$sourceType' } } },
  ]);
  const existing = new Map(existingRows.map((row) => [row._id, row]));

  const summary = { sources: sources.length, added: 0, updated: 0, unchanged: 0, removed: 0, chunks: 0, embedded: 0, mode: modelId ? 'semantic' : 'keyword' };
  const changed = [];

  for (const source of sources) {
    source.hash = sha([source.title, source.category, source.label, source.parts, modelId]);
    const current = existing.get(source.key);
    if (!force && current?.hash === source.hash) {
      summary.unchanged += 1;
    } else {
      if (current) summary.updated += 1;
      else summary.added += 1;
      changed.push(source);
    }
  }

  // Drop sources that no longer exist (question sources only when they were part of this run).
  const liveKeys = new Set(sources.map((source) => source.key));
  const removedKeys = [...existing.values()]
    .filter((row) => (row.type === 'document' || includeQuestions) && !liveKeys.has(row._id))
    .map((row) => row._id);
  if (removedKeys.length) {
    await AiKnowledgeChunk.deleteMany({ sourceKey: { $in: removedKeys } });
    summary.removed = removedKeys.length;
  }

  if (changed.length) {
    const inputs = changed.flatMap((source) => source.parts.map((part) => embeddingInput(source, part)));
    const vectors = modelId ? await embedTexts(inputs) : null;

    let cursor = 0;
    for (const source of changed) {
      const rows = source.parts.map((part, ord) => {
        const vector = vectors ? vectors[cursor] : null;
        cursor += 1;
        return {
          sourceKey: source.key,
          sourceType: source.type,
          category: source.category,
          title: source.title,
          section: part.section,
          sourceLabel: source.label,
          text: part.text,
          ord,
          contentHash: source.hash,
          embedding: vector || [],
          embeddingModel: vector ? modelId : null,
        };
      });
      await AiKnowledgeChunk.deleteMany({ sourceKey: source.key });
      await AiKnowledgeChunk.insertMany(rows, { ordered: true });
      summary.chunks += rows.length;
      if (vectors) summary.embedded += rows.length;
    }
  }

  retriever.invalidate();
  logger.info(`Knowledge ingest finished: ${JSON.stringify(summary)}`);
  return summary;
};

module.exports = { ingest };
