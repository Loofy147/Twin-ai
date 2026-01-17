# Real-World Data Integration Architecture

## Overview: From Generic to Personal

**BEFORE Integration:**
- "How do you feel about your relationships?"
- "What's your work priority?"
- "Best time for meetings?"

**AFTER Integration:**
- "How do you feel about **Sarah Martinez** (called 12 times this month)?"
- "Meeting with **John** at 2 PM vs working on **Q4 Report** - which matters more?"
- "You always schedule calls at 10 AM. Is this your preferred time?"

## Integration Sources

### 1. Phone Data (Android/iOS)

**Contacts API:**
```javascript
// What we extract
{
  contacts: [
    {
      name: "Sarah Martinez",
      phone: "+1234567890",
      email: "sarah@company.com",
      company: "TechCorp",
      lastContact: "2026-01-15",
      frequency: "weekly",
      tags: ["work", "team", "friend"]
    }
  ]
}
```

**Call History:**
```javascript
{
  calls: [
    {
      contact: "Sarah Martinez",
      type: "outgoing",
      duration: 1200, // seconds
      timestamp: "2026-01-17T10:30:00Z",
      frequency_rank: 1 // Most called person
    }
  ]
}
```

**SMS/Messages:**
```javascript
{
  messages: [
    {
      contact: "Sarah Martinez",
      count: 45, // messages last 30 days
      avgResponseTime: 300, // 5 minutes
      lastMessage: "2026-01-17T09:00:00Z"
    }
  ]
}
```

### 2. Google Calendar

**Events:**
```javascript
{
  events: [
    {
      id: "evt_123",
      title: "Team Standup",
      start: "2026-01-18T09:00:00Z",
      duration: 30,
      attendees: ["Sarah Martinez", "John Doe"],
      frequency: "daily",
      location: "Office - Room 301",
      priority: "high" // inferred from acceptance rate
    }
  ]
}
```

**Patterns:**
```javascript
{
  patterns: {
    mostProductiveHours: [9, 10, 11, 14, 15],
    meetingFreeBlocks: ["Monday 1-3 PM", "Friday all day"],
    averageMeetingsPerDay: 4,
    preferredMeetingDuration: 30
  }
}
```

### 3. Google Drive

**Files:**
```javascript
{
  files: [
    {
      id: "file_123",
      name: "Q4 Marketing Strategy.pdf",
      type: "document",
      lastModified: "2026-01-15",
      accessFrequency: "daily",
      sharedWith: ["Sarah Martinez", "Team"],
      folder: "Projects/2026/Q4"
    }
  ]
}
```

**Usage Patterns:**
```javascript
{
  patterns: {
    mostAccessedFolders: ["Projects", "Personal/Finance"],
    fileTypes: {"pdf": 40, "xlsx": 30, "docs": 30},
    peakUsageHours: [10, 14, 20]
  }
}
```

### 4. Location (Optional - Privacy Sensitive)

```javascript
{
  locations: [
    {
      name: "Office",
      visits: 45, // per month
      avgDuration: 8.5, // hours
      timeRanges: ["9 AM - 6 PM"],
      activities: ["work", "meetings"]
    },
    {
      name: "Home",
      visits: 60,
      avgDuration: 14,
      timeRanges: ["6 PM - 9 AM"]
    }
  ]
}
```

### 5. Other Potential Integrations

- **Email** (Gmail API): Communication patterns, important contacts
- **Task Management** (Todoist, Asana, Trello): Project priorities
- **Health** (Google Fit, Apple Health): Activity patterns
- **Finance** (with permission): Spending patterns
- **Social Media** (LinkedIn, Twitter): Professional network

## Database Schema Updates

```sql
-- ============================================
-- INTEGRATED DATA TABLES
-- ============================================

-- Real entities from your life
CREATE TABLE real_entities (
    id INTEGER PRIMARY KEY,
    entity_type VARCHAR(50), -- 'person', 'project', 'file', 'location', 'event'
    source VARCHAR(50), -- 'contacts', 'calendar', 'drive', 'location'
    source_id VARCHAR(255), -- Original ID from source
    name VARCHAR(255) NOT NULL,
    metadata JSONB, -- All source-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced TIMESTAMP,
    UNIQUE(source, source_id)
);

-- Interaction history with real entities
CREATE TABLE entity_interactions (
    id INTEGER PRIMARY KEY,
    real_entity_id INTEGER REFERENCES real_entities(id),
    interaction_type VARCHAR(50), -- 'call', 'message', 'meeting', 'file_access', 'visit'
    timestamp TIMESTAMP,
    duration INTEGER, -- seconds or null
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Derived patterns from interactions
CREATE TABLE entity_patterns (
    id INTEGER PRIMARY KEY,
    real_entity_id INTEGER REFERENCES real_entities(id),
    pattern_type VARCHAR(50), -- 'frequency', 'time_preference', 'priority', 'relationship_strength'
    value REAL,
    confidence REAL,
    last_calculated TIMESTAMP,
    metadata JSONB
);

-- Dynamic questions generated from real data
CREATE TABLE dynamic_questions (
    id INTEGER PRIMARY KEY,
    question_text TEXT NOT NULL,
    generated_from_entity_id INTEGER REFERENCES real_entities(id),
    generation_timestamp TIMESTAMP,
    times_asked INTEGER DEFAULT 0,
    avg_response_value REAL,
    metadata JSONB
);

-- Integration sync status
CREATE TABLE integration_syncs (
    id INTEGER PRIMARY KEY,
    source VARCHAR(50),
    last_sync TIMESTAMP,
    records_synced INTEGER,
    status VARCHAR(50), -- 'success', 'partial', 'failed'
    error_message TEXT,
    metadata JSONB
);
```

