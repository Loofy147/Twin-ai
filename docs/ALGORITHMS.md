# Twin-ai Algorithms

## 1. Adaptive Question Selection

The selection engine (`shared/AdaptiveSelectionAlgorithm.js`) uses a multi-factor scoring system to choose the best questions for the user.

### Scoring Factors:
*   **Coverage (40%)**: Prioritizes dimensions with the fewest responses to ensure a balanced profile.
*   **Trade-off Priority (50% boost)**: Boosts 'trade_off' questions for dimensions with low pattern confidence (< 0.4), forcing users to make hard choices that clarify their values.
*   **Difficulty Progression (20%)**: Increases the target difficulty level as the user answers more questions (e.g., Level 1 for 0-20 answers, Level 2 for 21-40, etc.).
*   **Engagement Factor (15%)**: Favors questions with higher inherent engagement ratings.
*   **Randomness (10%)**: Adds variability to prevent the question flow from feeling too predictable.

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
