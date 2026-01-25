import time
import numpy as np
import sys
from unittest.mock import MagicMock

# Mock dependencies to allow importing PersonalLifeEnv without all RL libs
class MockEnv:
    def __init__(self, *args, **kwargs):
        pass
    def reset(self, *args, **kwargs):
        return None, {}

mock_gym = MagicMock()
mock_gym.Env = MockEnv
sys.modules["gymnasium"] = mock_gym
sys.modules["gymnasium.spaces"] = MagicMock()
# sys.modules["numpy"] = np # Already imported
sys.modules["pandas"] = MagicMock()

from digital_twin_rl import PersonalLifeEnv

def run_benchmark(n_projects, n_steps=100000):
    user_data = {
        'profile_id': 1,
        'projects': [{'id': i, 'name': f'P{i}', 'progress': 0.1, 'priority': 0.8, 'deadline_days': 5} for i in range(n_projects)],
        'relationships': []
    }

    env = PersonalLifeEnv(user_data, {}, db_connection=None)

    # We want to measure the step() performance, specifically the reward calculation
    # We'll alternate between 'rest' and 'work_on_project'
    actions = [
        np.array([0, 0, 0, 0]), # rest
        np.array([1, 0, 0, 0]), # work_on_project 0
    ]

    start = time.time()
    for i in range(n_steps):
        env.step(actions[i % 2])
        if i % 100 == 0:
            env.reset() # Reset periodically to avoid ending the episode too quickly if hour wraps (though step handles it)
    end = time.time()

    avg_time = (end - start) / n_steps
    print(f"Projects: {n_projects:3} | Steps: {n_steps} | Total Time: {end - start:.4f}s | Avg Step: {avg_time*1e6:.2f}µs")
    return avg_time

if __name__ == "__main__":
    print("Running Reward Calculation Benchmark...")
    results = {}
    for n in [5, 20, 100]:
        results[n] = run_benchmark(n)
