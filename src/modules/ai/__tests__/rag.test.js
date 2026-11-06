const { chunkMarkdown } = require('../rag/chunker');
const { parseFrontmatter, loadDocuments } = require('../rag/document.loader');
const { tokenize, buildLexicalIndex, lexicalSearch } = require('../rag/lexical');
const { normalize, dot } = require('../rag/embedding.service');

describe('chunkMarkdown', () => {
  it('never crosses a heading and keeps the heading as the section', () => {
    const chunks = chunkMarkdown('# Title\n\n## A\nalpha text\n\n## B\nbeta text');
    expect(chunks).toEqual([
      { section: 'A', text: 'alpha text' },
      { section: 'B', text: 'beta text' },
    ]);
  });

  it('splits long sections into several bounded chunks', () => {
    const paragraph = (n) => `Paragraph ${n} ${'word '.repeat(60)}`.trim();
    const body = `## Long\n${[1, 2, 3, 4, 5].map(paragraph).join('\n\n')}`;
    const chunks = chunkMarkdown(body, { maxChars: 700 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.section === 'Long')).toBe(true);
    expect(chunks.every((chunk) => chunk.text.length <= 700)).toBe(true);
  });

  it('splits a single huge paragraph on sentence boundaries', () => {
    const body = `## Big\n${'This is a sentence. '.repeat(120)}`;
    const chunks = chunkMarkdown(body, { maxChars: 300 });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((chunk) => chunk.text.length <= 300)).toBe(true);
  });

  it('ignores empty input', () => {
    expect(chunkMarkdown('')).toEqual([]);
  });
});

describe('document loader', () => {
  it('parses frontmatter and leaves the body', () => {
    const { meta, body } = parseFrontmatter('---\ntitle: Hello\ncategory: policy\nsource: Me: Test\n---\n# Heading\nText');
    expect(meta).toEqual({ title: 'Hello', category: 'policy', source: 'Me: Test' });
    expect(body).toContain('# Heading');
  });

  it('works without frontmatter', () => {
    expect(parseFrontmatter('# Just text').meta).toEqual({});
  });

  it('loads the real knowledge base: every file has a title, a valid category and content', () => {
    const docs = loadDocuments(require('../../../config').ai.rag.knowledgeDir);
    expect(docs.length).toBeGreaterThanOrEqual(10);
    for (const doc of docs) {
      expect(doc.title.length).toBeGreaterThan(3);
      expect(['health', 'policy']).toContain(doc.category);
      expect(doc.body.length).toBeGreaterThan(100);
    }
    // Both kinds are present, and there are no duplicate titles.
    expect(new Set(docs.map((doc) => doc.category))).toEqual(new Set(['health', 'policy']));
    expect(new Set(docs.map((doc) => doc.title)).size).toBe(docs.length);
  });

  it('flags nothing resembling a drug dose in health articles (safety lint)', () => {
    const docs = loadDocuments(require('../../../config').ai.rag.knowledgeDir).filter((doc) => doc.category === 'health');
    const dosePattern = /\b\d+(\.\d+)?\s?(mg|mcg|ml|iu|tablets?|capsules?)\b/i;
    for (const doc of docs) {
      expect({ file: doc.file, hasDose: dosePattern.test(doc.body) }).toEqual({ file: doc.file, hasDose: false });
    }
  });
});

describe('lexical retrieval', () => {
  const chunks = [
    { id: '1', title: 'Managing a fever', section: 'Care', text: 'Rest and drink fluids when you have a fever.' },
    { id: '2', title: 'Ordering medicines', section: 'Payment', text: 'We record the payment method you choose.' },
    { id: '3', title: 'Diabetes basics', section: 'Symptoms', text: 'Thirst and frequent urination are common symptoms.' },
  ];
  const index = buildLexicalIndex(chunks);

  it('finds the relevant chunk first', () => {
    expect(lexicalSearch(index, 'what should I do about a fever')[0].chunk.id).toBe('1');
    expect(lexicalSearch(index, 'how is payment handled')[0].chunk.id).toBe('2');
  });

  it('matches plural forms', () => {
    expect(lexicalSearch(index, 'diabetes symptom')[0].chunk.id).toBe('3');
  });

  it('returns nothing for unrelated or stop-word-only queries', () => {
    expect(lexicalSearch(index, 'chocolate cake recipe')).toEqual([]);
    expect(lexicalSearch(index, 'what is the')).toEqual([]);
  });

  it('tokenizes without stop words', () => {
    expect(tokenize('The fevers and the cold')).toEqual(['fever', 'cold']);
  });
});

describe('vector helpers', () => {
  it('normalises to unit length so dot product is cosine similarity', () => {
    const v = normalize([3, 4]);
    expect(Math.hypot(...v)).toBeCloseTo(1);
    expect(dot(v, v)).toBeCloseTo(1);
    expect(dot(normalize([1, 0]), normalize([0, 1]))).toBeCloseTo(0);
  });
});
