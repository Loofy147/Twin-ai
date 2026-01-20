import { google, drive_v3 } from 'googleapis';

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

  private async loadTokens(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('integration_tokens')
        .select('*')
        .eq('profile_id', this.profileId)
        .eq('integration_type', 'google_drive')
        .single();

      if (error || !data) {
        this.logger.warn('No stored tokens found for Google Drive', { profile_id: this.profileId });
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined
      });

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to load Google Drive tokens', { profile_id: this.profileId, error: error.message });
      return false;
    }
  }

  async syncDrive(): Promise<SyncResult> {
    if (!this.drive && !(await this.loadTokens())) {
      return { success: false, files_synced: 0, questions_generated: 0, errors: ['Not authenticated'] };
    }

    try {
      const files = await this.fetchFiles();
      const syncedCount = await this.storeFiles(files);
      const questionsCount = await this.generateQuestions(files);

      return { success: true, files_synced: syncedCount, questions_generated: questionsCount };
    } catch (error: any) {
      return { success: false, files_synced: 0, questions_generated: 0, errors: [error.message] };
    }
  }

  private async fetchFiles(): Promise<DriveFile[]> {
    if (!this.drive) throw new Error('Drive not initialized');
    const response = await this.drive.files.list({
      pageSize: 50,
      fields: 'files(id, name, mimeType, viewedByMeTime)',
      orderBy: 'viewedByMeTime desc',
      q: "trashed = false"
    });
    return (response.data.files || []) as DriveFile[];
  }

  private async storeFiles(files: DriveFile[]): Promise<number> {
    if (files.length === 0) return 0;

    // BOLT OPTIMIZATION: Use batch upsert to reduce network roundtrips from O(N) to O(1)
    const entities = files.map(file => ({
      profile_id: this.profileId,
      entity_type: 'file',
      name: file.name || 'Untitled',
      metadata: {
        source: 'google_drive',
        source_id: file.id,
        mimeType: file.mimeType,
        lastViewed: file.viewedByMeTime
      }
    }));

    const { error } = await this.supabase
      .from('entities')
      .upsert(entities, { onConflict: 'profile_id,name,entity_type' });

    if (error) {
      this.logger.error('Failed to batch upsert drive files', { error: error.message });
      return 0;
    }

    return files.length;
  }

  private async generateQuestions(files: DriveFile[]): Promise<number> {
    const recentFiles = files.filter(f => f.viewedByMeTime).slice(0, 3);
    if (recentFiles.length === 0) return 0;

    // BOLT OPTIMIZATION: Batch insert questions
    const questions = recentFiles.map(file => ({
      text: `You recently worked on "${file.name}". How important is this to your current focus?`,
      question_type: 'priority',
      primary_dimension_id: 2,
      engagement_factor: 1.4,
      metadata: { source: 'google_drive', file_id: file.id }
    }));

    const { error } = await this.supabase.from('questions').insert(questions);

    if (error) {
      this.logger.error('Failed to batch insert drive questions', { error: error.message });
      return 0;
    }

    return recentFiles.length;
  }

  async disconnect(): Promise<void> {
    await this.supabase
      .from('integration_tokens')
      .delete()
      .eq('profile_id', this.profileId)
      .eq('integration_type', 'google_drive');
    this.drive = null;
  }
}
