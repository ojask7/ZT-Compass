# ZT Compass for SMEs — Product Requirements Document v1.0
**AlpenNova Ventures | Refined for AlpenNova Stack**
**Date:** February 2026 | **Status:** Approved — Demo Build Active
**Owner:** Group Product Manager | **Engineering Lead:** Coder Agent

---

## 1. Vision & Problem Statement

**Vision:** Turn "Zero Trust" from a vendor buzzword into an SME-executable security programme.

**Problem:** SMEs in CH, UK, EU face escalating cyber threats + regulatory obligations (NIS2, NCSC mandatory reporting) but lack tools to:
- Know where they stand (no posture visibility)
- Know what to do next (no actionable roadmap)
- Prove progress to boards and auditors (no evidence trail)

**ZT Compass:** Assess → Visualise → Act → Prove. Repeat.

---

## 2. Target Market

| Segment | Size | Geography | Budget Signal |
|---------|------|-----------|---------------|
| SME (25–100 staff) | Primary | CH, UK, EU | CHF 200–400/mo |
| Mid-market (100–500 staff) | Secondary | CH, UK, EU | CHF 500–1,500/mo |
| MSSP / vCISO | Partner channel | CH, UK, EU | CHF 799/mo per partner |

**TAM:** ~2.1M SMEs in CH+UK+EU under NIS2 or equivalent obligations.
**SOM (M12):** 50 Pro orgs → CHF 15,000 MRR

---

## 3. Personas

### Persona 1 — IT Manager "Marco" (SME, 25–150 staff)
- Owns M365/Google Workspace, endpoints, vendor access
- Pain: "I know we're not doing Zero Trust but I don't know where to start"
- Wants: A checklist with effort estimates he can show to his boss
- Success: Completed QuickScan, has a 30-day action list

### Persona 2 — Security Lead / vCISO "Sarah"
- Covers 5–10 SME clients, needs repeatable governance frameworks
- Pain: "Every client assessment is a custom spreadsheet. I can't scale."
- Wants: Maturity reports with evidence mapping, board-ready visuals
- Success: Runs assessments for all clients, exports PDF reports, tracks MoM progress

### Persona 3 — MSSP / Consulting Lead "Dirk"
- Runs a 20-person security consultancy, CH/EU market
- Pain: "We need a product to anchor our ZT advisory offering"
- Wants: Multi-tenant, portfolio analytics, white-label-ready
- Success: 10 client orgs onboarded, monthly posture reports

---

## 4. Regulatory Grounding

| Framework | Region | Relevance |
|-----------|--------|-----------|
| CISA Zero Trust Maturity Model v2.0 | Global | 5 pillars + 4 maturity levels |
| Switzerland NCSC Mandatory Reporting | 🇨🇭 CH | 24h cyber incident reporting from 1 Apr 2025 |
| UK Cyber Security Breaches Survey 2025 | 🇬🇧 UK | SME benchmarks, gap identification |
| ENISA NIS2 Technical Implementation Guidance (June 2025) | 🇪🇺 EU | 10 key risk management obligations |
| EU Commission Implementing Regulation 2024/2690 | 🇪🇺 EU | Specific technical measures for NIS2 entities |

**CISA ZTMM v2.0 — 5 Pillars × 4 Maturity Levels:**
- Pillars: Identity · Devices · Network · Applications · Data
- Maturity: Traditional (0–25) → Initial (26–50) → Advanced (51–80) → Optimal (81–100)

---

## 5. Tech Stack (AlpenNova Standard)

```
Backend:     FastAPI (Python 3.11)
Frontend:    React 18 + Tailwind CSS (Vite) — or Streamlit for speed
Database:    SQLite (demo) → PostgreSQL / Cloud SQL (production)
LLM:         Google Gemini (google-generativeai)
             Model: gemini-2.0-flash
             Key:   REDACTED_GEMINI_KEY
Container:   Single Docker container (React static served via FastAPI)
```

### GCP Deployment

```
Project:     clario-mvp
Region:      europe-west1  ← CH-adjacent (Swiss data residency note)
Service:     ztcompass-demo
Registry:    europe-west1-docker.pkg.dev/clario-mvp/clario-repo/
Auth:        raghu@alpennova.ch

Build:
  gcloud builds submit \
    --project clario-mvp \
    --region europe-west1 \
    --tag europe-west1-docker.pkg.dev/clario-mvp/clario-repo/ztcompass-demo:latest \
    /path/to/ZT-Compass/

Deploy:
  gcloud run deploy ztcompass-demo \
    --image europe-west1-docker.pkg.dev/clario-mvp/clario-repo/ztcompass-demo:latest \
    --region europe-west1 --project clario-mvp \
    --platform managed --allow-unauthenticated \
    --port 8080 --memory 1Gi --cpu 1
```

