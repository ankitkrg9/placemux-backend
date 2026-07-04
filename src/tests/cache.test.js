const { createCacheService } = require("../services/cacheService");

describe("Redis-backed cache service", () => {
  it("serves cached values from a cache hit and records the hit ratio", async () => {
    const cache = createCacheService({ ttlMs: 1000 });
    const fetcher = jest.fn().mockResolvedValue({ message: "from-db" });

    const first = await cache.getOrSet("analytics:baseline", fetcher, 1000);
    const second = await cache.getOrSet("analytics:baseline", fetcher, 1000);

    expect(first).toEqual({ message: "from-db" });
    expect(second).toEqual({ message: "from-db" });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
  });

  it("prevents stampedes by sharing an in-flight promise for the same key", async () => {
    const cache = createCacheService({ ttlMs: 1000 });
    let resolveValue;

    const fetcher = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveValue = resolve;
    }));

    const firstPromise = cache.getOrSet("analytics:hot-key", fetcher, 1000);
    const secondPromise = cache.getOrSet("analytics:hot-key", fetcher, 1000);

    resolveValue({ message: "shared" });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first).toEqual({ message: "shared" });
    expect(second).toEqual({ message: "shared" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("invalidates cached entries when a related tag is invalidated", async () => {
    const cache = createCacheService({ ttlMs: 1000 });
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ message: "first" })
      .mockResolvedValueOnce({ message: "second" });

    const first = await cache.getOrSet("analytics:baseline", fetcher, 1000, { tags: ["analytics:reports"] });
    expect(first).toEqual({ message: "first" });

    cache.invalidateByTag("analytics:reports");

    const second = await cache.getOrSet("analytics:baseline", fetcher, 1000, { tags: ["analytics:reports"] });

    expect(second).toEqual({ message: "second" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
