import sqlite3
import json
import os
import sys

# Add the shared/rl directory to the path so we can import digital_twin_rl
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from digital_twin_rl import DataPipeline

def setup_test_db():
    conn = sqlite3.connect(':memory:')
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../mobile/src/database/schema.sql'))
    with open(schema_path, 'r') as f:
        conn.executescript(f.read())
    return conn

def test_isolation():
    conn = setup_test_db()
    pipeline = DataPipeline(conn)
    cursor = conn.cursor()

    # Create two profiles
    cursor.execute("INSERT INTO profile (id) VALUES (1)")
    cursor.execute("INSERT INTO profile (id) VALUES (2)")

    # Profile 1 data
    cursor.execute("INSERT INTO entities (profile_id, entity_type, name) VALUES (1, 'person', 'Alice')")
    alice_id = cursor.lastrowid
    cursor.execute("INSERT INTO entity_attributes (profile_id, entity_id, attribute_type, value) VALUES (1, ?, 'trust', 0.9)", (alice_id,))

    cursor.execute("INSERT INTO workflows (profile_id, workflow_type, status, name, metadata) VALUES (1, 'project', 'active', 'Project Alpha', ?)",
                   (json.dumps({'deadline_days': 5}),))

    # Profile 2 data
    cursor.execute("INSERT INTO entities (profile_id, entity_type, name) VALUES (2, 'person', 'Bob')")
    bob_id = cursor.lastrowid
    cursor.execute("INSERT INTO entity_attributes (profile_id, entity_id, attribute_type, value) VALUES (2, ?, 'trust', 0.1)", (bob_id,))

    cursor.execute("INSERT INTO workflows (profile_id, workflow_type, status, name, metadata) VALUES (2, 'project', 'active', 'Project Beta', ?)",
                   (json.dumps({'deadline_days': 20}),))

    # Verify Profile 1
    data1 = pipeline.prepare_user_data(1)
    print("Profile 1 relationships:", [r['name'] for r in data1['relationships']])
    print("Profile 1 projects:", [p['name'] for p in data1['projects']])

    assert len(data1['relationships']) == 1
    assert data1['relationships'][0]['name'] == 'Alice'
    assert data1['relationships'][0]['strength'] == 0.9
    assert len(data1['projects']) == 1
    assert data1['projects'][0]['name'] == 'Project Alpha'

    # Verify Profile 2
    data2 = pipeline.prepare_user_data(2)
    print("Profile 2 relationships:", [r['name'] for r in data2['relationships']])
    print("Profile 2 projects:", [p['name'] for p in data2['projects']])

    assert len(data2['relationships']) == 1
    assert data2['relationships'][0]['name'] == 'Bob'
    assert data2['relationships'][0]['strength'] == 0.1
    assert len(data2['projects']) == 1
    assert data2['projects'][0]['name'] == 'Project Beta'

    print("Isolation test passed!")

if __name__ == "__main__":
    test_isolation()
