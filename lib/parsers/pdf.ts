/**
 * PDF parser. Uses `pdf-parse` (v2) to extract plain text from a PDF buffer.
 *
 * v2 is ESM-only with a named export `PDFParse` and ships its own types,
 * so the legacy `@types/pdf-parse` is no longer needed.
 * If we hit issues (scanned-PDF support, encoding bugs), consider
 * `pdf-parse-fork` or `unpdf`.
 */

import { PDFParse } from "pdf-parse";

/**
 * Extracts text from a PDF buffer.
 *
 * pdf-parse v2 API: pass the PDF bytes to the constructor (as a Uint8Array),
 * then call `.getText()`. `TextResult.text` holds the concatenated string.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
