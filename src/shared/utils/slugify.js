/**
 * Converts a string into a URL-friendly slug.
 */
const slugify = (value) => {
  if (!value) return '';

  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = slugify;
