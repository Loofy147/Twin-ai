# Reinforcement Learning System: The Twin Simulation

The RL System (`shared/rl/digital_twin_rl.py`) is the engine that transforms abstract user patterns into a functional Digital Twin. It operates under the **Oracle** and **Bolt** protocols to ensure predictive accuracy and high-performance training.

## The Simulation Environment (`PersonalLifeEnv`)

The environment is a profile-isolated simulation of the user's life.

### 🛡️ Sentinel: Multi-Tenant Isolation
The environment requires a validated `profile_id` for initialization. All data extraction (relationships, projects, preferences) is strictly filtered by this ID to prevent data leakage in shared training environments.

### ⚡ Bolt: Performance Optimization
To enable millions of training steps, the environment uses a **Neglect Penalty Cache**:
*   Project urgencies and priorities are pre-calculated during `reset()`.
*   The reward for project progress is calculated in O(1) time by updating a running sum rather than iterating over all projects in every step.

## The Overall Logic: Reward Function

The reward function synthesizes the "Values Overall Logic":
1.  **Value Alignment**: Direct rewards for actions that match high-confidence aspects in the `patterns` table.
2.  **Midas Impact**: Rewards are weighted by the `impact_score` of the associated patterns.
3.  **Holistic Balance**: Penalty for energy depletion (burnout) and neglect of high-priority entities.

## Training & Validation (Sun-Tzu/Palette)

### Validation Question Generation
The `DigitalTwinTrainer` uses the trained policy to generate "Self-Reflection" questions:
*   **Logic**: The agent chooses an action in a given scenario.
*   **Palette Interaction**: The system asks the user: *"Your Digital Twin suggested: [Action]. Is this the 'you' that you want to cultivate?"*
*   **Feedback Loop**: User responses to these questions are inserted back into the `responses` table, directly refining the patterns that drive future training.

## Data Pipeline (Tuber)

The `DataPipeline` class bridges the database and the simulation:
*   **Preferences**: Extracts `impact_score` and `confidence` from the `patterns` table.
*   **Entities**: Extracts `strength` (trust) and `priority` from `entity_attributes`.
*   **Multi-Tenancy**: Every SQL query in the pipeline is parameterized with the `profile_id`.

## Usage & Integration

```python
# Oracle/Bolt Production Implementation
from shared.rl.digital_twin_rl import DigitalTwinTrainer

# Profile-specific initialization
trainer = DigitalTwinTrainer(db_connection, profile_id=1)

# Training with SB3
model = trainer.train(total_timesteps=20000)

# Generate validation questions (Palette/Sun-Tzu)
question_ids = trainer.generate_validation_questions(model, n_questions=5)
```
