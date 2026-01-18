# Reinforcement Learning System for Digital Twin

This document describes the Reinforcement Learning (RL) system used to train the Digital Twin to make decisions and take actions on behalf of the user.

## Overview

The RL system builds upon the learned preferences and patterns detected from user responses. It creates a simulated environment where an agent can explore different actions and learn an optimal policy that aligns with the user's true values.

## Components

### 1. RL Environment (`PersonalLifeEnv`)
A custom OpenAI Gym (Gymnasium) environment that simulates a day in the user's life.
- **State Space**: Includes temporal context (hour, day), personal state (energy, cognitive load), available resources (time), and the status of projects and relationships.
- **Action Space**: A multi-discrete space representing:
  - Action type (rest, work, social, etc.)
  - Target entity (which person or project)
  - Duration
  - Intensity/Depth
- **Reward Function**: Calculates rewards based on:
  - Value alignment (using detected patterns)
  - Energy management (avoiding burnout)
  - Relationship maintenance
  - Project progress (meeting deadlines)

### 2. Data Pipeline
Converts real-world data from the SQLite database into the RL environment's initial state and reward parameters.
- Extracts relationships from `entities` and `entity_attributes`.
- Extracts active projects from `workflows`.
- Extracts learned preferences from the `patterns` table.

### 3. Training Pipeline (`DigitalTwinTrainer`)
Uses the PPO (Proximal Policy Optimization) algorithm from `stable-baselines3` to train the agent.
- Periodically validates the agent's decisions with the user to refine the reward function.
- Saves the trained model for each user profile.

## Training Flow

1. **Data Collection**: User answers questions, and integrations sync real-world data.
2. **Pattern Detection**: Algorithms identify user preferences across 15 dimensions.
3. **Simulation Setup**: The environment is populated with the user's actual projects, people, and goals.
4. **Agent Training**: The agent runs thousands of simulated days to learn the user's decision-making style.
5. **Validation**: The user reviews proposed actions, providing feedback that updates the reward function.
6. **Deployment**: The trained digital twin can then recommend or take actions that match the user's preferences.

## Requirements

- `gymnasium`
- `stable-baselines3`
- `numpy`
- `pandas`
- `torch` (dependency for stable-baselines3)

## Usage

```python
from shared.rl.digital_twin_rl import DigitalTwinTrainer
import sqlite3

db = sqlite3.connect('personal_learning.db')
trainer = DigitalTwinTrainer(db, profile_id=1)
agent = trainer.train(total_timesteps=100000)
```
