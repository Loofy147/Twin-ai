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

## 2026-01-26 - [View-Based Code Splitting]
**Learning:** Statically importing all major view components at the root levels (like `App.tsx`) forces the browser to download the entire application logic before the first paint, even if the user only visits the Home page. For apps with complex analytical views, this bloats the initial chunk size significantly.
**Action:** Use `React.lazy` with dynamic imports for route-level components. Wrap the view renderer in `<Suspense>` to provide a consistent loading state while chunks are fetched. This reduces the initial bundle size and improves Time to Interactive (TTI).

## 2026-01-26 - [Localized State for High-Frequency Input]
**Learning:** Storing state for peripheral UI elements (like a footer newsletter form) in a root-level component (like `App.tsx`) causes the entire application tree to re-render on every keystroke. This is especially impactful in complex apps where the main view contains data-heavy components (Analytics, Knowledge Graphs).
**Action:** Extract peripheral forms into dedicated, memoized components with localized state. This ensures that typing only triggers a re-render of the small form component, keeping the rest of the application idle.

## 2026-01-25 - [SQLite UPSERT with Multi-Tenancy]
**Learning:** Implementing `INSERT ... ON CONFLICT` for multi-tenant tables requires the conflict target (e.g., `profile_id, entity_id, attribute_type`) to have a matching UNIQUE index or constraint. Without it, SQLite cannot resolve the conflict, and the query will fail even if the columns exist.
**Action:** When adding `profile_id` to existing tables for isolation, always update the unique constraints to include the `profile_id` to support safe UPSERT operations.

## 2026-01-25 - [Synergy Detection via O(N) Grouping]
**Learning:** Detecting synergies (cross-dimension correlations) can easily become an O(N²) problem if checking every pair of patterns. By grouping patterns by dimension in a single pass (O(N)) and then comparing dimension-level stats, the search space for synergies is reduced from patterns to dimensions, which is much smaller.
**Action:** Use intermediate aggregation or grouping (hash maps) to reduce the complexity of correlation detection algorithms.

## 2026-01-25 - [Meta-Identity Synergy Optimization]
**Learning:** Operating from a single identity (e.g., only Bolt) can lead to myopic optimizations that compromise security (Sentinel) or architecture (Oracle). By utilizing the Meta-Identity Framework, we can identify "Multi-Objective" optimizations. For example, the 'Alignment Engine' provides both a performance win (single RPC) and a strategic win (user value metric).
**Action:** Use the Meta-Identity Council to peer-review architectural changes before implementation to ensure all project dimensions are balanced.

## 2026-01-26 - [RL Observation & Reward Optimization]
**ROI:** ~65% reduction in step time (from 37µs to 13µs).
**Learning:** In high-frequency loops like RL 'step' functions, creating new dictionaries and numpy arrays on every call is a major bottleneck. Pre-allocating observation arrays and using O(1) reward caches (populated at initialization or on infrequent reset events) significantly boosts throughput.
**Action:** Pre-allocate mutable numpy arrays for observations and return '.copy()' to satisfy the contract while avoiding list-to-array overhead. Hoist all mapping logic and static scores to class constants to avoid redundant allocations.

## 2026-01-29 - [Route-level Code Splitting for Bundle Optimization]
**Learning:** For single-page applications with distinct views, bundling all components together increases the initial load time significantly as the application grows. Route-level code splitting using `React.lazy` and `React.Suspense` allows the browser to download only the necessary code for the active route, improving Time to Interactive (TTI).
**Action:** Implement code splitting for major feature views that are not part of the initial landing experience. Use a stable fallback UI (like a centered spinner with defined height) to minimize Layout Shift (CLS) during view transitions.

## 2026-01-29 - [React Hook State Consolidation]
**Learning:** Sequential updates to multiple `useState` variables within a single event (like an API response) trigger multiple re-renders of the component and all its children. Consolidating these into a single state object ensures that the update is atomic and triggers only one re-render cycle.
**Action:** Use a single `state` object for highly-correlated data in custom hooks instead of multiple `useState` calls. This is especially impactful for data-heavy views like Analytics where multiple charts and metrics depend on the same fetch result.

