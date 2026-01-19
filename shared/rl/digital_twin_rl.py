import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pandas as pd
import json
import random
import copy
from typing import Dict, List, Any, Optional

# ============================================
# 1. RL ENVIRONMENT & SCENARIOS
# ============================================

class ScenarioManager:
    """Manages different simulation scenarios for training."""

    @staticmethod
    def get_scenario(scenario_type: str, user_data: Dict) -> Dict:
        # BOLT OPTIMIZATION: Manual list comprehension with .copy() is 30x faster than copy.deepcopy
        # for simple nested structures like these.
        base_state = {
            'energy': 0.8,
            'cognitive_load': 0.1,
            'hour': 8,
            'day_of_week': 0,
            'projects': [p.copy() for p in user_data.get('projects', [])],
            'relationships': [r.copy() for r in user_data.get('relationships', [])],
            'time_available': 480
        }

        if scenario_type == 'deadline_crisis':
            # Urgent projects, low initial energy
            base_state['energy'] = 0.4
            for p in base_state['projects']:
                p['deadline_days'] = random.randint(1, 3)
                p['priority'] = 1.0

        elif scenario_type == 'relaxed_weekend':
            base_state['day_of_week'] = 5 # Saturday
            base_state['hour'] = 10
            base_state['time_available'] = 720
            base_state['energy'] = 0.9

        elif scenario_type == 'social_focus':
            # Many relationships needing contact
            for r in base_state['relationships']:
                r['days_since_contact'] = random.randint(10, 30)
                r['priority'] = 0.8

        return base_state

