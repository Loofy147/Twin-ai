// ============================================
// COMPLETE INTEGRATION IMPLEMENTATION
// ============================================

// ============================================
// 1. MOBILE: CONTACTS INTEGRATION (React Native)
// ============================================

import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';

class ContactsIntegration {
  async requestPermission() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message: 'This app needs access to your contacts to generate personalized questions.',
          buttonPositive: 'OK'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const permission = await Contacts.requestPermission();
      return permission === 'authorized';
    }
  }

  async syncContacts(db, profileId) {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Contacts permission denied');
    }

    // Get all contacts
    const contacts = await Contacts.getAll();

    // Process and store
    const processed = contacts.map(contact => ({
      source: 'contacts',
      source_id: contact.recordID,
      entity_type: 'person',
      name: contact.givenName + ' ' + contact.familyName,
      metadata: {
        company: contact.company,
        jobTitle: contact.jobTitle,
        phoneNumbers: contact.phoneNumbers?.length || 0, // Count only
        emails: contact.emailAddresses?.length || 0,
        hasThumbnail: !!contact.hasThumbnailPhoto
      }
    }));

    // Insert into database
    for (const entity of processed) {
      await db.run(`
        INSERT INTO real_entities (
          entity_type, source, source_id, name, metadata, last_synced
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_id)
        DO UPDATE SET name = ?, metadata = ?, last_synced = ?
      `, [
        entity.entity_type,
        entity.source,
        entity.source_id,
        entity.name,
        JSON.stringify(entity.metadata),
        new Date().toISOString(),
        entity.name,
        JSON.stringify(entity.metadata),
        new Date().toISOString()
      ]);
    }

    // Record sync
    await db.run(`
      INSERT INTO integration_syncs (source, last_sync, records_synced, status)
      VALUES ('contacts', ?, ?, 'success')
    `, [new Date().toISOString(), processed.length]);

    return { success: true, count: processed.length };
  }

  async generateQuestionsFromContacts(db, profileId) {
    // Get all synced contacts
    const contacts = await db.all(`
      SELECT * FROM real_entities
      WHERE entity_type = 'person' AND source = 'contacts'
      ORDER BY last_synced DESC
      LIMIT 50
    `);

    const questions = [];

    for (const contact of contacts) {
      const metadata = JSON.parse(contact.metadata);

      // Question 1: Relationship assessment
      questions.push({
        text: `How do you feel about ${contact.name}?`,
        question_type: 'relationship',
        primary_dimension: 'relationships',
        generated_from_entity_id: contact.id,
        metadata: {
          options: [
            { text: 'Trust deeply', aspect: 'trust', weight: 1.0 },
            { text: 'Like/Respect', aspect: 'positive', weight: 0.7 },
            { text: 'Neutral', aspect: 'neutral', weight: 0.3 },
            { text: 'Uncomfortable', aspect: 'negative', weight: -0.5 },
            { text: "Don't Care", aspect: 'indifferent', weight: 0 }
          ],
          contact_metadata: metadata
        }
      });

      // Question 2: Communication preference
      if (metadata.phoneNumbers > 0 || metadata.emails > 0) {
        questions.push({
          text: `Best way to communicate with ${contact.name}:`,
          question_type: 'preference',
          primary_dimension: 'communication',
          generated_from_entity_id: contact.id,
          metadata: {
            options: [
              { text: 'Call', aspect: 'voice', weight: 1.0 },
              { text: 'Text/Message', aspect: 'text', weight: 0.8 },
              { text: 'Email', aspect: 'email', weight: 0.6 },
              { text: 'In person', aspect: 'face_to_face', weight: 0.9 },
              { text: "Don't Care", aspect: 'indifferent', weight: 0 }
            ]
          }
        });
      }

      // Question 3: Professional relationship (if company exists)
      if (metadata.company) {
        questions.push({
          text: `${contact.name} at ${metadata.company} - this relationship is:`,
          question_type: 'relationship_context',
          primary_dimension: 'work_style',
          generated_from_entity_id: contact.id,
          metadata: {
            options: [
              { text: 'Critical to my work', aspect: 'essential', weight: 1.0 },
              { text: 'Important colleague', aspect: 'important', weight: 0.7 },
              { text: 'Professional acquaintance', aspect: 'neutral', weight: 0.4 },
              { text: "Don't Care", aspect: 'indifferent', weight: 0 }
            ]
          }
        });
      }
    }

    // Store dynamic questions
    for (const q of questions) {
      await db.run(`
        INSERT INTO dynamic_questions (
          question_text, generated_from_entity_id,
          generation_timestamp, metadata
        ) VALUES (?, ?, ?, ?)
      `, [
        q.text,
        q.generated_from_entity_id,
        new Date().toISOString(),
        JSON.stringify(q.metadata)
      ]);
    }

    return questions;
  }
}

