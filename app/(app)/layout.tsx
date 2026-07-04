import type { ReactNode } from "react";

/**
 * Layout for the (app) route group — PROTECTED pages.
 *
 * Phase 0: presentational shell only. Phase 1 adds a real auth guard that
 * reads the Firebase ID token (cookie or header) server-side and redirects
 * to /login when absent/invalid. Per Next.js 16 docs, the layout guard does
 * NOT replace per-action verification — every Server Action still re-verifies.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <span className="font-semibold">Resume Builder</span>
          <nav className="text-sm text-zinc-600 dark:text-zinc-400">
            <span>Sign-out arrives in Phase 1</span>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
