# Cypher Sheets — Obsidian plugin

[![Status: Proof of Concept](https://img.shields.io/badge/status-proof%20of%20concept-orange)](https://github.com/OscillateLabsLLC/.github/blob/main/SUPPORT_STATUS.md)

Render a **Cypher System** character — written as a ```` ```cypher ```` YAML
block in a note — as a printable one-page character sheet inside Obsidian, and
export it to PDF.

Write a character's stats as plain YAML; flip the note to Reading view (`Cmd+E`)
and the block renders as a styled sheet you can hand to a player or print.

> **Scope:** Tier 1 characters; no validation, no calculation. The data is
> rendered exactly as written — pools, edges, wounds, skills, and abilities are
> author-supplied. This is an early proof of concept.

## Install

This plugin is not (yet) in the Obsidian community store, so install it manually:

1. Download `manifest.json` and `main.js` from the
   [latest release](https://github.com/OscillateLabsLLC/obsidian-cypher-sheets/releases),
   or build them yourself (see below).
2. Copy both files into your vault at
   `<vault>/.obsidian/plugins/cypher-sheets/`.
3. Reload Obsidian (Command palette → **Reload app without saving**) so it scans
   the new plugin.
4. Enable **Cypher Sheets** in Settings → Community plugins.

### Build from source

```bash
npm install
npm run build      # produces main.js
```

`npm run dev` runs an esbuild watch for live iteration. Desktop only — PDF export
uses Electron, which isn't available on Obsidian mobile.

## Use

1. Command palette → **Cypher Sheets: New blank Cypher character** creates a note
   pre-filled with a ```` ```cypher ```` skeleton — the fastest way to start.
   (Or add a ```` ```cypher ```` block to any note yourself.)
2. Edit the YAML in the block. In **Reading view** (toggle with **Cmd+E**) the
   block renders in place as the sheet. To edit the raw YAML, use **Source mode**
   (the `⋯` menu → "Source mode") — Live Preview renders the block, so Source
   mode gives you the plain text.
3. Run **Cypher Sheets: Export character sheet to PDF** to write `<note name>.pdf`
   next to the note.
4. **Cypher Sheets: Show character sheet (preview)** (or the ribbon scroll icon)
   pins the sheet in the right sidebar beside the editor.

## Authoring format

The character lives in a fenced ```` ```cypher ```` block in the note body — so
the data stays plain, always-editable YAML (Obsidian's Properties panel can't
edit lists of objects, which is why this isn't frontmatter).

````markdown
# Bobby Reyes

```cypher
name: Bobby Reyes
sentence: "I am an Empathic Psion who Consorts with the Dead."
descriptor: Empathic
type: Psion
focus: Consorts with the Dead
tier: 1
effort: 1
cypher_limit: 2
might:     { pool: 8,  edge: 0 }
speed:     { pool: 10, edge: 0 }
intellect: { pool: 18, edge: 1 }
wounds:    { minor: 5, moderate: 4, major: 3 }
defend: "Block = Might defense · Dodge = Speed defense, negate."
armor: "None."
skills:
  - Charm (trained)               # Name (level)
  - Intellect defense (inability)
abilities:
  - name: Mind Reading
    cost: "2 Int"                 # omit cost for passive abilities
    text: "Read a visible creature's surface thoughts in short range."
attacks:
  - { name: "Force ray", modifier: "—", damage: "4" }
cyphers: 2                        # number of blank GM-fill cypher slots
gear: [extendable baton, phone]
background: "A self-taught medium the dead talk to."
```
````

### Field notes

- **Stat pools** accept `8` shorthand or `{ pool: 8, edge: 1 }` (edge defaults 0).
- **Skills** use the `Name (level)` form, where `level` is `trained`,
  `specialized`, `expert`, or `inability`. (The verbose
  `{ name, level }` form also works.)
- **Abilities / attacks** are lists of objects — edit them in the YAML block.
- **Notes** and **inventory write-in lines** are added automatically to fill the
  sheet; their count adapts to the character's content.

## Commands

| Command | What it does |
|---|---|
| **New blank Cypher character** | Creates a note seeded with a `cypher` skeleton |
| **Show character sheet (preview)** | Pins the sheet in the right sidebar |
| **Export character sheet to PDF** | Writes `<note name>.pdf` next to the note |

## Note on metadata queries

Because the data lives in a code block rather than frontmatter, it is **not**
indexed by Obsidian's metadata cache — Dataview and property search won't see
`might:` etc. That's intentional (it's what makes the YAML freely editable); for
printable handout sheets it doesn't matter. If you need vault-wide character
queries, add a small `cypher: true` frontmatter flag alongside the block.

## License & attribution

Released under the MIT License (see [`LICENSE`](LICENSE)).

This is an unofficial fan-made tool. The **Cypher System** is a trademark of
Monte Cook Games, LLC. This project is not affiliated with, endorsed, or
sponsored by Monte Cook Games. No game rules text is distributed — you supply
your own character data.
