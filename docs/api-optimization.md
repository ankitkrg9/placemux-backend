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

### Expected impact

- Repeated reads of the same report should avoid the database round-trip after the first request until the cache expires.
- This reduces latency for hot, repeated requests and lowers unnecessary load on the database.
