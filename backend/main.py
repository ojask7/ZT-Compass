import os
import json
import uuid
import time
import sqlite3
from contextlib import contextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI(title="ZT Compass API")

DB_PATH = "/tmp/ztcompass.db"
GEMINI_KEY = os.environ["GEMINI_API_KEY"]
genai.configure(api_key=GEMINI_KEY)

def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            region TEXT,
            answers TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.commit(); con.close()

@contextmanager
def get_db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()

init_db()

class SessionCreate(BaseModel):
    region: str

class AnswerSubmit(BaseModel):
    session_id: str
    answers: dict

class EmailCapture(BaseModel):
    email: str

QUESTIONS = [
    {"id": "id_mfa",    "pillar": "Identity",      "text": "Is MFA enforced for all users (including admins)?",                         "hint": "Consider employees, contractors, admins, and service accounts."},
    {"id": "id_cond",   "pillar": "Identity",      "text": "Do you have conditional access policies restricting sign-in by device compliance or location?", "hint": "E.g. Entra ID CA, Okta policies, or equivalent."},
    {"id": "dev_mdm",   "pillar": "Devices",       "text": "Are all corporate endpoints enrolled in an MDM solution?",                  "hint": "Intune, Jamf, VMware Workspace ONE, etc."},
    {"id": "dev_edr",   "pillar": "Devices",       "text": "Is EDR (Endpoint Detection & Response) deployed on all endpoints?",         "hint": "CrowdStrike, Defender for Endpoint, SentinelOne, etc."},
    {"id": "net_seg",   "pillar": "Network",       "text": "Is your network segmented to limit lateral movement?",                      "hint": "Micro-segmentation or VLAN isolation. Flat networks are high risk."},
    {"id": "net_vpn",   "pillar": "Network",       "text": "Is remote access provided via ZTNA or a managed VPN with MFA?",            "hint": "ZTNA (Zscaler, Cloudflare Access) preferred over traditional VPN."},
    {"id": "app_auth",  "pillar": "Applications",  "text": "Are your crown-jewel applications using modern authentication (OAuth2/SAML/OIDC)?", "hint": "Legacy NTLM/Kerberos-only apps are a significant risk."},
    {"id": "app_pam",   "pillar": "Applications",  "text": "Is privileged access reviewed quarterly or more frequently?",               "hint": "Just-in-time access and PAM tools reduce exposure."},
    {"id": "dat_class", "pillar": "Data",          "text": "Has sensitive data been classified and labelled across your environment?",  "hint": "Microsoft Purview, Varonis, or manual classification frameworks."},
    {"id": "dat_bkp",   "pillar": "Data",          "text": "Has a backup restore been successfully tested in the last 6 months?",       "hint": "An untested backup is not a backup."},
]

SCORE_MAP = {"yes": 100, "partial": 50, "no": 0, "unknown": 10}

def compute_scores(answers: dict):
    pillars = {}
    for q in QUESTIONS:
        p = q["pillar"]
        a = answers.get(q["id"], {})
        raw = a.get("answer", "unknown").lower()
        score = SCORE_MAP.get(raw, 10)
        if p not in pillars:
            pillars[p] = []
        pillars[p].append(score)
    result = {}
    for p, scores in pillars.items():
        avg = sum(scores) / len(scores)
        if avg >= 80:
            level = "Optimal"
        elif avg >= 55:
            level = "Advanced"
        elif avg >= 30:
            level = "Initial"
        else:
            level = "Traditional"
        result[p] = {"score": round(avg), "level": level}
    return result

REGION_BANNERS = {
    "CH": "🇨🇭 CH: Mandatory 24h incident reporting to NCSC applies if you operate critical infrastructure. ISG/KISG compliance required.",
    "UK": "🇬🇧 UK: Cyber Breaches Survey 2025 — 43% of UK businesses suffered a breach last year. NCSC CAF alignment recommended.",
    "EU": "🇪🇺 EU: NIS2 Directive requires risk management measures, incident reporting within 24h, and board accountability.",
}

