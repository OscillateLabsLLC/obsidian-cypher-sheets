/**
 * Shared DOM helpers for rendering a character into an Obsidian element.
 * Used by both the Reading-view post-processor and the sidebar preview.
 */

import { normalize, type Character, type Frontmatter } from "./character";
import { renderSheetBody, sheetStyle } from "./render";

let styleInjected = false;

/** Inject the sheet CSS into the document head exactly once. */
export function ensureStyle(): void {
  if (styleInjected) return;
  const el = document.head.createEl("style", { text: sheetStyle() });
  el.id = "cypher-sheets-style";
  styleInjected = true;
}

/**
 * Parse trusted, fully-escaped HTML we built ourselves and adopt its nodes into
 * `target`. Avoids a raw innerHTML assignment (which Obsidian's plugin review
 * flags) while keeping the renderer's single-template design.
 */
export function insertSheetHtml(target: HTMLElement, html: string): void {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const node of Array.from(doc.body.childNodes)) {
    target.appendChild(node);
  }
}

/** Render loose frontmatter/YAML data into `target` (normalizes first). */
export function renderCharacterInto(
  target: HTMLElement,
  fm: Frontmatter
): void {
  renderSheetInto(target, normalize(fm));
}

/** Render an already-normalized Character into `target`. */
export function renderSheetInto(target: HTMLElement, character: Character): void {
  ensureStyle();
  insertSheetHtml(target, renderSheetBody(character));
}
