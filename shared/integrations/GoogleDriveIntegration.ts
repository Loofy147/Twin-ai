import { google, drive_v3 } from 'googleapis';
import { supabase } from '../../web/src/lib/supabase';
import { logger } from '../../web/src/lib/logger';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  viewedByMeTime?: string;
  modifiedTime?: string;
}

interface SyncResult {
  success: boolean;
  files_synced: number;
  questions_generated: number;
  errors?: string[];
}

export class GoogleDriveIntegration {
  private oauth2Client;
  private drive: drive_v3.Drive | null = null;
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
   * Load stored tokens and refresh if needed
   */
  private async loadTokens(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('integration_tokens')
        .select('*')
        .eq('profile_id', this.profileId)
        .eq('integration_type', 'google_drive')
        .single();

      if (error || !data) {
        logger.warn('No stored tokens found for Google Drive', { profile_id: this.profileId });
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined
      });

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      logger.debug('Google Drive tokens loaded successfully', {
        profile_id: this.profileId,
        expires_at: data.expires_at
      });

      return true;

    } catch (error: any) {
      logger.error('Failed to load Google Drive tokens', {
        profile_id: this.profileId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Sync drive files with retry logic
   */
  async syncDrive(): Promise<SyncResult> {
    const timer = logger.startTimer('google_drive_sync');

    if (!this.drive) {
      const loaded = await this.loadTokens();
      if (!loaded) {
        return {
          success: false,
          files_synced: 0,
          questions_generated: 0,
          errors: ['Not authenticated']
        };
      }
    }

    let attempt = 0;
    const errors: string[] = [];

    while (attempt < this.MAX_RETRIES) {
      try {
        const files = await this.fetchFiles();
        const syncedCount = await this.storeFiles(files);
        const questionsCount = await this.generateQuestions(files);

        logger.info('Drive sync completed', {
          profile_id: this.profileId,
          files_synced: syncedCount,
          questions_generated: questionsCount,
          duration_ms: timer()
        });

        return {
          success: true,
          files_synced: syncedCount,
          questions_generated: questionsCount
        };

      } catch (error: any) {
        attempt++;
        const errorMsg = `Attempt ${attempt}/${this.MAX_RETRIES}: ${error.message}`;
        errors.push(errorMsg);

        logger.warn('Drive sync attempt failed', {
          profile_id: this.profileId,
          attempt,
          error: error.message
        });

        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
        }
      }
    }

    timer();
    return {
      success: false,
      files_synced: 0,
      questions_generated: 0,
      errors
    };
  }

  /**
   * Fetch recently modified/viewed files from Google Drive
   */
  private async fetchFiles(): Promise<DriveFile[]> {
    if (!this.drive) throw new Error('Drive not initialized');

    const response = await this.drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, mimeType, viewedByMeTime, modifiedTime)',
      orderBy: 'viewedByMeTime desc',
      q: "trashed = false"
    });

    if (!response.data.files) {
      return [];
    }

    return response.data.files as DriveFile[];
  }

  /**
   * Store files as entities in database
   */
  private async storeFiles(files: DriveFile[]): Promise<number> {
    let count = 0;

    for (const file of files) {
      try {
        const { error } = await supabase
          .from('entities')
          .upsert({
            entity_type: 'file',
            name: file.name,
            metadata: {
              created_by: this.profileId,
              visibility: 'private',
              source: 'google_drive',
              source_id: file.id,
              mimeType: file.mimeType,
              lastViewed: file.viewedByMeTime,
              lastModified: file.modifiedTime
            }
          }, {
            onConflict: 'name,entity_type'
          });

        if (!error) count++;

      } catch (error: any) {
        logger.warn('Failed to store drive file', {
          file_id: file.id,
          error: error.message
        });
      }
    }

    return count;
  }

  /**
   * Generate questions from drive activity
   */
  private async generateQuestions(files: DriveFile[]): Promise<number> {
    let count = 0;

    // Only process top 5 most recently viewed files
    const recentFiles = files.filter(f => f.viewedByMeTime).slice(0, 5);

    for (const file of recentFiles) {
      await this.insertQuestion({
        text: `You recently worked on "${file.name}". How important is this project to your current goals?`,
        question_type: 'priority',
        primary_dimension_id: 2, // Work Style
        engagement_factor: 1.4,
        metadata: {
          source: 'google_drive',
          file_id: file.id,
          options: [
            { text: "Critical Priority", weight: 1.0 },
            { text: "Supporting Task", weight: 0.6 },
            { text: "Minor Reference", weight: 0.2 },
            { text: "No longer relevant", weight: -0.5 }
          ]
        }
      });
      count++;
    }

    return count;
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
      logger.warn('Failed to insert question from Drive', { error: error.message });
    }
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
        .eq('integration_type', 'google_drive');

      this.drive = null;

      logger.info('Google Drive disconnected', {
        profile_id: this.profileId
      });
    } catch (error: any) {
      logger.error('Failed to disconnect Google Drive', {
        profile_id: this.profileId,
        error: error.message
      });
      throw error;
    }
  }
}