// ============================================
// 2. MOBILE: CALL HISTORY (React Native)
// ============================================

import CallLogs from 'react-native-call-log';

class CallHistoryIntegration {
  async syncCallHistory(db, profileId) {
    if (Platform.OS !== 'android') {
      // iOS doesn't allow call log access
      return { success: false, reason: 'iOS_NOT_SUPPORTED' };
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Call log permission denied');
    }

    // Get last 90 days of calls
    const calls = await CallLogs.load(1000); // Last 1000 calls
    const now = Date.now();
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    const recentCalls = calls.filter(call => call.timestamp > ninetyDaysAgo);

    // Aggregate by contact
    const contactStats = {};

    for (const call of recentCalls) {
      const key = call.name || call.phoneNumber;

      if (!contactStats[key]) {
        contactStats[key] = {
          name: call.name,
          totalCalls: 0,
          outgoingCalls: 0,
          incomingCalls: 0,
          totalDuration: 0,
          avgDuration: 0,
          lastCall: null,
          callTimes: [] // Hour of day
        };
      }

      contactStats[key].totalCalls++;
      contactStats[key].totalDuration += call.duration;

      if (call.type === 'OUTGOING') {
        contactStats[key].outgoingCalls++;
      } else if (call.type === 'INCOMING') {
        contactStats[key].incomingCalls++;
      }

      const callDate = new Date(call.timestamp);
      contactStats[key].callTimes.push(callDate.getHours());

      if (!contactStats[key].lastCall || call.timestamp > contactStats[key].lastCall) {
        contactStats[key].lastCall = call.timestamp;
      }
    }

    // Calculate averages and store
    for (const [name, stats] of Object.entries(contactStats)) {
      stats.avgDuration = stats.totalDuration / stats.totalCalls;

      // Find entity in database (match by name)
      const entity = await db.get(`
        SELECT id FROM real_entities
        WHERE name = ? AND entity_type = 'person'
      `, [name]);

      if (entity) {
        // Store interaction patterns
        await db.run(`
          INSERT INTO entity_patterns (
            real_entity_id, pattern_type, value, confidence,
            last_calculated, metadata
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          entity.id,
          'call_frequency',
          stats.totalCalls,
          0.9,
          new Date().toISOString(),
          JSON.stringify({
            outgoing: stats.outgoingCalls,
            incoming: stats.incomingCalls,
            avgDuration: Math.round(stats.avgDuration),
            lastCall: stats.lastCall,
            preferredHours: this.findPreferredHours(stats.callTimes)
          })
        ]);
      }
    }

    return { success: true, contactsAnalyzed: Object.keys(contactStats).length };
  }

  findPreferredHours(callTimes) {
    const hourCounts = {};
    callTimes.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  async generateQuestionsFromCallHistory(db) {
    // Get contacts with call patterns
    const contactsWithCalls = await db.all(`
      SELECT re.*, ep.metadata
      FROM real_entities re
      JOIN entity_patterns ep ON re.id = ep.real_entity_id
      WHERE ep.pattern_type = 'call_frequency'
      ORDER BY ep.value DESC
      LIMIT 20
    `);

    const questions = [];

    for (const contact of contactsWithCalls) {
      const callData = JSON.parse(contact.metadata);

      // Question: Call frequency validation
      questions.push({
        text: `You call ${contact.name} ${Math.round(callData.outgoing / 3)} times/month. This feels:`,
        question_type: 'behavioral_validation',
        primary_dimension: 'relationships',
        generated_from_entity_id: contact.id,
        metadata: {
          options: [
            { text: 'Just right', aspect: 'satisfied', weight: 1.0 },
            { text: 'Should call more', aspect: 'increase', weight: 0.5 },
            { text: 'Too frequent', aspect: 'decrease', weight: -0.5 },
            { text: "Don't Care", aspect: 'indifferent', weight: 0 }
          ],
          call_data: callData
        }
      });

      // Question: Call time preference
      if (callData.preferredHours && callData.preferredHours.length > 0) {
        const topHour = callData.preferredHours[0];
        questions.push({
          text: `You usually call ${contact.name} around ${topHour}:00. Is this your preferred time?`,
          question_type: 'temporal_validation',
          primary_dimension: 'time_management',
          generated_from_entity_id: contact.id,
          metadata: {
            options: [
              { text: 'Yes, ideal time', aspect: 'ideal', weight: 1.0 },
              { text: 'Works fine', aspect: 'acceptable', weight: 0.6 },
              { text: 'Not ideal', aspect: 'suboptimal', weight: -0.3 },
              { text: "Don't Care", aspect: 'indifferent', weight: 0 }
            ]
          }
        });
      }
    }

    return questions;
  }
}

// ============================================
// 3. WEB: GOOGLE CALENDAR INTEGRATION
// ============================================

import { google } from 'googleapis';

class GoogleCalendarIntegration {
  constructor(accessToken) {
    this.calendar = google.calendar({
      version: 'v3',
      auth: accessToken
    });
  }

  async syncCalendar(db, profileId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFuture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Fetch events
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: thirtyDaysAgo.toISOString(),
      timeMax: sixtyDaysFuture.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500
    });

    const events = response.data.items;

    for (const event of events) {
      // Store event as entity
      await db.run(`
        INSERT INTO real_entities (
          entity_type, source, source_id, name, metadata, last_synced
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_id)
        DO UPDATE SET name = ?, metadata = ?, last_synced = ?
      `, [
        'event',
        'google_calendar',
        event.id,
        event.summary,
        JSON.stringify({
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          attendees: event.attendees?.map(a => a.email) || [],
          recurrence: event.recurrence,
          location: event.location,
          status: event.status
        }),
        new Date().toISOString(),
        event.summary,
        JSON.stringify({
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          attendees: event.attendees?.map(a => a.email) || [],
          recurrence: event.recurrence,
          location: event.location,
          status: event.status
        }),
        new Date().toISOString()
      ]);

      // Store interactions
      await db.run(`
        INSERT INTO entity_interactions (
          real_entity_id, interaction_type, timestamp, metadata
        ) SELECT id, 'calendar_event', ?, ? FROM real_entities
        WHERE source = 'google_calendar' AND source_id = ?
      `, [
        event.start.dateTime || event.start.date,
        JSON.stringify({ status: event.status }),
        event.id
      ]);
    }

    // Analyze patterns
    await this.analyzeCalendarPatterns(db, events);

    return { success: true, eventsSynced: events.length };
  }

  async analyzeCalendarPatterns(db, events) {
    // Find meeting time preferences
    const hourCounts = {};
    const dayOfWeekCounts = {};
    const durationCounts = {};

    events.forEach(event => {
      if (!event.start.dateTime) return; // Skip all-day events

      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const hour = start.getHours();
      const day = start.getDay();
      const duration = (end - start) / (1000 * 60); // minutes

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;

      const durationBucket = duration <= 30 ? '30' : duration <= 60 ? '60' : '60+';
      durationCounts[durationBucket] = (durationCounts[durationBucket] || 0) + 1;
    });

    // Store patterns
    await db.run(`
      INSERT INTO patterns (
        profile_id, pattern_type, dimension_id,
        confidence, strength, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      1, // profile_id
      'meeting_time_preference',
      6, // time_management dimension
      0.8,
      1.0,
      JSON.stringify({
        preferredHours: Object.entries(hourCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([hour]) => parseInt(hour)),
        preferredDays: Object.entries(dayOfWeekCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([day]) => parseInt(day)),
        preferredDuration: Object.entries(durationCounts)
          .sort((a, b) => b[1] - a[1])[0][0]
      })
    ]);
  }

  async generateQuestionsFromCalendar(db) {
    // Get upcoming events
    const upcomingEvents = await db.all(`
      SELECT * FROM real_entities
      WHERE entity_type = 'event'
        AND source = 'google_calendar'
        AND json_extract(metadata, '$.start') > datetime('now')
      ORDER BY json_extract(metadata, '$.start')
      LIMIT 20
    `);

    const questions = [];

    for (const event of upcomingEvents) {
      const metadata = JSON.parse(event.metadata);
      const startTime = new Date(metadata.start);

      // Question: Time preference
      questions.push({
        text: `"${event.name}" scheduled at ${startTime.toLocaleTimeString()}. This time works for you?`,
        question_type: 'temporal_validation',
        primary_dimension: 'time_management',
        generated_from_entity_id: event.id,
        metadata: {
          options: [
            { text: 'Perfect time', aspect: 'ideal', weight: 1.0 },
            { text: 'Acceptable', aspect: 'okay', weight: 0.5 },
            { text: 'Not ideal', aspect: 'suboptimal', weight: -0.5 },
            { text: 'Bad time', aspect: 'avoid', weight: -1.0 },
            { text: "Don't Care", aspect: 'indifferent', weight: 0 }
          ],
          event_time: metadata.start
        }
      });

      // Question: Meeting value (if recurring)
      if (metadata.recurrence) {
        questions.push({
          text: `"${event.name}" is recurring. Is this meeting valuable to you?`,
          question_type: 'value_assessment',
          primary_dimension: 'work_style',
          generated_from_entity_id: event.id,
          metadata: {
            options: [
              { text: 'Essential', aspect: 'critical', weight: 1.0 },
              { text: 'Useful', aspect: 'helpful', weight: 0.6 },
              { text: 'Neutral', aspect: 'neutral', weight: 0.3 },
              { text: 'Time waste', aspect: 'wasteful', weight: -0.6 },
              { text: "Don't Care", aspect: 'indifferent', weight: 0 }
            ]
          }
        });
      }
    }

    return questions;
  }
}

// ============================================
// 4. WEB: GOOGLE DRIVE INTEGRATION
// ============================================

class GoogleDriveIntegration {
  constructor(accessToken) {
    this.drive = google.drive({
      version: 'v3',
      auth: accessToken
    });
  }

  async syncDrive(db, profileId) {
    // Get recently accessed files
    const response = await this.drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, mimeType, modifiedTime, viewedByMeTime, owners, permissions)',
      orderBy: 'viewedByMeTime desc'
    });

