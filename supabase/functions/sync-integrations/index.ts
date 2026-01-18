import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')

  // Basic security check - could be a secret key for cron
  if (authHeader !== `Bearer ${Deno.env.get('SYNC_SECRET_KEY')}`) {
    // Also allow service role if needed
    // return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // 1. Fetch all active integration tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('integration_tokens')
      .select('*')
      .eq('integration_type', 'google_calendar')

    if (tokenError) throw tokenError

    const results = []

    for (const token of tokens) {
      try {
        // TODO: Implement actual sync logic here
        // 1. Refresh token if needed
        // 2. Fetch events from Google API
        // 3. Store in entities table
        // 4. Generate questions

        console.log(`Syncing for profile: ${token.profile_id}`)

        results.push({ profile_id: token.profile_id, status: 'success' })
      } catch (err) {
        console.error(`Sync failed for profile ${token.profile_id}:`, err)
        results.push({ profile_id: token.profile_id, status: 'failed', error: err.message })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Sync function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
