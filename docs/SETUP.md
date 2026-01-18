# Twin-ai Setup and Development

## Prerequisites
*   Node.js (v18+)
*   npm

## Installation

1.  **Install Mobile Dependencies**:
    ```bash
    cd mobile
    npm install
    ```

2.  **Install Web Dependencies**:
    ```bash
    cd web
    npm install
    ```

## Database Seeding

### Local (SQLite)
To populate the initial 5,000+ question bank and dimensions in your local SQLite database:
```bash
node shared/generateInitialBank.js
```
This script initializes the SQLite database at `mobile/src/database/twin-ai.db`.

### Cloud (Supabase)
To seed your remote Supabase instance:
1. Ensure your `web/.env` contains correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Run the seeding script:
```bash
node web/scripts/seedSupabase.js
```
Note: Ensure you have run migrations first using the Supabase CLI.

## Running Tests

Twin-ai includes an end-to-end integration test that simulates data syncing, question answering, and pattern detection.

```bash
node tests/integration_test.js
```

## Project Structure

*   `/mobile`: React Native application and SQLite database logic.
*   `/web`: React web application for cloud integrations.
*   `/shared`: Core algorithmic engine and question generators.
*   `/docs`: System documentation.
*   `/tests`: Integration and unit tests.
