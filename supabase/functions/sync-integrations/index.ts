import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { google } from "https://esm.sh/googleapis@140.0.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI')

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { integration } = await req.json()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    // Fetch tokens
    const { data: integrationToken, error: tokenError } = await supabase
      .from('integration_tokens')
      .select('*')
      .eq('profile_id', user.id)
      .eq('integration_type', integration)
      .single()

    if (tokenError || !integrationToken) throw new Error('Integration not found')

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: integrationToken.access_token,
      refresh_token: integrationToken.refresh_token,
      expiry_date: integrationToken.expires_at ? new Date(integrationToken.expires_at).getTime() : undefined
    })

    let syncedCount = 0;

    if (integration === 'google_calendar') {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events = response.data.items || []
      if (events.length > 0) {
        // BOLT OPTIMIZATION: Use batch upsert to reduce cloud network latency and avoid Edge Function timeouts
        const eventEntities = events.map(event => ({
          profile_id: user.id,
          entity_type: 'event',
          name: event.summary || 'Untitled',
          metadata: {
            source: 'google_calendar',
            source_id: event.id,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date
          }
        }))

        const { error } = await supabase.from('entities').upsert(eventEntities, { onConflict: 'profile_id,name,entity_type' })
        if (error) throw error;
      }
      syncedCount = events.length;
    } else if (integration === 'google_drive') {
      const drive = google.drive({ version: 'v3', auth: oauth2Client })
      const response = await drive.files.list({
        pageSize: 50,
        fields: 'files(id, name, mimeType, viewedByMeTime)',
        orderBy: 'viewedByMeTime desc',
        q: "trashed = false"
      })

      const files = response.data.files || []
      if (files.length > 0) {
        // BOLT OPTIMIZATION: Use batch upsert for Drive files
        const fileEntities = files.map(file => ({
          profile_id: user.id,
          entity_type: 'file',
          name: file.name || 'Untitled',
          metadata: {
            source: 'google_drive',
            source_id: file.id,
            mimeType: file.mimeType,
            lastViewed: file.viewedByMeTime
          }
        }))

        const { error } = await supabase.from('entities').upsert(fileEntities, { onConflict: 'profile_id,name,entity_type' })
        if (error) throw error;
      }
      syncedCount = files.length;
    }

    await supabase.from('integration_tokens').update({
      last_used_at: new Date().toISOString()
    }).eq('id', integrationToken.id)

    return new Response(JSON.stringify({ success: true, count: syncedCount }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
