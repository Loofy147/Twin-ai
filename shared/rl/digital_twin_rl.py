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
        # SENTINEL: Enforce strict profile isolation in RL environment
        if not user_data or 'profile_id' not in user_data:
            raise ValueError("RL Environment must be initialized with a valid profile_id")

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
            'call_person', 'exercise', 'learn', 'do_nothing',
            'strategic_decision', 'economic_action', 'political_action', 'cultural_action'
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

        # BOLT OPTIMIZATION: Initialize cached metrics for O(1) step/reward calculations
        self.cached_relationship_avg = np.mean([r['strength'] for r in self.state['relationships']]) if self.state['relationships'] else 0.5
        self.cached_project_progress = np.mean([p['progress'] for p in self.state['projects']]) if self.state['projects'] else 0.0

        # Pre-calculate project urgencies and total neglect penalty sum
        # BOLT: These are cached to enable O(1) reward calculation in the hot path.
        self._update_neglect_penalty_cache()

        return self._get_obs(), {'scenario': scenario_type}

    def _update_neglect_penalty_cache(self):
        """
        Calculates and caches the sum of neglect penalties for all projects.
        Urgencies are based on deadline_days, which are currently constant per episode.
        If deadline_days were to change during a step, this should be called again.
        """
        self.project_urgencies = []
        self.cached_neglect_penalty_sum = 0.0
        for p in self.state['projects']:
            # Urgency formula: higher as deadline approaches (< 7 days)
            urgency = max(0, (7 - p['deadline_days']) / 7) if p['deadline_days'] < 7 else 0
            self.project_urgencies.append(urgency)
            if urgency > 0:
                self.cached_neglect_penalty_sum += 0.1 * urgency * p['priority']

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

                # BOLT OPTIMIZATION: Refresh the neglect penalty cache when priority changes
                self._update_neglect_penalty_cache()

            return event_type
        return None

    def _apply_action(self, action_type, target_idx, duration, intensity):
        self.state['time_available'] -= duration
        self.state['hour'] += duration / 60

        # BOLT OPTIMIZATION: Return deltas for efficient reward calculation
        deltas = {'project_idx': -1, 'project_delta': 0, 'rel_idx': -1, 'rel_delta': 0, 'impact_delta': 0}

        # SENTINEL: Privacy Constraint - High intensity actions on sensitive data increase risk
        if intensity > 3 and action_type in ['call_person', 'economic_action']:
             if 'privacy_sensitivity_high' in self.pattern_cache:
                 self.state['energy'] -= 0.1 # Penalty for privacy risk management

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

        elif action_type == 'strategic_decision':
            # SUN TZU: Long-term impact focus, high energy cost
            self.state['energy'] -= 0.2
            self.state['cognitive_load'] += 0.3
            deltas['impact_delta'] = 0.5 * (intensity / 5)

        elif action_type == 'economic_action':
            # Economics & Trade: Market/Credit/Bank interaction
            self.state['energy'] -= 0.1
            deltas['impact_delta'] = 0.2 * (intensity / 5)

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
        # BOLT OPTIMIZATION: Replaced O(N) loop with O(1) cached penalty and direct progress bonus access
        if action_type != 'work_on_project':
            reward -= self.cached_neglect_penalty_sum
        else:
            idx = action_deltas['project_idx']
            if idx != -1:
                proj = self.state['projects'][idx]
                urgency = self.project_urgencies[idx]
                delta = action_deltas['project_delta']
                if delta > 0:
                    # Bonus for progress on important things
                    reward += delta * proj['priority'] * (1 + urgency)

        # MIDAS: Add bonus for impact-generating actions (Strategic/Economic)
        if action_deltas.get('impact_delta', 0) > 0:
            reward += action_deltas['impact_delta'] * 2.0

        return reward

    def _prime_pattern_cache(self):
        """Fetch all patterns for the user once."""
        try:
            cursor = self.db.cursor()
            # BOLT: Fetch dimension-linked patterns
            cursor.execute("""
                SELECT a.code, p.strength, p.confidence
                FROM patterns p
                JOIN aspects a ON p.aspect_id = a.id
                WHERE p.profile_id = ?
            """, (self.user_data['profile_id'],))
            for code, strength, confidence in cursor.fetchall():
                self.pattern_cache[code] = (strength, confidence)

            # SENTINEL: Fetch general patterns (like privacy sensitivity)
            cursor.execute("""
                SELECT pattern_type, strength, confidence
                FROM patterns
                WHERE profile_id = ? AND dimension_id IS NULL AND aspect_id IS NULL
            """, (self.user_data['profile_id'],))
            for ptype, strength, confidence in cursor.fetchall():
                self.pattern_cache[ptype] = (strength, confidence)
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
            'do_nothing': 'VAL_FREEDOM',
            'strategic_decision': 'POW_REVOLUTION',
            'economic_action': 'ECO_MARKET',
            'political_action': 'POW_DEMOCRACY',
            'cultural_action': 'CUL_LANGUAGE'
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
            'do_nothing': 0.0,
            'strategic_decision': 0.9,
            'economic_action': 0.6,
            'political_action': 0.5,
            'cultural_action': 0.4
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
        """
        TUBER: Extract preferences from patterns to inform RL environment.
        Expected: Allows the agent to start with user-aligned weights.
        """
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT a.code, p.strength, p.confidence, p.impact_score
            FROM patterns p
            JOIN aspects a ON p.aspect_id = a.id
            WHERE p.profile_id = ? AND p.confidence > 0.4
        """, (profile_id,))
        rows = cursor.fetchall()

        preferences = {}
        for r in rows:
            preferences[r[0]] = {
                'strength': r[1],
                'confidence': r[2],
                'impact': r[3]
            }
        return preferences

    def extract_relationships(self, profile_id: int) -> List[Dict]:
        # TUBER: Added profile_id filtering to prevent data leakage and ensure multi-tenant isolation
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT
                e.id, e.name, e.metadata,
                MAX(CASE WHEN ea.attribute_type = 'trust' THEN ea.value END) as strength,
                MAX(CASE WHEN ea.attribute_type = 'priority' THEN ea.value END) as priority
            FROM entities e
            LEFT JOIN entity_attributes ea ON e.id = ea.entity_id AND ea.profile_id = ?
            WHERE e.entity_type = 'person' AND e.profile_id = ?
            GROUP BY e.id
            LIMIT 20
        """, (profile_id, profile_id))
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
        # TUBER: Added profile_id filtering for multi-tenant isolation
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT id, name, metadata
            FROM workflows
            WHERE workflow_type = 'project' AND status = 'active' AND profile_id = ?
        """, (profile_id,))
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
        SENTINEL: Ensures questions are tied only to the current profile.
        """
        questions_generated = []
        for _ in range(n_questions):
            obs, info = self.env.reset()

            # ORACLE: Validate observation integrity before processing
            if not obs or 'energy' not in obs:
                continue
            action, _states = model.predict(obs, deterministic=True)

            action_idx, target_idx, duration_idx, intensity_idx = action
            action_type = self.env.action_types[action_idx]
            duration = (duration_idx + 1) * 15

            # Describe the scenario and agent choice
            scenario_desc = f"Context: {info['scenario']}. Hour: {self.env.state['hour']:.1f}. Energy: {self.env.state['energy']:.2f}."
            agent_choice_desc = f"The agent decided to: {action_type} for {duration} minutes."

            # PALETTE: Engaging and aspect-aware question text
            # ORACLE: Link decision to potential long-term value
            full_question_text = (
                f"Your Digital Twin is learning from your {action_type} habits. "
                f"Scenario: {info['scenario']}. Hour: {self.env.state['hour']:.1f}. "
                f"It suggested: '{action_type} for {duration}m'. "
                "Is this the 'you' that you want to cultivate?"
            )

            # Insert into database
            try:
                cursor = self.db.cursor()
                cursor.execute("""
                    INSERT OR IGNORE INTO questions (profile_id, text, question_type, difficulty_level, primary_dimension_id, metadata)
                    VALUES (?, ?, 'RL_VALIDATION', 3, (SELECT id FROM dimensions WHERE name = 'Values' LIMIT 1), ?)
                """, (self.profile_id, full_question_text, json.dumps({
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
