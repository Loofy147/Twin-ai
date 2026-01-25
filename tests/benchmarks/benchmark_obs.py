import time
import numpy as np
import sys
from unittest.mock import MagicMock

# Mock dependencies
class MockEnv:
    def __init__(self, *args, **kwargs):
        pass
    def reset(self, *args, **kwargs):
        return None, {}

mock_gym = MagicMock()
mock_gym.Env = MockEnv
sys.modules["gymnasium"] = mock_gym
sys.modules["gymnasium.spaces"] = MagicMock()
sys.modules["numpy"] = np
sys.modules["pandas"] = MagicMock()

import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../shared/rl')))
from digital_twin_rl import PersonalLifeEnv

def benchmark_obs():
    n_entities = 500
    user_data = {
        'profile_id': 'user1',
        'projects': [{'id': i, 'progress': 0.1, 'deadline_days': 5, 'priority': 0.8} for i in range(n_entities)],
        'relationships': [{'id': i, 'strength': 0.5} for i in range(n_entities)]
    }

    env = PersonalLifeEnv(user_data, {}, db_connection=None)

    # Measure _get_obs time
    start = time.time()
    for _ in range(10000):
        env._get_obs()
    end = time.time()
    print(f"10,000 observations took: {end - start:.4f}s")

    # Verify incremental update
    initial_rel = env.cached_relationship_avg
    # Simulate step impact on relationships
    env._apply_action('call_person', 0, 30, 3)
    new_rel = env.cached_relationship_avg

    # Expected incremental: initial + 0.05 / 500
    expected = initial_rel + 0.05 / n_entities
    print(f"Initial: {initial_rel}, New: {new_rel}, Expected: {expected}")
    assert abs(new_rel - expected) < 1e-7

if __name__ == "__main__":
    benchmark_obs()
