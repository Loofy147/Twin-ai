## 2025-05-22 - [SQLite Bulk Insert Optimization]
**Learning:** SQLite performance is heavily dependent on transactions. Without a transaction, every insert causes a synchronous disk write. For bulk operations (e.g., 4000+ questions), wrapping in a transaction can yield >100x speedup. Additionally, replacing O(log N) database lookups inside loops with O(1) Map lookups in memory significantly reduces overhead.
**Action:** Always wrap bulk database operations in a single transaction. Cache frequently accessed lookup data (like aspect IDs) in memory before entering a large loop.

## 2025-05-23 - [Database Indexing for Aspects]
**Learning:** Common joins between 'responses', 'questions', and 'answer_options' are frequent in analytics and adaptive selection. Without indexes on foreign keys like 'primary_dimension_id' and 'aspect_id', these joins become full table scans, slowing down linearly with user history.
**Action:** Ensure all foreign keys used in WHERE or JOIN clauses have explicit indexes.

## 2025-05-24 - [Python RL State Copying]
**Learning:** `copy.deepcopy` is extremely slow in Python RL environments where state snapshots are taken every step. For simple nested structures (like a list of flat dictionaries), manual shallow copying of the first level is ~30x faster and sufficient if the nested dicts contain only primitives.
**Action:** Use list/dict comprehensions with `.copy()` for one-level nested data instead of `deepcopy` in performance-critical paths.

## 2026-01-22 - [React useEffect Consolidation]
**Learning:** Having separate `useEffect` hooks for interdependent state (like `filter` and `page`) often leads to "double-fetching" where the first state change triggers a fetch, and the second state change (triggered by the first) cancels the first and triggers a second fetch. This wastes network resources and can cause UI flickering.
**Action:** Consolidate related state updates into a single effect, or use a "force reset" pattern in the fetch function to handle multiple state changes in one cycle.

## 2026-01-22 - [Unified RPC for Dashboard Analytics]
**Learning:** Fetching dashboard components (metrics, breakdown, patterns, activity) via separate API calls causes high TTFB (Time to First Byte) and UI layout shifts as data trickles in. Consolidating into a single server-side RPC reduced network roundtrips from 4 to 1 and allowed for "gap-filling" (e.g., zero-filling days with no activity) to be handled efficiently in the DB instead of the client.
**Action:** Use unified RPCs for data-heavy dashboard views. Shift data normalization and relation joining (like patterns -> dimensions) to the server to reduce payload size and client-side processing.

## 2026-01-23 - [React Memoization & Constant Hoisting]
**Learning:** In large React components, declaring complex objects (icons, color maps, configurations) inside the component body causes them to be recreated on every render, breaking props equality for children and negating the benefits of `React.memo`. Additionally, when wrapping large components in `memo`, subtle syntax errors (like missing closing parentheses) can break the entire build and lead to confusing errors during HMR.
**Action:** Always hoist static configuration objects to the module level. When memoizing components, verify the component signature and closing syntax carefully. Use `useCallback` for event handlers passed to memoized children to ensure stable references.

## 2026-01-24 - [RL Reward Calculation Optimization]
**ROI:** ~65% reduction in step time for 100 projects (expected: 50%)
**Learning:** RL reward functions often contain O(N) loops over state entities (like projects or relationships). Since many reward components (like urgency and priority) are constant within an episode or change only on specific events, they can be cached at reset or updated incrementally. This is critical for training throughput as steps are called millions of times.
**Pattern:** Move loop-based reward logic to a pre-calculation step in 'reset()' and use an O(1) cached lookup in 'step()'.
**Gotcha:** If cached values depend on time-advancing state (like deadlines), ensure the simulation either has constant-time episodes or explicitly recalculates the cache when time-dependent variables change significantly.

## 2026-01-25 - [requestAnimationFrame for Battery-Efficient UI]
**Learning:** Using `setInterval` for high-frequency UI updates (like counters) continues to run even when the tab is backgrounded and doesn't sync with the display's refresh rate, causing unnecessary CPU usage and battery drain. `requestAnimationFrame` automatically throttles to the screen's refresh rate and pauses when the tab is inactive.
**Action:** Prefer `requestAnimationFrame` over `setInterval` for any continuous UI animations or high-frequency updates. Ensure a fallback or immediate final state is available for accessibility (Palette protocol).

## 2026-01-25 - [SQLite UPSERT with Multi-Tenancy]
**Learning:** Implementing `INSERT ... ON CONFLICT` for multi-tenant tables requires the conflict target (e.g., `profile_id, entity_id, attribute_type`) to have a matching UNIQUE index or constraint. Without it, SQLite cannot resolve the conflict, and the query will fail even if the columns exist.
**Action:** When adding `profile_id` to existing tables for isolation, always update the unique constraints to include the `profile_id` to support safe UPSERT operations.