> ⚠️ **CISO Mandate:** No `allUsers` on admin surfaces. Public demo OK; all admin APIs require auth.
> 🇨🇭 **Swiss Data Residency:** europe-west1 acceptable for demo. Migrate to europe-west6 (Zurich) in V1 for CH customers.

### RBAC Model

| Role | Permissions |
|------|-------------|
| Org Admin | Full access, manage users, export evidence |
| Contributor | Run assessments, create roadmap tasks |
| Read-only | View dashboard and roadmap |
| Partner | Multi-tenant view across assigned orgs |

---

## 6. MVP Modules

### MVP-1: Assessment Engine — Flow: Feature 🟢 | P0

**QuickScan** (<15 min)
- 10 questions × 5 pillars (2 per pillar)
- Answer: Yes / No / Partial / Unknown + optional evidence note
- Confidence scoring: Attested (self-declared) vs Evidenced (documented)
- Scoring: Yes=100, Partial=50, No=0, Unknown=10

**FullScan** (<45 min, V1)
- 50 questions × 5 pillars
- Evidence attachment prompts

### MVP-2: Maturity Dashboard — Flow: Feature 🟢 | P0

- 5 pillar tiles: score (0–100) + maturity level + color
  - Traditional=red, Initial=amber, Advanced=teal, Optimal=green
- Radar/spider chart for overall posture
- Top 5 Risks (No/Unknown answers, weighted by pillar)
- Top 5 Quick Wins (Partial answers close to Yes, low effort)
- Region overlay banner
- "Generate My Roadmap" CTA

### MVP-3: Roadmap Generator — Flow: Feature 🟢 | P0

- Input: Assessment answers + region + org size → Gemini prompt
- Output: Structured 30/60/90-day roadmap (JSON)
  - 30-day: 5 tasks (quick wins)
  - 60-day: 4 tasks (foundational)
  - 90-day: 3 tasks (structural)
- Each task: title, description, owner role, effort (S/M/L), DoD, evidence examples
- Display: Timeline + expandable cards
- Export: PDF (Sprint 5)

**Gemini Prompt Template:**
```
You are a Zero Trust security advisor for SMEs.
Region: {region} | Org size: {org_size}
Assessment answers: {answers_json}
Pillar scores: {scores_json}

Generate a 30/60/90-day Zero Trust roadmap as JSON:
[{ "phase": "30-day", "tasks": [{ "title", "description", "owner_role", "effort", "dod", "evidence_examples" }] }]

Focus on practical SME steps. Prioritise Identity and Device hygiene first.
```

### MVP-4: SME Playbooks — Flow: Feature 🟢 | P1

10 playbooks for MVP-done. Each: 5–7 steps, owner role, evidence, DoD, effort estimate.

1. Identity: MFA Rollout Path
2. Identity: Conditional Access Starter Pack
3. Identity: Privileged Access Review
4. Devices: MDM Adoption Steps (Intune/Jamf)
5. Devices: EDR Coverage & Response Runbook
6. Network: VPN → ZTNA Migration Path
7. Applications: Crown Jewels Inventory & App Review
8. Data: Classification Framework for SMEs
9. Data: Backup & Recovery Verification
10. Incident Readiness: Triage + Comms Templates

### MVP-5: Region Overlays — Flow: Feature 🟢 | P1

**🇨🇭 CH:** NCSC 24h mandatory reporting, critical infrastructure sectors, reporting portal steps
**🇬🇧 UK:** Cyber Breaches Survey 2025 benchmarks, common SME gaps, Cyber Essentials mapping
**🇪🇺 EU:** NIS2 10 key measures, ENISA technical guidance → ZT pillar mapping, NIS2 entity decision tree

> ⚠️ All overlays carry: "This is guidance only, not legal or compliance advice."

---

## 7. Demo Day Scope (24h build — 28 Feb 2026)

| Screen | Feature | Scope |
|--------|---------|-------|
| Landing | Hero + region selector + QuickScan CTA | ✅ Demo |
| QuickScan | 10 questions (2×5 pillars), Yes/No/Partial/Unknown | ✅ Demo |
| Dashboard | 5 pillar tiles, top 5 risks/wins, region banner | ✅ Demo |
| Roadmap | Gemini 30/60/90-day plan, expandable cards | ✅ Demo |
| Playbooks | 5 pre-loaded (Identity×2, Devices×2, Incident) | ✅ Demo |
| Region Page | CH/UK/EU overlay content | ✅ Demo |
| PDF Export | Print-to-PDF of dashboard + roadmap | ✅ Demo |
| FullScan | 50 questions | ❌ V1 |
| Evidence locker | File upload + storage | ❌ V1 |
| M365 connectors | Automated evidence collection | ❌ V1 |
| Partner workspace | Multi-tenant | ❌ V1 |
| User auth | Login/saved assessments | ❌ V1 |

---

## 8. Business Model

