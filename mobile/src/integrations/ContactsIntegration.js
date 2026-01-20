// mobile/src/integrations/ContactsIntegration.js
// Based on integration-code-impl.js

class ContactsIntegration {
  async syncContacts(db, profileId) {
    // In a real React Native app, we would use:
    // import Contacts from 'react-native-contacts';
    // const contacts = await Contacts.getAll();

    // For this implementation, we'll assume contacts are passed or fetched from a mock
    const contacts = [
      { givenName: 'Sarah', familyName: 'Martinez', company: 'Design Co', phoneNumbers: [{ label: 'mobile', number: '555-0123' }] },
      { givenName: 'John', familyName: 'Smith', company: 'Tech Inc', phoneNumbers: [{ label: 'work', number: '555-4567' }] }
    ];

    // BOLT OPTIMIZATION: Hoist prepare and use transaction for bulk contact sync
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO entities (entity_type, name, metadata)
      VALUES (?, ?, ?)
    `);

    const sync = db.transaction((contactsList) => {
      for (const contact of contactsList) {
        const fullName = `${contact.givenName} ${contact.familyName}`;
        insertStmt.run('person', fullName, JSON.stringify({
          company: contact.company,
          source: 'contacts'
        }));
      }
    });

    sync(contacts);

    return { success: true, count: contacts.length };
  }

  async generateQuestionsFromContacts(db, profileId) {
    const contacts = db.prepare("SELECT * FROM entities WHERE entity_type = 'person'").all();
    const questions = [];

    for (const contact of contacts) {
      questions.push({
        text: `How do you feel about your relationship with ${contact.name}?`,
        question_type: 'relationship',
        primary_dimension_id: 3, // Relationships (based on schema)
        metadata: JSON.stringify({
          entity_id: contact.id,
          options: [
            { text: "Very Close", weight: 1.0 },
            { text: "Professional", weight: 0.5 },
            { text: "Distant", weight: 0.1 },
            { text: "Don't Care", weight: 0 }
          ]
        })
      });
    }

    // BOLT OPTIMIZATION: Hoist prepare and use transaction for bulk question generation
    const insertQuestionStmt = db.prepare(`
      INSERT OR IGNORE INTO questions (text, question_type, primary_dimension_id, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const saveQuestions = db.transaction((qs) => {
      for (const q of qs) {
        insertQuestionStmt.run(q.text, q.question_type, q.primary_dimension_id, q.metadata);
      }
    });

    saveQuestions(questions);

    return questions;
  }
}

module.exports = ContactsIntegration;
