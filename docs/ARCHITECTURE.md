# Twin-ai Architecture

## System Overview

Twin-ai is a production-hardened personal learning system designed to build a secure "digital twin" of the user. It achieves this by:
1.  **Integrating** with real-world data sources (Contacts, Call Logs, Calendar, Drive).
2.  **Generating** targeted questions based on this data.
3.  **Selecting** questions adaptively to maximize learning with full pagination support.
4.  **Detecting patterns** in user responses to refine the digital profile.
5.  **Training an RL Agent** to act as a digital twin using these patterns.
6.  **Ensuring Privacy** through multi-tenant isolation and Row Level Security (RLS).

## Data Flow

1.  **Ingestion**: Mobile and Web integrations pull metadata from third-party APIs. Web integrations utilize Supabase Edge Functions for secure server-side synchronization.
2.  **Entity Mapping**: Synced data is mapped to `entities` (people, events, files) in the local SQLite database.
3.  **Question Generation**:
    *   **Static**: A bank of 5,000+ questions covering 15 dimensions.
    *   **Dynamic**: Questions generated on-the-fly from recently synced entities.
4.  **Adaptive Selection**: The system selects 10-20 questions daily based on dimension coverage and pattern confidence.
5.  **Feedback Loop**: User responses are analyzed by the Pattern Detector, which updates the `patterns` table, influencing future question selection.
6.  **RL Training**: Detected patterns and real-world data are used to train a Reinforcement Learning agent in a simulated environment, creating a functional digital twin.

## Components

*   **Mobile App (React Native)**: Handles local integrations like Contacts and Call Logs using local SQLite.
*   **Web App (React)**: Production-ready SPA with Supabase Auth, adaptive question selection, and a resilient database service layer featuring circuit breakers and retries.
*   **Supabase Backend**: Provides PostgreSQL with Row Level Security (RLS), Edge Functions for OAuth processing, and secure cloud storage.
*   **Shared Engine**: Contains the core logic for question generation, selection, and pattern detection, shared across mobile and web.
*   **RL Training System (Python)**: Uses stable-baselines3 to train a digital twin agent based on learned preferences.
*   **Hybrid Storage**: Uses local SQLite for mobile and Supabase PostgreSQL for web/cloud, synchronized via secure APIs.
