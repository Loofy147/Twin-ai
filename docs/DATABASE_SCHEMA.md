# Database Schema Documentation

Twin-ai uses a hybrid storage model: SQLite for mobile/local-first and Supabase PostgreSQL for cloud/web. The schema enforces multi-tenant isolation via Row Level Security (RLS).

## Core Tables

### `profile`
Stores the high-level state of the digital twin.
*   `id`: Primary Key (UUID/String, maps to Auth user).
*   `total_responses`: Total questions answered.
*   `engagement_score`: Overall engagement level.

### `dimensions`
The 15 core dimensions of human life analyzed (e.g., Values, Work Style, Health).
*   `id`: Primary Key.
*   `name`: Name of the dimension.

### `aspects`
Granular attributes within each dimension (e.g., 'freedom' within 'Values').
*   `id`: Primary Key.
*   `dimension_id`: Reference to `dimensions`.
*   `name`: Aspect name.

### `questions`
The question bank.
*   `id`: Primary Key.
*   `text`: The question content.
*   `question_type`: choice, scale, trade_off, scenario.
*   `difficulty_level`: 1 to 5.
*   `primary_dimension_id`: Reference to `dimensions`.
*   `metadata`: JSON field containing options and aspect mappings.

### `answer_options`
Possible responses for each question.
*   `id`: Primary Key.
*   `question_id`: Reference to `questions`.
*   `aspect_id`: Reference to `aspects` (the aspect this answer measures).
*   `weight`: Numeric value representing the choice's strength.

### `responses`
User answers.
*   `id`: Primary Key.
*   `profile_id`: Reference to `profile` (Mandatory for RLS).
*   `question_id`: Reference to `questions`.
*   `answer_option_id`: Reference to `answer_options`.

### `patterns`
Detected user patterns and preferences.
*   `id`: Primary Key.
*   `profile_id`: Reference to `profile`.
*   `pattern_type`: e.g., 'preference', 'meeting_density'.
*   `aspect_id`: Reference to `aspects`.
*   `confidence`: 0.0 to 1.0.
*   `strength`: The intensity of the preference.

### `entities`
Real-world objects from integrations.
*   `id`: Primary Key.
*   `profile_id`: Reference to `profile`.
*   `entity_type`: person, file, event.
*   `name`: Display name.
*   `metadata`: JSON field with source-specific data.

## Security & Integrity
*   **Multi-tenancy**: Every user-specific table includes a `profile_id` column protected by Row Level Security (RLS) policies.
*   **Data Isolation**: Unique constraints (e.g., `(profile_id, name, entity_type)` on `entities`) prevent data collisions between users.
*   **Referential Integrity**: Cascading deletes are enforced on `profile_id` to ensure no orphaned records.

## Implementation Notes
*   **JSON Support**: The schema uses SQLite's `JSON` type and PostgreSQL's `JSONB` for metadata and dynamic fields.
*   **Upserts**: Key tables utilize `UNIQUE` constraints and `ON CONFLICT` patterns to ensure idempotency during synchronization and pattern detection.
