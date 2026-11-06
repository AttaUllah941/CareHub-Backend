const { escapeRegex } = require('../regex');
const { createMemoryCache } = require('../memoryCache');
const { setPublicListingCacheHeaders, setPublicReferenceCacheHeaders } = require('../publicCacheHeaders');

describe('escapeRegex', () => {
  it('makes user input match literally', () => {
    expect(new RegExp(`^${escapeRegex('.*')}$`, 'i').test('Lahore')).toBe(false);
    expect(new RegExp(`^${escapeRegex('St. John (East)')}$`, 'i').test('st. john (east)')).toBe(true);
  });

  it('never throws on characters that are invalid in a RegExp', () => {
    for (const input of ['((', '[[', '\\', '*', '+?', '{1,', '(a+)+$']) {
      expect(() => new RegExp(`^${escapeRegex(input)}$`, 'i')).not.toThrow();
    }
  });

  it('leaves ordinary city names unchanged in behaviour', () => {
    for (const city of ['Lahore', 'Rawalpindi', 'Dera Ghazi Khan', "Gujranwala"]) {
      expect(new RegExp(`^${escapeRegex(city)}$`, 'i').test(city.toUpperCase())).toBe(true);
    }
  });
});

describe('createMemoryCache bounds', () => {
  it('never grows past maxEntries, evicting the oldest first', () => {
    const cache = createMemoryCache({ maxEntries: 3 });
    for (const key of ['a', 'b', 'c', 'd', 'e']) cache.set(key, key.toUpperCase());

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(['c', 'd', 'e'].map((key) => cache.get(key))).toEqual(['C', 'D', 'E']);
  });

  it('refreshing a key keeps it and does not evict others unnecessarily', () => {
    const cache = createMemoryCache({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 3); // update, still two keys
    expect(cache.get('a')).toBe(3);
    expect(cache.get('b')).toBe(2);
  });

  it('bounds results cached through wrap() (e.g. keys derived from request input)', async () => {
    const cache = createMemoryCache({ maxEntries: 5 });
    for (let i = 0; i < 50; i += 1) {
      await cache.wrap(`junk-${i}`, async () => null);
    }
    let alive = 0;
    for (let i = 0; i < 50; i += 1) if (cache.get(`junk-${i}`) !== undefined || false) alive += 1;
    // null results are cached values too — only the 5 newest may remain
    expect(await cache.wrap('junk-49', async () => 'fresh')).toBeNull();
    expect(await cache.wrap('junk-0', async () => 'fresh')).toBe('fresh');
    expect(alive).toBeLessThanOrEqual(5);
  });

  it('keeps existing behaviour: values are returned until their TTL expires', async () => {
    const cache = createMemoryCache({ defaultTtlMs: 20 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(cache.get('k')).toBeUndefined();
  });
});

describe('public cache headers', () => {
  const fakeResponse = (initialVary) => {
    const headers = initialVary ? { vary: initialVary } : {};
    return {
      headers,
      set(name, value) { headers[name.toLowerCase()] = value; return this; },
      vary(field) {
        const current = headers.vary ? headers.vary.split(/,\s*/) : [];
        if (!current.includes(field)) current.push(field);
        headers.vary = current.join(', ');
        return this;
      },
      removeHeader(name) { delete headers[name.toLowerCase()]; },
    };
  };

  it('keeps Vary: Origin added by CORS (so a CDN never serves one site\'s CORS headers to another)', () => {
    for (const setter of [setPublicListingCacheHeaders, setPublicReferenceCacheHeaders]) {
      const res = fakeResponse('Origin');
      setter(res);
      expect(res.headers.vary).toBe('Origin, Accept-Encoding');
      expect(res.headers['cache-control']).toMatch(/^public/);
    }
  });
});
