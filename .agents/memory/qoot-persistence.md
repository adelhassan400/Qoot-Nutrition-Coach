---
name: Qoot persistence boundary
description: Why Qoot uses a persistent single-profile backend with replaceable deterministic coach services
---

Qoot's first-user experience uses persistent PostgreSQL records for profile, plans, meals, weights, and workouts, while coach replies and meal-photo estimates stay behind REST endpoints with deterministic behavior.

**Why:** The product needs reload-safe nutrition history immediately, but introducing account auth or paid AI services would expand scope before the core loop is proven.

**How to apply:** Preserve the API shapes when replacing deterministic coach or scanner logic with a managed AI/image provider, and keep user-visible logging flows backed by the database.