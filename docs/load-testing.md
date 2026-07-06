# Load testing and stress analysis

## Scenarios

- Load: 10 concurrent requests, 50 total requests against the root endpoint.
- Stress: increase concurrency and total requests to expose saturation limits.
- Soak: hold a steady moderate load for a longer duration to detect leaks or drift.

## Current verified run

Command:

```bash
LOAD_TEST_CONCURRENCY=10 LOAD_TEST_TOTAL_REQUESTS=50 npm run load:test
```

Observed results:

- Success rate: 100%
- Average latency: 8.42 ms
- p95 latency: 23 ms
- p99 latency: 26 ms
- Max latency: 26 ms

## Bottleneck observations

- The server responds successfully at this moderate load level.
- The current bottleneck is not yet the application code at this scale; the next step is to increase concurrency and run a stress scenario to expose the saturation point.

## Capacity guidance

- Keep the current rate-limiting and overload protections in place.
- If the p95 or p99 latency rises sharply under higher concurrency, lower the effective request rate or scale horizontally.
- Use the same script for soak tests to monitor for slow memory growth or queue buildup.
