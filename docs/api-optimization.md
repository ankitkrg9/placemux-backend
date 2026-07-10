# API Optimization Notes

## Baseline report optimization

### Problem

The baseline report endpoint was recomputing the same aggregate metrics on every request, which adds avoidable database work for a read-heavy endpoint.

### Changes made

- Added a short-lived in-memory cache for the baseline report in [src/services/analyticsService.js](src/services/analyticsService.js).
- Reused the cached report for repeat requests within the cache window to avoid duplicate database queries.
- Kept the response contract intact for existing clients.

### Verification

- Test command: `npm test -- --runInBand`
- Result: 4/4 test suites passed and 10/10 tests passed.

### Cache invalidation behavior

- The analytics baseline report is cached for up to 30 seconds by default.
- Writes that affect the underlying analytics dataset (company signup, company profile creation, KYC submission, candidate creation, job creation, and application submission) now proactively invalidate the cached report.
- This keeps the cache fresh on the write path while still allowing bounded staleness during read-only traffic.

### Expected impact

## Production route locking

- Sensitive API routes require authentication.
- Production environments block debug-style paths and return sanitized error responses.
- Startup validates required production configuration before serving traffic.

## Load testing workflow

- Run the API locally before benchmarking, for example with `npm start`.
- Execute the synthetic load test with `npm run load:test`.
- Use `LOAD_TEST_CONCURRENCY`, `LOAD_TEST_TOTAL_REQUESTS`, and `LOAD_TEST_URL` to tune the scenario.
- Review the reported success rate, average latency, and p95/p99 latency for capacity planning.

### Load-test example

```bash
LOAD_TEST_URL=http://127.0.0.1:3000/health LOAD_TEST_CONCURRENCY=20 LOAD_TEST_TOTAL_REQUESTS=200 npm run load:test
```

- Repeated reads of the same report should avoid the database round-trip after the first request until the cache expires.
- This reduces latency for hot, repeated requests and lowers unnecessary load on the database.
