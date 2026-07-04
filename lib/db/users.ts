/**
 * Helpers for the user profile document — SERVER only.
 *
 * The user doc is created on first sign-up via a Firebase Auth trigger
 * (Phase 1). It holds `aiUsage` for rate limiting. Per firestore.rules,
 * clients cannot write here directly.
 */

import "server-only";

import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export interface UserDoc {
  email: string;
  displayName: string | null;
  createdAt: typeof FieldValue.serverTimestamp;
}

/** Ensures the user's profile doc exists. Called after first sign-in. */
export async function ensureUserDoc(uid: string, email: string): Promise<void> {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email,
      displayName: null,
      createdAt: FieldValue.serverTimestamp(),
      aiUsage: { dailyCount: 0 },
    });
  }
}
