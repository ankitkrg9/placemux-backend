const DEFAULT_TTL_MS = 30_000;

class CacheService {
  constructor({ ttlMs = DEFAULT_TTL_MS } = {}) {
    this.ttlMs = ttlMs;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    this.inFlight = new Map();
  }

  async getOrSet(key, fetcher, ttlMs = this.ttlMs) {
    const existing = this.store.get(key);
    if (existing && Date.now() < existing.expiresAt) {
      this.stats.hits += 1;
      return existing.value;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const pending = (async () => {
      this.stats.misses += 1;
      const value = await fetcher();
      this.store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
      this.stats.sets += 1;
      return value;
    })();

    this.inFlight.set(key, pending);

    try {
      return await pending;
    } finally {
      this.inFlight.delete(key);
    }
  }

  invalidate(key) {
    this.store.delete(key);
    this.inFlight.delete(key);
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRatio: total === 0 ? 0 : this.stats.hits / total
    };
  }
}

const createCacheService = (options = {}) => new CacheService(options);

module.exports = {
  CacheService,
  createCacheService,
  DEFAULT_TTL_MS
};
