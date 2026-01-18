import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pandas as pd
import json
import random
import copy
from typing import Dict, List, Any, Optional

# ============================================
# 1. RL ENVIRONMENT
# ============================================

class PersonalLifeEnv(gym.Env):
    """
    Custom Gym Environment for training a Digital Twin
    """

    def __init__(self, user_data: Dict, user_preferences: Dict):
        super(PersonalLifeEnv, self).__init__()

        self.user_data = user_data
        self.preferences = user_preferences

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
        """Initialize state from user data"""
        super().reset(seed=seed)
        self.state = {
            'energy': 0.8,
            'cognitive_load': 0.1,
            'hour': 8,
            'day_of_week': 0, # Monday
            'projects': copy.deepcopy(self.user_data.get('projects', [])),
            'relationships': copy.deepcopy(self.user_data.get('relationships', [])),
            'time_available': 480 # 8 hours in minutes
        }
        return self._get_obs(), {}

    def _get_obs(self):
        return {
            'temporal': np.array([self.state['hour']/24, self.state['day_of_week']/7, 1.0], dtype=np.float32),
            'personal': np.array([self.state['energy'], self.state['cognitive_load'], 0.7, 0.8], dtype=np.float32),
            'resources': np.array([self.state['time_available']/1440, 1.0, self.state['energy']], dtype=np.float32),
            'relationship_avg': np.array([np.mean([r['strength'] for r in self.state['relationships']]) if self.state['relationships'] else 0.5], dtype=np.float32),
            'project_progress': np.array([np.mean([p['progress'] for p in self.state['projects']]) if self.state['projects'] else 0.0], dtype=np.float32)
        }

    def step(self, action):
        action_idx, target_idx, duration_idx, intensity_idx = action
        action_type = self.action_types[action_idx]
        duration = (duration_idx + 1) * 15 # minutes

        # Execute action impacts
        old_state = copy.deepcopy(self.state)
        self._apply_action(action_type, target_idx, duration, intensity_idx)

        # Calculate reward
        reward = self._calculate_reward(action_type, old_state, self.state)

        # Check if done (end of day)
        terminated = self.state['hour'] >= 22 or self.state['time_available'] <= 0
        truncated = False

        return self._get_obs(), reward, terminated, truncated, {}

    def _apply_action(self, action_type, target_idx, duration, intensity):
        self.state['time_available'] -= duration
        self.state['hour'] += duration / 60

        if action_type == 'work_on_project' and self.state['projects']:
            idx = target_idx % len(self.state['projects'])
            self.state['projects'][idx]['progress'] += (duration / 120) * (intensity / 5)
            self.state['energy'] -= 0.1 * (intensity / 5)
            self.state['cognitive_load'] += 0.1 * (intensity / 5)

        elif action_type == 'rest':
            self.state['energy'] = min(1.0, self.state['energy'] + (duration / 120))
            self.state['cognitive_load'] = max(0.0, self.state['cognitive_load'] - 0.2)

        elif action_type == 'call_person' and self.state['relationships']:
            idx = target_idx % len(self.state['relationships'])
            self.state['relationships'][idx]['strength'] += 0.05
            self.state['relationships'][idx]['days_since_contact'] = 0
            self.state['energy'] -= 0.05

        # Clip values
        self.state['energy'] = np.clip(self.state['energy'], 0, 1)
        self.state['cognitive_load'] = np.clip(self.state['cognitive_load'], 0, 1)

    def _calculate_reward(self, action_type, old_state, new_state):
        reward = 0.0

        # Value alignment (from patterns)
        reward += self._calculate_value_alignment(action_type)

        # Energy management
        if new_state['energy'] < 0.2:
            reward -= 0.5 # Penalty for burnout

        # Relationship maintenance
        reward += self._calculate_relationship_reward(old_state['relationships'], new_state['relationships'])

        # Project progress
        for proj in new_state['projects']:
            if proj['deadline_days'] < 7 and proj['progress'] < 0.5:
                reward -= 0.2 # Penalty for falling behind

        return reward

    def _calculate_value_alignment(self, action_type):
        """
        Calculate reward based on alignment with learned patterns from the database.
        """
        # Mapping action types to dimension/aspect codes
        action_mapping = {
            'call_person': 'REL_MAINTENANCE',
            'work_on_project': 'ACHIEVEMENT',
            'deep_work': 'GROWTH',
            'rest': 'WELLBEING',
            'exercise': 'HEALTH',
            'learn': 'LEARNING',
            'do_nothing': 'FREEDOM'
        }

        aspect_code = action_mapping.get(action_type)
        if not aspect_code:
            return 0.0

        # Attempt to get the pattern strength for this aspect
        # In a real training run, this would be pre-cached
        try:
            cursor = self.db.cursor()
            cursor.execute("""
                SELECT strength FROM patterns p
                JOIN aspects a ON p.aspect_id = a.id
                WHERE a.code = ? AND p.profile_id = ?
            """, (aspect_code, self.user_data['profile_id']))
            row = cursor.fetchone()
            if row:
                return float(row[0])
        except Exception:
            pass

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

    def _calculate_relationship_reward(self, old_rels, new_rels):
        reward = 0.0
        for old, new in zip(old_rels, new_rels):
            strength_delta = new['strength'] - old['strength']
            reward += strength_delta * new['priority']
        return reward

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
                e.id, e.name,
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
            relationships.append({
                'id': r[0],
                'name': r[1],
                'strength': r[2] if r[2] is not None else 0.5,
                'priority': r[3] if r[3] is not None else 0.5,
                'days_since_contact': 7 # Default
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
        self.env = PersonalLifeEnv(self.user_data, self.user_data.get('preferences', {}))

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

if __name__ == "__main__":
    import sqlite3
    # Just for testing structure
    try:
        conn = sqlite3.connect(':memory:')
        trainer = DigitalTwinTrainer(conn, 1)
        print("Trainer initialized successfully")
    except Exception as e:
        print(f"Initialization failed: {e}")
