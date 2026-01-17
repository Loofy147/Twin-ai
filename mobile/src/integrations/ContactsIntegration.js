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

    for (const contact of contacts) {
      const fullName = `${contact.givenName} ${contact.familyName}`;

      // Store in entities table
      db.prepare(`
        INSERT INTO entities (entity_type, name, metadata)
        VALUES (?, ?, ?)
      `).run('person', fullName, JSON.stringify({
        company: contact.company,
        source: 'contacts'
      }));
    }

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

    // Store generated questions
    for (const q of questions) {
      db.prepare(`
        INSERT INTO questions (text, question_type, primary_dimension_id, metadata)
        VALUES (?, ?, ?, ?)
      `).run(q.text, q.question_type, q.primary_dimension_id, q.metadata);
    }

    return questions;
  }
}

module.exports = ContactsIntegration;
