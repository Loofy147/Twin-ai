# 🔌 API Reference

## 🔐 Authentication

### Sign Up
`authService.signUp(data: SignUpData)`
- **Input:** Email, Password, Metadata
- **Output:** `AuthUser` object
- **Features:** Rate limiting, Password validation, Profile creation

### Sign In
`authService.signIn(email, password, csrfToken?)`
- **Input:** Credentials and optional CSRF token
- **Output:** `AuthUser` object
- **Features:** Rate limiting, Brute force protection

---

## 📊 Database Service

### Get Questions
`databaseService.getQuestions(options)`
- **Options:** limit, offset, difficulty, dimensionId, excludeAnswered
- **Returns:** `{ data: Question[], count: number }`
- **Optimization:** Server-side RPC for unanswered filtering

### Submit Response
`databaseService.submitResponse(response)`
- **Input:** `Response` object
- **Features:** Atomic profile stat updates, Cache invalidation

### Get Analytics
`databaseService.getAnalytics(profileId, days)`
- **Returns:** Aggregated metrics and daily activity
- **Optimization:** Single database roundtrip via RPC

---

## 📱 Mobile DB Adapter

### Prepare Statement
`db.prepare(sql)`
- **Returns:** Statement object with `run()`, `get()`, `all()`
- **Features:** Automatic retry logic, Performance logging

### Transaction
`db.transaction(fn)`
- **Features:** Safe atomic operations with retry support
