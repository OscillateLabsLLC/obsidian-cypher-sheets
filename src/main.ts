/**
 * Cypher Sheets — Obsidian plugin.
 *
 * Renders a Cypher System v2 character note (YAML frontmatter) as a printable
 * one-page sheet. In Reading view the note itself becomes the sheet (toggle
 * with Cmd+E); a side pane and a PDF export (via Electron printToPDF) are also
 * available. v1: Tier 1, no validation or calculation — data is rendered as
 * written.
 */

import {
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  normalizePath,
  parseYaml,
} from "obsidian";
import { characterFromMarkdown, extractCypherBlock } from "./block";
import { renderCharacterInto } from "./dom";
import { renderSheetDocument } from "./render";
import { htmlToPdf } from "./pdf";
import { BLANK_CHARACTER } from "./blank";
import { CypherSheetView, VIEW_TYPE_CYPHER } from "./view";

export default class CypherSheetsPlugin extends Plugin {
  /** docIds we've already rendered a sheet into, so we do it once per note. */
  private renderedDocs = new Set<string>();

  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_CYPHER, (leaf) => new CypherSheetView(leaf));

    // A ```cypher fenced block renders as the sheet in place (Reading view /
    // Live Preview). The YAML lives in the note body, so it stays editable as
    // plain text — no Properties-panel mangling of object lists.
    this.registerMarkdownCodeBlockProcessor("cypher", (source, el) =>
      this.renderCodeBlock(source, el)
    );

    this.addRibbonIcon("scroll-text", "Show Cypher character sheet", () => {
      void this.showSheetForActive();
    });

    this.addCommand({
      id: "show-character-sheet",
      name: "Show character sheet (preview)",
      callback: () => void this.showSheetForActive(),
    });

    this.addCommand({
      id: "new-character",
      name: "New blank Cypher character",
      callback: () => void this.createBlankCharacter(),
    });

    this.addCommand({
      id: "export-character-sheet-pdf",
      name: "Export character sheet to PDF",
      callback: () => void this.exportActiveToPdf(),
    });

    // Live-refresh the preview when the shown note's frontmatter changes.
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (file instanceof TFile) this.forEachSheetView((v) => v.refreshIfShowing(file));
      })
    );
  }

  onunload(): void {
    // Leaves of our view type are cleaned up by Obsidian on unload.
  }

  /**
   * Render a ```cypher fenced block: parse its YAML body and draw the sheet in
   * place. Called once per block by Obsidian, in Reading view and Live Preview.
   * On a YAML error we show the message inline rather than failing silently, so
   * the author can fix the block.
   */
  private renderCodeBlock(source: string, el: HTMLElement): void {
    el.empty();
    let data: unknown;
    try {
      data = parseYaml(source);
    } catch (err) {
      this.renderError(el, `Could not parse character YAML: ${(err as Error).message}`);
      return;
    }
    if (!data || typeof data !== "object") {
      this.renderError(el, "Empty or invalid character block.");
      return;
    }
    renderCharacterInto(
      el.createDiv({ cls: "cypher-sheet-reading" }),
      data as Record<string, unknown>
    );
  }

  private renderError(el: HTMLElement, message: string): void {
    el.createEl("div", { text: message, cls: "cypher-sheet-error" });
  }

  /** The markdown file currently being edited/viewed, if any. */
  private activeCharacterFile(): TFile | null {
    const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file
      ?? this.app.workspace.getActiveFile();
    return file ?? null;
  }

  private forEachSheetView(fn: (v: CypherSheetView) => void): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CYPHER)) {
      const view = leaf.view;
      if (view instanceof CypherSheetView) fn(view);
    }
  }

  /** Create a blank Cypher character note and open it for editing. */
  private async createBlankCharacter(): Promise<void> {
    // Place it beside the active note's folder, or the vault root.
    const activeDir = this.app.workspace.getActiveFile()?.parent?.path ?? "";
    const base = "New Cypher Character";
    let path = normalizePath((activeDir ? activeDir + "/" : "") + base + ".md");
    let n = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(
        (activeDir ? activeDir + "/" : "") + `${base} ${n}.md`
      );
      n++;
    }

    try {
      const file = await this.app.vault.create(path, BLANK_CHARACTER);
      // Open in the current pane in edit mode so the author lands on the YAML.
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file, { state: { mode: "source" } });
      new Notice(`Created ${file.basename} — edit the cypher block, then Cmd+E.`);
    } catch (err) {
      console.error("Cypher Sheets: failed to create blank character", err);
      new Notice(`Couldn't create character note: ${(err as Error).message}`);
    }
  }

  /** Open (or focus) the preview pane and point it at the active note. */
  private async showSheetForActive(): Promise<void> {
    const file = this.activeCharacterFile();
    if (!file) {
      new Notice("No active note to render.");
      return;
    }
    const text = await this.app.vault.cachedRead(file);
    if (!extractCypherBlock(text)) {
      new Notice("This note has no ```cypher block to render.");
      return;
    }

    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CYPHER)[0];
    if (!leaf) {
      const right = this.app.workspace.getRightLeaf(false);
      if (!right) {
        new Notice("Couldn't open a sidebar pane for the sheet.");
        return;
      }
      leaf = right;
      await leaf.setViewState({ type: VIEW_TYPE_CYPHER, active: true });
    }
    const view = leaf.view;
    if (view instanceof CypherSheetView) view.setFile(file);
    this.app.workspace.revealLeaf(leaf);
  }

  /** Render the active character to a PDF written next to the note. */
  private async exportActiveToPdf(): Promise<void> {
    const file = this.activeCharacterFile();
    if (!file) {
      new Notice("No active note to export.");
      return;
    }
    const notice = new Notice("Exporting character sheet to PDF…", 0);
    try {
      const text = await this.app.vault.cachedRead(file);
      const character = characterFromMarkdown(text);
      const html = renderSheetDocument(character);
      const bytes = await htmlToPdf(html);

      const dir = file.parent?.path ?? "";
      const outPath = normalizePath(
        (dir ? dir + "/" : "") + file.basename + ".pdf"
      );
      const existing = this.app.vault.getAbstractFileByPath(outPath);
      if (existing instanceof TFile) {
        await this.app.vault.modifyBinary(existing, bytes);
      } else {
        await this.app.vault.createBinary(outPath, bytes);
      }
      notice.hide();
      new Notice(`Saved ${outPath}`);
    } catch (err) {
      notice.hide();
      console.error("Cypher Sheets: PDF export failed", err);
      new Notice(`PDF export failed: ${(err as Error).message}`);
    }
  }
}
