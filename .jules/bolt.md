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
