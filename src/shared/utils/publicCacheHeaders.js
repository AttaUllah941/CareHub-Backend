/**
 * Shared Cache-Control for public reference catalogs (specialties, languages).
 * Safe for browsers, Netlify edge, and CDNs — data changes rarely and mutations
 * invalidate the in-process cache immediately.
 */
const PUBLIC_REF_CACHE_CONTROL =
  'public, max-age=300, s-maxage=600, stale-while-revalidate=86400';

const setPublicReferenceCacheHeaders = (res) => {
  res.set('Cache-Control', PUBLIC_REF_CACHE_CONTROL);
  res.set('Vary', 'Accept-Encoding');
  res.removeHeader('Pragma');
  res.removeHeader('Expires');
};

module.exports = {
  PUBLIC_REF_CACHE_CONTROL,
  setPublicReferenceCacheHeaders,
};