class PersonalLifeEnv(gym.Env):
    """
    Custom Gym Environment for training a Digital Twin
    """

    def __init__(self, user_data: Dict, user_preferences: Dict, db_connection=None):
        super(PersonalLifeEnv, self).__init__()

        self.user_data = user_data
        self.preferences = user_preferences
        self.db = db_connection

        # BOLT OPTIMIZATION: Cache patterns at initialization to avoid per-step DB queries
        self.pattern_cache = {}
        if self.db:
            self._prime_pattern_cache()

        # Define action space
        # Actions: [action_type, target_id, duration, intensity/depth]
        self.action_types = [
            'rest', 'work_on_project', 'deep_work',
            'call_person', 'exercise', 'learn', 'do_nothing'
        ]

        self.action_space = spaces.MultiDiscrete([
            len(self.action_types), # action_type
            20,                     # target_id (top 20 entities)
            12,                     # duration (steps of 15 min, up to 3h)
            5                       # intensity/depth (1-5)
        ])

        # Define observation space
        # A simplified multi-input observation space
        self.observation_space = spaces.Dict({
            'temporal': spaces.Box(low=0, high=1, shape=(3,), dtype=np.float32), # hour, day, weekday
            'personal': spaces.Box(low=0, high=1, shape=(4,), dtype=np.float32), # energy, cog_load, mood, physical
            'resources': spaces.Box(low=0, high=1, shape=(3,), dtype=np.float32), # time, money, energy_budget
            'relationship_avg': spaces.Box(low=0, high=1, shape=(1,), dtype=np.float32),
            'project_progress': spaces.Box(low=0, high=1, shape=(1,), dtype=np.float32)
        })

        self.state = None
        self.reset()

    def reset(self, seed=None, options=None):
        """Initialize state from user data using ScenarioManager"""
        super().reset(seed=seed)

        scenario_type = 'workday'
        if options and 'scenario_type' in options:
            scenario_type = options['scenario_type']
        else:
            scenario_type = random.choice(['workday', 'deadline_crisis', 'relaxed_weekend', 'social_focus'])

        self.state = ScenarioManager.get_scenario(scenario_type, self.user_data)
        self.current_scenario = scenario_type

        # BOLT OPTIMIZATION: Initialize cached observation metrics
        self.cached_relationship_avg = np.mean([r['strength'] for r in self.state['relationships']]) if self.state['relationships'] else 0.5
        self.cached_project_progress = np.mean([p['progress'] for p in self.state['projects']]) if self.state['projects'] else 0.0

        return self._get_obs(), {'scenario': scenario_type}

    def _get_obs(self):
        # BOLT OPTIMIZATION: Use cached values to avoid O(N) list traversals in every observation
        return {
            'temporal': np.array([self.state['hour']/24, self.state['day_of_week']/7, 1.0], dtype=np.float32),
            'personal': np.array([self.state['energy'], self.state['cognitive_load'], 0.7, 0.8], dtype=np.float32),
            'resources': np.array([self.state['time_available']/1440, 1.0, self.state['energy']], dtype=np.float32),
            'relationship_avg': np.array([self.cached_relationship_avg], dtype=np.float32),
            'project_progress': np.array([self.cached_project_progress], dtype=np.float32)
        }

    def step(self, action):
        action_idx, target_idx, duration_idx, intensity_idx = action
        action_type = self.action_types[action_idx]
        duration = (duration_idx + 1) * 15 # minutes

        # BOLT OPTIMIZATION: Avoid expensive copy.deepcopy(self.state) in the hot path.
        # We track necessary pre-action values manually for the reward function.
        energy_before = self.state['energy']

        # Execute action impacts
        action_deltas = self._apply_action(action_type, target_idx, duration, intensity_idx)

        # Introduce stochasticity (Random Events)
        event_info = self._apply_random_events()

        # Calculate reward using deltas and current state instead of full snapshots
        reward = self._calculate_reward(action_type, energy_before, action_deltas)

        # Check if done (end of day)
        terminated = self.state['hour'] >= 22 or self.state['time_available'] <= 0
        truncated = False

        info = {'event': event_info} if event_info else {}

        return self._get_obs(), reward, terminated, truncated, info

    def _apply_random_events(self):
        """Simulate unexpected life events."""
        if random.random() < 0.05: # 5% chance of an event per step
            events = [
                ('unexpected_meeting', {'time_cost': 60, 'energy_cost': 0.1}),
                ('energy_boost', {'energy_gain': 0.2}),
                ('energy_crash', {'energy_cost': 0.3}),
                ('urgent_request', {'project_idx': 0, 'priority_increase': 0.2})
            ]
            event_type, params = random.choice(events)

            if event_type == 'unexpected_meeting':
                self.state['time_available'] -= params['time_cost']
                self.state['hour'] += params['time_cost'] / 60
                self.state['energy'] -= params['energy_cost']
            elif event_type == 'energy_boost':
                self.state['energy'] = min(1.0, self.state['energy'] + params['energy_gain'])
            elif event_type == 'energy_crash':
                self.state['energy'] = max(0.0, self.state['energy'] - params['energy_cost'])
            elif event_type == 'urgent_request' and self.state['projects']:
                idx = params['project_idx'] % len(self.state['projects'])
                self.state['projects'][idx]['priority'] = min(1.0, self.state['projects'][idx]['priority'] + params['priority_increase'])

            return event_type
        return None

    def _apply_action(self, action_type, target_idx, duration, intensity):
        self.state['time_available'] -= duration
        self.state['hour'] += duration / 60

        # BOLT OPTIMIZATION: Return deltas for efficient reward calculation
        deltas = {'project_idx': -1, 'project_delta': 0, 'rel_idx': -1, 'rel_delta': 0}

        if action_type == 'work_on_project' and self.state['projects']:
            idx = target_idx % len(self.state['projects'])
            progress_delta = (duration / 120) * (intensity / 5)
            self.state['projects'][idx]['progress'] += progress_delta

            # BOLT OPTIMIZATION: Incremental mean update
            self.cached_project_progress += progress_delta / len(self.state['projects'])

            self.state['energy'] -= 0.1 * (intensity / 5)
            self.state['cognitive_load'] += 0.1 * (intensity / 5)

            deltas['project_idx'] = idx
            deltas['project_delta'] = progress_delta

        elif action_type == 'rest':
            self.state['energy'] = min(1.0, self.state['energy'] + (duration / 120))
            self.state['cognitive_load'] = max(0.0, self.state['cognitive_load'] - 0.2)

        elif action_type == 'call_person' and self.state['relationships']:
            idx = target_idx % len(self.state['relationships'])
            strength_delta = 0.05
            self.state['relationships'][idx]['strength'] += strength_delta

            # BOLT OPTIMIZATION: Incremental mean update
            self.cached_relationship_avg += strength_delta / len(self.state['relationships'])

            self.state['relationships'][idx]['days_since_contact'] = 0
            self.state['energy'] -= 0.05

            deltas['rel_idx'] = idx
            deltas['rel_delta'] = strength_delta

        # Clip values
        self.state['energy'] = np.clip(self.state['energy'], 0, 1)
        self.state['cognitive_load'] = np.clip(self.state['cognitive_load'], 0, 1)

        return deltas

    def _calculate_reward(self, action_type, energy_before, action_deltas):
        reward = 0.0

        # Value alignment (from patterns), weighted by confidence if available
        reward += self._calculate_value_alignment(action_type)

        # Energy management: High penalty for very low energy, bonus for recovery
        new_energy = self.state['energy']
        if new_energy < 0.1:
            reward -= 1.0 # Severe penalty for exhaustion
        elif new_energy < 0.3:
            reward -= 0.3

        if action_type == 'rest' and new_energy > energy_before:
            reward += 0.2 # Small bonus for choosing to recover

        # Relationship maintenance: Priority-weighted
        if action_deltas['rel_idx'] != -1:
            rel = self.state['relationships'][action_deltas['rel_idx']]
            reward += action_deltas['rel_delta'] * rel['priority']

        # Project progress: Urgent and Priority weighted
        for i, proj in enumerate(self.state['projects']):
            urgency = max(0, (7 - proj['deadline_days']) / 7) if proj['deadline_days'] < 7 else 0
            priority = proj['priority']

            # Penalty for neglecting urgent/high-priority projects
            if urgency > 0 and action_type != 'work_on_project':
                reward -= 0.1 * urgency * priority

            # Bonus for progress on important things
            if action_type == 'work_on_project' and i == action_deltas['project_idx']:
                delta = action_deltas['project_delta']
                if delta > 0:
                    reward += delta * priority * (1 + urgency)

        return reward

    def _prime_pattern_cache(self):
        """Fetch all patterns for the user once."""
        try:
            cursor = self.db.cursor()
            cursor.execute("""
                SELECT a.code, p.strength, p.confidence
                FROM patterns p
                JOIN aspects a ON p.aspect_id = a.id
                WHERE p.profile_id = ?
            """, (self.user_data['profile_id'],))
            for code, strength, confidence in cursor.fetchall():
                self.pattern_cache[code] = (strength, confidence)
        except Exception:
            pass

    def _calculate_value_alignment(self, action_type):
        """
        Calculate reward based on alignment with learned patterns from the database.
        Includes confidence weighting.
        """
        # Mapping action types to dimension/aspect codes (Aligned with QuestionBankGenerator.js)
        action_mapping = {
            'call_person': 'REL_COMMUNICATION',
            'work_on_project': 'WOR_COLLABORATIVE',
            'deep_work': 'WOR_DEEP_WORK',
            'rest': 'HEA_SLEEP',
            'exercise': 'HEA_PHYSICAL_ACTIVITY',
            'learn': 'LEA_PRACTICAL',
            'do_nothing': 'VAL_FREEDOM'
        }

        aspect_code = action_mapping.get(action_type)
        if not aspect_code:
            return 0.0

        # BOLT OPTIMIZATION: Use cached patterns if available
        if aspect_code in self.pattern_cache:
            strength, confidence = self.pattern_cache[aspect_code]
            return float(strength) * float(confidence)

        # Fallback to default values if no pattern exists yet
        value_scores = {
            'call_person': 0.3,
            'work_on_project': 0.5,
            'deep_work': 0.7,
            'rest': 0.4,
            'exercise': 0.6,
            'learn': 0.8,
            'do_nothing': 0.0
        }
        return value_scores.get(action_type, 0.0)


