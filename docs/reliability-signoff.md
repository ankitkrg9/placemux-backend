**Reliability Sign-off**

**Scope:** payments initiation, background worker, outbox publishing, rate limiting and overload guard.

Checks performed:

- **Automated tests:** Core unit and integration tests run under CI (`npm test`).
- **Concurrency test:** `src/tests/concurrency.payment.test.js` verifies idempotency under concurrent requests.
- **Outbox:** transactional writes to `outbox` on payment initiation; publisher worker reads and marks published.
- **Circuit breaker:** external gateway wrapped with a circuit breaker to prevent cascading failures.
- **Overload guard and rate limiter:** `overloadGuard` in `src/server.js` and rate limiter applied.

How to reproduce load run (local):

1. Start the API locally:

```bash
npm run dev
```

2. Run the provided load test (adjust env vars as needed):

```bash
# e.g. 200 connections for 30s
LOAD_TEST_CONNECTIONS=200 LOAD_TEST_DURATION=30 npm run load:test
```

What to inspect:

- Monitor process CPU/memory and DB connection count.
- Watch for `503` responses from overload guard or rate limiter — expected under heavy overload.
- Confirm no duplicate payments created by inspecting `payments` table for the test reference id.

Next actions (recommended):

- Add a production-grade publisher that publishes to Kafka/SQS with retries and DLQ.
- Add Prometheus metrics and an alerting runbook.
