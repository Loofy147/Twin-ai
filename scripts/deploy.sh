#!/bin/bash
# Twin-AI - Deployment Script

set -e

echo "🚀 Starting deployment..."

# 1. Build web app
echo "📦 Building web application..."
cd web
pnpm install
pnpm build
cd ..

# 2. Deploy Supabase migrations
echo "🗄️ Deploying database migrations..."
cd web
npx supabase db push
cd ..

# 3. Deploy Edge Functions
echo "⚡ Deploying edge functions..."
npx supabase functions deploy google-oauth-callback
npx supabase functions deploy sync-integrations

echo "✅ Deployment complete!"
