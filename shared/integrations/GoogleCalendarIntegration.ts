import { google, calendar_v3 } from 'googleapis';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees?: string[];
  recurrence?: string[];
  location?: string;
}

interface SyncResult {
  success: boolean;
  events_synced: number;
  questions_generated: number;
  errors?: string[];
}

export class GoogleCalendarIntegration {
  private oauth2Client;
  private calendar: calendar_v3.Calendar | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    private profileId: string,
    private supabase: any,
    private logger: any,
    config: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    }
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  async connect(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const { error } = await this.supabase
        .from('integration_tokens')
        .upsert({
          profile_id: this.profileId,
          integration_type: 'google_calendar',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      this.logger.debug('Calendar tokens stored');
    } catch (error: any) {
      this.logger.error('Failed to store calendar tokens', { error: error.message });
      throw error;
    }
  }

  private async loadTokens(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('integration_tokens')
      .select('*')
      .eq('profile_id', this.profileId)
      .eq('integration_type', 'google_calendar')
      .single();

    if (error || !data) return false;

    this.oauth2Client.setCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    return true;
  }

  async syncCalendar(): Promise<SyncResult> {
    if (!this.calendar && !(await this.loadTokens())) {
      return { success: false, events_synced: 0, questions_generated: 0, errors: ['Not authenticated'] };
    }

    try {
      const events = await this.fetchEvents();
      const syncedCount = await this.storeEvents(events);
      const questionsCount = await this.generateQuestions(events);

      return { success: true, events_synced: syncedCount, questions_generated: questionsCount };
    } catch (error: any) {
      return { success: false, events_synced: 0, questions_generated: 0, errors: [error.message] };
    }
  }

  private async fetchEvents(): Promise<CalendarEvent[]> {
    if (!this.calendar) throw new Error('Calendar not initialized');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: thirtyDaysAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 500,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return (response.data.items || [])
      .filter(event => event.start?.dateTime && event.end?.dateTime)
      .map(event => ({
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        start: event.start!.dateTime!,
        end: event.end!.dateTime!,
        attendees: event.attendees?.map(a => a.email!).filter(Boolean),
        recurrence: event.recurrence,
        location: event.location
      }));
  }

  private async storeEvents(events: CalendarEvent[]): Promise<number> {
    let count = 0;
    for (const event of events) {
      const { error } = await this.supabase
        .from('entities')
        .upsert({
          profile_id: this.profileId,
          entity_type: 'event',
          name: event.summary,
          metadata: {
            source: 'google_calendar',
            source_id: event.id,
            start: event.start,
            end: event.end
          }
        }, { onConflict: 'profile_id,name,entity_type' });
      if (!error) count++;
    }
    return count;
  }

  private async generateQuestions(events: CalendarEvent[]): Promise<number> {
    if (events.length > 5) {
      const { error } = await this.supabase.from('questions').insert({
        text: `You have ${events.length} events in the last 30 days. How satisfied are you with your time usage?`,
        question_type: 'reflection',
        primary_dimension_id: 6,
        engagement_factor: 1.5,
        metadata: { source: 'google_calendar' }
      });
      return error ? 0 : 1;
    }
    return 0;
  }

  async disconnect(): Promise<void> {
    await this.supabase
      .from('integration_tokens')
      .delete()
      .eq('profile_id', this.profileId)
      .eq('integration_type', 'google_calendar');
    this.calendar = null;
  }
}
