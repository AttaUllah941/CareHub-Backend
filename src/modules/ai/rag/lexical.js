/**
 * Keyword retrieval used when embeddings are unavailable (no API key yet, provider outage).
 * Query terms are weighted by rarity (idf) and terms found in a chunk's title/section count double.
 * `score` is the weighted share of query terms the chunk covers (0..1).
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'has', 'have',
  'what', 'when', 'where', 'which', 'who', 'why', 'how', 'does', 'did', 'with', 'this', 'that', 'from', 'your',
  'about', 'into', 'than', 'then', 'them', 'they', 'will', 'would', 'should', 'could', 'there', 'their', 'been',
  'being', 'any', 'get', 'got', 'may', 'might', 'also', 'its', 'too', 'very', 'much', 'many', 'some', 'tell', 'give',
]);

const stem = (token) => (token.length > 4 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token);

const tokenize = (text) =>
  String(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    .map(stem);

/** Precomputes per-chunk token sets and document frequencies for a list of chunks. */
const buildLexicalIndex = (chunks) => {
  const df = new Map();
  const entries = chunks.map((chunk) => {
    const body = new Set(tokenize(chunk.text));
    const head = new Set(tokenize(`${chunk.title} ${chunk.section}`));
    for (const token of new Set([...body, ...head])) df.set(token, (df.get(token) || 0) + 1);
    return { chunk, body, head };
  });
  return { entries, df, total: Math.max(1, chunks.length) };
};

const lexicalSearch = (index, query, { k = 4, minCoverage = 0.5 } = {}) => {
  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length) return [];

  const weight = (token) => Math.log(1 + index.total / (1 + (index.df.get(token) || 0)));
  const totalWeight = queryTokens.reduce((sum, token) => sum + weight(token), 0);

  return index.entries
    .map(({ chunk, body, head }) => {
      let matched = 0;
      for (const token of queryTokens) {
        if (head.has(token)) matched += weight(token) * 1.5;
        else if (body.has(token)) matched += weight(token);
      }
      return { chunk, score: Math.min(1, matched / totalWeight) };
    })
    .filter((result) => result.score >= minCoverage)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
};

module.exports = { tokenize, buildLexicalIndex, lexicalSearch };
