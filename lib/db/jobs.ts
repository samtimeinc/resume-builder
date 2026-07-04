/**
 * Firestore CRUD helpers for job descriptions — SERVER only.
 */

import "server-only";

import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { JobDescription } from "@/lib/types/resume";

const COL = "jobs";

export async function getJob(uid: string, jobId: string): Promise<JobDescription | null> {
  const snap = await db.collection("users").doc(uid).collection(COL).doc(jobId).get();
  if (!snap.exists) return null;
  return { id: snap.id, uid, ...(snap.data() as Omit<JobDescription, "id" | "uid">) };
}

export async function listJobs(uid: string): Promise<JobDescription[]> {
  const snap = await db.collection("users").doc(uid).collection(COL).get();
  return snap.docs.map((d) => ({
    id: d.id,
    uid,
    ...(d.data() as Omit<JobDescription, "id" | "uid">),
  }));
}

export async function createJob(
  uid: string,
  data: Pick<JobDescription, "title" | "company" | "source" | "sourceUrl" | "content">,
): Promise<string> {
  const ref = await db.collection("users").doc(uid).collection(COL).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
