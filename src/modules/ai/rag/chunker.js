/**
 * Splits markdown into retrieval-sized chunks that never cross a heading, so every chunk is
 * about one topic and can be cited by "document – section".
 */
const DEFAULT_MAX_CHARS = 900;

const splitSections = (body) => {
  const sections = [];
  let current = { heading: '', lines: [] };

  for (const line of String(body).replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      if (current.lines.join('').trim()) sections.push(current);
      current = { heading: heading[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('').trim()) sections.push(current);
  return sections;
};

/** Breaks an over-long paragraph on sentence boundaries. */
const splitLongParagraph = (paragraph, maxChars) => {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [paragraph];
  const parts = [];
  let buffer = '';
  for (const sentence of sentences) {
    if (buffer && (buffer + sentence).length > maxChars) {
      parts.push(buffer.trim());
      buffer = '';
    }
    buffer += sentence;
  }
  if (buffer.trim()) parts.push(buffer.trim());
  return parts;
};

/**
 * @param {string} body markdown without frontmatter
 * @returns {{ section: string, text: string }[]}
 */
const chunkMarkdown = (body, { maxChars = DEFAULT_MAX_CHARS } = {}) => {
  const chunks = [];

  for (const section of splitSections(body)) {
    const paragraphs = section.lines
      .join('\n')
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .flatMap((paragraph) => (paragraph.length > maxChars ? splitLongParagraph(paragraph, maxChars) : [paragraph]));

    let buffer = '';
    const flush = () => {
      if (buffer.trim()) chunks.push({ section: section.heading, text: buffer.trim() });
      buffer = '';
    };

    for (const paragraph of paragraphs) {
      if (buffer && buffer.length + paragraph.length + 2 > maxChars) flush();
      buffer += `${buffer ? '\n\n' : ''}${paragraph}`;
    }
    flush();
  }

  return chunks;
};

module.exports = { chunkMarkdown, DEFAULT_MAX_CHARS };
