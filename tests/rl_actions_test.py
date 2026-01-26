import sqlite3
import numpy as np
import os
import sys

# Add the project root to PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.rl.digital_twin_rl import PersonalLifeEnv

def test_new_rl_actions():
    print("Testing new RL actions (Strategic, Economic, Political, Cultural)...")

    user_data = {
        'profile_id': 1,
        'projects': [{'id': 1, 'name': 'Test Project', 'progress': 0.1, 'priority': 0.8, 'deadline_days': 5}],
        'relationships': [{'id': 1, 'name': 'Test Person', 'strength': 0.5, 'priority': 0.7, 'days_since_contact': 10}]
    }
    user_preferences = {}

    # Use an in-memory database for testing
    conn = sqlite3.connect(':memory:')

    env = PersonalLifeEnv(user_data, user_preferences, db_connection=conn)

    # Test 'strategic_decision'
    # Action mapping: ['rest', 'work_on_project', 'deep_work', 'call_person', 'exercise', 'learn', 'do_nothing', 'strategic_decision', 'economic_action', 'political_action', 'cultural_action']
    # Index 7 is 'strategic_decision'

    obs, info = env.reset()
    energy_before = env.state['energy']

    # action: [action_type_idx, target_idx, duration_idx, intensity_idx]
    action = np.array([7, 0, 3, 4]) # strategic_decision, project 0, 60min, intensity 4
    obs, reward, terminated, truncated, info = env.step(action)

    energy_after = env.state['energy']
    print(f"Strategic Decision - Energy Before: {energy_before:.2f}, After: {energy_after:.2f}, Reward: {reward:.2f}")

    assert energy_after < energy_before, "Strategic decision should consume energy"
    assert reward > 0, "Strategic decision should give positive reward for impact"

    # Test 'economic_action' (Index 8)
    env.reset()
    energy_before = env.state['energy']
    action = np.array([8, 0, 1, 4]) # economic_action
    obs, reward, terminated, truncated, info = env.step(action)
    print(f"Economic Action - Energy Before: {energy_before:.2f}, After: {env.state['energy']:.2f}, Reward: {reward:.2f}")
    assert env.state['energy'] < energy_before
    assert reward > 0

    print("SUCCESS: New RL actions verified.")

if __name__ == "__main__":
    test_new_rl_actions()
