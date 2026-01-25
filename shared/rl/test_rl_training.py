import gymnasium as gym
import sqlite3
import json
import os
import sys
import numpy as np

# Add the shared directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from shared.rl.digital_twin_rl import PersonalLifeEnv, DataPipeline, DigitalTwinTrainer

def setup_mock_db():
    db = sqlite3.connect(':memory:')
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../mobile/src/database/schema.sql'))
    with open(schema_path, 'r') as f:
        db.executescript(f.read())

    cursor = db.cursor()

    cursor.execute("INSERT INTO profile (id) VALUES (1)")
    cursor.execute("INSERT INTO dimensions (id, name) VALUES (1, 'values')")
    cursor.execute("INSERT INTO aspects (id, dimension_id, name, code) VALUES (1, 1, 'Wellbeing', 'WELLBEING')")
    # Strong preference for rest (Wellbeing)
    cursor.execute("INSERT INTO patterns (profile_id, aspect_id, strength, confidence) VALUES (1, 1, 1.0, 1.0)")

    cursor.execute("INSERT INTO entities (id, profile_id, name, entity_type) VALUES (1, 1, 'Friend', 'person')")
    cursor.execute("INSERT INTO workflows (id, profile_id, name, workflow_type, status, metadata) VALUES (1, 1, 'Project', 'project', 'active', '{\"progress\": 0.0, \"priority\": 0.5, \"deadline_days\": 10}')")

    db.commit()
    return db

def test_training_loop():
    print("Testing training loop...")
    db = setup_mock_db()
    trainer = DigitalTwinTrainer(db, 1)

    # Run a short training
    # Note: 5000 steps might be enough to see SOME movement, but PPO usually needs more.
    # We just want to ensure it doesn't crash and returns a model.
    model = trainer.train(total_timesteps=2048)
    assert model is not None
    print("Training loop execution passed.")

    # Test question generation
    print("Testing validation question generation...")
    q_ids = trainer.generate_validation_questions(model, n_questions=3)
    assert len(q_ids) == 3

    cursor = db.cursor()
    cursor.execute("SELECT count(*) FROM questions WHERE question_type = 'RL_VALIDATION'")
    count = cursor.fetchone()[0]
    assert count == 3
    print("Question generation passed.")

    # Verify the agent learns to prefer 'rest' if wellbeing is weighted high?
    # This is harder to test deterministically without more steps,
    # but we can check if it at least produces valid actions.
    obs, info = trainer.env.reset()
    action, _ = model.predict(obs)
    assert trainer.env.action_space.contains(action)
    print("Agent prediction passed.")

if __name__ == "__main__":
    test_training_loop()
