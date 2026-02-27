# ZT Compass — Beta Deployment

**URL:** https://ztcompass-demo-962044827135.europe-west1.run.app

**GCP Project:** clario-mvp
**Region:** europe-west1
**Service:** ztcompass-demo
**Image:** europe-west1-docker.pkg.dev/clario-mvp/clario-repo/ztcompass-demo:beta
**Deployed:** 2026-02-27

## Beta Changes
- Fixed QuickScan session bug (was creating new session instead of restoring existing)
- Added SQLite emails table + POST /api/sessions/{id}/email endpoint
- Added email capture CTA on Dashboard ("Get your full report")
- GET /api/sessions/{id} now returns questions (enables answer restore on refresh)
- Gemini roadmap: 30s timeout + 3x exponential backoff retry (1.5s, 3s, 6s)
- Error states: load errors in QuickScan and Dashboard show friendly messages
- Loading spinners on all async states
- localStorage session persistence (session_id stored on scan start)
- Playwright happy path tests: tests/test_happy_path.py
