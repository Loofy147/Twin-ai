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
    # Create in-memory DB and initialize with schema
    db = sqlite3.connect(':memory:')
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../mobile/src/database/schema.sql'))
    with open(schema_path, 'r') as f:
        db.executescript(f.read())

    cursor = db.cursor()

    # Create profile
    cursor.execute("INSERT INTO profile (id) VALUES (1)")

    # Insert some dummy data with profile_id
    cursor.execute("INSERT INTO entities (id, profile_id, name, entity_type) VALUES (1, 1, 'Sarah', 'person')")
    cursor.execute("INSERT INTO entity_attributes (profile_id, entity_id, attribute_type, value) VALUES (1, 1, 'trust', 0.8)")
    cursor.execute("INSERT INTO entity_attributes (profile_id, entity_id, attribute_type, value) VALUES (1, 1, 'priority', 0.9)")
    cursor.execute("INSERT INTO workflows (id, profile_id, name, workflow_type, status, metadata) VALUES (1, 1, 'Q4 Report', 'project', 'active', '{\"progress\": 0.4, \"priority\": 0.9, \"deadline_days\": 5}')")

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
