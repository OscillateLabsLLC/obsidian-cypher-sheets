/**
 * The Cypher Sheet preview pane. A read-only side view that renders the active
 * (or a pinned) character note as the printable sheet, live-updating as the
 * note's frontmatter changes.
 *
 * Note: with the Reading-view post-processor, most users will just toggle the
 * note itself (Cmd+E). This pane stays useful for pinning a sheet beside the
 * editor while you tweak the YAML.
 */

import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { characterFromMarkdown } from "./block";
import { renderSheetInto } from "./dom";

export const VIEW_TYPE_CYPHER = "cypher-sheet-view";

export class CypherSheetView extends ItemView {
  private file: TFile | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CYPHER;
  }

  getDisplayText(): string {
    return this.file ? `Sheet: ${this.file.basename}` : "Cypher Sheet";
  }

  getIcon(): string {
    return "scroll-text";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("cypher-sheet-preview");
    this.render();
  }

  /** Point the preview at a specific file and re-render. */
  setFile(file: TFile | null): void {
    this.file = file;
    this.render();
  }

  getFile(): TFile | null {
    return this.file;
  }

  /** Re-render if the given file is the one we're showing. */
  refreshIfShowing(file: TFile): void {
    if (this.file && file.path === this.file.path) this.render();
  }

  private async render(): Promise<void> {
    const host = this.contentEl;
    host.empty();

    if (!this.file) {
      host.createEl("p", {
        text: "Open a Cypher character note, then run “Show character sheet”.",
        cls: "cypher-empty",
      });
      return;
    }

    try {
      const text = await this.app.vault.cachedRead(this.file);
      const character = characterFromMarkdown(text);
      renderSheetInto(host.createDiv(), character);
    } catch (err) {
      host.createEl("p", {
        text: `“${this.file.basename}”: ${(err as Error).message}`,
        cls: "cypher-empty",
      });
    }
  }
}
