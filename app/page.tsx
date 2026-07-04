import Link from "next/link";

/**
 * Public landing page.
 *
 * Phase 0 placeholder. Real home experience (sign-in CTA vs dashboard
 * redirect for signed-in users) arrives in Phase 1.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Resume Builder
      </h1>
      <p className="mt-4 max-w-prose text-lg text-zinc-600 dark:text-zinc-400">
        Keep one master resume as your source of truth, then generate tailored
        versions for any job description — powered by AI.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Create an account
        </Link>
      </div>
    </main>
  );
}
