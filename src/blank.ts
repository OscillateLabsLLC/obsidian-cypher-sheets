/**
 * The blank-character template. A new note seeded with a ```cypher block
 * containing the full Tier 1 schema and example rows, so authors edit a working
 * skeleton as plain YAML in the note body. v1: Tier 1, no validation.
 */

export const BLANK_CHARACTER = `# New Cypher Character

\`\`\`cypher
name: New Character
sentence: "I am a [descriptor] [type] who [focus]."
descriptor: Adjective
type: Type
focus: Does Something
tier: 1
effort: 1
cypher_limit: 2
might: { pool: 10, edge: 0 }
speed: { pool: 10, edge: 0 }
intellect: { pool: 10, edge: 0 }
wounds: { minor: 5, moderate: 4, major: 3 }
defend: "Block = Might defense · Dodge = Speed defense, negate."
armor: "None."
skills:
  - A trained skill (trained)
  - An inability (inability)
abilities:
  - name: First Ability
    cost: "1 Int"
    text: "What it does."
  - name: Second Ability
    text: "Abilities without a cost just omit the cost field."
cyphers: 2
gear:
  - item one
  - item two
attacks:
  - { name: "Attack name", modifier: "—", damage: "4" }
# Tier advancements bought so far this tier (4 XP each, once per tier).
# Buying all four moves you to the next tier.
advancement:
  capabilities: false   # +4 points into stat Pools
  perfection: false     # +1 to the Edge of your choice
  effort: false         # +1 Effort (max 6)
  training: false       # gain a new skill or improve an existing one
  other: false          # alternate advancement from the Cypher GM's Guide
background: "A sentence or two of who they are and why they're here."
\`\`\`

> Edit the YAML above, then toggle to **Reading view** (Cmd+E) to see the sheet
> render in place. Run **Cypher Sheets: Export character sheet to PDF** for a
> printable copy.
>
> \`skills\` use \`Name (level)\` where \`level\` is \`trained\`,
> \`specialized\`, \`expert\`, or \`inability\`. Stat pools accept \`10\` or
> \`{ pool: 10, edge: 1 }\`.
>
> \`advancement\` also accepts a short list of what you've bought this tier,
> e.g. \`advancement: [capabilities, effort]\`. Reset it to empty when you
> reach a new tier.
`;
