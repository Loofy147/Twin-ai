# Twin-ai Architecture

## System Overview

Twin-ai is a personal learning system designed to build a "digital twin" of the user. It achieves this by:
1.  **Integrating** with real-world data sources (Contacts, Call Logs, Calendar, Drive).
2.  **Generating** targeted questions based on this data.
3.  **Selecting** questions adaptively to maximize learning.
4.  **Detecting patterns** in user responses to refine the digital profile.

## Data Flow

1.  **Ingestion**: Mobile and Web integrations pull metadata from third-party APIs.
2.  **Entity Mapping**: Synced data is mapped to `entities` (people, events, files) in the local SQLite database.
3.  **Question Generation**:
    *   **Static**: A bank of 5,000+ questions covering 15 dimensions.
    *   **Dynamic**: Questions generated on-the-fly from recently synced entities.
4.  **Adaptive Selection**: The system selects 10-20 questions daily based on dimension coverage and pattern confidence.
5.  **Feedback Loop**: User responses are analyzed by the Pattern Detector, which updates the `patterns` table, influencing future question selection.

## Components

*   **Mobile App (React Native)**: Handles local integrations like Contacts and Call Logs.
*   **Web App (React)**: Handles cloud integrations like Google Calendar and Google Drive.
*   **Shared Engine**: Contains the core logic for question generation, selection, and pattern detection.
*   **SQLite Database**: Local-first storage for all user data, ensuring privacy and control.
