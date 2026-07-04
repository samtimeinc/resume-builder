/**
 * DOCX parser. Uses `mammoth` to extract plain text from a Word document.
 */

export async function parseDocx(buffer: Buffer): Promise<string> {
  // mammoth's API uses Buffer natively.
  const { extractRawText } = await import("mammoth");
  const result = await extractRawText({ buffer });
  return result.value.trim();
}
