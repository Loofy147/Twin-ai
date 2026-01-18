// web/src/integrations/GoogleDriveIntegration.js
// Based on integration-code-impl.js

class GoogleDriveIntegration {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async syncDrive(db, profileId) {
    // Mocking drive files
    const files = [
      { id: 'f1', name: 'Product Roadmap 2024', mimeType: 'application/vnd.google-apps.spreadsheet', viewedByMeTime: new Date().toISOString() },
      { id: 'f2', name: 'Personal Journal', mimeType: 'application/vnd.google-apps.document', viewedByMeTime: new Date(Date.now() - 86400000).toISOString() }
    ];

    for (const file of files) {
      db.prepare(`
        INSERT OR IGNORE INTO entities (entity_type, name, metadata)
        VALUES (?, ?, ?)
      `).run('file', file.name, JSON.stringify({
        source: 'google_drive',
        source_id: file.id,
        mimeType: file.mimeType,
        lastViewed: file.viewedByMeTime
      }));
    }

    return { success: true, count: files.length };
  }

  async generateQuestionsFromDrive(db) {
    const files = db.prepare("SELECT * FROM entities WHERE entity_type = 'file'").all();
    const questions = [];

    for (const file of files) {
      questions.push({
        text: `"${file.name}" was recently accessed. Is this currently a top priority for you?`,
        question_type: 'priority',
        primary_dimension_id: 2, // Work Style
        engagement_factor: 1.4,
        metadata: JSON.stringify({
          entity_id: file.id,
          options: [
            { text: "Top Priority", weight: 1.0 },
            { text: "Supporting Task", weight: 0.6 },
            { text: "Just Browsing", weight: 0.2 },
            { text: "Not Priority", weight: 0 }
          ]
        })
      });
    }

    for (const q of questions) {
      db.prepare(`
        INSERT OR IGNORE INTO questions (text, question_type, engagement_factor, primary_dimension_id, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(q.text, q.question_type, q.engagement_factor, q.primary_dimension_id, q.metadata);
    }

    return questions;
  }
}

module.exports = GoogleDriveIntegration;
