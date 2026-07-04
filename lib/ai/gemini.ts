/**
 * Google Gemini service — SERVER ONLY.
 *
 * Wraps `@google/generative-ai`. The API key never leaves the server.
 *
 * Gem model budget (free tier, subject to change — verify in production):
 *   - gemini-1.5-flash / 2.0-flash offer generous free RPM/TPD limits.
 *   - We default to a Flash model for cost/speed; change `MODEL_NAME` to upgrade.
 */

import "server-only";

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash-latest";

// Cache the model instance across hot reloads in dev.
let cachedModel: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Get one at https://aistudio.google.com/app/apikey " +
        "and set it in .env.local (see .env.example).",
    );
  }

  const client = new GoogleGenerativeAI(apiKey);
  cachedModel = client.getGenerativeModel({ model: MODEL_NAME });
  return cachedModel;
}

/**
 * Sends a prompt to Gemini and returns the raw text response.
 *
 * This is the ONLY function that talks to the Gemini API. All higher-level
 * helpers (full-resume generation, section rewrite) go through `generateText`,
 * which keeps our usage-gating rule in one place: there is no free-form
 * "ask the AI anything" endpoint exposed to the client.
 *
 * Throws on network/quota errors — callers should catch and surface a
 * friendly message (especially the shared-quota-exhausted case).
 */
export async function generateText(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/** Version tag stored on tailored resumes so we know what produced them. */
export const GENERATOR_VERSION = `${MODEL_NAME}-v1`;
