# Twin-ai Algorithms

## 1. Adaptive Question Selection

The selection engine (`shared/AdaptiveSelectionAlgorithm.js`) and the frontend `useQuestions` hook work together to provide a paginated, filtered, and adaptive question stream.

### Scoring Factors:
*   **Coverage (40%)**: Prioritizes dimensions with the fewest responses to ensure a balanced profile.
*   **Trade-off Priority (50% boost)**: Boosts 'trade_off' questions for dimensions with low pattern confidence (< 0.4), forcing users to make hard choices that clarify their values.
*   **Difficulty Progression (20%)**: Increases the target difficulty level as the user answers more questions (e.g., Level 1 for 0-20 answers, Level 2 for 21-40, etc.).
*   **Engagement Factor (15%)**: Favors questions with higher inherent engagement ratings.
*   **Randomness (10%)**: Adds variability to prevent the question flow from feeling too predictable.

### Pagination & Resilience:
*   **Incremental Loading**: Questions are fetched in batches (default: 10) to optimize browser performance and reduce database load.
*   **Server-Side Filtering**: Dimension filtering and answered-question exclusion are performed at the database level for maximum efficiency.
*   **Circuit Breaker Logic**: The data layer implements a circuit breaker that trips after 5 consecutive failures, preventing system-wide crashes during transient API outages.

## 2. Pattern Detection

The pattern detector (`shared/PatternDetector.js`) analyzes user responses to identify consistent preferences.

### Process:
1.  **Frequency Analysis**: Identifies `aspect_id`s that have been selected at least 3 times.
2.  **Confidence Calculation**: Confidence is calculated as `min(1.0, count / 10)`.
3.  **Strength Calculation**: Strength is the average `weight` of the selected options for that aspect.
4.  **Persistence**: Identified patterns are saved or updated in the `patterns` table using an upsert logic.

## 3. Dynamic Question Generation

Integrations generate questions based on real-world entities.

### Example Logic:
*   **Relationship Questions**: Generated from `Entities` of type 'person'.
*   **Priority Questions**: Generated from `Entities` of type 'file' or 'event'.
*   **Temporal Validation**: Asks about preferred meeting times based on calendar patterns.
