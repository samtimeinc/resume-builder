# Decisions Log

A dated, chronological record of significant project decisions and changes.
This complements `ARCHITECTURE.md` (current-state design) by capturing *why* and
*when* choices were made. Append new entries at the top.

Format per entry:
```
## YYYY-MM-DD — Short title
- Decision: ...
- Rationale: ...
- Tradeoffs / alternatives: ...
```

---

## 2026-07-04 — Project initialization & core stack

- **Decision:** Build a fresh Next.js application (App Router, TypeScript) with Firebase Auth, Firestore, Tailwind CSS, and Google Gemini (free tier). Deploy on Vercel.
- **Rationale:**
  - Next.js App Router chosen over Vite so the server can host Firebase Admin SDK and Gemini API calls behind our own endpoints, keeping secrets off the client.
  - Firebase covers Auth + Firestore quickly and integrates natively with Vercel serverless.
  - Google Gemini selected as the AI provider because its free tier offers the largest context window and most usable free quota for resume-tailoring workloads (master resume + JD can be large).
  - Tailwind for fast, consistent styling.
- **Tradeoffs / alternatives:**
  - Vite + separate Node backend would be lighter but doubles deployment surface.
  - Groq is faster but smaller context; OpenRouter free models vary in quality.
- **Constraints locked here:** AI may only be used to (a) generate a full tailored resume or (b) rewrite a section the user explicitly selects — never free-form. Per-user daily AI caps enforced in Firestore (default `AI_DAILY_USER_CAP=10`) to protect the shared free-tier quota.

## 2026-07-04 — Master resume as the source of truth

- **Decision:** Each user maintains a single **master resume** (`users/{uid}/masterResume`) treated as a living document. Every tailored resume derives from it but stores its own deep copy.
- **Rationale:** Pure referencing would break old tailored resumes when the master changes. Deep copies keep each tailored version independent and editable.
- **Inputs accepted:** upload (PDF / DOCX / TXT / MD) or manual entry/edit.

## 2026-07-04 — Job description input

- **Decision:** Accept JD via pasted text **or** a URL (server-side scrape). Scraping runs server-side with an SSRF guard (block private/local IPs, timeout, sanitize).

## 2026-07-04 — Output UX

- **Decision:** Tailored resumes are shown as an **editable in-app preview** (v1). Static PDF/DOCX export deferred.

## 2026-07-04 — Agent hand-off guide added

- **Decision:** Add `docs/AGENT_GUIDE.md` as the consolidated onboarding briefing for any agent picking up the project on a fresh machine.
- **Rationale:** The agent's internal `/memories/repo/*` scratchpad is workspace-local and does NOT travel with the repo. Without a committed equivalent, a fresh-clone agent loses project identity, Next 16 gotchas, and current-phase state. `AGENT_GUIDE.md` mirrors that memory in a version-controlled file. `AGENTS.md` now points at it as the "read this first" entry point.
- **Maintained alongside:** `AGENTS.md` (rules), `ARCHITECTURE.md` (design), `DECISIONS.md` (history). `AGENT_GUIDE.md` is the "where am I / what's next" briefing — update it whenever phase state changes or significant new learnings emerge.

## 2026-07-04 — Phase 0 complete

- **Outcome:** Next.js 16.2.10 + React 19.2.4 + Tailwind v4 project scaffolded. Build + lint clean. Dev server boots (`npm run dev`).
- **Foundation in place:**
  - `lib/types/resume.ts` — TS types mirroring the Firestore data model.
  - `lib/firebase/client.ts` (browser SDK, public env) and `lib/firebase/admin.ts` (server SDK, `server-only`, `verifyIdToken` helper).
  - `lib/ai/{gemini,prompts,rateLimit}.ts` — Gemini wrapper (server-only), full + section prompt templates, per-user 24h rolling AI cap.
  - `lib/parsers/{pdf,docx,text}.ts` — uses pdf-parse **v2** (`PDFParse` named export, constructor takes `{ data: Uint8Array }`, call `.getText()`), mammoth for DOCX, native decode for txt/md.
  - `lib/scraper/jobDescription.ts` — cheerio-based with SSRF guard (blocks private/loopback/link-local IPs), 8s timeout, 2 MB cap.
  - `lib/db/{masterResume,jobs,tailoredResumes,users}.ts` — server-only Firestore CRUD helpers.
  - `lib/auth/session.ts` — `getUidFromRequest()` for route handlers.
  - `app/(auth)/{login,signup}/page.tsx` + shared layout, `app/(app)/dashboard/page.tsx` + protected layout (auth guard deferred to Phase 1).
  - `firestore.rules` (ownership-based), `firestore.indexes.json`, `.env.example` (committed) + `.env.local` (gitignored).
- **Decisions made along the way:**
  - PowerShell `CurrentUser` execution policy → `RemoteSigned` (so `npm.ps1` runs; blocks unsigned web scripts).
  - `.gitignore`: kept `.env*` ignored but force-committed `.env.example` via `!.env.example`.
  - `@types/pdf-parse` was added then made redundant — v2 ships its own types. Left installed (harmless); will remove in a housekeeping pass.
- **Followups for later phases:**
  - Phase 1: replace auth page stubs with real Firebase email/password + Google, server-side session cookie + middleware auth guard, auto-create user doc on first sign-in.
  - Stray `c:\workspace\rbtmp` folder + degraded terminal PATHs on long sessions — operator wellness, no impact.

## 2026-07-04 — Toolchain setup

- **Decision:** Node.js v24.18.0 LTS + npm 11.16.0 installed on Windows. ESLint is **enabled** (Next.js default). `pdf-parse` and `mammoth` confirmed for resume parsing.
- **Environment change:** PowerShell `CurrentUser` execution policy set to `RemoteSigned` so the npm CLI (`npm.ps1`) can run. This permits locally installed scripts while still blocking unsigned scripts downloaded from the internet.
- **Tradeoffs / alternatives:** Could have used `nvm-windows`/`fnm` for version management; deferred since a single Node LTS is sufficient for v1.

## 2026-07-04 — Project memory & decision logging

- **Decision:** Maintain a dated `docs/DECISIONS.md` inside the repo, separate from the agent's internal `/memories/repo/` scratchpad.
- **Rationale:** The repo file is version-controlled, visible to the whole team, and travels with the code. The internal memory is the agent's fast recall across sessions and is not committed.
- **Convention:** `AGENTS.md` is a living document and is updated whenever a decision affects technology, conventions, or commands.
