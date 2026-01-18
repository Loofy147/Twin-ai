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
    cursor = db.cursor()
    cursor.execute("CREATE TABLE entities (id INTEGER PRIMARY KEY, name TEXT, entity_type TEXT, metadata TEXT)")
    cursor.execute("CREATE TABLE entity_attributes (id INTEGER PRIMARY KEY, entity_id INTEGER, attribute_type TEXT, value REAL)")
    cursor.execute("CREATE TABLE workflows (id INTEGER PRIMARY KEY, name TEXT, workflow_type TEXT, status TEXT, metadata TEXT)")
    cursor.execute("CREATE TABLE dimensions (id INTEGER PRIMARY KEY, name TEXT)")
    cursor.execute("CREATE TABLE aspects (id INTEGER PRIMARY KEY, dimension_id INTEGER, name TEXT, code TEXT)")
    cursor.execute("CREATE TABLE patterns (id INTEGER PRIMARY KEY, profile_id INTEGER, aspect_id INTEGER, strength REAL, confidence REAL)")
    cursor.execute("CREATE TABLE questions (id INTEGER PRIMARY KEY, text TEXT, question_type TEXT, difficulty_level INTEGER, primary_dimension_id INTEGER, metadata TEXT)")
    cursor.execute("CREATE TABLE answer_options (id INTEGER PRIMARY KEY, question_id INTEGER, text TEXT, weight REAL)")

    cursor.execute("INSERT INTO dimensions (id, name) VALUES (1, 'values')")
    cursor.execute("INSERT INTO aspects (id, dimension_id, name, code) VALUES (1, 1, 'Wellbeing', 'WELLBEING')")
    # Strong preference for rest (Wellbeing)
    cursor.execute("INSERT INTO patterns (profile_id, aspect_id, strength, confidence) VALUES (1, 1, 1.0, 1.0)")

    cursor.execute("INSERT INTO entities (id, name, entity_type) VALUES (1, 'Friend', 'person')")
    cursor.execute("INSERT INTO workflows (id, name, workflow_type, status, metadata) VALUES (1, 'Project', 'project', 'active', '{\"progress\": 0.0, \"priority\": 0.5, \"deadline_days\": 10}')")

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
