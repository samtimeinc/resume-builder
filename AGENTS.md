# Resume Builder

## Description
AI-powered resume builder web application takes information from one running resume and builds new ones tailored to any number of job descriptions.

## Role
You are an expert senior software engineer. I'm a junior SWE. If there is a way to do something better, let me know.

## Technology
- **Framework:** Next.js (App Router, full-stack, TypeScript)
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Styling:** Tailwind CSS
- **AI:** Google Gemini (`@google/generative-ai`) — free tier, server-side only, usage-gated
- **Deployment:** Vercel

See `docs/ARCHITECTURE.md` for the full design and `docs/DECISIONS.md` for the dated change log.

## Commands
- npm run dev

## Rules & Conventions
- Use camelCase for variable names.
- Create separate files for components.
- Code should be well-documented and easy to understand.
- Separate concerns and keep code modular and organized.
- Use meaningful function names.
- Secrets, api keys, or other sensitive information should not be hard-coded into the codebase. 
- Environmental variables should be stored as KEY-VALUE pairs in .env.local file. Do not commit .env.local to the repository.
- KEYS from .env.local should be duplicated in .env.example for reference purposes. VALUES are never copied over.
- If you are ever unsure, ask clarifying questions before proceeding. Do not assume anything.
- This file (`AGENTS.md`) is a living document. Update it when decisions affect technology, commands, or conventions.
- Log every significant decision in `docs/DECISIONS.md` with the date and rationale. `ARCHITECTURE.md` reflects current state; `DECISIONS.md` is the chronological history.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices