# Resume Builder — Architecture

> Living document. Last updated: 2026-07-04.
>
> An AI-powered resume builder. A user maintains one **master resume** (their source of truth) and generates multiple **tailored resumes** against job descriptions.

---

## 1. Goals & Non-Goals

### Goals
- Maintain a single **master resume** per user — living, editable, the source of truth.
- Generate **tailored resumes** from the master + a job description using Google Gemini (free tier).
- Allow tailoring of **specific resume sections** the user selects (not just whole-doc regeneration).
- Accept job descriptions via **pasted text** or **URL (scraped)**.
- Deliver an **editable in-app preview** of each generated resume.
- Run entirely on **free-tier** infrastructure and AI.

### Non-Goals (for v1)
- Public sharing / collaboration.
- Paid tiers or billing.
- ATS scoring dashboard.
- Multi-language resumes.
- Resume versioning beyond simple history list.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js** (App Router, full-stack, TypeScript) |
| Auth | **Firebase Authentication** |
| Database | **Cloud Firestore** |
| Styling | **Tailwind CSS** |
| AI | **Google Gemini** (`@google/generative-ai`) — free tier |
| File parsing | `pdf-parse` (PDF), `mammoth` (DOCX), native (TXT/MD) |
| Web scraping (JD URLs) | `cheerio` + ` Cyrus`/undici (server fetch) |
| Editor | Simple rich text / structured fields (decide in implementation) |
| Deployment | **Vercel** |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (Client)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Auth pages   │  │ Editor pages │  │ Generate / Preview   │ │
│  │ (login/signup)│  │ (master +    │  │ (tailored + editable)│ │
│  │              │  │  tailored)   │  │                      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          │ Firebase SDK    │ Next.js            │ Next.js
          │ (client)        │ Server Actions /   │ Route Handlers
          │                 │ API routes         │ (AI calls)
          ▼                 ▼                    ▼
   ┌─────────────┐  ┌────────────────────────────────────────┐
   │ Firebase     │  │        Next.js Server (Node runtime)   │
   │ Auth         │  │  ┌────────────┐  ┌──────────────────┐  │
   │              │  │  │ Firestore  │  │ Gemini Service   │  │
   │              │  │  │ admin SDK  │  │ (rate-limited)   │  │
   │              │  │  │            │  │                  │  │
   │              │  │  │            │  │ File parsers     │  │
   │              │  │  │            │  │ URL scraper      │  │
   │              │  │  └─────┬──────┘  └────────┬─────────┘  │
   └─────────────┘  │        │                  │             │
                    └────────┼──────────────────┼─────────────┘
                             ▼                  ▼
                     ┌──────────────┐   ┌──────────────┐
                     │  Firestore   │   │  Gemini API  │
                     │   (data)     │   │  (free tier) │
                     └──────────────┘   └──────────────┘
