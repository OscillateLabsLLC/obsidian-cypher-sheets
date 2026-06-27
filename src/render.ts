/**
 * Render a normalized Character to a self-contained HTML string.
 *
 * This is a direct port of the Python engine's template.html.j2 + render_html().
 * The CSS is kept identical so the Obsidian preview and the PDF match the
 * standalone tool's output. Electron's Chromium handles flexbox fine, so the
 * table-based workarounds carried over from WeasyPrint are simply harmless.
 */

import type { Ability, Character, Skill } from "./character";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLE = `
  @page { size: Letter portrait; margin: 0.34in 0.36in 0.28in; }
  .cypher-sheet * { box-sizing: border-box; margin: 0; padding: 0; }
  .cypher-sheet {
    --maroon: #6e1f24;
    --maroon-soft: #f3e4e1;
    --ink: #2a2018;
    --line: #c9b8b3;
    --box: #fbf5f3;
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #2a2018;
    background: #fff;
    font-size: 9.2pt;
    line-height: 1.28;
  }
  /* When shown inside Obsidian (reading view / side pane), give the sheet a
     light frame and a Letter-ish max width so it reads like a printed page
     rather than stretching to the full editor width. Harmless in the PDF,
     where the sheet is the whole page. */
  .cypher-sheet-reading .cypher-sheet,
  .cypher-sheet-preview .cypher-sheet {
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.34in 0.36in;
    border: 1px solid var(--line);
    box-shadow: 0 1px 6px rgba(0,0,0,0.12);
  }
  .cypher-sheet .band {
    background: var(--maroon); color: #fff;
    font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    font-size: 7.6pt; padding: 2.5px 7px; border-radius: 2px;
  }
  .cypher-sheet header { border-bottom: 2.5px solid var(--maroon); padding-bottom: 6px; margin-bottom: 7px; }
  .cypher-sheet .brand { display: flex; align-items: baseline; justify-content: space-between; }
  .cypher-sheet .brand .logo { color: var(--maroon); font-weight: 800; font-size: 17pt; letter-spacing: .03em; }
  .cypher-sheet .brand .logo sup { font-size: 8pt; }
  .cypher-sheet .brand .tier { font-size: 8pt; color: #6b5a52; }
  .cypher-sheet .brand .tier b { color: var(--maroon); font-size: 10pt; }
  .cypher-sheet .name { font-size: 19pt; font-weight: 800; color: var(--ink); margin-top: 3px; line-height: 1.05; }
  .cypher-sheet .sentence { font-size: 10.5pt; font-style: italic; color: var(--maroon); margin-top: 1px; }
  .cypher-sheet .sentence .parts { font-style: normal; color: #6b5a52; font-size: 8pt; letter-spacing: .04em; text-transform: uppercase; margin-top: 2px; }
  .cypher-sheet .background { font-size: 8.6pt; color: #5a4a42; margin-top: 4px; }
  .cypher-sheet .pools { display: flex; gap: 8px; margin: 9px 0 7px; }
  .cypher-sheet .pool { flex: 1; border: 1.5px solid var(--maroon); border-radius: 4px; overflow: hidden; background: var(--box); }
  .cypher-sheet .pool .ptitle { background: var(--maroon); color: #fff; text-align: center; font-weight: 700; font-size: 8pt; letter-spacing: .08em; padding: 2px 0; }
  .cypher-sheet .pool .pvals { display: flex; }
  .cypher-sheet .pool .pv { flex: 2; text-align: center; padding: 6px 0 3px; }
  .cypher-sheet .pool .pe { flex: 1; text-align: center; padding: 6px 0 3px; border-left: 1px solid var(--line); background: var(--maroon-soft); }
  .cypher-sheet .pool .num { font-size: 18pt; font-weight: 800; color: var(--ink); line-height: 1; }
  .cypher-sheet .pool .lab { font-size: 6pt; letter-spacing: .1em; color: #8a756c; text-transform: uppercase; margin-top: 2px; }
  .cypher-sheet .body { display: table; width: 100%; border-spacing: 0; table-layout: fixed; }
  .cypher-sheet .col { display: table-cell; vertical-align: top; }
  .cypher-sheet .col.left { width: 3.5in; padding-right: 10px; }
  .cypher-sheet .col.right { width: auto; }
  .cypher-sheet section { margin-bottom: 8px; }
  .cypher-sheet section > .band { margin-bottom: 4px; }
  .cypher-sheet .wounds table { border-collapse: collapse; }
  .cypher-sheet .wounds td { padding: 1.5px 0; vertical-align: middle; }
  .cypher-sheet .wounds td.wlab { width: 70px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding-right: 6px; }
  .cypher-sheet .wounds .minor td.wlab { color: #4a7a4a; }
  .cypher-sheet .wounds .moderate td.wlab { color: #b5852a; }
  .cypher-sheet .wounds .major td.wlab { color: var(--maroon); }
  .cypher-sheet .boxes { font-size: 0; }
  .cypher-sheet .box { display: inline-block; width: 13px; height: 13px; margin-right: 3px; border: 1.4px solid #8a756c; border-radius: 2px; }
  .cypher-sheet .box.major { border-color: var(--maroon); }
  .cypher-sheet .wnote { font-size: 7.2pt; color: #8a756c; font-style: italic; margin-top: 2px; }
  .cypher-sheet .kv { font-size: 8.4pt; margin-bottom: 2px; }
  .cypher-sheet .kv b { color: var(--maroon); text-transform: uppercase; font-size: 7pt; letter-spacing: .05em; }
  .cypher-sheet table.skills { width: 100%; border-collapse: collapse; }
  .cypher-sheet table.skills td { padding: 1.5px 3px; border-bottom: 1px dotted var(--line); font-size: 8.4pt; }
  .cypher-sheet table.skills td.lv { width: 92px; text-align: right; }
  .cypher-sheet .tsei { display: inline-flex; gap: 2px; }
  .cypher-sheet .tsei span { width: 13px; height: 13px; border: 1px solid var(--line); border-radius: 2px; font-size: 6.5pt; text-align: center; line-height: 13px; color: #b9a8a2; font-weight: 700; }
  .cypher-sheet .tsei span.on { background: var(--maroon); color: #fff; border-color: var(--maroon); }
  .cypher-sheet .tsei span.inab { background: #fff; color: var(--maroon); border-color: var(--maroon); }
  .cypher-sheet table.atk { width: 100%; border-collapse: collapse; }
  .cypher-sheet table.atk th { background: var(--maroon); color: #fff; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .05em; padding: 2px 4px; text-align: left; }
  .cypher-sheet table.atk th.r, .cypher-sheet table.atk td.r { text-align: right; }
  .cypher-sheet table.atk td { padding: 2px 4px; border-bottom: 1px dotted var(--line); font-size: 8.2pt; }
  .cypher-sheet .ability { margin-bottom: 4px; border-left: 2.5px solid var(--maroon-soft); padding-left: 6px; }
  .cypher-sheet .ability .an { font-weight: 700; font-size: 8.8pt; color: var(--ink); }
  .cypher-sheet .ability .ac { font-size: 7pt; color: #fff; background: var(--maroon); border-radius: 3px; padding: 0 4px; margin-left: 4px; font-weight: 700; vertical-align: 1px; }
  .cypher-sheet .ability .at { font-size: 8.3pt; color: #3a2e28; }
  .cypher-sheet .cyphers .cline { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 8.4pt; }
  .cypher-sheet .cyphers .cnum { color: var(--maroon); font-weight: 800; }
  .cypher-sheet .cyphers .cfill { flex: 1; border-bottom: 1.2px solid #b9a8a2; height: 13px; }
  .cypher-sheet .cyphers .climit { font-size: 7.5pt; color: #6b5a52; margin-bottom: 4px; }
  .cypher-sheet .cyphers .climit b { color: var(--maroon); }
  .cypher-sheet .gear ul { list-style: none; }
  .cypher-sheet .gear li { font-size: 8.4pt; padding: 1px 0 1px 11px; position: relative; border-bottom: 1px dotted var(--line); }
  .cypher-sheet .gear li::before { content: "\\25C6"; position: absolute; left: 0; color: var(--maroon); font-size: 6pt; top: 3px; }
  .cypher-sheet .gear li.blank { min-height: 14px; }
  .cypher-sheet .gear li.blank::before { content: ""; }
  .cypher-sheet .notes .line { height: 17px; border-bottom: 1px solid var(--line); }
`;

