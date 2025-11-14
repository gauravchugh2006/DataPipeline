# Trust Metrics and Goodwill Mitigation Strategy

## KPI catalogue

| KPI | Definition | Threshold | Rationale |
| --- | --- | --- | --- |
| On-time delivery rate | Percentage of deliveries completed on or before the promised timestamp | ≥ 95% | Missed commitments erode confidence in fulfilment promises; the flag triggers when punctuality dips. |
| CSR badge coverage | Share of customer support interactions handled by an agent with an active badge | ≥ 75% | Badged agents represent vetted experts; coverage drops signal training gaps that increase churn risk. |
| Average resolution time | Mean minutes to close a support interaction | ≤ 30 minutes | Slow responses compound frustration during post-purchase issues. |
| Resolution success rate | Share of interactions with a successful outcome | ≥ 90% | Guarantees that escalations are actioned, protecting refunds and credits. |
| Composite trust score | Weighted blend of the above (50% on-time, 30% CSR coverage, 20% resolution time) | ≥ 90 healthy, 75–89 monitor, < 75 critical | Consolidates signal fatigue into a single badge-friendly indicator. |

## Rolling logic

* dbt model `trust_signal_rollups` aggregates metrics by service day, calculates 7-day and 30-day rolling means, and annotates thresholds so BI users can filter on breach windows.
* Airflow enrichment normalises metrics into a composite trust score, adds a 30-day rolling composite trend, and surfaces a unified breach flag for alerting.

## Goodwill mitigation

1. **Delivery reliability** – Persistently high on-time performance means fewer refund gestures for missed promises and unlocks proactive messaging when the 7-day trend slips below target.
2. **Expert coverage** – CSR badge coverage exposes staffing gaps; when coverage drops, workforce managers can rebalance shifts before customer sentiment decays.
3. **Responsiveness** – Tracking resolution minutes and success rates limits repeat contacts and public complaints. Combined with breach flags, it feeds customer apology credits only when warranted.

## Trust badges

| Badge | Criteria | Customer experience |
| --- | --- | --- |
| Platinum | Composite trust score ≥ 95 for 30-day rolling window | "Exceptional reliability" badge on order tracking and partner dashboards. |
| Gold | Composite trust score between 90 and 94.99 | Displays "Reliable fulfilment" badge and enables in-app transparency report download. |
| Silver | Composite trust score between 80 and 89.99 | Shows "Improving" badge with contextual messaging about active remediation. |
| Watchlist | Composite trust score < 80 or breach flag triggered | Replaces positive badge with notice directing customers to latest transparency report; prompts partner escalation. |

## Transparency delivery

* **Warehouse mart** – `analytics.mart_trust_scores` refreshes with each Airflow run, ensuring BI and APIs draw from the same trusted source.
* **Customer API** – `/api/trust/metrics` returns JSON for in-app charts; `/api/trust/metrics/export` delivers CSV downloads for partners.
* **BI integration** – Analysts can join the mart with customer cohorts to quantify goodwill at risk and feed executive scorecards.

## Operational handbook

1. Monitor the breach flag daily; a `true` value should trigger a root-cause review and communications plan within four hours.
2. During incidents, expose the transparency export directly in the customer app hero banner to maintain credibility.
3. Review badge coverage weekly with support leads to align training and coaching plans with CSR badge expiry schedules.
