/**
 * Converts a string into a URL-friendly slug.
 */
const slugify = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = { slugify };
