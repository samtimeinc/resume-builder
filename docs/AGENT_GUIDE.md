# Agent Guide — Resume Builder

> **Read this first if you're picking up this project as an agent.**
>
> This is the consolidated briefing that mirrors the agent's workspace-local
> memory. It guarantees a fresh clone gives any agent the same starting
> context as the original session.

---

## Project identity

- **Repo:** <https://github.com/samtimeinc/resume-builder>
- **Branch:** `main`
- **Git author (committed as):** Sam Phin \<samtime.worldwide@gmail.com\>
- **Commit convention:** `<type>: <subject>` — e.g. `feat:`, `chore:`, `fix:`. Long bodies go in a second paragraph.

---

## Where to find things

| You want | Open this |
|---|---|
| Stack / commands / coding rules | `AGENTS.md` |
| Current architecture (full design) | `docs/ARCHITECTURE.md` |
| Why each decision was made (dated, chronological, newest at top) | `docs/DECISIONS.md` |
| Phase roadmap | `docs/ARCHITECTURE.md` §11 |
| Setup / env vars | `README.md` |
| Live agent task tracking | The `manage_todo_list` tool (session-scoped) |

---

## Current state as of 2026-07-04

**Phase 0 (scaffold + foundations) is COMPLETE and pushed.**

- ✅ Next.js 16 (App Router, TS) + Tailwind v4 + ESLint — builds + lints clean.
- ✅ All deps installed: `firebase`, `firebase-admin`, `@google/generative-ai`, `pdf-parse` (v2), `mammoth`, `cheerio`, `server-only`.
- ✅ `lib/` foundations: types, firebase client/admin split, Gemini wrapper + prompts + rate-limit, parsers, SSRF-guarded JD scraper, Firestore CRUD, route groups `(auth)` + `(app)`.
- ✅ `firestore.rules` (ownership-based), `.env.example`.
- ❌ **Not yet done:** Firebase Auth is **stubbed** (pages render but don't authenticate). The `(app)` guard is presentational only — no real session verification yet.

**Next phase (Phase 1) = Firebase Auth.** See `docs/ARCHITECTURE.md` §11.

---

## Locked project decisions (don't relitigate without reason)

- Stack: Next.js (App Router, full-stack, TS) + Firebase Auth + Firestore + Tailwind CSS + Google Gemini (free tier, server-only, usage-gated).
- AI usage rule: AI may ONLY (a) generate a full tailored resume or (b) rewrite a section the user explicitly selects — never free-form. There is no general-purpose "ask the AI" endpoint.
- Master resume = living document / source of truth; tailored resumes store a deep copy.
- JD input: paste text OR paste URL (server-side scrape with SSRF guard).
- Output: editable in-app preview.
- Per-user daily AI cap enforced in Firestore (default `AI_DAILY_USER_CAP=10`).
- Secrets: `.env.local` only (gitignored). `.env.example` (keys only) is committed for reference.

---

## ⚠️ Next.js 16 specifics to honor when writing code

These are easy to forget and cause build failures. Source: bundled docs at `node_modules/next/dist/docs/`.

- **`params` and `searchParams` are Promises** — always `const { slug } = await params`.
- **`fetch()` is NOT cached by default.** Opt in with `'use cache'`.
- **`cookies()` and `headers()` are async** — `await headers()`.
- **`refresh()`** is imported from **`next/cache`**, not `router.refresh()`.
- Generated type helpers are available globally after first `next dev`/`build`: `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`.
- **Mark server-side modules with `import 'server-only'`** so the build fails if they leak into a Client Component. Applied to `lib/firebase/admin.ts`, `lib/ai/*`, `lib/db/*`, `lib/scraper/*`, `lib/auth/session.ts`.
- Only `NEXT_PUBLIC_*` env vars reach the browser; non-prefixed become empty strings on the client.
- **Every Server Action and API route re-verifies the Firebase ID token** — actions are POST-reachable, layout guards do not protect them.
- Tailwind v4 = CSS-first config. No `tailwind.config.ts`. Configure in `app/globals.css` with `@theme { ... }`.

---

## Working environment notes (operator wellness, not architectural)

- Dev machine is **Windows** with PowerShell. To run `npm` the PowerShell `CurrentUser` execution policy must be `RemoteSigned` (apply with `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force`).
- Node source: `nvm4w` install at `C:\nvm4w\nodejs`. Current Node: v24.18.0 LTS.
- Long-lived terminal sessions sometimes lose PATH; refresh with:
  `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
- The `c:\workspace\rbtmp` folder on the original machine is leftover scratch from scaffolding and can be deleted.

---

## First message to send an agent on a fresh machine

> "Read `AGENTS.md`, `docs/AGENT_GUIDE.md`, `docs/ARCHITECTURE.md`, and the top of `docs/DECISIONS.md`, then tell me your understanding of the project state and what Phase 1 (Firebase Auth) entails."

This will get the agent fully oriented.
