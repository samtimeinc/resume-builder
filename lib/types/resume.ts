/**
 * Shared TypeScript types for the Resume Builder.
 *
 * These mirror the Firestore data model in `docs/ARCHITECTURE.md` §4.
 * Document IDs are Firebase Auth UIDs where relevant.
 */

// ---------- Primitive helpers ----------

/** ISO month string, e.g. "2024-08". Empty/"Present" allowed for ongoing items. */
export type IsoMonth = string;

// ---------- Contact ----------

export interface ResumeLink {
  label: string; // e.g. "LinkedIn", "GitHub", "Portfolio"
  url: string;
}

export interface Contact {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  links?: ResumeLink[];
}

// ---------- Resume content sections ----------

export interface ExperienceItem {
  /** Stable client-side id so we can reorder/edit without ambiguity. */
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: IsoMonth;
  endDate?: IsoMonth; // omit or "Present" for current role
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: IsoMonth;
  endDate?: IsoMonth;
  notes?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  link?: string;
  bullets?: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer?: string;
  date?: IsoMonth;
  link?: string;
}

// ---------- Full resume shape ----------

/**
 * The structured content of a resume — shared by both the master resume
 * and tailored resumes (which store a deep copy).
 */
export interface ResumeContent {
  contact: Contact;
  summary?: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects?: ProjectItem[];
  certifications?: CertificationItem[];
}

// ---------- Source format (master resume only) ----------

export type SourceFormat = "pdf" | "docx" | "txt" | "md" | "manual";

// ---------- Master resume ----------

export interface MasterResume extends ResumeContent {
  id: string;
  uid: string;
  sourceFormat?: SourceFormat;
  uploadedFileName?: string;
  /** Original parsed text — kept for re-parsing / audit. */
  rawText?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ---------- Job description ----------

export type JobSource = "paste" | "url";

export interface JobDescription {
  id: string;
  uid: string;
  title?: string;
  company?: string;
  source: JobSource;
  sourceUrl?: string;
  content: string;
  createdAt: FirestoreTimestamp;
}

// ---------- Tailored resume ----------

export interface TailoredResume extends ResumeContent {
  id: string;
  uid: string;
  masterId: string;
  jobId: string;
  /** e.g. "gemini-2.0-flash-v1" — for auditing what produced this. */
  generatorVersion: string;
  generatedAt: FirestoreTimestamp;
  lastEditedAt?: FirestoreTimestamp;
}

// ---------- Section types (for section-by-section AI rewrite) ----------

export type SectionKind =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications";

// ---------- AI usage tracking ----------

/** Stored on the user doc to enforce per-user daily AI caps. */
export interface AiUsage {
  dailyCount: number;
  dailyResetAt: FirestoreTimestamp;
}

// ---------- Firestore timestamp helper ----------
//
// Firestore returns `{ seconds, nanoseconds }` for Timestamp fields when read
// via the Admin SDK. We type these loosely so the same interfaces work for
// both reading (Firestore shape) and writing (we pass `serverTimestamp()`).

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}
