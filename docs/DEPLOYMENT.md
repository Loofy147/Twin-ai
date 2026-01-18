# Deployment Guide

This guide covers how to deploy the Twin-ai web application and database to production environments.

## Database (Supabase)

The web application uses Supabase for cloud data storage.

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Push Schema**:
    Ensure you have the Supabase CLI installed and logged in.
    ```bash
    cd web
    npx supabase link --project-ref your-project-ref
    npm run db:migrate
    ```
3.  **Seed Data**:
    Populate the cloud database with the initial question bank.
    ```bash
    cd web
    # Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
    npm run db:seed
    ```

## Web Application (Vercel)

The web application is built with Vite and can be easily deployed to Vercel.

1.  **Connect Repository**: Connect your GitHub/GitLab repository to Vercel.
2.  **Configure Project**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `web`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3.  **Environment Variables**:
    Add the following environment variables in the Vercel dashboard:
    *   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
4.  **Deploy**: Vercel will automatically build and deploy the application.

## Mobile Application

Currently, the mobile application is designed for local development using React Native and SQLite. For production deployment, you would need to:
1.  Configure the build for iOS/Android (using Fastlane or similar).
2.  Optionally switch the `dbAdapter.js` to point to a production-ready synchronization layer if using the cloud backend.
