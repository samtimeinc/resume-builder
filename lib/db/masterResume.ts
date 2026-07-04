/**
 * Firestore CRUD helpers for master resumes — SERVER only.
 *
 * Uses the Admin SDK, which bypasses Security Rules. Ownership (uid) is
 * enforced in code: callers must pass the verified uid; we never trust a
 * uid sent from the client.
 */

import "server-only";

import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { MasterResume, ResumeContent } from "@/lib/types/resume";

const COL = "masterResume";

export async function getMasterResume(
  uid: string,
  masterId: string,
): Promise<MasterResume | null> {
  const snap = await db.collection("users").doc(uid).collection(COL).doc(masterId).get();
  if (!snap.exists) return null;
  return { id: snap.id, uid, ...(snap.data() as Omit<MasterResume, "id" | "uid">) };
}

export async function listMasterResumes(uid: string): Promise<MasterResume[]> {
  const snap = await db.collection("users").doc(uid).collection(COL).get();
  return snap.docs.map((d) => ({
    id: d.id,
    uid,
    ...(d.data() as Omit<MasterResume, "id" | "uid">),
  }));
}

/** Returns the new doc id. */
export async function createMasterResume(
  uid: string,
  content: ResumeContent,
  meta: { sourceFormat?: MasterResume["sourceFormat"]; uploadedFileName?: string; rawText?: string } = {},
): Promise<string> {
  const ref = await db.collection("users").doc(uid).collection(COL).add({
    ...content,
    ...meta,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateMasterResume(
  uid: string,
  masterId: string,
  content: ResumeContent,
): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .collection(COL)
    .doc(masterId)
    .set(
      { ...content, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}
