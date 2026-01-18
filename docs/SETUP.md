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

To populate the initial 5,000+ question bank and dimensions:
```bash
node shared/generateInitialBank.js
```
This script initializes the SQLite database at `mobile/src/database/twin-ai.db`.

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