const CHARS_PER_LINE = 62;
const USABLE_ROWS = 44;

/** Estimate ruled Notes lines that fit under the abilities (ported heuristic). */
function noteLines(abilities: Ability[]): number {
  let rows = 2; // the two section banners
  for (const ab of abilities) {
    rows += 1; // name row
    rows += Math.max(1, Math.ceil((ab.text?.length ?? 0) / CHARS_PER_LINE));
    rows += 0.4; // amortized inter-ability margin
  }
  return Math.trunc(Math.max(4, Math.min(40, USABLE_ROWS - rows)));
}

function skillPips(s: Skill): string {
  if (s.level === "inability") {
    return `<span class="tsei"><span class="inab">I</span></span>`;
  }
  const on = (cond: boolean) => (cond ? "on" : "");
  const t = on(true);
  const sp = on(s.level === "specialized" || s.level === "expert");
  const e = on(s.level === "expert");
  return `<span class="tsei"><span class="${t}">T</span><span class="${sp}">S</span><span class="${e}">E</span></span>`;
}

/** Render the inner sheet markup (no <html>/<head>), reusable in preview + PDF. */
export function renderSheetBody(c: Character): string {
  const pools = [
    { label: "MIGHT", ...c.might },
    { label: "SPEED", ...c.speed },
    { label: "INTELLECT", ...c.intellect },
  ];
  const woundRows = [
    { key: "minor", count: c.wounds.minor },
    { key: "moderate", count: c.wounds.moderate },
    { key: "major", count: c.wounds.major },
  ];
  const blankInventory = Math.max(2, Math.min(6, 8 - c.gear.length));
  const notes = noteLines(c.abilities);

  const poolsHtml = pools
    .map(
      (p) => `
      <div class="pool">
        <div class="ptitle">${esc(p.label)}</div>
        <div class="pvals">
          <div class="pv"><div class="num">${esc(p.pool)}</div><div class="lab">Pool</div></div>
          <div class="pe"><div class="num">${esc(p.edge)}</div><div class="lab">Edge</div></div>
        </div>
      </div>`
    )
    .join("");

  const woundsHtml = woundRows
    .map(
      (wr) => `
            <tr class="${wr.key}">
              <td class="wlab">${esc(wr.key)}</td>
              <td><span class="boxes">${`<span class="box ${wr.key}"></span>`.repeat(
                Math.max(0, wr.count)
              )}</span></td>
            </tr>`
    )
    .join("");

  const skillsHtml = c.skills
    .map(
      (s) => `
            <tr><td>${esc(s.name)}</td><td class="lv">${skillPips(s)}</td></tr>`
    )
    .join("");

  const attacksHtml = c.attacks.length
    ? `
        <section>
          <div class="band">Attacks</div>
          <table class="atk">
            <tr><th>Attack</th><th>Modifier</th><th class="r">Damage</th></tr>
            ${c.attacks
              .map(
                (a) =>
                  `<tr><td>${esc(a.name)}</td><td>${esc(a.modifier)}</td><td class="r">${esc(
                    a.damage
                  )}</td></tr>`
              )
              .join("")}
          </table>
        </section>`
    : "";

  const cyphersHtml = Array.from(
    { length: Math.max(0, c.cyphers) },
    (_, n) =>
      `<div class="cline"><span class="cnum">${n + 1}.</span><span class="cfill"></span></div>`
  ).join("");

  const gearHtml =
    c.gear.map((g) => `<li>${esc(g)}</li>`).join("") +
    `<li class="blank">&nbsp;</li>`.repeat(blankInventory);

  const abilitiesHtml = c.abilities
    .map(
      (ab) => `
          <div class="ability">
            <div class="an">${esc(ab.name)}${
              ab.cost ? `<span class="ac">${esc(ab.cost)}</span>` : ""
            }</div>
            <div class="at">${esc(ab.text)}</div>
          </div>`
    )
    .join("");

  const notesHtml = `<div class="line"></div>`.repeat(notes);

  return `
  <div class="cypher-sheet">
    <header>
      <div class="brand">
        <span class="logo">CYPHER<sup>&trade;</sup></span>
        <span class="tier">TIER <b>${esc(c.tier)}</b> &nbsp;&middot;&nbsp; EFFORT <b>${esc(
    c.effort
  )}</b> &nbsp;&middot;&nbsp; CYPHER LIMIT <b>${esc(c.cypher_limit)}</b></span>
      </div>
      <div class="name">${esc(c.name)}</div>
      <div class="sentence">
        ${esc(c.sentence)}
        <div class="parts">${esc(c.descriptor)} &nbsp;|&nbsp; ${esc(c.type)} &nbsp;|&nbsp; ${esc(
    c.focus
  )}</div>
      </div>
      ${c.background ? `<div class="background">${esc(c.background)}</div>` : ""}
    </header>

    <div class="pools">${poolsHtml}</div>

    <div class="body">
      <div class="col left">
        <section class="wounds">
          <div class="band">Wounds &amp; Damage Track</div>
          <table>${woundsHtml}</table>
          <div class="wnote">3rd major wound = dead. A full Moderate row = all actions hindered.${
            c.wounds.note ? " " + esc(c.wounds.note) : ""
          }</div>
        </section>

        <section>
          <div class="band">Defense</div>
          <div class="kv"><b>Defend</b> &nbsp;${esc(c.defend)}</div>
          <div class="kv"><b>Armor</b> &nbsp;${esc(c.armor)}</div>
        </section>

        <section>
          <div class="band">Skills &amp; Inabilities</div>
          <table class="skills">${skillsHtml}</table>
        </section>

        ${attacksHtml}

        <section class="cyphers">
          <div class="band">Cyphers</div>
          <div class="climit">Cypher limit: <b>${esc(
            c.cypher_limit
          )}</b> &mdash; discharge after use.</div>
          ${cyphersHtml}
        </section>

        <section class="gear">
          <div class="band">Inventory &amp; Equipment</div>
          <ul>${gearHtml}</ul>
        </section>
      </div>

      <div class="col right">
        <section>
          <div class="band">Special Abilities</div>
          ${abilitiesHtml}
        </section>

        <section class="notes">
          <div class="band">Notes</div>
          ${notesHtml}
        </section>
      </div>
    </div>
  </div>`;
}

/** A full standalone HTML document (used for PDF export). */
export function renderSheetDocument(c: Character): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(c.name)} — Cypher System Character Sheet</title>
<style>${STYLE}</style>
</head>
<body>${renderSheetBody(c)}</body>
</html>`;
}

/** The CSS, exposed so the preview view can inject it into the document once. */
export function sheetStyle(): string {
  return STYLE;
}
