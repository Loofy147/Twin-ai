import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // SENTINEL: Now expects a nonce ID

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: 'Missing code or state' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // SENTINEL: Verify and consume the OAuth nonce - CRITICAL
    const { data: nonce, error: nonceError } = await supabase
      .from('oauth_nonces')
      .select('profile_id')
      .eq('id', state)
      .single()

    if (nonceError || !nonce) {
      console.error('Invalid or expired state nonce:', state, nonceError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired state' }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    // SENTINEL: Delete nonce immediately after use (one-time use)
    await supabase.from('oauth_nonces').delete().eq('id', state)

    // 1. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error)
    }

    // 2. Store tokens in database using the verified profile_id from nonce
    const { error } = await supabase
      .from('integration_tokens')
      .upsert({
        profile_id: nonce.profile_id,
        integration_type: 'google_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    // 3. Redirect back to app
    const returnUrl = Deno.env.get('APP_RETURN_URL') || 'http://localhost:5173/integrations?success=true'
    return Response.redirect(returnUrl, 303)

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
