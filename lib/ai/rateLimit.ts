/**
 * Per-user daily cap on AI generations.
 *
 * Gemini's free tier is SHARED across all users. To stop one heavy user
 * from exhausting the global quota, we track each user's count in
 * Firestore under `users/{uid}.aiUsage` and reject once they exceed
 * `AI_DAILY_USER_CAP` within a rolling 24h window.
 */

import "server-only";

import { db } from "@/lib/firebase/admin";
import type { AiUsage } from "@/lib/types/resume";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getCap(): number {
  const raw = process.env.AI_DAILY_USER_CAP;
  const parsed = raw ? Number(raw) : NaN;
  // Fall back to a conservative default if the env var is missing/invalid.
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
}

export class RateLimitError extends Error {
  /** Milliseconds until the user's count resets (for friendly UI). */
  readonly resetAtMs: number;

  constructor(resetAtMs: number) {
    super("Daily AI generation limit reached. Please try again later.");
    this.name = "RateLimitError";
    this.resetAtMs = resetAtMs;
  }
}

/**
 * Verifies the user is under their daily cap. MUST be called before any
 * Gemini request. Throws `RateLimitError` if over.
 */
export async function assertUnderCap(uid: string): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const usage = snap.get("aiUsage") as AiUsage | undefined;

  const now = Date.now();
  const cap = getCap();

  // Has the rolling 24h window elapsed? If so, the cap effectively resets.
  const windowElapsed =
    !usage || !usage.dailyResetAt || now >= usage.dailyResetAt.seconds * 1000;

  if (windowElapsed) {
    // Reset the window; count starts fresh from this request (set later by recordUsage).
    await userRef.set(
      {
        aiUsage: { dailyCount: 0, dailyResetAt: { seconds: 0, nanoseconds: 0 } },
      },
      { merge: true },
    );
    return;
  }

  if ((usage?.dailyCount ?? 0) >= cap) {
    throw new RateLimitError(usage!.dailyResetAt.seconds * 1000);
  }
}

/**
 * Increments the user's daily count AFTER a successful generation.
 * Pairs with `assertUnderCap`.
 */
export async function recordUsage(uid: string): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  const now = Date.now();
  const snap = await userRef.get();
  const usage = snap.get("aiUsage") as AiUsage | undefined;

  // If a window just started (count == 0 / no usage), set the reset deadline
  // to now + 24h. Otherwise just increment.
  const needsNewWindow =
    !usage || !usage.dailyResetAt || now >= usage.dailyResetAt.seconds * 1000;

  if (needsNewWindow) {
    await userRef.set(
      {
        aiUsage: {
          dailyCount: 1,
          // Convert to Firestore timestamp shape for consistency on read.
          dailyResetAt: { seconds: Math.floor((now + ONE_DAY_MS) / 1000), nanoseconds: 0 },
        },
      },
      { merge: true },
    );
  } else {
    await userRef.set(
      {
        aiUsage: {
          dailyCount: (usage!.dailyCount ?? 0) + 1,
          dailyResetAt: usage!.dailyResetAt,
        },
      },
      { merge: true },
    );
  }
}

// `serverTimestamp` is intentionally not used here: per-user timestamps in
// this module are stored as plain `{seconds, nanoseconds}` numeric objects
// (see AiUsage type) rather than FieldValue.serverTimestamp().
