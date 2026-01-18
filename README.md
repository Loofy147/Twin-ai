# Twin-ai: Your Personal Digital Twin

Twin-ai is an AI system that learns YOU through your behavior and responses. Unlike traditional assistants that ask you to explain yourself, Twin-ai uses your actual data to ask targeted questions, building a comprehensive digital twin over time.

## Key Features

*   **Real-World Integration**: Connects with Contacts, Calendar, Drive, and Call Logs to ground questions in your actual life.
*   **Adaptive Learning**: An engine that evolves with you, selecting questions based on dimension coverage and pattern confidence.
*   **5,000+ Question Bank**: A massive taxonomy of questions covering 15 dimensions of life, from Work Style to Spirituality.
*   **Privacy-First**: All processing and data storage happens locally in your own SQLite database.
*   **No Chat Required**: Learns through simple multiple-choice questions (10-20 per day, 2-5 minutes).

## Documentation

Explore our detailed documentation in the `docs/` directory:

*   [**Architecture**](./docs/ARCHITECTURE.md): System design and data flow.
*   [**Database Schema**](./docs/DATABASE_SCHEMA.md): SQLite table definitions and relations.
*   [**Algorithms**](./docs/ALGORITHMS.md): Adaptive selection and pattern detection logic.
*   [**Integrations**](./docs/INTEGRATIONS.md): Mobile and Web integration strategies.
*   [**Setup & Development**](./docs/SETUP.md): How to install, seed, and test the system.

## Getting Started

1.  Clone the repository.
2.  Install dependencies in `mobile/` and `web/`.
3.  Run the seeding script: `node shared/generateInitialBank.js`.
4.  Run the integration test: `node tests/integration_test.js`.

## The Result
After 500+ responses, you'll have a digital twin that knows:
*   What you actually value (vs. what you say you value).
*   How you make decisions in real situations.
*   Who matters to you and why.
*   Your true patterns across all life dimensions.
