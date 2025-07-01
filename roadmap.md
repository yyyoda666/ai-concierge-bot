

<!--
NOTE: Internal planning document for Cursor.
DO **NOT** commit this file to GitHub or include it in any public branch.
-->

# AI Concierge Chat – Technical & Functional Specification

## 1  Purpose
Replace the static lead‑capture form with a conversational “AI Concierge” that  
* collects project details and image uploads,  
* auto‑submits a structured **brief** (JSON) to a Relay webhook ➜ Notion, and  
* still succeeds if the visitor closes the tab or browser, or is idle for 60 s.

## 2  User‑side Interaction Goals

| Step | Behaviour |
|------|-----------|
| 1. Greeting | Assistant greets in brand voice (“experienced creative director”). |
| 2. Progressive questions | Collect **project type, budget, timeline, notes**. |
| 3. File uploads | Drag‑and‑drop **image/*** (≤ 20 MB). Non‑images blocked client‑side. |
| 4. Contact info | Ask for *name + email* early; reprompt later if still missing. |
| 5. Readiness signal | Assistant replies the literal string `READY_TO_SUBMIT` once all mandatory slots are filled. |
| 6. Submit | Visitor clicks **Submit Brief** *or* auto‑submit fires on idle ≥ 60 s **or** when the tab/browser is closed. |

> **Autosubmit must succeed even when the client closes the tab or the entire browser.**  
> Best‑effort is via `navigator.sendBeacon`; any loss is detectable via the audit log.

## 3  System Components

```
Browser (React widget)
│  ├── ChatWidget.js
│  ├── useBeacon()           ← sendBeacon on beforeunload + idle≥60 s
│  ├── Dropzone              ← /api/upload
│  └── SessionContext        ← sessionId, name, email in localStorage
│
├── /api/upload              ← stores image in Vercel Blob, returns {url, size, mime}
├── /api/chat                ← proxies LLM; returns {assistantMsg, readyToSubmit}
├── /api/submit-brief        ← assembles brief JSON, POSTs to Relay, marks session submitted
└── /api/session-beacon      ← audit log (JSON‑per‑line Blob). Optional Supabase later.
```

## 4  Data Contracts

### 4.1  Brief JSON → Relay

```jsonc
{
  "session_id": "…",
  "project_type": "…",
  "budget": "…",
  "timeline": "…",
  "notes": "…",
  "file_urls": [
    { "url": "https://…", "category": "product_photo" },
    { "url": "https://…", "category": "style_inspiration" }
  ],
  "transcript_url": "https://…",
  "name": "…",
  "email": "…"
}
```

### 4.2  Audit record (append‑only)

```json
{
  "session_id": "…",
  "ended_at": "ISO‑8601",
  "submitted": true | false,
  "msg_count": 12,
  "file_count": 3,
  "name": "…",
  "email": "…"
}
```

## 5  LLM Prompt Addendum
> *“When the user uploads an image, assume it depicts what they claim.  
> Categorise each as **product photo** or **style inspiration** unless context suggests otherwise.  
> When all required details (contact info **or** other reliable identifier, project type, budget, timeline) are gathered, respond with the literal string **READY_TO_SUBMIT**.”*

## 6  Idle & Exit Logic

| Trigger | Action |
|---------|--------|
| Inactivity ≥ 60 s | `navigator.sendBeacon('/api/submit-brief', …)` |
| Tab or browser close (`beforeunload`) | Same beacon call – must fire before unload completes. |
| Manual click **Submit Brief** | `fetch('/api/submit-brief')` |

Duplicates are acceptable; server checks `submitted=true` to no‑op.

## 7  Storage & TTL

| Item | Where | TTL |
|------|-------|-----|
| Images | Vercel Blob | 48 h signed URL |
| Transcript `.txt` | Same bucket | 48 h |
| Audit log | JSON‑per‑line Blob (phase 1) → Supabase (phase 2) | Indefinite |

## 8  Implementation Roadmap

1. **Phase 1a – Session & Beacon**  
   Generate `sessionId`, store name/email in localStorage, implement idle & exit beacon, write audit log.

2. **Phase 1b – Brief Assembly**  
   Build `/api/submit-brief`: classify images, generate transcript, POST to Relay.

3. **Phase 2 – Supabase Upgrade**  
   Migrate audit log to Supabase; nightly cron flags `submitted=false` rows.

4. **Phase 3 – Enhancements**  
   File‑type conversion in Relay, optional vision model, dedupe refinement.

## 9  Open Questions for Cursor

1. Best file for session storage helpers?
2. Existing idle‑timer hook we can reuse?
3. Utilities for Blob writes in Vercel runtime?
4. Regex vs LLM for name/email detection?