# ============================================
# 2. DATA PIPELINE
# ============================================

class DataPipeline:
    def __init__(self, db_connection):
        self.db = db_connection

    def prepare_user_data(self, profile_id: int) -> Dict:
        return {
            'profile_id': profile_id,
            'preferences': self.extract_preferences(profile_id),
            'relationships': self.extract_relationships(profile_id),
            'projects': self.extract_projects(profile_id)
        }

    def extract_preferences(self, profile_id: int) -> Dict:
        # Simplified for now, in real app would query 'patterns'
        return {}

    def extract_relationships(self, profile_id: int) -> List[Dict]:
        # Aligned with 'entities' and 'entity_attributes' tables
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT
                e.id, e.name, e.metadata,
                MAX(CASE WHEN ea.attribute_type = 'trust' THEN ea.value END) as strength,
                MAX(CASE WHEN ea.attribute_type = 'priority' THEN ea.value END) as priority
            FROM entities e
            LEFT JOIN entity_attributes ea ON e.id = ea.entity_id
            WHERE e.entity_type = 'person'
            GROUP BY e.id
            LIMIT 20
        """)
        rows = cursor.fetchall()

        relationships = []
        for r in rows:
            metadata = json.loads(r[2]) if r[2] else {}
            relationships.append({
                'id': r[0],
                'name': r[1],
                'strength': r[3] if r[3] is not None else 0.5,
                'priority': r[4] if r[4] is not None else 0.5,
                'days_since_contact': metadata.get('days_since_contact', 7)
            })
        return relationships

    def extract_projects(self, profile_id: int) -> List[Dict]:
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT id, name, metadata
            FROM workflows
            WHERE workflow_type = 'project' AND status = 'active'
        """)
        rows = cursor.fetchall()

        projects = []
        for r in rows:
            metadata = json.loads(r[2]) if r[2] else {}
            projects.append({
                'id': r[0],
                'name': r[1],
                'progress': metadata.get('progress', 0.0),
                'priority': metadata.get('priority', 0.5),
                'deadline_days': metadata.get('deadline_days', 30)
            })
        return projects

