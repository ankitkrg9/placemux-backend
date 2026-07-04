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
    this.tagIndex = new Map();
  }

  async getOrSet(key, fetcher, ttlMs = this.ttlMs, options = {}) {
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
      const tags = Array.from(new Set(options.tags || []));
      const entry = {
        value,
        expiresAt: Date.now() + ttlMs,
        tags
      };
      this.setEntry(key, entry);
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

  setEntry(key, entry) {
    const previousEntry = this.store.get(key);
    if (previousEntry?.tags?.length) {
      this.unindexEntry(key, previousEntry.tags);
    }

    this.store.set(key, entry);
    this.indexEntry(key, entry.tags || []);
  }

  indexEntry(key, tags = []) {
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }

      this.tagIndex.get(tag).add(key);
    });
  }

  unindexEntry(key, tags = []) {
    tags.forEach(tag => {
      const taggedKeys = this.tagIndex.get(tag);
      if (!taggedKeys) {
        return;
      }

      taggedKeys.delete(key);
      if (taggedKeys.size === 0) {
        this.tagIndex.delete(tag);
      }
    });
  }

  invalidate(key) {
    const entry = this.store.get(key);
    if (entry?.tags?.length) {
      this.unindexEntry(key, entry.tags);
    }

    this.store.delete(key);
    this.inFlight.delete(key);
  }

  invalidateByTag(tag) {
    const taggedKeys = this.tagIndex.get(tag);
    if (!taggedKeys) {
      return 0;
    }

    const keys = Array.from(taggedKeys);
    keys.forEach(key => this.invalidate(key));
    this.tagIndex.delete(tag);
    return keys.length;
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
