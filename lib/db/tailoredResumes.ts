/**
 * Firestore CRUD helpers for tailored resumes — SERVER only.
 *
 * Each tailored resume stores a DEEP COPY of content (per ARCHITECTURE.md §4):
 * edits to one never affect another.
 */

import "server-only";

import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { ResumeContent, TailoredResume } from "@/lib/types/resume";

const COL = "tailoredResumes";

export async function getTailoredResume(
  uid: string,
  resumeId: string,
): Promise<TailoredResume | null> {
  const snap = await db.collection("users").doc(uid).collection(COL).doc(resumeId).get();
  if (!snap.exists) return null;
  return { id: snap.id, uid, ...(snap.data() as Omit<TailoredResume, "id" | "uid">) };
}

export async function listTailoredResumes(uid: string): Promise<TailoredResume[]> {
  const snap = await db.collection("users").doc(uid).collection(COL).get();
  return snap.docs.map((d) => ({
    id: d.id,
    uid,
    ...(d.data() as Omit<TailoredResume, "id" | "uid">),
  }));
}

export async function createTailoredResume(
  uid: string,
  content: ResumeContent,
  meta: { masterId: string; jobId: string; generatorVersion: string },
): Promise<string> {
  const ref = await db.collection("users").doc(uid).collection(COL).add({
    ...content,
    ...meta,
    generatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateTailoredResume(
  uid: string,
  resumeId: string,
  content: ResumeContent,
): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .collection(COL)
    .doc(resumeId)
    .set(
      {
        ...content,
        lastEditedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