```

Key principles:
- **No secrets reach the browser.** Gemini API key, Firebase Admin SA, and scraping endpoints all live server-side in `.env.local`.
- **AI calls only happen for whitelisted intents** (generate full / generate section). There is no generic "ask the AI" endpoint.
- **Per-user usage caps** enforced in Firestore before any Gemini call.

---

## 4. Data Model (Firestore)

Top-level collections. Document IDs are Firebase Auth UIDs where relevant.

### `users/{uid}`
Profile / preferences.
```ts
{
  email: string;
  displayName: string | null;
  createdAt: Timestamp;
  aiUsage: {
    dailyCount: number;        // generations today
    dailyResetAt: Timestamp;   // when count resets
  };
}
```

### `users/{uid}/masterResume/{masterId}`
The single living source-of-truth resume. (Typically one doc per user, but the collection pattern allows drafts/migration.)
```ts
{
  // Structured fields (editable in app)
  contact: { name, email, phone, location, links: { linkedin?, github?, portfolio? } };
  summary?: string;
  experience: Array<{
    id: string;            // stable clientId for editing
    company: string;
    title: string;
    location?: string;
    startDate: string;     // ISO month
    endDate?: string;      // ISO month or "Present"
    bullets: string[];     // achievement lines
  }>;
  education: Array<{ id, institution, degree, field, start, end, notes? }>;
  skills: string[];        // tags
  projects?: Array<{ id, name, description, link?, bullets?: string[] }>;
  certifications?: Array<{ id, name, issuer, date, link? }>;

  sourceFormat?: 'pdf' | 'docx' | 'txt' | 'md' | 'manual';
  uploadedFileName?: string;
  rawText?: string;        // original parsed text (for re-parsing/audit)
  updatedAt: Timestamp;
}
```

### `users/{uid}/jobs/{jobId}`
A job description the user wants to tailor against.
```ts
{
  title?: string;
  company?: string;
  source: 'paste' | 'url';
  sourceUrl?: string;
  content: string;         // normalized JD text
  createdAt: Timestamp;
}
```

### `users/{uid}/tailoredResumes/{resumeId}`
A generated/resaved tailored resume derived from master + job.
```ts
{
  masterId: string;        // ref to master resume at generation time
  jobId: string;           // ref to job description used
  contact: { /* same shape as master, possibly edited */ };
  summary?: string;
  experience: [/* same shape, bullets tailored */];
  education: [/* copied from master */];
  skills: [/* reordered/tailored */];
  projects?: [...];
  certifications?: [...];
  generatedAt: Timestamp;
  generatorVersion: string;  // e.g. "gemini-2.0-flash-v1"
  // Edit history (lightweight)
  lastEditedAt?: Timestamp;
}
```

> **Rule:** a tailored resume stores a **deep copy** of content, not a reference. This keeps each tailored version independent and editable.

---

## 5. Directory Structure (Next.js App Router)

```
resume-builder/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                       # protected routes
│   │   ├── layout.tsx               # auth guard
│   │   ├── dashboard/page.tsx       # list tailored resumes + jobs
│   │   ├── master/
│   │   │   ├── page.tsx             # editor for master resume
│   │   │   └── upload/              # upload flow component
│   │   ├── jobs/
│   │   │   ├── page.tsx             # list/add jobs
│   │   │   └── new/page.tsx         # paste text or URL
│   │   └── resumes/
│   │       ├── new/page.tsx         # pick master + job → generate
│   │       └── [id]/page.tsx        # editable preview
│   ├── api/
│   │   ├── master/upload/route.ts   # POST file, parse, save draft
│   │   ├── jobs/scrape/route.ts     # POST { url } → JD text
│   │   ├── generate/
│   │   │   ├── resume/route.ts      # POST → full tailored resume
│   │   │   └── section/route.ts     # POST → single section rewrite
│   └── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # buttons, inputs, cards (shared)
│   ├── editor/                      # resume editor pieces
│   │   ├── ContactFields.tsx
│   │   ├── ExperienceList.tsx
│   │   ├── ExperienceItem.tsx
│   │   ├── EducationList.tsx
│   │   ├── SkillsEditor.tsx
│   │   └── ...
│   ├── resume/                      # read/preview pieces
│   │   ├── ResumePreview.tsx        # styled printable preview
│   │   └── TailoringControls.tsx
│   ├── upload/
│   │   └── FileDropzone.tsx
│   └── auth/
│       └── AuthForm.tsx
├── lib/
│   ├── firebase/
│   │   ├── client.ts                # client SDK init (browser)
│   │   └── admin.ts                 # admin SDK init (server only)
│   ├── ai/
│   │   ├── gemini.ts                # Gemini client wrapper
│   │   ├── prompts.ts               # prompt templates (full + section)
│   │   └── rateLimit.ts             # per-user daily cap
│   ├── parsers/
│   │   ├── pdf.ts
│   │   ├── docx.ts
│   │   └── text.ts
│   ├── scraper/
│   │   └── jobDescription.ts        # cheerio-based JD extractor
│   ├── db/
│   │   ├── masterResume.ts          # CRUD helpers
│   │   ├── jobs.ts
│   │   ├── tailoredResumes.ts
│   │   └── users.ts
│   ├── auth/
│   │   ├── session.ts               # verify ID token server-side
│   │   └── withUser.ts              # route guard helper
│   └── types/
│       └── resume.ts                # shared TS types
├── .env.local                       # secrets (gitignored)
├── .env.example                     # keys only (committed)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Key Flows

### 6.1 Upload master resume
1. Client posts file to `/api/master/upload`.
2. Server detects MIME and routes to the right parser (`pdf-parse`, `mammoth`, plain for txt/md).
3. Parsed **plain text** is normalized into a structured resume shape (best-effort heuristics initially; improve over time).
4. Server stores parsed doc under `users/{uid}/masterResume/{id}` with `sourceFormat`, `rawText`, and structured fields.
5. User lands on the master editor to **correct** parsed fields (parsing is never perfect).