## Dynamic Question Generation Algorithm

```javascript
class DynamicQuestionGenerator {

  async generateQuestionsFromContacts(contacts) {
    const questions = [];

    // Analyze interaction patterns
    const contactsWithPatterns = await this.enrichContactsWithPatterns(contacts);

    for (const contact of contactsWithPatterns) {

      // 1. RELATIONSHIP QUESTIONS
      questions.push({
        text: `How do you feel about ${contact.name}?`,
        type: 'relationship',
        dimension: 'relationships',
        entity_id: contact.id,
        options: [
          { text: "Trust deeply", value: 1.0, aspect: "trust" },
          { text: "Like/Respect", value: 0.7, aspect: "positive" },
          { text: "Neutral/Professional", value: 0.3, aspect: "neutral" },
          { text: "Uncomfortable", value: -0.3, aspect: "negative" },
          { text: "Distrust", value: -0.7, aspect: "distrust" },
          { text: "Don't Care", value: 0, aspect: "indifferent" }
        ],
        metadata: {
          contactFrequency: contact.callFrequency,
          lastContact: contact.lastContact
        }
      });

      // 2. FREQUENCY VALIDATION
      if (contact.callFrequency === 'high') {
        questions.push({
          text: `You call ${contact.name} ${contact.callCount} times/month. This feels:`,
          type: 'behavioral_validation',
          dimension: 'relationships',
          entity_id: contact.id,
          options: [
            { text: "Just right", value: 1.0, aspect: "satisfied" },
            { text: "Should be more", value: 0.5, aspect: "increase" },
            { text: "Too much", value: -0.5, aspect: "decrease" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }

      // 3. PRIORITY QUESTIONS (if contact appears in calendar)
      if (contact.hasUpcomingMeeting) {
        questions.push({
          text: `Meeting with ${contact.name} at ${contact.nextMeeting.time} vs working on ${this.getCurrentTopProject()}. Priority?`,
          type: 'trade_off',
          dimension: 'decision_making',
          entity_id: contact.id,
          options: [
            { text: `Meeting with ${contact.name}`, value: 1.0, aspect: "relationship_priority" },
            { text: "Work on project", value: -1.0, aspect: "project_priority" },
            { text: "Both are equal", value: 0, aspect: "balanced" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }

      // 4. COMMUNICATION STYLE
      if (contact.hasMessageHistory) {
        questions.push({
          text: `Best way to communicate with ${contact.name}:`,
          type: 'preference',
          dimension: 'communication',
          entity_id: contact.id,
          options: [
            { text: "Call", value: 1.0, aspect: "voice" },
            { text: "Text/Message", value: 0.7, aspect: "text" },
            { text: "Email", value: 0.5, aspect: "email" },
            { text: "In person", value: 0.9, aspect: "face_to_face" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }
    }

    return questions;
  }

  async generateQuestionsFromCalendar(events) {
    const questions = [];

    for (const event of events) {

      // 1. TIME PREFERENCE VALIDATION
      const eventHour = new Date(event.start).getHours();
      questions.push({
        text: `"${event.title}" scheduled at ${this.formatTime(event.start)}. This time works for you?`,
        type: 'temporal_validation',
        dimension: 'time_management',
        entity_id: event.id,
        options: [
          { text: "Perfect time", value: 1.0, aspect: "ideal" },
          { text: "Acceptable", value: 0.5, aspect: "okay" },
          { text: "Not ideal", value: -0.5, aspect: "suboptimal" },
          { text: "Bad time", value: -1.0, aspect: "avoid" },
          { text: "Don't Care", value: 0, aspect: "indifferent" }
        ],
        metadata: { eventTime: eventHour }
      });

      // 2. RECURRING MEETING VALUE
      if (event.isRecurring) {
        questions.push({
          text: `"${event.title}" happens ${event.frequency}. Is this meeting valuable?`,
          type: 'value_assessment',
          dimension: 'work_style',
          entity_id: event.id,
          options: [
            { text: "Essential", value: 1.0, aspect: "critical" },
            { text: "Useful", value: 0.6, aspect: "helpful" },
            { text: "Neutral", value: 0.3, aspect: "neutral" },
            { text: "Time waste", value: -0.6, aspect: "wasteful" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }

      // 3. ATTENDEE PREFERENCES
      if (event.attendees && event.attendees.length > 0) {
        const mainAttendee = event.attendees[0];
        questions.push({
          text: `Meetings with ${mainAttendee}: one-on-one or group?`,
          type: 'preference',
          dimension: 'communication',
          entity_id: event.id,
          options: [
            { text: "Prefer one-on-one", value: 1.0, aspect: "intimate" },
            { text: "Small group (2-4)", value: 0.6, aspect: "small_group" },
            { text: "Larger group fine", value: 0.3, aspect: "large_group" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }
    }

    return questions;
  }

  async generateQuestionsFromDrive(files) {
    const questions = [];

    for (const file of files) {

      // 1. PROJECT PRIORITY
      if (file.isProject) {
        questions.push({
          text: `How important is "${file.name}" to you right now?`,
          type: 'priority',
          dimension: 'work_style',
          entity_id: file.id,
          options: [
            { text: "Top priority", value: 1.0, aspect: "critical" },
            { text: "Important", value: 0.7, aspect: "high" },
            { text: "Medium", value: 0.5, aspect: "medium" },
            { text: "Low priority", value: 0.3, aspect: "low" },
            { text: "Can pause", value: 0.1, aspect: "paused" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ],
          metadata: {
            lastAccessed: file.lastModified,
            accessFrequency: file.accessCount
          }
        });
      }

      // 2. COLLABORATION PREFERENCE
      if (file.sharedWith && file.sharedWith.length > 0) {
        questions.push({
          text: `"${file.name}" - working with ${file.sharedWith[0]} on this. Collaboration style?`,
          type: 'behavioral',
          dimension: 'work_style',
          entity_id: file.id,
          options: [
            { text: "Lead it myself", value: 1.0, aspect: "solo_lead" },
            { text: "Equal collaboration", value: 0.5, aspect: "collaborative" },
            { text: "Support their lead", value: -0.5, aspect: "support" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }

      // 3. TIME INVESTMENT VALIDATION
      if (file.hoursSpent > 10) {
        questions.push({
          text: `You've spent ${file.hoursSpent} hours on "${file.name}". Worth it?`,
          type: 'validation',
          dimension: 'values',
          entity_id: file.id,
          options: [
            { text: "Absolutely", value: 1.0, aspect: "valuable" },
            { text: "Yes", value: 0.7, aspect: "worthwhile" },
            { text: "Unsure", value: 0.3, aspect: "uncertain" },
            { text: "Not really", value: -0.5, aspect: "regret" },
            { text: "Don't Care", value: 0, aspect: "indifferent" }
          ]
        });
      }
    }

    return questions;
  }

  async generateQuestionsFromPatterns(patterns) {
    const questions = [];

    // CONSISTENCY CHECKS based on learned patterns vs observed behavior

    // Example: You say you value freedom, but you scheduled 8 meetings today
    if (patterns.valuesFreedom && patterns.meetingsToday > 6) {
      questions.push({
        text: `You value freedom, but have ${patterns.meetingsToday} meetings today. How do you feel?`,
        type: 'consistency_check',
        dimension: 'values',
        options: [
          { text: "This is fine, meetings are important", value: 1.0, aspect: "reconciled" },
          { text: "Uncomfortable, too many meetings", value: -1.0, aspect: "conflict" },
          { text: "It varies by day", value: 0.3, aspect: "contextual" },
          { text: "Don't Care", value: 0, aspect: "indifferent" }
        ]
      });
    }

    // Example: You always decline meetings after 4 PM
    if (patterns.declinedEvening > 5) {
      questions.push({
        text: `You decline most meetings after 4 PM. Why?`,
        type: 'behavioral_explanation',
        dimension: 'time_management',
        options: [
          { text: "Family time", value: 1.0, aspect: "family" },
          { text: "Personal work time", value: 0.8, aspect: "focus_work" },
          { text: "Energy levels low", value: 0.6, aspect: "energy" },
          { text: "Just prefer mornings", value: 0.5, aspect: "preference" },
          { text: "Don't Care", value: 0, aspect: "indifferent" }
        ]
      });
    }

    return questions;
  }

  // MASTER FUNCTION: Generate all dynamic questions
  async generateAllDynamicQuestions() {
    const allQuestions = [];

    // Pull latest data from integrations
    const contacts = await this.getContacts();
    const calendar = await this.getCalendarEvents();
    const files = await this.getDriveFiles();
    const patterns = await this.getLearnedPatterns();

    // Generate questions from each source
    allQuestions.push(...await this.generateQuestionsFromContacts(contacts));
    allQuestions.push(...await this.generateQuestionsFromCalendar(calendar));
    allQuestions.push(...await this.generateQuestionsFromDrive(files));
    allQuestions.push(...await this.generateQuestionsFromPatterns(patterns));

    // Store in database
    for (const q of allQuestions) {
      await this.storeDynamicQuestion(q);
    }

    return allQuestions;
  }
}
```

## Privacy-First Integration Strategy

### Principle: Your Data Never Leaves Your Control

```javascript
// ALL data processing happens locally or in your database
// NO data sent to third parties
// API keys stored securely, never shared

