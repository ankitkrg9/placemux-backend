# Baseline Report Metric Dictionary

This document records the core metrics exposed by the baseline reporting endpoint.

| Metric                      | Definition                                                                     | Source       |
| --------------------------- | ------------------------------------------------------------------------------ | ------------ |
| total_companies             | Total number of companies registered on the platform.                          | companies    |
| total_jobs                  | Total number of jobs currently published.                                      | jobs         |
| total_candidates            | Total number of candidate profiles created.                                    | candidates   |
| total_applications          | Total application submissions, regardless of status outcome.                   | applications |
| application_acceptance_rate | Share of applications that ended in the APPLIED state.                         | applications |
| rejected_threshold_rate     | Share of applications rejected because the candidate missed a skill threshold. | applications |

## Aggregation grain

The baseline report is aggregated at the overall-platform grain, which means the numbers are calculated across all available data rather than by company, job, or candidate cohort.

## Notes

- The report is deterministic and re-runnable for the same database snapshot.
- The values are intended to be a baseline reference for future reporting periods.
