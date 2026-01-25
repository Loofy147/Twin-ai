import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GITHUB_CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID')
const GITHUB_CLIENT_SECRET = Deno.env.get('GITHUB_CLIENT_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: 'Missing code or state' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Verify and consume the OAuth nonce
    const { data: nonce, error: nonceError } = await supabase
      .from('oauth_nonces')
      .select('profile_id')
      .eq('id', state)
      .single()

    if (nonceError || !nonce) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired state' }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    await supabase.from('oauth_nonces').delete().eq('id', state)

    // 1. Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error)
    }

    // 2. Store token
    const { error } = await supabase
      .from('integration_tokens')
      .upsert({
        profile_id: nonce.profile_id,
        integration_type: 'github',
        access_token: tokens.access_token,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    const returnUrl = Deno.env.get('APP_RETURN_URL') || 'http://localhost:5173/integrations?success=true'
    return Response.redirect(returnUrl, 303)

  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
