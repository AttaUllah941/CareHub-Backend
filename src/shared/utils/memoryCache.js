/**
 * Tiny in-process TTL cache for hot, rarely-changing reference data.
 * Suitable for single-instance deploys (e.g. Render free) without Redis.
 */
/**
 * `maxEntries` bounds memory: some keys derive from request input (search text, slugs), so an
 * unbounded cache could be grown without limit. When full, the oldest entry is evicted.
 */
const createMemoryCache = ({ defaultTtlMs = 5 * 60 * 1000, maxEntries = 1000 } = {}) => {
  const store = new Map();
  const inflight = new Map();

  const get = (key) => {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  };

  const set = (key, value, ttlMs = defaultTtlMs) => {
    // Re-insert so Map order tracks recency, then evict the oldest entry if over capacity.
    store.delete(key);
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (store.size > maxEntries) store.delete(store.keys().next().value);
    return value;
  };

  const del = (key) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  const wrap = async (key, loader, ttlMs = defaultTtlMs) => {
    const cached = get(key);
    if (cached !== undefined) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = Promise.resolve()
      .then(loader)
      .then((value) => set(key, value, ttlMs))
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, promise);
    return promise;
  };

  return { get, set, del, clear, wrap };
};

module.exports = { createMemoryCache };
