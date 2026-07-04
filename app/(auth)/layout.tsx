import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Layout for the (auth) route group: login + signup.
 *
 * Phase 0: pure presentational shell. Real Firebase Auth wiring lands in
 * Phase 1 (per ARCHITECTURE.md §11).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 block text-center text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to home
        </Link>
        {children}
      </div>
    </div>
  );
}