    const files = response.data.files;

    for (const file of files) {
      // Determine if shared
      const sharedWith = file.permissions
        ?.filter(p => p.type === 'user' && p.role !== 'owner')
        .map(p => p.emailAddress) || [];

      await db.run(`
        INSERT INTO real_entities (
          entity_type, source, source_id, name, metadata, last_synced
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_id)
        DO UPDATE SET name = ?, metadata = ?, last_synced = ?
      `, [
        'file',
        'google_drive',
        file.id,
        file.name,
        JSON.stringify({
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          viewedByMeTime: file.viewedByMeTime,
          sharedWith: sharedWith.length,
          isShared: sharedWith.length > 0
        }),
        new Date().toISOString(),
        file.name,
        JSON.stringify({
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          viewedByMeTime: file.viewedByMeTime,
          sharedWith: sharedWith.length,
          isShared: sharedWith.length > 0
        }),
        new Date().toISOString()
      ]);
    }

    return { success: true, filesSynced: files.length };
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================

async function setupIntegrations(db, profileId) {
  // Mobile: Contacts
  const contactsIntegration = new ContactsIntegration();
  await contactsIntegration.syncContacts(db, profileId);
  await contactsIntegration.generateQuestionsFromContacts(db, profileId);

  // Mobile: Call History (Android only)
  const callHistoryIntegration = new CallHistoryIntegration();
  await callHistoryIntegration.syncCallHistory(db, profileId);
  await callHistoryIntegration.generateQuestionsFromCallHistory(db);

  // Web: Google Calendar
  const googleToken = 'YOUR_GOOGLE_OAUTH_TOKEN';
  const calendarIntegration = new GoogleCalendarIntegration(googleToken);
  await calendarIntegration.syncCalendar(db, profileId);
  await calendarIntegration.generateQuestionsFromCalendar(db);

  // Web: Google Drive
  const driveIntegration = new GoogleDriveIntegration(googleToken);
  await driveIntegration.syncDrive(db, profileId);

  console.log('All integrations synced successfully');
}