# Database Schema Documentation

Twin-ai uses SQLite for local data storage. The schema is designed for multi-dimensional analysis of user preferences.

## Core Tables

### `profile`
Stores the high-level state of the digital twin.
*   `id`: Primary Key.
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
*   `profile_id`: Reference to `profile`.
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
*   `entity_type`: person, file, event.
*   `name`: Display name.
*   `metadata`: JSON field with source-specific data.

## Implementation Notes
*   **JSON Support**: The schema uses SQLite's `JSON` type (text with JSON affinity) for metadata and dynamic fields.
*   **Upserts**: The `patterns` table has a `UNIQUE(profile_id, dimension_id, aspect_id)` constraint to support `ON CONFLICT` updates during pattern detection.
