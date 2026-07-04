/**
 * Firebase CLIENT SDK — safe to import in Client Components.
 *
 * Only the Auth service is exposed here (Firestore reads/writes go through
 * Server Actions / Route Handlers using the Admin SDK — see lib/firebase/admin.ts).
 * This keeps all client DB access subject to Firestore Security Rules and
 * avoids bundling service-account credentials into the browser.
 *
 * Public env vars (NEXT_PUBLIC_*) are required. They become empty strings
 * at build time if missing — `assertConfig` below fails loudly in that case.
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Reads + validates the public Firebase config. Throws at startup if any
 * required var is missing, so misconfigurations surface immediately
 * instead of producing silent failures later.
 */
function readClientConfig() {
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config missing env vars: ${missing.join(", ")}. ` +
        `Copy the keys from .env.example into .env.local and fill in values.`,
    );
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
}

// initializeApp is idempotent-safe via getApps guard to avoid double-init
// during hot reloads in dev.
const app = getApps().length ? getApp() : initializeApp(readClientConfig());

export const auth: Auth = getAuth(app);