RISK_TEMPLATES = {
    "Identity":     ("No MFA = highest ransomware entry vector. Credential-based attacks account for 80% of breaches.", "Enable MFA for all accounts in 48h — free with Entra ID / Google Workspace."),
    "Devices":      ("Unmanaged endpoints cannot be trusted. BYOD without MDM is a blind spot.", "Enrol all company-issued devices in MDM this sprint. Start with priority assets."),
    "Network":      ("Flat networks allow lateral movement — one breach = full compromise.", "Implement VLAN segregation for crown-jewel systems as a quick win."),
    "Applications": ("Legacy auth apps bypass modern identity controls entirely.", "Onboard top-5 apps to SSO/SAML — removes password sprawl and gives visibility."),
    "Data":         ("Unclassified data = unprotected data. You can't protect what you can't see.", "Run a data discovery scan and label top-3 sensitive data stores this week."),
}

def generate_risks_and_wins(pillar_scores: dict):
    ordered = sorted(pillar_scores.items(), key=lambda x: x[1]["score"])
    risks = [{"pillar": p, "score": sc["score"], "risk": RISK_TEMPLATES.get(p, ("Risk", "Win"))[0]} for p, sc in ordered[:5]]
    wins  = [{"pillar": p, "win":  RISK_TEMPLATES.get(p, ("Risk", "Win"))[1]} for p, sc in ordered]
    return risks[:5], wins[:5]

def _gemini_generate_with_retry(prompt: str, max_retries: int = 3, timeout: int = 30) -> str:
    """Generate content with retry and exponential backoff."""
    model = genai.GenerativeModel("gemini-2.0-flash")
    last_error = None
    for attempt in range(max_retries):
        try:
            import threading
            result = [None]
            error = [None]
            def _call():
                try:
                    result[0] = model.generate_content(prompt)
                except Exception as e:
                    error[0] = e
            t = threading.Thread(target=_call)
            t.start()
            t.join(timeout=timeout)
            if t.is_alive():
                raise TimeoutError(f"Gemini call timed out after {timeout}s")
            if error[0]:
                raise error[0]
            return result[0].text.strip()
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                wait = (2 ** attempt) * 1.5
                time.sleep(wait)
    raise last_error

@app.post("/api/sessions")
def create_session(body: SessionCreate):
    sid = str(uuid.uuid4())
    with get_db() as db:
        db.execute("INSERT INTO sessions (id, region, answers) VALUES (?,?,?)", (sid, body.region, "{}"))
    return {"session_id": sid, "questions": QUESTIONS}

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    return {
        "session_id": row["id"],
        "region": row["region"],
        "answers": json.loads(row["answers"]),
        "questions": QUESTIONS,
    }

@app.post("/api/sessions/{session_id}/answers")
def submit_answers(session_id: str, body: AnswerSubmit):
    with get_db() as db:
        row = db.execute("SELECT id FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Session not found")
        db.execute("UPDATE sessions SET answers=? WHERE id=?", (json.dumps(body.answers), session_id))
    return {"ok": True}

