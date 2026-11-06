const config = require('../../../config');
const { getProvider } = require('../providers');

const BATCH_SIZE = 64;

/** The provider can embed only when it is configured and implements embed(). */
const canEmbed = () => {
  const provider = getProvider();
  return provider.isConfigured() && typeof provider.embed === 'function';
};

/** Identifier stored with each vector; vectors from a different model/size are never compared. */
const currentModelId = () => `${config.ai.embeddingModel}:${config.ai.embeddingDimensions}`;

const normalize = (vector) => {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum) || 1;
  return vector.map((value) => value / norm);
};

const dot = (a, b) => {
  let total = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) total += a[i] * b[i];
  return total;
};

/** Embeds texts in batches and returns normalised vectors in input order. */
const embedTexts = async (texts) => {
  const provider = getProvider();
  const vectors = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const result = await provider.embed(batch);
    vectors.push(...result.map(normalize));
  }
  return vectors;
};

module.exports = { canEmbed, currentModelId, embedTexts, normalize, dot };