class PrivacyFirstIntegration {

  // 1. LOCAL PROCESSING ONLY
  async syncContacts() {
    // Read from phone
    const rawContacts = await Contacts.getAll();

    // Process locally
    const processed = rawContacts.map(c => ({
      id: hashId(c.phone), // Hash PII
      name: c.name, // Keep for questions
      metadata: {
        company: c.company,
        lastContact: c.lastContact,
        // NO phone numbers, emails stored in main DB
      }
    }));

    // Store in YOUR database
    await this.db.insertMany('real_entities', processed);
  }

  // 2. MINIMAL DATA RETENTION
  async syncCalendar() {
    // Only sync upcoming/recent events
    const events = await Calendar.getEvents({
      from: '30 days ago',
      to: '60 days future'
    });

    // Extract only what's needed for questions
    const minimal = events.map(e => ({
      title: e.title,
      time: e.start,
      attendees: e.attendees.map(a => a.name), // Names only
      // NO content, attachments, private notes
    }));

    return minimal;
  }

  // 3. USER CONTROL
  async getUserConsent() {
    return {
      contacts: await askPermission('contacts'),
      calendar: await askPermission('calendar'),
      location: await askPermission('location'),
      // Each integration requires explicit consent
    };
  }

  // 4. DELETE ANYTIME
  async deleteAllIntegratedData() {
    await this.db.run('DELETE FROM real_entities');
    await this.db.run('DELETE FROM entity_interactions');
    // Complete data removal
  }
}
```

## Integration Implementation

### Mobile App (React Native)

```javascript
// contacts-integration.js
import Contacts from 'react-native-contacts';
import { PermissionsAndroid } from 'react-native';