@app.get("/api/sessions/{session_id}/dashboard")
def get_dashboard(session_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    answers = json.loads(row["answers"])
    region = row["region"]
    pillar_scores = compute_scores(answers)
    risks, wins = generate_risks_and_wins(pillar_scores)
    overall = round(sum(p["score"] for p in pillar_scores.values()) / len(pillar_scores))
    return {
        "session_id": session_id,
        "region": region,
        "overall_score": overall,
        "pillar_scores": pillar_scores,
        "top_risks": risks,
        "quick_wins": wins,
        "region_banner": REGION_BANNERS.get(region, ""),
    }

@app.post("/api/sessions/{session_id}/roadmap")
def generate_roadmap(session_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    answers = json.loads(row["answers"])
    region = row["region"]
    pillar_scores = compute_scores(answers)

    summary_lines = []
    for q in QUESTIONS:
        a = answers.get(q["id"], {})
        ans = a.get("answer", "unknown")
        note = a.get("note", "")
        summary_lines.append(f"- {q['pillar']} / {q['text']}: {ans}" + (f" (note: {note})" if note else ""))

    prompt = f"""You are a Zero Trust security advisor. Generate a prioritised roadmap for an organisation in region {region}.

Assessment answers:
{chr(10).join(summary_lines)}

Pillar scores: {json.dumps(pillar_scores)}

Return ONLY a JSON object with this EXACT structure (no markdown, no code fences, pure JSON):
{{
  "30_day": [
    {{"title": "...", "description": "...", "owner": "CISO / IT Manager / etc", "effort": "S", "definition_of_done": "..."}}
  ],
  "60_day": [...],
  "90_day": [...]
}}

30-day: 5 tasks (highest priority, quick wins)
60-day: 4 tasks (medium-term improvements)
90-day: 3 tasks (strategic / architectural changes)

Be specific, actionable, and tailored to the {region} regulatory context."""

    try:
        text = _gemini_generate_with_retry(prompt, max_retries=3, timeout=30)
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
        roadmap = json.loads(text.strip())
    except Exception as e:
        reg_task = {"CH": "ISG/KISG compliance review", "UK": "NCSC CAF assessment", "EU": "NIS2 Article 21 gap analysis"}.get(region, "Regulatory compliance review")
        roadmap = {
            "30_day": [
                {"title": "Enable MFA for all users", "description": "Roll out MFA to 100% of accounts, starting with admins and privileged users.", "owner": "IT Manager", "effort": "S", "definition_of_done": "Zero accounts without MFA enforced. Legacy auth blocked."},
                {"title": "Enrol endpoints in MDM", "description": "Inventory all endpoints and enrol in Intune/Jamf. Set compliance baseline.", "owner": "IT Manager", "effort": "M", "definition_of_done": "100% corporate endpoints enrolled and compliant."},
                {"title": "Deploy EDR on all endpoints", "description": "Install EDR agent (Defender/CrowdStrike/SentinelOne) and verify telemetry.", "owner": "Security Team", "effort": "M", "definition_of_done": "EDR coverage >95% with active monitoring."},
                {"title": "Conditional access baseline policy", "description": "Block sign-in from non-compliant devices. Require MFA for all cloud apps.", "owner": "CISO", "effort": "S", "definition_of_done": "CA policy active in enforce mode. Compliant devices only."},
                {"title": "Data classification discovery scan", "description": "Run automated scan to identify sensitive data stores and apply labels.", "owner": "Data Owner", "effort": "S", "definition_of_done": "Sensitive data catalogue created and published."},
            ],
            "60_day": [
                {"title": "Network micro-segmentation", "description": "Segment crown-jewel systems into isolated VLANs. Block lateral movement paths.", "owner": "Network Engineer", "effort": "L", "definition_of_done": "Crown-jewel systems unreachable from general network segment."},
                {"title": "SSO for top-5 applications", "description": "Onboard priority apps to SAML/OIDC via your IdP. Remove local passwords.", "owner": "IT Manager", "effort": "M", "definition_of_done": "5 apps federated. No local authentication paths."},
                {"title": "Privileged access review", "description": "Audit and right-size all admin accounts. Enable JIT access where possible.", "owner": "CISO", "effort": "M", "definition_of_done": "Admin count reduced by >50%. JIT access enabled."},
                {"title": "Backup restore test", "description": "Perform a full restore test from offline backups. Document RTO/RPO results.", "owner": "IT Manager", "effort": "S", "definition_of_done": "Restore completed and documented. RTO within target."},
            ],
            "90_day": [
                {"title": "ZTNA deployment", "description": "Replace VPN with ZTNA solution (Cloudflare Access / Zscaler). Decommission VPN.", "owner": "Network Engineer", "effort": "L", "definition_of_done": "VPN decommissioned. All remote access via ZTNA with device posture."},
                {"title": reg_task, "description": "Assess readiness against regional requirements and produce a gap report.", "owner": "CISO", "effort": "M", "definition_of_done": "Gap report produced. Remediation plan approved by board."},
                {"title": "Security awareness training programme", "description": "Deploy phishing simulation and mandatory annual training for all staff.", "owner": "HR / Security", "effort": "M", "definition_of_done": ">90% staff trained. Phishing click rate <5%."},
            ],
        }
    return {"roadmap": roadmap, "region": region}

@app.post("/api/sessions/{session_id}/email")
def capture_email(session_id: str, body: EmailCapture):
    with get_db() as db:
        row = db.execute("SELECT id FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Session not found")
        db.execute("INSERT INTO emails (session_id, email) VALUES (?,?)", (session_id, body.email))
    return {"ok": True, "message": "Thank you! Your full report will be sent shortly."}

PLAYBOOKS = [
    {
        "id": "pb_mfa", "title": "Identity: MFA Rollout Path", "pillar": "Identity", "icon": "🔐",
        "steps": [
            {"step": 1, "title": "Inventory all accounts", "description": "Export full user list including service accounts, shared mailboxes, break-glass accounts.", "owner": "IT Manager", "evidence": "User export CSV with account types tagged"},
            {"step": 2, "title": "Enable MFA for admins first", "description": "Force MFA on all Global Admin, Security Admin, and privileged roles immediately.", "owner": "CISO", "evidence": "Sign-in logs showing MFA required for admin logins"},
            {"step": 3, "title": "Roll out in waves", "description": "Wave 1: IT. Wave 2: Finance/HR. Wave 3: All remaining users. 2-week waves.", "owner": "IT Manager", "evidence": "MFA registration report >90% per wave"},
            {"step": 4, "title": "Block legacy authentication", "description": "Create CA policy to block all legacy auth protocols (IMAP, POP, SMTP Auth, basic auth).", "owner": "CISO", "evidence": "Legacy auth sign-in count = 0"},
            {"step": 5, "title": "Exception process", "description": "Document exceptions (e.g. service accounts) with compensating controls and review schedule.", "owner": "CISO", "evidence": "Exception register maintained and reviewed quarterly"},
            {"step": 6, "title": "Monitor and report", "description": "Weekly MFA adoption dashboard. Escalate users not registered after reminder cycle.", "owner": "IT Manager", "evidence": "MFA coverage >99% maintained continuously"},
        ],
        "definition_of_done": "100% of interactive user accounts have MFA enforced. Legacy authentication blocked. Exception register maintained."
    },
    {
        "id": "pb_ca", "title": "Identity: Conditional Access Starter", "pillar": "Identity", "icon": "🛡️",
        "steps": [
            {"step": 1, "title": "Baseline: Require MFA for all users", "description": "Create CA policy requiring MFA for all cloud app sign-ins. Exclude break-glass accounts.", "owner": "CISO", "evidence": "Policy in report-only for 2 weeks, then enforced"},
            {"step": 2, "title": "Block risky locations", "description": "Create named locations for trusted offices/countries. Block or step-up others.", "owner": "CISO", "evidence": "Named locations configured. Risky sign-ins alerted"},
            {"step": 3, "title": "Require compliant device", "description": "For sensitive apps, require device compliance (MDM-enrolled and healthy).", "owner": "IT Manager", "evidence": "Compliant device CA policy active for crown-jewel apps"},
            {"step": 4, "title": "Block high-risk sign-ins", "description": "Integrate Identity Protection. Auto-block or force password reset on high-risk sign-ins.", "owner": "CISO", "evidence": "Risk-based CA active. Alerts flowing to SIEM"},
            {"step": 5, "title": "Quarterly review", "description": "Review sign-in logs, identify gaps, adjust policies. Document rationale for each policy.", "owner": "CISO", "evidence": "Quarterly review log with policy change history"},
        ],
        "definition_of_done": "5 baseline CA policies active and enforced. No interactive sign-in without MFA. Risk-based policies active."
    },
    {
        "id": "pb_mdm", "title": "Devices: MDM Adoption Steps", "pillar": "Devices", "icon": "💻",
        "steps": [
            {"step": 1, "title": "Inventory all endpoints", "description": "Create authoritative asset register: all laptops, desktops, mobiles, tablets.", "owner": "IT Manager", "evidence": "Asset register with device types, OS versions, ownership"},
            {"step": 2, "title": "Deploy MDM agent", "description": "Push Intune/Jamf enrolment to all managed devices via email + IT-assisted sessions.", "owner": "IT Manager", "evidence": "MDM enrolment report >90%"},
            {"step": 3, "title": "Configure compliance policies", "description": "Define compliant device: OS version, encryption, screen lock, EDR installed.", "owner": "CISO", "evidence": "Compliance policies published. Non-compliant devices flagged"},
            {"step": 4, "title": "Block non-compliant access", "description": "Enforce CA policy: corporate resources require compliant device. Communicate deadline.", "owner": "CISO", "evidence": "Non-compliant devices blocked from email/SharePoint"},
            {"step": 5, "title": "BYOD policy", "description": "Define BYOD policy. MAM (app management) rather than full MDM for personal devices.", "owner": "HR / CISO", "evidence": "BYOD policy signed off. MAM profiles deployed"},
            {"step": 6, "title": "Automated new device onboarding", "description": "Autopilot/DEP enrolment for all new devices — zero-touch provisioning.", "owner": "IT Manager", "evidence": "New devices automatically enrolled within 30 mins of unboxing"},
        ],
        "definition_of_done": "100% corporate endpoints MDM-enrolled and compliant. BYOD covered by MAM. New device onboarding automated."
    },
    {
        "id": "pb_edr", "title": "Devices: EDR Coverage Checklist", "pillar": "Devices", "icon": "🔍",
        "steps": [
            {"step": 1, "title": "Select and procure EDR solution", "description": "Evaluate Defender for Endpoint (M365 E5), CrowdStrike, SentinelOne. Procure licenses.", "owner": "CISO", "evidence": "EDR vendor selected. Licensing procured"},
            {"step": 2, "title": "Pilot on IT team", "description": "Run 2-week pilot on IT team devices. Validate telemetry, alerts, performance impact.", "owner": "IT Manager", "evidence": "Pilot sign-off document. Telemetry confirmed in console"},
            {"step": 3, "title": "Roll out to all endpoints", "description": "Deploy EDR agent via MDM software push. Target: 100% coverage in 2 weeks.", "owner": "IT Manager", "evidence": "EDR console shows >95% endpoint coverage"},
            {"step": 4, "title": "Enable prevention mode", "description": "Switch from detection-only to prevention mode after 2-week tuning period.", "owner": "CISO", "evidence": "Prevention mode active. False positive rate <2%"},
            {"step": 5, "title": "Connect to SIEM / SOC", "description": "Forward EDR alerts to SIEM or managed SOC. Define escalation path.", "owner": "Security Team", "evidence": "Alerts flowing to SIEM. Escalation runbook documented"},
            {"step": 6, "title": "Monthly coverage review", "description": "Review EDR coverage report monthly. Investigate and remediate any gaps.", "owner": "IT Manager", "evidence": "Monthly coverage reports with <2% gap tolerance"},
        ],
        "definition_of_done": ">95% endpoint EDR coverage. Prevention mode enabled. Alerts in SIEM/SOC. Monthly reviews documented."
    },
    {
        "id": "pb_ir", "title": "Incident Readiness: Triage + Comms", "pillar": "Data", "icon": "🚨",
        "steps": [
            {"step": 1, "title": "Define severity levels", "description": "P1 (active breach), P2 (suspected breach/data exposure), P3 (policy violation/near miss).", "owner": "CISO", "evidence": "Severity matrix documented and communicated to all staff"},
            {"step": 2, "title": "IR runbook", "description": "Create step-by-step runbook: Detect → Contain → Eradicate → Recover → Lessons Learned.", "owner": "CISO", "evidence": "IR runbook published. Board reviewed and approved"},
            {"step": 3, "title": "Internal comms template", "description": "Template for notifying staff: what happened, what to do, who to contact. Plain language.", "owner": "CISO / HR", "evidence": "Template stored in offline location and tested"},
            {"step": 4, "title": "Regulatory notification template", "description": "CH: NCSC portal. UK: ICO 72h. EU: NIS2 24h. Pre-fill templates, store regulatory contacts.", "owner": "CISO / Legal", "evidence": "Templates legally reviewed. Contacts in IR runbook"},
            {"step": 5, "title": "Customer notification template", "description": "Draft notification for customers if their data is affected. Legal review required.", "owner": "CISO / Legal / CEO", "evidence": "Template legally reviewed. Approval process documented"},
            {"step": 6, "title": "Tabletop exercise", "description": "Run 2-hour tabletop simulating a ransomware attack. Test runbook and comms.", "owner": "CISO", "evidence": "Exercise report with gaps identified and remediated"},
            {"step": 7, "title": "Post-incident review", "description": "Mandatory PIR within 5 days of any P1/P2 incident. Feed lessons back into runbook.", "owner": "CISO", "evidence": "PIR template exists. At least 1 exercise completed per year"},
        ],
        "definition_of_done": "IR runbook published. All templates legally reviewed. Tabletop exercise completed. Regulatory process tested."
    },
]

REGION_OVERLAYS = {
    "CH": {
        "title": "Switzerland — Cyber Regulatory Context",
        "sections": [
            {"heading": "NCSC 24-Hour Incident Reporting", "content": "Under ISG (Informationssicherheitsgesetz), operators of critical infrastructure must report significant cyber incidents to the NCSC within 24 hours of detection.", "items": ["Applies to: energy, water, transport, health, banking, government ICT", "Report via: report.ncsc.admin.ch", "Include: nature of incident, affected systems, initial impact assessment", "Follow-up: detailed report within 72 hours"]},
            {"heading": "Critical Infrastructure Sectors", "content": "Sectors subject to mandatory reporting under Swiss law:", "items": ["Energy (electricity, gas, district heating)", "Water supply and wastewater", "Transport (rail, air, road infrastructure)", "Health (hospitals, pharmaceutical supply)", "Banking and financial market infrastructure", "Government ICT and digital services", "Telecommunications"]},
            {"heading": "Reporting Portal Steps", "content": "How to report an incident to NCSC:", "items": ["1. Go to report.ncsc.admin.ch", "2. Select 'Meldung fur kritische Infrastrukturen'", "3. Authenticate with your CHy-Mail or HIN identity", "4. Complete the structured incident form", "5. Receive confirmation number", "6. NCSC will contact you within 4 hours for P1 incidents"]},
            {"heading": "ZT Compass Alignment", "content": "Key ZT controls mapped to Swiss requirements:", "items": ["Identity controls: reduce credential-based breach risk", "EDR/MDM: meet ISG Article 5 baseline security measures", "Network segmentation: limit blast radius of incidents", "Data classification: support proportionate protection under revised DSG", "IR runbook: meet 24h reporting obligation"]},
        ]
    },
    "UK": {
        "title": "United Kingdom — Cyber Regulatory Context",
        "sections": [
            {"heading": "Cyber Breaches Survey 2025", "content": "DSIT Cyber Security Breaches Survey 2025 findings:", "items": ["43% of UK businesses experienced a cyber attack in the past 12 months", "32% of businesses have a formal incident response plan", "Only 13% of businesses conduct regular penetration testing", "Phishing remains #1 attack vector (84% of breached businesses)", "Median cost of a breach for medium businesses: GBP 10,830", "Only 31% of businesses have board-level cyber security oversight"]},
            {"heading": "Common Gaps for UK SMEs", "content": "Frequent findings from NCSC assessments:", "items": ["MFA not enabled on email and Microsoft 365", "No patch management process", "Insufficient backup testing", "No network segmentation", "Lack of security awareness training", "ICO breach notification missed — 72h deadline not tracked"]},
            {"heading": "NCSC Cyber Essentials", "content": "UK businesses should target Cyber Essentials certification:", "items": ["Firewalls and internet gateways", "Secure configuration of devices and software", "User access control and admin privileges", "Malware protection (EDR)", "Patch management — update all software within 14 days", "CE+ adds independent technical verification"]},
            {"heading": "ICO Breach Notification", "content": "Under UK GDPR, personal data breaches must be reported to the ICO:", "items": ["72-hour notification deadline from time of becoming aware", "Report via: ico.org.uk/make-a-complaint/data-security", "Include: nature of breach, categories/volumes of data, likely consequences", "Notify affected individuals if high risk to their rights and freedoms", "Document all breaches even if not reported"]},
        ]
    },
    "EU": {
        "title": "European Union — NIS2 & Cyber Regulatory Context",
        "sections": [
            {"heading": "NIS2 Directive — 10 Key Requirements", "content": "NIS2 (EU 2022/2555) — key requirements for essential and important entities:", "items": ["1. Risk analysis and information system security policies", "2. Incident handling (detection, response, recovery)", "3. Business continuity and crisis management", "4. Supply chain security — vet ICT suppliers", "5. Security in network and information systems acquisition", "6. Policies to assess cybersecurity risk measures effectiveness", "7. Basic cyber hygiene practices and cybersecurity training", "8. Policies on cryptography and encryption", "9. Human resources security, access control, asset management", "10. Multi-factor authentication or continuous authentication"]},
            {"heading": "ENISA Guidance Mapping", "content": "ENISA guidance aligned to NIS2:", "items": ["ENISA Good Practice Guide on Incident Management: NIS2 Art. 21(2)(b)", "ENISA Cloud Security Guide: supply chain and ICT security", "ENISA Threat Landscape 2024: ransomware top threat", "ENISA Guidelines on Vulnerability Disclosure", "ENISA Cybersecurity Certification Framework: EUCC for ICT products"]},
            {"heading": "Incident Reporting Under NIS2", "content": "Multi-stage reporting obligations:", "items": ["Early warning: 24 hours — notify national CSIRT", "Incident notification: 72 hours — detailed notification with initial assessment", "Intermediate report: on request from CSIRT/authority", "Final report: 1 month after incident notification — full analysis", "Significant incident: major operational disruption or financial loss"]},
            {"heading": "NIS2 Scope — Are You In?", "content": "NIS2 covers essential entities (EE) and important entities (IE):", "items": ["Essential entities: energy, transport, banking, health, water, digital infrastructure", "Important entities: postal, waste, chemicals, food, manufacturing, digital providers", "Size threshold: medium enterprises (50+ employees or EUR 10M+ turnover) in covered sectors", "Penalties: EE up to EUR 10M or 2% global turnover; IE up to EUR 7M or 1.4% global turnover"]},
        ]
    }
}

@app.get("/api/playbooks")
def list_playbooks():
    return [{"id": p["id"], "title": p["title"], "pillar": p["pillar"], "icon": p["icon"]} for p in PLAYBOOKS]

@app.get("/api/playbooks/{playbook_id}")
def get_playbook(playbook_id: str):
    for p in PLAYBOOKS:
        if p["id"] == playbook_id:
            return p
    raise HTTPException(404, "Playbook not found")

@app.get("/api/regions/{region}")
def get_region_overlay(region: str):
    region = region.upper()
    if region not in REGION_OVERLAYS:
        raise HTTPException(404, "Region not found")
    return REGION_OVERLAYS[region]

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ztcompass", "version": "beta"}

# Serve React frontend
STATIC_DIR = "/app/static"
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=f"{STATIC_DIR}/assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index = f"{STATIC_DIR}/index.html"
        if os.path.exists(index):
            return FileResponse(index)
        return {"error": "Frontend not built"}
