# Deployment Guide

This guide covers how to deploy the Twin-ai web application and database to production environments.

## Database & Backend (Supabase)

The web application uses Supabase for cloud data storage, authentication, and background logic.

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Authentication Setup**:
    *   Enable Email/Password provider.
    *   Configure Redirect URLs for OAuth providers (e.g., `https://your-app.vercel.app`).
3.  **Push Schema & RLS**:
    Ensure you have the Supabase CLI installed and logged in.
    ```bash
    cd web
    npx supabase link --project-ref your-project-ref
    npx supabase db push
    ```
4.  **Deploy Edge Functions**:
    Deploy the synchronization and OAuth callback functions.
    ```bash
    npx supabase functions deploy google-oauth-callback
    npx supabase functions deploy sync-integrations
    ```
5.  **Seed Data**:
    Populate the cloud database with the initial question bank.
    ```bash
    cd web
    # Ensure .env has VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY
    pnpm run db:seed
    ```

6.  **Prisma Setup (Optional but Recommended)**:
    The project now includes Prisma for type-safe database access.
    ```bash
    cd web
    # Ensure DATABASE_URL is set in .env
    npx prisma db push
    ```

## Web Application (Vercel)

The web application is built with Vite and can be easily deployed to Vercel.

1.  **Connect Repository**: Connect your GitHub/GitLab repository to Vercel.
2.  **Configure Project**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `web`
    *   **Build Command**: `npm run build` (This automatically runs `prisma generate`)
    *   **Output Directory**: `dist`
3.  **Environment Variables**:
    Add the following environment variables in the Vercel dashboard:
    *   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
    *   `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
4.  **Security Configuration**:
    The project includes a `web/vercel.json` which configures:
    *   SPA routing (rewriting all requests to `/index.html`).
    *   Strict Content Security Policy (CSP).
    *   Strict-Transport-Security (HSTS).
    *   X-Content-Type-Options.
5.  **Deploy**: Vercel will automatically build and deploy the application.

## Mobile Application

Currently, the mobile application is designed for local development using React Native and SQLite. For production deployment, you would need to:
1.  Configure the build for iOS/Android (using Fastlane or similar).
2.  Optionally switch the `dbAdapter.js` to point to a production-ready synchronization layer if using the cloud backend.
