/**
 * Text + Markdown parsers. These need no dependencies — just decode the
 * buffer as UTF-8 and normalize whitespace.
 */

export async function parseText(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8").trim();
}

// Markdown is parsed as plain text for now. The structured-field editor is
// the source of truth; markdown from an upload is just seed content.
export const parseMarkdown = parseText;
