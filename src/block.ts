/**
 * Extract the ```cypher fenced block from a note's raw markdown.
 *
 * The character data lives in a code block in the body (not frontmatter), so
 * the PDF-export and side-pane paths — which work from file text rather than
 * the rendered DOM — pull the YAML out with this helper.
 */

import { parseYaml } from "obsidian";
import { normalize, type Character } from "./character";

// Matches an opening fence (``` or ~~~, 3+ chars) tagged `cypher`, captures the
// body up to the matching closing fence. Tolerates leading indentation.
const CYPHER_BLOCK_RE =
  /^[ \t]*(`{3,}|~{3,})[ \t]*cypher[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\1[ \t]*$/m;

/** Return the raw YAML inside the first ```cypher block, or null if none. */
export function extractCypherBlock(markdown: string): string | null {
  const m = markdown.match(CYPHER_BLOCK_RE);
  return m ? m[2] : null;
}

/** True if the note contains a ```cypher block. */
export function hasCypherBlock(markdown: string): boolean {
  return CYPHER_BLOCK_RE.test(markdown);
}

/**
 * Parse a note's ```cypher block into a normalized Character.
 * Throws on a missing block or invalid YAML so callers can report it.
 */
export function characterFromMarkdown(markdown: string): Character {
  const yaml = extractCypherBlock(markdown);
  if (yaml == null) {
    throw new Error("No ```cypher block found in this note.");
  }
  const data = parseYaml(yaml);
  if (!data || typeof data !== "object") {
    throw new Error("The ```cypher block is empty or invalid.");
  }
  return normalize(data as Record<string, unknown>);
}