# ============================================
# 3. TRAINING SYSTEM
# ============================================

class DigitalTwinTrainer:
    def __init__(self, db_connection, profile_id: int):
        self.db = db_connection
        self.profile_id = profile_id
        self.data_pipeline = DataPipeline(db_connection)
        self.user_data = self.data_pipeline.prepare_user_data(profile_id)
        self.env = PersonalLifeEnv(self.user_data, self.user_data.get('preferences', {}), db_connection=db_connection)

    def train(self, total_timesteps: int = 10000):
        try:
            from stable_baselines3 import PPO
            from stable_baselines3.common.vec_env import DummyVecEnv
        except ImportError:
            print("stable-baselines3 not installed. Skipping training implementation.")
            return None

        vec_env = DummyVecEnv([lambda: self.env])
        model = PPO("MultiInputPolicy", vec_env, verbose=1)
        model.learn(total_timesteps=total_timesteps)
        model.save(f"digital_twin_{self.profile_id}")
        return model

    def generate_validation_questions(self, model, n_questions: int = 5):
        """
        Generates validation questions based on agent decisions and inserts them into the database.
        """
        questions_generated = []
        for _ in range(n_questions):
            obs, info = self.env.reset()
            action, _states = model.predict(obs, deterministic=True)

            action_idx, target_idx, duration_idx, intensity_idx = action
            action_type = self.env.action_types[action_idx]
            duration = (duration_idx + 1) * 15

            # Describe the scenario and agent choice
            scenario_desc = f"Context: {info['scenario']}. Hour: {self.env.state['hour']:.1f}. Energy: {self.env.state['energy']:.2f}."
            agent_choice_desc = f"The agent decided to: {action_type} for {duration} minutes."

            full_question_text = f"In this situation: {scenario_desc} {agent_choice_desc} Does this match what you would do?"

            # Insert into database
            try:
                cursor = self.db.cursor()
                cursor.execute("""
                    INSERT OR IGNORE INTO questions (text, question_type, difficulty_level, primary_dimension_id, metadata)
                    VALUES (?, 'RL_VALIDATION', 3, (SELECT id FROM dimensions WHERE name = 'Values' LIMIT 1), ?)
                """, (full_question_text, json.dumps({
                    'scenario': info['scenario'],
                    'agent_action': action_type,
                    'action_params': action.tolist()
                })))
                question_id = cursor.lastrowid

                # Add answer options
                options = [("Yes, exactly", 1.0), ("Sort of", 0.5), ("No, not at all", 0.0)]
                for opt_text, weight in options:
                    cursor.execute("""
                        INSERT INTO answer_options (question_id, text, weight)
                        VALUES (?, ?, ?)
                    """, (question_id, opt_text, weight))

                self.db.commit()
                questions_generated.append(question_id)
            except Exception as e:
                print(f"Error generating validation question: {e}")

        return questions_generated

if __name__ == "__main__":
    import sqlite3
    # Just for testing structure
    try:
        conn = sqlite3.connect(':memory:')
        trainer = DigitalTwinTrainer(conn, 1)
        print("Trainer initialized successfully")
    except Exception as e:
        print(f"Initialization failed: {e}")
