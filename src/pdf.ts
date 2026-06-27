/**
 * PDF export via Electron's printToPDF — the same mechanism Obsidian's own
 * "Export to PDF" uses. We load the sheet HTML into an offscreen
 * BrowserWindow, print it to a Letter-sized PDF buffer, and hand the bytes
 * back to the caller to write into the vault.
 *
 * Desktop-only: Electron is unavailable on mobile (manifest sets
 * isDesktopOnly), so this module is never reached there.
 */

// Electron is provided by the Obsidian runtime; it's marked external in esbuild.
// We pull `remote` lazily so a missing API degrades to a clear error rather
// than a load-time crash.
type PrintToPDFOptions = {
  pageSize?: string | { width: number; height: number };
  printBackground?: boolean;
  marginsType?: number;
  landscape?: boolean;
};

interface BrowserWindowLike {
  loadURL(url: string): Promise<void>;
  webContents: {
    printToPDF(opts: PrintToPDFOptions): Promise<Buffer>;
    on(event: string, cb: (...args: unknown[]) => void): void;
    once(event: string, cb: (...args: unknown[]) => void): void;
  };
  destroy(): void;
  isDestroyed(): boolean;
}

interface BrowserWindowCtor {
  new (opts: Record<string, unknown>): BrowserWindowLike;
}

function getBrowserWindow(): BrowserWindowCtor {
  // Obsidian desktop exposes Electron. BrowserWindow lives on the remote
  // module (older Electron bundled `remote`, newer uses `@electron/remote`),
  // falling back to the main electron export in the rare case it's present.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require("electron");
  // `@electron/remote` is the supported module (the legacy `electron.remote`
  // was deprecated in Electron 12). Prefer it; fall back to the legacy remote,
  // then to a direct BrowserWindow export, so this works across the Electron
  // versions Obsidian has shipped.
  let remote: { BrowserWindow?: BrowserWindowCtor } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remote = require("@electron/remote");
  } catch {
    remote = electron.remote;
  }
  const BW = (remote?.BrowserWindow ?? electron.remote?.BrowserWindow ?? electron.BrowserWindow) as
    | BrowserWindowCtor
    | undefined;
  if (!BW) {
    throw new Error(
      "Could not access Electron BrowserWindow — PDF export is desktop-only."
    );
  }
  return BW;
}

/**
 * Render `html` to a US-Letter PDF and return the bytes.
 * Background graphics on; margins handled by the document's own @page rule.
 */
export async function htmlToPdf(html: string): Promise<ArrayBuffer> {
  const BrowserWindow = getBrowserWindow();
  // A hidden (not offscreen) window paints reliably — offscreen rendering is a
  // known source of blank printToPDF output. sandbox:false lets the page load.
  const win = new BrowserWindow({
    show: false,
    width: 850,
    height: 1100,
    webPreferences: { sandbox: false },
  });

  try {
    const dataUrl =
      "data:text/html;charset=utf-8," + encodeURIComponent(html);

    // Wait for the page to actually finish loading before printing, rather
    // than racing a fixed timeout. loadURL resolving isn't sufficient on all
    // Electron builds, so we also wait on the did-finish-load event.
    const loaded = new Promise<void>((resolve, reject) => {
      win.webContents.once("did-finish-load", () => resolve());
      win.webContents.once("did-fail-load", (...args: unknown[]) =>
        reject(new Error(`Page failed to load: ${String(args[2] ?? "")}`))
      );
    });
    await win.loadURL(dataUrl);
    await loaded;
    // A short settle for fonts/layout after load completes.
    await new Promise((r) => setTimeout(r, 80));

    const buffer = await win.webContents.printToPDF({
      pageSize: "Letter",
      printBackground: true,
      landscape: false,
      // marginsType 1 = no margins (the @page rule supplies them).
      marginsType: 1,
    });
    // Node Buffer -> a standalone ArrayBuffer sized exactly to the data.
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
