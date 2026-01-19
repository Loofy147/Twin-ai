# Twin-ai Integrations

Twin-ai bridges the gap between digital behavior and personal values through real-world data integrations.

## Mobile Integrations (React Native)

### 1. Contacts
*   **Library**: `react-native-contacts`
*   **Purpose**: Identifies the people in the user's life.
*   **Data Used**: Names, companies, and relationship labels.
*   **Questions Generated**: Asks about the closeness and nature of relationships.

### 2. Call Logs (Android)
*   **Library**: `react-native-call-log`
*   **Purpose**: Analyzes social interaction frequency.
*   **Data Used**: Call duration, timestamps, and frequency per contact.
*   **Questions Generated**: Validates energy levels after interactions and priorities of frequent contacts.

## Web Integrations (React / Supabase)

Web integrations utilize **OAuth 2.0** for secure access and **Supabase Edge Functions** for background synchronization.

### 1. Google Calendar
*   **Library**: `googleapis`
*   **Flow**: Client-side OAuth initiation -> Edge Function callback -> Encrypted token storage.
*   **Purpose**: Understands the user's time allocation and social commitments.
*   **Data Used**: Event titles, attendees, recurrence, and locations.
*   **Questions Generated**: Asks about meeting value and time preferences.

### 2. Google Drive
*   **Library**: `googleapis`
*   **Flow**: Utilizes shared OAuth infrastructure for background file analysis.
*   **Purpose**: Identifies active projects and interests.
*   **Data Used**: Recently viewed file names, mime types, and sharing status.
*   **Questions Generated**: Asks about project priority and collaboration style.

## Resilient Sync Engine
*   **Exponential Backoff**: Automatic retries for API rate limits and network issues.
*   **Circuit Breakers**: Prevents cascading failures if third-party APIs are down.
*   **Atomic Sync**: Uses single transactions for entity mapping to ensure data consistency.

## Privacy-First Approach
*   **Local Storage**: All integrated data is stored in the local SQLite database.
*   **Hashing**: Sensitive PII (like phone numbers) is used only for matching and is not stored in the main profile database.
*   **Metadata Only**: The system focuses on metadata (when, how often) rather than content (what was said, what is in the file).
