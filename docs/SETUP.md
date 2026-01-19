# Twin-ai Setup and Development

## Prerequisites
*   Node.js (v18+)
*   pnpm (v9+)

## Installation

1.  **Install Mobile Dependencies**:
    ```bash
    cd mobile
    pnpm install
    ```

2.  **Install Web Dependencies**:
    ```bash
    cd web
    pnpm install
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
1. Ensure your `web/.env` contains the required variables:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY` (Required for seeding)
2. Run the seeding script:
```bash
node web/scripts/seedSupabase.js
```
Note: Ensure you have run migrations first using the Supabase CLI: `npx supabase db push`.

## Running Tests

### Unit Tests (Web)
Twin-ai uses Vitest for web service and utility testing:
```bash
cd web
npx vitest run
```

### Integration Tests
End-to-end integration test for local SQLite:
```bash
node tests/integration_test.js
```

### Security Verification
Verify Row Level Security (RLS) and multi-tenant isolation:
```bash
npx vitest run tests/isolation.test.ts
```

## Project Structure

*   `/mobile`: React Native application and SQLite database logic.
*   `/web`: React web application for cloud integrations.
*   `/shared`: Core algorithmic engine and question generators.
*   `/docs`: System documentation.
*   `/tests`: Integration and unit tests.
