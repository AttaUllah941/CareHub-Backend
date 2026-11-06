const fs = require('fs');
const path = require('path');

/** Parses a leading `---` block of `key: value` lines. Deliberately tiny — no YAML dependency. */
const parseFrontmatter = (raw) => {
  const text = String(raw).replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator > 0) meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { meta, body: text.slice(match[0].length) };
};

const titleFromBody = (body, fallback) => body.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;

/**
 * Loads every `.md` file in a directory (README.md excluded). Documents without a `category`
 * default to "health"; a document must have a non-empty body.
 * @returns {{ key: string, file: string, title: string, category: string, source: string, body: string }[]}
 */
const loadDocuments = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith('.md') && file.toLowerCase() !== 'readme.md')
    .sort()
    .map((file) => {
      const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf8'));
      return {
        key: `doc:${file}`,
        file,
        title: meta.title || titleFromBody(body, file.replace(/\.md$/i, '')),
        category: (meta.category || 'health').toLowerCase(),
        source: meta.source || 'CareHub',
        body: body.trim(),
      };
    })
    .filter((doc) => doc.body.length > 0);
};

module.exports = { loadDocuments, parseFrontmatter };