### 6.2 Add a job description
- **Paste:** text → sanitize → store as `jobs/{id}`.
- **URL:** POST to `/api/jobs/scrape` → server fetches HTML → `cheerio` extracts main content → store as `jobs/{id}`.

### 6.3 Generate a tailored resume (full)
1. POST `{ masterId, jobId }` to `/api/generate/resume`.
2. Server verifies session → loads master + job → **checks daily AI cap**.
3. Builds prompt from templates (`lib/ai/prompts.ts`): master content + JD + instructions.
4. Calls Gemini → parses JSON response into structured tailored resume.
5. Saves under `tailoredResumes/{id}`, increments user's `aiUsage.dailyCount`.
6. Client navigates to `/resumes/[id]` editable preview.

### 6.4 Generate a tailored resume (single section)
1. POST `{ tailoredResumeId, section, context }` to `/api/generate/section`.
2. Same guard + rate-limit path.
3. Prompt rewrites only the requested field (e.g., one experience's bullets, or summary).
4. Server merges the new section back into the tailored resume doc.

### 6.5 Editable preview
- The `/resumes/[id]` page renders `ResumePreview` (Tailwind-styled, print-friendly).
- Inline editing writes back via Server Actions.

---

## 7. Security

- **No client-side secrets.** Firebase client SDK uses a public config; Firestore **Security Rules** enforce ownership.
- **Server verifies the Firebase ID token** on every API route / Server Action via `lib/auth/session.ts`.
- **Firestore rules (v1 sketch):**
  ```
  match /users/{uid}/{document=**} {
    allow read, write: if request.auth.uid == uid;
  }
  ```
- **AI endpoints** require auth + rate-limit check + intent whitelist before calling Gemini.
- **Scraping endpoint** validates + sanitizes URLs, sets timeouts, blocks private/local IPs (SSRF guard).

---

## 8. Rate Limiting & AI Quota

- Gemini free tier has RPM/TPD limits shared across **all users** in the app.
- Each user has `aiUsage.dailyCount` in Firestore.
- **Cap:** N generations/day per user (start conservative, e.g. 10, configurable).
- Cap resets on a rolling 24h timer (`aiUsage.dailyResetAt`).
- If user is over cap, API returns `429` with a friendly message + reset time.
- If the **shared Gemini quota** is exhausted, the server returns a distinct error so the UI can distinguish "you hit your cap" vs "service busy — try later".

---

## 9. Environment Variables (`.env.local`)

Copied as **keys only** into `.env.example`. Never commit values.

```
# Firebase Client (public, but still src of truth for app)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server only — never expose)
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Gemini (server only)
GEMINI_API_KEY=

# App
AI_DAILY_USER_CAP=10
```

> Vercel: these same variables are added in the Vercel project settings. `.env.local` is for local dev only.

---

## 10. Deployment (Vercel)

- Push to `main` → Vercel auto-deploys.
- Set all environment variables in Vercel dashboard (use the same names).
- Enable Firebase Auth authorized domains for the Vercel domain.
- Firestore Security Rules deployed via Firebase CLI.

---

## 11. Phased Implementation Plan

| Phase | Scope | Outcome |
|---|---|---|
| **0** | Scaffold: Next.js + TS + Tailwind + Firebase config + env files + Firestore rules | Bootable empty app |
| **1** | Auth: Firebase client + login/signup + protected layout + session verify | Users can sign in |
| **2** | Master resume: upload (PDF/DOCX/TXT/MD) + parse + structured editor + save | Master resume is real |
| **3** | Jobs: paste + URL scrape + list | JD library |
| **4** | Gemini service + rate limit + prompts + `/api/generate/resume` | Full tailored resume |
| **5** | Tailored resume editable preview + save | Usable tailored resume |
| **6** | Section-by-section AI rewrite via `/api/generate/section` | Granular editing |
| **7** | Dashboard, polish, print/export, deployment | Production-ish v1 |

---

## 12. Open Questions (to resolve during build)

1. **Editor UX:** structured-field forms (safer, parseable) vs rich-text editor (more flexible but harder to extract structured data for AI). Recommendation: structured fields for v1.
2. **Export:** v1 is editable preview — do we also print-to-PDF via browser, or add `@react-pdf/renderer`? Defer.
3. **Scraping quality:** JD sites vary wildly; need a fallback "we couldn't read this cleanly — paste instead" UX.
4. **AI response integrity:** enforce structured JSON output via Gemini's JSON mode / function calling, with validation + retry on schema mismatch.

---

This document will change as we learn. Update it whenever an architectural decision shifts.
