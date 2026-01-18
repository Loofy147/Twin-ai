import gymnasium as gym
import sqlite3
import json
import os
import sys

# Add the shared directory to path so we can import the module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from shared.rl.digital_twin_rl import PersonalLifeEnv, DataPipeline, DigitalTwinTrainer

def test_initialization():
    print("Testing initialization...")
    # Create in-memory DB
    db = sqlite3.connect(':memory:')
    cursor = db.cursor()

    # Create necessary tables for DataPipeline
    cursor.execute("CREATE TABLE entities (id INTEGER PRIMARY KEY, name TEXT, entity_type TEXT, metadata TEXT)")
    cursor.execute("CREATE TABLE entity_attributes (id INTEGER PRIMARY KEY, entity_id INTEGER, attribute_type TEXT, value REAL)")
    cursor.execute("CREATE TABLE workflows (id INTEGER PRIMARY KEY, name TEXT, workflow_type TEXT, status TEXT, metadata TEXT)")

    # Insert some dummy data
    cursor.execute("INSERT INTO entities (id, name, entity_type) VALUES (1, 'Sarah', 'person')")
    cursor.execute("INSERT INTO entity_attributes (entity_id, attribute_type, value) VALUES (1, 'trust', 0.8)")
    cursor.execute("INSERT INTO entity_attributes (entity_id, attribute_type, value) VALUES (1, 'priority', 0.9)")
    cursor.execute("INSERT INTO workflows (id, name, workflow_type, status, metadata) VALUES (1, 'Q4 Report', 'project', 'active', '{\"progress\": 0.4, \"priority\": 0.9, \"deadline_days\": 5}')")

    db.commit()

    # Test DataPipeline
    pipeline = DataPipeline(db)
    user_data = pipeline.prepare_user_data(1)
    assert len(user_data['relationships']) == 1
    assert len(user_data['projects']) == 1
    print("DataPipeline passed.")

    # Test Environment
    env = PersonalLifeEnv(user_data, {})
    obs, info = env.reset()
    assert 'temporal' in obs
    assert 'personal' in obs
    print("Environment reset passed.")

    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)
    assert 'temporal' in obs
    print(f"Environment step passed with reward: {reward}")

    # Test Trainer (just initialization)
    trainer = DigitalTwinTrainer(db, 1)
    assert trainer.env is not None
    print("Trainer initialization passed.")

    print("All RL module verification tests passed!")

if __name__ == "__main__":
    test_initialization()
