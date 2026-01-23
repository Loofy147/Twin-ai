# 🐛 Troubleshooting Guide

This guide covers common issues and their solutions for the Twin-AI system.

## 🌐 Web Application

### 1. Database Connection Errors
**Symptoms:** "Failed to fetch", "Circuit breaker is open", or 500 errors in console.
**Solutions:**
- Verify your Supabase credentials in `web/.env`.
- Check your internet connection.
- View database health: `console.log(await databaseService.healthCheck())`.
- Check if the circuit breaker is open: `databaseService.getStats().circuit`.

### 2. Session Timeout Issues
**Symptoms:** Automatically logged out frequently.
**Solutions:**
- Increase session timeout in `web/.env`: `VITE_SESSION_TIMEOUT=60` (minutes).
- Check your browser's session storage settings.

### 3. CSRF Token Errors
**Symptoms:** "Invalid CSRF token" during login or form submission.
**Solutions:**
- Refresh the page to generate a new token.
- Ensure your browser allows session storage.

---

## 📱 Mobile Application

### 1. Database Not Initializing
**Symptoms:** "Database not open" errors.
**Solutions:**
- Ensure `better-sqlite3` is installed correctly for your environment.
- On mobile, ensure `react-native-sqlite-storage` is linked.
- Run `node ../shared/generateInitialBank.js` to create the initial database.

### 2. Slow Queries
**Symptoms:** Lag when answering questions or viewing analytics.
**Solutions:**
- Run `dbAdapter.optimizeDatabase()` to vacuum and analyze.
- Check the query logs: `dbAdapter.getStats()`.

---

## 🧠 RL System

### 1. Training is Slow
**Symptoms:** Training takes a long time to complete.
**Solutions:**
- Ensure you're using the enhanced `digital_twin_rl.py` which removes `deepcopy` bottlenecks.
- Reduce `total_timesteps` during development.

---

## 📞 Still need help?
- Check the [Architecture Guide](./ARCHITECTURE.md)
- Join our Discord server
- Email support@twin-ai.app
