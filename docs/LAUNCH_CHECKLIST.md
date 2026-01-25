# Twin-AI Launch Checklist

This checklist defines the critical steps required to move from the current **Infrastructure Ready** state to **Public Beta** and **Production**.

## 🔴 Phase 1: Security & Foundation (COMPLETE)
- [x] Supabase Auth integration.
- [x] Row Level Security (RLS) policies for all tables.
- [x] Multi-tenant data isolation.
- [x] production-ready `DatabaseService` with circuit breakers and retries.
- [x] Global error boundaries in React.
- [x] Cascading data purge logic for account deletion.

## 🟡 Phase 2: Beta Preparation (Next 2-4 Weeks)

### 1. Infrastructure Setup
- [ ] **Supabase Production Project**: Create a new project for production traffic.
- [ ] **Custom Domain**: Configure SSL and custom domain for the web app.
- [ ] **Google OAuth Verification**: Submit the app for Google verification to remove the "unverified app" warning.
- [ ] **Environment Variable Audit**: Ensure all production keys are rotated and stored in Vercel/Supabase secrets.

### 2. Monitoring & Observability
- [ ] **Error Tracking**: Integrate Sentry for frontend and backend edge functions.
- [ ] **Analytics**: Implement PostHog or similar for privacy-preserving usage analytics.
- [ ] **Uptime Monitoring**: Set up health checks for the database and web app.
- [x] **Audit Logs**: Finalize the audit logging trigger for sensitive security events.

### 3. Data Integrity & Migration
- [ ] **Database Backups**: Enable point-in-time recovery on Supabase.
- [x] **Migration Versioning**: Move from single migration file to versioned migration scripts.
- [ ] **Rate Limiting**: Fine-tune rate limiting thresholds based on initial traffic.

## 🟢 Phase 3: Public Launch (3+ Months)

### 1. Feature Completion
- [ ] **Mobile Parity**: Ensure the React Native app supports the new Supabase-based profile sync.
- [ ] **RL Refinement**: Scale the RL training to use federated learning or off-policy training with user logs.
- [ ] **Advanced Patterns**: Implement cross-dimensional pattern detection (e.g., how work habits affect relationships).

### 2. Compliance & Legal
- [ ] **Privacy Policy**: Finalize the legal language regarding metadata-only analysis.
- [ ] **Terms of Service**: Establish user agreements for the digital twin agent.
- [ ] **GDPR/CCPA Audit**: Conduct a full privacy impact assessment.

## 🚀 Pre-Deployment Check (Final Step)
1. [ ] Run `npx vitest run tests/isolation.test.ts` on staging.
2. [ ] Verify "Delete Account" works on 3 test accounts with varying data volumes.
3. [ ] Confirm Google Calendar sync works with a "real" (non-test) Google account.
4. [x] Check all icons have ARIA labels.
5. [ ] Verify zero API keys are committed to the repository.