| Tier | Features | CH | UK | EU |
|------|----------|----|----|-----|
| **Free** | QuickScan only + basic dashboard | CHF 0 | £0 | €0 |
| **Pro** | Full assessment + roadmap + all playbooks + PDF | CHF 299/mo | £249/mo | €279/mo |
| **Partner** | Multi-tenant + portfolio analytics + white-label | CHF 799/mo | £649/mo | €749/mo |

### M12 Financial Targets

| Metric | Target |
|--------|--------|
| MRR | CHF 15,000 |
| Pro orgs | 50 |
| Partner orgs | 5 |
| QuickScan leads/mo | 200 |
| Free → Pro conversion | 8% |
| CAC (organic + content) | CHF 200 |
| LTV (Pro, 24-month) | CHF 7,176 |
| Gross margin | ~82% |

---

## 9. Success Metrics

### MVP Done When:
- [ ] QuickScan <15 min → maturity map + top risks + top wins + ≥12 roadmap tasks
- [ ] ≥10 playbooks with steps/owners/evidence/DoD
- [ ] Region overlays trigger correctly (CH/UK/EU)
- [ ] Gemini roadmap <10s
- [ ] PDF export functional
- [ ] Live on Cloud Run with public URL

### Product KPIs
| KPI | Target |
|-----|--------|
| QuickScan completion rate | >75% |
| Roadmap generation rate | >60% |
| Free → Pro conversion | >8% |
| NPS (Pro users) | >50 |
| PDF export rate | >30% |

---

## 10. Sprint Plan

| Sprint | Items | Flow |
|--------|-------|------|
| Demo Day (24h) | QuickScan + Dashboard + Gemini Roadmap + 5 Playbooks + Region overlays | Feature 🟢 |
| Sprint 1–2 | Assessment schema + scoring + dashboard skeleton | Feature 🟢 |
| Sprint 3–4 | Roadmap generator + 10 core playbooks + templates | Feature 🟢 |
| Sprint 5 | Region overlays + PDF export v0 + onboarding | Feature 🟢 |
| Sprint 6 | Hardening + analytics + RBAC + polish | Debt 🔵 + Risk 🟡 |

---

## 11. Non-Functional Requirements

| Requirement | Spec |
|-------------|------|
| Tenant isolation | Separate SQLite DB (demo) → schema-per-tenant Postgres (prod) |
| Encryption | TLS in transit (Cloud Run); encrypted at rest in prod |
| GDPR compliance | Consent gate before data persistence; deletion on request; no PII in answers |
| CISO mandate | No `allUsers` on admin APIs; management surfaces require auth |
| Data residency (demo) | europe-west1 (Belgium) — acceptable |
| Data residency (prod) | europe-west6 (Zurich) for CH customers |
| Performance | Gemini <10s; dashboard load <2s |
| Mobile | Responsive via Tailwind breakpoints |

---

## 12. Out of Scope

- SIEM/SOAR replacement
- Automated remediation or policy enforcement
- Legal compliance engine (all overlays: "guidance only, not legal advice")
- Real-time threat intelligence
- Custom assessment schema builder (V2)

---

## Appendix A — QuickScan Question Schema (JSON)

```json
{
  "pillars": [
    { "id": "identity", "name": "Identity", "questions": [
      { "id": "id_q1", "text": "Is MFA enabled for all users accessing business applications?", "weight": 1.5 },
      { "id": "id_q2", "text": "Do you have conditional access policies restricting access by device health or location?", "weight": 1.2 }
    ]},
    { "id": "devices", "name": "Devices", "questions": [
      { "id": "dev_q1", "text": "Are all employee devices enrolled in an MDM solution (e.g. Intune, Jamf)?", "weight": 1.3 },
      { "id": "dev_q2", "text": "Is EDR software deployed on all endpoints?", "weight": 1.4 }
    ]},
    { "id": "network", "name": "Network", "questions": [
      { "id": "net_q1", "text": "Is your network segmented to limit lateral movement between departments/systems?", "weight": 1.2 },
      { "id": "net_q2", "text": "Do remote workers connect via VPN or ZTNA?", "weight": 1.1 }
    ]},
    { "id": "applications", "name": "Applications", "questions": [
      { "id": "app_q1", "text": "Are critical business applications using modern authentication (OAuth2/SAML)?", "weight": 1.3 },
      { "id": "app_q2", "text": "Have you reviewed and restricted privileged access in the last 90 days?", "weight": 1.4 }
    ]},
    { "id": "data", "name": "Data", "questions": [
      { "id": "dat_q1", "text": "Do you have a data classification policy that employees are aware of?", "weight": 1.1 },
      { "id": "dat_q2", "text": "Have you tested your backup restore process in the last 6 months?", "weight": 1.5 }
    ]}
  ]
}
```

---
*Document maintained by AlpenNova Ventures Group Product Manager.*
*Last updated: 27 Feb 2026 | Next review: After Demo Day (28 Feb 2026)*
