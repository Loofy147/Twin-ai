// web/src/integrations/GoogleCalendarIntegration.js
// Based on integration-code-impl.js

class GoogleCalendarIntegration {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async syncCalendar(db, profileId) {
    // Mocking calendar events
    const events = [
      {
        id: 'ev1',
        summary: 'Weekly Project Sync',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        attendees: [{ email: 'sarah@example.com' }, { email: 'john@example.com' }],
        recurrence: ['RRULE:FREQ=WEEKLY']
      },
      {
        id: 'ev2',
        summary: 'Deep Work Session',
        start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
        end: { dateTime: new Date(Date.now() + 86400000 + 7200000).toISOString() },
        location: 'Focus Room'
      }
    ];

    for (const event of events) {
      db.prepare(`
        INSERT INTO entities (entity_type, name, metadata)
        VALUES (?, ?, ?)
      `).run('event', event.summary, JSON.stringify({
        source: 'google_calendar',
        source_id: event.id,
        start: event.start.dateTime,
        end: event.end?.dateTime,
        attendees: event.attendees?.map(a => a.email),
        recurrence: event.recurrence,
        location: event.location
      }));
    }

    // Pattern analysis: count meetings per day
    const meetingsPerDay = events.length;
    db.prepare(`
        INSERT INTO patterns (profile_id, pattern_type, confidence, strength, metadata)
        VALUES (?, ?, ?, ?, ?)
    `).run(profileId, 'meeting_density', 0.8, 1.0, JSON.stringify({ avgMeetingsPerDay: meetingsPerDay }));

    return { success: true, count: events.length };
  }

  async generateQuestionsFromCalendar(db) {
    const events = db.prepare("SELECT * FROM entities WHERE entity_type = 'event'").all();
    const questions = [];

    for (const event of events) {
        const metadata = JSON.parse(event.metadata);

        // Question about meeting value
        questions.push({
            text: `How valuable do you find the "${event.name}" meeting?`,
            question_type: 'priority',
            primary_dimension_id: 2, // Work Style
            engagement_factor: 1.5,
            metadata: JSON.stringify({
                entity_id: event.id,
                options: [
                    { text: "Highly Valuable", weight: 1.0 },
                    { text: "Moderately Valuable", weight: 0.6 },
                    { text: "Neutral", weight: 0.3 },
                    { text: "Waste of Time", weight: -0.5 },
                    { text: "Don't Care", weight: 0 }
                ]
            })
        });

        // Question about attendees if any
        if (metadata.attendees && metadata.attendees.length > 0) {
            questions.push({
                text: `You frequently meet with ${metadata.attendees[0]}. Do you feel this collaboration is productive?`,
                question_type: 'relationship',
                primary_dimension_id: 3, // Relationships
                engagement_factor: 1.8,
                metadata: JSON.stringify({
                    options: [
                        { text: "Very Productive", weight: 1.0 },
                        { text: "Somewhat", weight: 0.5 },
                        { text: "Could be better", weight: 0.1 }
                    ]
                })
            });
        }
    }

    for (const q of questions) {
      db.prepare(`
        INSERT INTO questions (text, question_type, engagement_factor, primary_dimension_id, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(q.text, q.question_type, q.engagement_factor, q.primary_dimension_id, q.metadata);
    }

    return questions;
  }
}

module.exports = GoogleCalendarIntegration;
