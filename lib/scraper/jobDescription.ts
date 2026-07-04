/**
 * Server-side job-description scraper.
 *
 * Fetches a URL, extracts the main text content with `cheerio`, and returns
 * normalized text suitable for AI tailoring.
 *
 * SECURITY — SSRF guard:
 *   The fetch target is validated to block private/loopback/link-local IPs
 *   (10.x, 127.x, 169.254.x, 172.16/12, 192.168.x, ::1, fc00::/7) so users
 *   cannot make the server fetch internal services. We also enforce a
 *   timeout and a max size.
 */

import "server-only";

import { isIP } from "node:net";
import dns from "node:dns/promises";
import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000; // 2 MB hard cap on response body

/** Rejects hostnames that resolve to private/loopback IPs. */
async function assertPublicHost(hostname: string): Promise<void> {
  const ipLiteral = isIP(hostname) ? hostname : (await dns.lookup(hostname)).address;
  if (!ipLiteral) {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }

  const isPrivate =
    /^127\./.test(ipLiteral) ||
    /^10\./.test(ipLiteral) ||
    /^192\.168\./.test(ipLiteral) ||
    /^169\.254\./.test(ipLiteral) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ipLiteral) ||
    /^::1$/.test(ipLiteral) ||
    /^f[cd]/i.test(ipLiteral);

  if (isPrivate) {
    throw new Error(`Refusing to fetch private/local address: ${ipLiteral}`);
  }
}

/**
 * Scrapes a job posting URL and returns cleaned plain text.
 * Throws on any network/SSRF/parse failure — caller decides the UX.
 */
export async function scrapeJobDescription(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported.");
  }

  await assertPublicHost(url.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "ResumeBuilder/1.0 (+JD scraper)" },
    });
  } catch (err) {
    throw new Error(`Could not fetch URL: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok || !response.body) {
    throw new Error(`Fetch failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BYTES) {
      reader.cancel().catch(() => {});
      throw new Error("Page is too large to scrape (> 2 MB).");
    }
    html += decoder.decode(value, { stream: true });
  }

  return extractMainText(html);
}

/** Picks the most text-rich part of the page (heuristic, job-board-friendly). */
function extractMainText(html: string): string {
  const $ = cheerio.load(html);

  // Drop obviously irrelevant noise (script/style/nav/footer/aside/header).
  $("script,style,noscript,nav,footer,header,aside,form,iframe").remove();

  // Prefer <main>, then <article>, then fall back to <body>.
  const root = $("main").first().text()
    || $("article").first().text()
    || $("body").text();

  return whitelistText(root);
}

function whitelistText(s: string): string {
  return s
    .replace(/\u00a0/g, " ") // non-breaking spaces → normal
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
