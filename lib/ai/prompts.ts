/**
 * Prompt templates for all AI generation intents.
 *
 * Per project rule: AI may ONLY be used to (a) generate a full tailored
 * resume or (b) rewrite a section the user explicitly selects. This file
 * defines those two prompts and ONLY those.
 */

import type { ResumeContent, SectionKind } from "@/lib/types/resume";

const SYSTEM_DIRECTIVE = `You are a professional resume writer.
ALWAYS respond with valid, minified JSON only — no markdown fences, no commentary.
The JSON shape you return MUST exactly match the requested schema.
Preserve truthful facts from the master resume; never invent employers, titles, dates, or degrees.
Where the job description emphasizes a skill the candidate has, surface it earlier and phrase bullets
to mirror the job's language without lying or exaggerating.
Bullets should start with strong action verbs and be quantified where possible.`;

/**
 * Builds the prompt for a full tailored-resume generation.
 */
export function buildFullResumePrompt(args: {
  master: ResumeContent;
  jobDescription: string;
}): string {
  return [
    SYSTEM_DIRECTIVE,
    "",
    "## TASK",
    "Produce a tailored version of the candidate's resume for the given job description.",
    "",
    "## CANDIDATE MASTER RESUME (source of truth — JSON)",
    JSON.stringify(args.master),
    "",
    "## JOB DESCRIPTION",
    args.jobDescription,
    "",
    "## REQUIRED OUTPUT JSON SCHEMA",
    "Return ONLY a JSON object with the same top-level keys as the master resume",
    "(contact, summary, experience, education, skills, projects, certifications).",
    "Tailor: summary, bullet ordering/wording, skill ordering. Do NOT change factual data",
    "(dates, degrees, employers). Preserve the 'id' fields on every array item.",
    "Output ONLY the JSON object.",
  ].join("\n");
}

/**
 * Builds the prompt for a single-section rewrite.
 */
export function buildSectionPrompt(args: {
  section: SectionKind;
  currentSection: unknown; // typed loosely — shape varies per section
  fullResume: ResumeContent;
  jobDescription: string;
  /** Free-form edit hint from the user, e.g. "make this more outcome-focused". */
  instruction: string;
}): string {
  const target = JSON.stringify(args.currentSection);

  return [
    SYSTEM_DIRECTIVE,
    "",
    "## TASK",
    `Rewrite ONLY the "${args.section}" section of the resume to better match the job description.`,
    "Do not touch any other section. Preserve all 'id' fields and factual data.",
    "",
    "## FULL RESUME (for context — DO NOT return this, only the rewritten section)",
    JSON.stringify(args.fullResume),
    "",
    "## JOB DESCRIPTION",
    args.jobDescription,
    "",
    `## SECTION TO REWRITE: ${args.section}`,
    target,
    "",
    "## USER INSTRUCTION",
    args.instruction || "Tailor this section for the job description.",
    "",
    "## REQUIRED OUTPUT",
    `Return ONLY the rewritten "${args.section}" value as JSON, in the same shape as the input section.`,
  ].join("\n");
}
