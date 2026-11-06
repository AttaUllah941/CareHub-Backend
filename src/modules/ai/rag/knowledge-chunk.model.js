const mongoose = require('mongoose');

/**
 * One retrievable passage of CareHub knowledge (a document section or a doctor-answered question).
 * `embedding` is L2-normalised so similarity is a plain dot product. When no embedding provider
 * was available at ingest time, `embedding` is empty and retrieval falls back to keyword search.
 */
const knowledgeChunkSchema = new mongoose.Schema(
  {
    sourceKey: { type: String, required: true, index: true }, // doc:<file> | hq:<questionId>
    sourceType: { type: String, enum: ['document', 'health_question'], required: true, index: true },
    category: { type: String, default: 'health', index: true }, // health | policy
    title: { type: String, required: true },
    section: { type: String, default: '' },
    sourceLabel: { type: String, default: 'CareHub' },
    text: { type: String, required: true },
    ord: { type: Number, default: 0 },
    contentHash: { type: String, required: true },
    embedding: { type: [Number], default: [], select: false },
    /** `${model}:${dimensions}` the vector was created with; null when not embedded. */
    embeddingModel: { type: String, default: null },
  },
  { timestamps: true },
);

knowledgeChunkSchema.index({ sourceKey: 1, ord: 1 });

const AiKnowledgeChunk =
  mongoose.models.AiKnowledgeChunk || mongoose.model('AiKnowledgeChunk', knowledgeChunkSchema);

module.exports = { AiKnowledgeChunk };
