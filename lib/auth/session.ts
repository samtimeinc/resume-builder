/**
 * Auth helpers — SERVER only.
 *
 * `getUidFromRequest` extracts the Firebase ID token from the
 * `Authorization: Bearer <token>` header used by Route Handlers and verifies it.
 *
 * Server Actions receive the token explicitly via FormData/argument, so they
 * call `verifyIdToken` directly (see lib/firebase/admin.ts).
 */

import "server-only";

import { headers } from "next/headers";
import { verifyIdToken } from "@/lib/firebase/admin";

/**
 * For API route handlers (anything under app / api). Returns the caller's
 * UID, or `null` if no/invalid token — callers should respond 401/403.
 * NOTE: written without the literal asterisk-slash here to avoid the
 * TypeScript JSDoc lexer ending the comment early.
 */
export async function getUidFromRequest(): Promise<string | null> {
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyIdToken(authHeader.slice("Bearer ".length));
}