## 2026-01-30 - [Memoizing Root Context Values]
**Learning:** Passing a fresh object literal to a root-level context provider (e.g., 'AuthContext.tsx') triggers a re-render of the entire application tree on every provider update, regardless of whether the underlying state values changed. While React 18's automatic batching reduces the impact of multiple state updates, it does not prevent the cascading re-render caused by an unstable object reference in a Context Provider.
**Action:** Always wrap Context Provider value objects in 'useMemo'. This is the most critical performance optimization for large React applications to ensure that state changes in the root only affect the specific components that consume those values.

## 2026-02-14 - [Covering Index for Response Analysis]
**Learning:** The `PatternDetector.analyzeResponses` query was a major bottleneck as user history grew. By adding a composite covering index on `(profile_id, response_type, answer_option_id)`, we eliminate the need for full table scans and additional lookups for the joined columns.
**ROI:** ~34-56% reduction in analysis time (verified with 100k responses).
**Action:** Use composite indexes to cover both filtering (`WHERE`) and joining (`JOIN`) columns in high-frequency analytical queries.

## 2026-01-30 - [Parallelizing Integration Fetches]
**Learning:** Sequential 'await' calls in a loop for independent tasks (like fetching from multiple integrations) creates a bottleneck where total time = sum(individual times). Switching to 'Promise.all' allows concurrent execution, reducing total time to max(individual times).
**Action:** Use 'Promise.all' for independent async operations, especially when they involve network I/O or multiple external integrations.

## 2026-02-06 - [Pruned O(D^2) Loop for Synergies]
**ROI:** ~40-90% reduction in synergy detection time.
**Learning:** Calculating synergies between all dimension pairs is an O(D^2) problem. By pre-calculating dimension averages and sorting them descending, we can prune the search space significantly. If avg(A) + avg(next_best_B) <= 1.5 (threshold 0.75), we can skip all remaining pairs for A and potentially break the outer loop entirely.
**Action:** Always sort and prune nested correlation loops when a threshold exists. Avoid redundant operations like JSON.parse or repeated divisions inside these hot loops.

## 2026-02-06 - [Async DB Compatibility in Shared Logic]
**Learning:** Shared logic (PatternDetector, AdaptiveSelectionAlgorithm) that interacts with a database must use await for all DB operations (all, get, run, transaction) to be compatible with both synchronous (Node.js/better-sqlite3) and asynchronous (React Native/Supabase) database adapters. Without await, these methods return Promises instead of data in async environments, leading to runtime errors like forEach is not a function.
**Action:** Standardize on async/await for all database interactions in shared modules.

## 2026-02-07 - [Database Query Consolidation in ValueAlignmentEngine]
**Learning:** Performing multiple aggregate queries on the same table within a single logical operation (like calculating holistic alignment) introduces unnecessary roundtrip latency and redundant table scans. Modern SQL (including SQLite) supports conditional aggregation using CASE WHEN inside aggregate functions, allowing multiple filtered metrics to be retrieved in a single scan.
**Action:** When an operation requires multiple metrics from the same table with different filters, consolidate them into a single SELECT statement using CASE WHEN and aggregate functions.

## 2026-02-08 - [Bounded Candidate Selection for Adaptive Algorithms]
**Learning:** Question selection algorithms that score the entire unanswered question bank in JavaScript suffer from O(N) complexity that degrades as the dataset grows. By moving initial filtering (active status) and ordering (engagement) to the database with a reasonable `LIMIT` (e.g., 500), the JS processing time is capped at O(1) relative to total bank size. The use of `NOT EXISTS` over `LEFT JOIN` for anti-joins further improves SQLite performance for large exclusion sets.
**Action:** Always cap candidate sets fetched for JS-side scoring using SQL `LIMIT`. Ensure ordering uses indexed columns to avoid temporary sort tables.
