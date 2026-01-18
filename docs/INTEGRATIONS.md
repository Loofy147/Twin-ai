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

## Web Integrations (React)

### 1. Google Calendar
*   **Library**: `googleapis`
*   **Purpose**: Understands the user's time allocation and social commitments.
*   **Data Used**: Event titles, attendees, recurrence, and locations.
*   **Questions Generated**: Asks about meeting value and time preferences.

### 2. Google Drive
*   **Library**: `googleapis`
*   **Purpose**: Identifies active projects and interests.
*   **Data Used**: Recently viewed file names, mime types, and sharing status.
*   **Questions Generated**: Asks about project priority and collaboration style.

## Privacy-First Approach
*   **Local Storage**: All integrated data is stored in the local SQLite database.
*   **Hashing**: Sensitive PII (like phone numbers) is used only for matching and is not stored in the main profile database.
*   **Metadata Only**: The system focuses on metadata (when, how often) rather than content (what was said, what is in the file).
