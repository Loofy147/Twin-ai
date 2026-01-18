import { google, calendar_v3 } from 'googleapis';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

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

  /**
   * Initialize and store OAuth tokens
   */
  async connect(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Store tokens securely in database
      const { error } = await supabase
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

      logger.debug('Tokens stored successfully', {
        profile_id: this.profileId,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      });

    } catch (error: any) {
      logger.error('Failed to store tokens', {
        profile_id: this.profileId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Load stored tokens and refresh if needed
   */
  private async loadTokens(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('integration_tokens')
        .select('*')
        .eq('profile_id', this.profileId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (error || !data) {
        logger.warn('No stored tokens found', { profile_id: this.profileId });
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined
      });

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      logger.debug('Tokens loaded successfully', {
        profile_id: this.profileId,
        expires_at: data.expires_at
      });

      return true;

    } catch (error: any) {
      logger.error('Failed to load tokens', {
        profile_id: this.profileId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Sync calendar events with retry logic
   */
  async syncCalendar(): Promise<SyncResult> {
    const timer = logger.startTimer('google_calendar_sync');

    if (!this.calendar) {
      const loaded = await this.loadTokens();
      if (!loaded) {
        return {
          success: false,
          events_synced: 0,
          questions_generated: 0,
          errors: ['Not authenticated']
        };
      }
    }

    let attempt = 0;
    const errors: string[] = [];

    while (attempt < this.MAX_RETRIES) {
      try {
        const events = await this.fetchEvents();
        const syncedCount = await this.storeEvents(events);
        const questionsCount = await this.generateQuestions(events);

        logger.info('Calendar sync completed', {
          profile_id: this.profileId,
          events_synced: syncedCount,
          questions_generated: questionsCount,
          duration_ms: timer()
        });

        return {
          success: true,
          events_synced: syncedCount,
          questions_generated: questionsCount
        };

      } catch (error: any) {
        attempt++;
        const errorMsg = `Attempt ${attempt}/${this.MAX_RETRIES}: ${error.message}`;
        errors.push(errorMsg);

        logger.warn('Calendar sync attempt failed', {
          profile_id: this.profileId,
          attempt,
          error: error.message
        });

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        }
      }
    }

    timer();
    return {
      success: false,
      events_synced: 0,
      questions_generated: 0,
      errors
    };
  }

  /**
   * Fetch events from Google Calendar
   */
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

    if (!response.data.items) {
      return [];
    }

    return response.data.items
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

  /**
   * Store events as entities in database
   */
  private async storeEvents(events: CalendarEvent[]): Promise<number> {
    let count = 0;

    for (const event of events) {
      try {
        const { error } = await supabase
          .from('entities')
          .upsert({
            entity_type: 'event',
            name: event.summary,
            metadata: {
              created_by: this.profileId,
              visibility: 'private',
              source: 'google_calendar',
              source_id: event.id,
              start: event.start,
              end: event.end,
              attendees: event.attendees,
              recurrence: event.recurrence,
              location: event.location,
              duration_minutes: this.calculateDuration(event.start, event.end)
            }
          }, {
            onConflict: 'name,entity_type'
          });

        if (!error) count++;

      } catch (error: any) {
        logger.warn('Failed to store event', {
          event_id: event.id,
          error: error.message
        });
      }
    }

    return count;
  }

  /**
   * Generate contextual questions from calendar patterns
   */
  private async generateQuestions(events: CalendarEvent[]): Promise<number> {
    const patterns = this.analyzePatterns(events);
    let count = 0;

    // Meeting density pattern
    if (patterns.avgMeetingsPerDay > 3) {
      await this.insertQuestion({
        text: `You average ${patterns.avgMeetingsPerDay.toFixed(1)} meetings per day. How do you feel about this schedule?`,
        question_type: 'meeting_density',
        primary_dimension_id: 6, // Time Management
        engagement_factor: 1.8,
        metadata: {
          pattern: 'high_meeting_density',
          avg_meetings: patterns.avgMeetingsPerDay,
          options: [
            { text: "Just right - I thrive on collaboration", weight: 1.0 },
            { text: "A bit much - could use more focus time", weight: 0.5 },
            { text: "Overwhelming - need significant reduction", weight: -0.5 }
          ]
        }
      });
      count++;
    }

    // Recurring meetings
    const recurringMeetings = events.filter(e => e.recurrence);
    if (recurringMeetings.length > 0) {
      const meeting = recurringMeetings[0];
      await this.insertQuestion({
        text: `"${meeting.summary}" is a recurring meeting. How valuable is this for you?`,
        question_type: 'meeting_value',
        primary_dimension_id: 2, // Work Style
        engagement_factor: 1.6,
        metadata: {
          entity_name: meeting.summary,
          options: [
            { text: "Highly valuable - critical for my work", weight: 1.0 },
            { text: "Moderately valuable", weight: 0.6 },
            { text: "Could be optimized", weight: 0.3 },
            { text: "Not valuable - waste of time", weight: -0.5 }
          ]
        }
      });
      count++;
    }

    // Store meeting density pattern
    await this.storePattern('meeting_density', patterns.avgMeetingsPerDay);

    return count;
  }

  /**
   * Analyze calendar patterns
   */
  private analyzePatterns(events: CalendarEvent[]) {
    const totalDays = 30;
    const avgMeetingsPerDay = events.length / totalDays;
    const recurringCount = events.filter(e => e.recurrence).length;
    const avgDuration = events.reduce((sum, e) =>
      sum + this.calculateDuration(e.start, e.end), 0
    ) / (events.length || 1);

    return {
      avgMeetingsPerDay,
      recurringCount,
      avgDuration,
      totalEvents: events.length
    };
  }

  /**
   * Helper: Calculate event duration in minutes
   */
  private calculateDuration(start: string, end: string): number {
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
  }

  /**
   * Helper: Insert question into database
   */
  private async insertQuestion(question: any): Promise<void> {
    try {
      await supabase.from('questions').insert({
        text: question.text,
        question_type: question.question_type,
        primary_dimension_id: question.primary_dimension_id,
        engagement_factor: question.engagement_factor,
        metadata: question.metadata
      });
    } catch (error: any) {
      logger.warn('Failed to insert question', { error: error.message });
    }
  }

  /**
   * Helper: Store pattern
   */
  private async storePattern(type: string, value: number): Promise<void> {
    try {
      await supabase.from('patterns').upsert({
        profile_id: this.profileId,
        pattern_type: type,
        confidence: 0.8,
        strength: value,
        metadata: { source: 'google_calendar' },
        last_updated: new Date().toISOString()
      });
    } catch (error: any) {
      logger.warn('Failed to store pattern', { error: error.message });
    }
  }

  /**
   * Helper: Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Disconnect integration
   */
  async disconnect(): Promise<void> {
    try {
      await supabase
        .from('integration_tokens')
        .delete()
        .eq('profile_id', this.profileId)
        .eq('integration_type', 'google_calendar');

      this.calendar = null;

      logger.info('Google Calendar disconnected', {
        profile_id: this.profileId
      });
    } catch (error: any) {
      logger.error('Failed to disconnect', {
        profile_id: this.profileId,
        error: error.message
      });
      throw error;
    }
  }
}
