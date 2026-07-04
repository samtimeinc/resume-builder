/**
 * Firebase ADMIN SDK — SERVER ONLY.
 *
 * `import 'server-only'` makes the build FAIL if any Client Component
 * accidentally imports this module. This is our hard guarantee that
 * service-account credentials never reach the browser bundle.
 *
 * Exposes:
 *   - `adminAuth`    for verifying ID tokens from the client.
 *   - `db`           Firestore instance for all server reads/writes.
 *   - `verifyIdToken(idToken)`  helper used by every protected Server Action
 *                               and Route Handler.
 */

import "server-only";

import { getApp, getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function readAdminConfig() {
  // Admin credentials. Must NOT be NEXT_PUBLIC_ (would leak to browser).
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error(
      "Firebase admin credentials missing. Set FIREBASE_CLIENT_EMAIL and " +
        "FIREBASE_PRIVATE_KEY in .env.local (see .env.example).",
    );
  }

  // When set via env, '\\n' escape sequences in the private key need to be
  // turned back into real newlines so the PEM parses correctly.
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return { credential: cert({ clientEmail, privateKey }) };
}

// Guard against re-initializing on hot reload in dev.
const app: App = getApps().length ? getApp() : initializeApp(readAdminConfig());

export const adminAuth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/**
 * Verifies a Firebase ID token (sent from the client as a Bearer token or
 * passed into a Server Action) and returns the decoded UID, or `null` if
 * the token is missing/invalid/expired.
 *
 * Call this at the TOP of every protected Server Action and Route Handler.
 * Server Actions are reachable by direct POST — do not rely on a layout
 * guard alone. See Next.js 16 mutating-data docs.
 */
export async function verifyIdToken(
  idToken: string | undefined | null,
): Promise<string | null> {
  if (!idToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    // Invalid signature, expired, revoked, malformed — treat uniformly as anon.
    return null;
  }
}
