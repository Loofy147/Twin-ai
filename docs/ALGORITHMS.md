# Twin-AI Algorithms: Evolution & Logic

## 1. Value Alignment Engine (Holistic Logic)

The system's "Overall Logic" is encapsulated in the Value Alignment Engine (`shared/ValueAlignmentEngine.js`). It synthesizes multiple data points into a single coherence metric.

### Holistic Alignment Formula:
$$Score = (Conf_{avg} \times 0.4) + (Syn_{density} \times 0.3) + (Imp_{total} \times 0.2) + (Stab \times 0.1)$$

*   **Confidence ($Conf_{avg}$)**: Average confidence of all detected patterns.
*   **Synergy Density ($Syn_{density}$)**: Ratio of actual detected synergies to total potential dimension pairings.
*   **Impact ($Imp_{total}$)**: Cumulative impact score of patterns, normalized to a 0-1 scale.
*   **Stability ($Stab$)**: Temporal consistency based on the average "age" of pattern updates (lower oscillation equals higher stability).

## 2. Pattern & Synergy Detection

The `shared/PatternDetector.js` handles multi-level value extraction.

### Pattern Detection (Midas/Tuber):
*   **Frequency Trigger**: Triggers after 3 consistent responses for an aspect.
*   **Impact Score**: Calculated as $Confidence \times Strength$.
*   **Optimization**: Uses O(1) in-memory hash map lookups and transactions for high-speed SQLite persistence.

### Synergy Detection (Sun-Tzu/Oracle):
*   **O(N) Grouping**: Patterns are grouped by dimension in a single pass.
*   **Correlation**: Identifies pairings where dimension averages both exceed a 0.75 threshold.
*   **Value Multiplier**: Synergies are assigned a 1.5x impact multiplier compared to standard patterns.

## 3. RL Reward Logic (Bolt/Oracle)

The Digital Twin RL environment (`shared/rl/digital_twin_rl.py`) utilizes an optimized reward function for high-speed simulation.

### Reward Components:
*   **Value Alignment**: Reward proportional to $Strength \times Confidence$ of matching patterns.
*   **O(1) Neglect Penalty**: Uses a **Neglect Penalty Cache** calculated during `reset()`. The penalty sum is updated incrementally during events rather than re-calculating the entire project list every step.
*   **Urgency Weighting**: Project progress bonuses are non-linearly weighted by priority and dynamic urgency (days until deadline).

## 4. Adaptive Question Selection

### Dynamic Target Selection:
*   **Coverage Balancing**: Prioritizes dimensions with low response counts.
*   **Validation Injection**: Automatically injects RL-generated validation questions to test the twin's accuracy against the user's actual behavior.
*   **Difficulty Scaling**: Difficulty levels (1-5) scale with the user's "Learning Version" to maintain engagement.