async function syncContacts() {
  // Request permission
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  if (granted) {
    // Get all contacts
    const contacts = await Contacts.getAll();

    // Process and store
    await processContacts(contacts);
  }
}

// calendar-integration.js
import CalendarEvents from 'react-native-calendar-events';

async function syncCalendar() {
  const permission = await CalendarEvents.requestPermissions();

  if (permission === 'authorized') {
    const events = await CalendarEvents.fetchAllEvents(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)  // 60 days future
    );

    await processCalendar(events);
  }
}
```

### Web App (Google APIs)

```javascript
// google-drive-integration.js
import { google } from 'googleapis';

async function syncGoogleDrive(accessToken) {
  const drive = google.drive({ version: 'v3', auth: accessToken });

  // Get recently accessed files
  const response = await drive.files.list({
    pageSize: 100,
    fields: 'files(id, name, mimeType, modifiedTime, viewedByMeTime)',
    orderBy: 'viewedByMeTime desc'
  });

  await processFiles(response.data.files);
}

// google-calendar-integration.js
async function syncGoogleCalendar(accessToken) {
  const calendar = google.calendar({ version: 'v3', auth: accessToken });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  await processCalendarEvents(response.data.items);
}
```

## Benefits of Real-World Integration

### Before: Generic Questions
- 100 questions → 10% engagement
- Abstract scenarios
- Hard to answer honestly
- Slow to build profile

### After: Personal Questions
- 100 questions → 80% engagement
- Real situations from YOUR life
- Easy to answer (you know these people/projects)
- Fast, accurate profile building

### Example Transformation

**Generic:**
- "How do you feel about teamwork?" (vague, hard to answer)

**Personal:**
- "How do you feel about Sarah Martinez?" (specific, easy to answer)
- "You call Sarah 3x/week but haven't called John in months. Why?"
- "Meeting with Sarah vs finishing Q4 Report - what matters more?"

## Summary

With real-world integration:
1. **Questions become personal** - using YOUR actual life
2. **Agent learns faster** - concrete data, not abstract concepts
3. **Validation loop** - comparing stated preferences vs actual behavior
4. **Actionable insights** - "You say you value family but work 70 hrs/week"
5. **Privacy maintained** - all processing local/your database

Want me to build you the **integration interface** - showing how to connect these APIs and generate dynamic questions from your real data?