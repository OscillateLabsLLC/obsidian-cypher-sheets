/**
 * Character data model + normalization.
 *
 * Ported from the Python engine's normalize(): accept the loose YAML
 * frontmatter shape an author writes and fill defaults so the renderer can
 * assume a clean object. v1 is Tier 1 only — no validation, no calculation.
 */

export type SkillLevel = "trained" | "specialized" | "expert" | "inability";

export interface Stat {
  pool: number;
  edge: number;
}

export interface Wounds {
  minor: number;
  moderate: number;
  major: number;
  note?: string;
}

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface Ability {
  name: string;
  cost?: string;
  text: string;
}

export interface Attack {
  name: string;
  modifier: string;
  damage: string;
}

/**
 * The four per-tier advancements plus the GM's-Guide "other" slot, as printed
 * on the official C2 sheet. Each is bought once per tier, in any order; buying
 * all four moves the character to the next tier.
 */
export interface Advancement {
  capabilities: boolean;
  perfection: boolean;
  effort: boolean;
  training: boolean;
  other: boolean;
  note?: string;
}

export interface Character {
  name: string;
  sentence: string;
  descriptor: string;
  type: string;
  focus: string;
  tier: number;
  effort: number;
  cypher_limit: number;
  cyphers: number;
  might: Stat;
  speed: Stat;
  intellect: Stat;
  wounds: Wounds;
  defend: string;
  armor: string;
  skills: Skill[];
  abilities: Ability[];
  attacks: Attack[];
  gear: string[];
  advancement: Advancement;
  background?: string;
}

/** A YAML frontmatter object as Obsidian hands it to us (untyped). */
export type Frontmatter = Record<string, unknown>;

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}

/** `8`, `{pool: 8}`, or `{pool: 8, edge: 1}` -> {pool, edge}. */
function normStat(v: unknown): Stat {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return { pool: num(o.pool, 0), edge: num(o.edge, 0) };
  }
  return { pool: num(v, 0), edge: 0 };
}

function normWounds(v: unknown): Wounds {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    minor: num(o.minor, 0),
    moderate: num(o.moderate, 0),
    major: num(o.major, 0),
    note: o.note != null ? String(o.note) : undefined,
  };
}

const SKILL_RE = /^(.*?)\s*\((trained|specialized|expert|inability)\)\s*$/i;

/** "Charm", "Charm (inability)", or {name, level} -> Skill. */
function normSkill(v: unknown): Skill {
  if (typeof v === "string") {
    const m = v.match(SKILL_RE);
    if (m) return { name: m[1].trim(), level: m[2].toLowerCase() as SkillLevel };
    return { name: v.trim(), level: "trained" };
  }
  const o = (v ?? {}) as Record<string, unknown>;
  const level = String(o.level ?? "trained").toLowerCase() as SkillLevel;
  return { name: str(o.name), level };
}

function normAbility(v: unknown): Ability {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    name: str(o.name),
    cost: o.cost != null ? String(o.cost) : undefined,
    text: str(o.text),
  };
}

function normAttack(v: unknown): Attack {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    name: str(o.name),
    modifier: str(o.modifier, "—"),
    damage: str(o.damage),
  };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "yes" || s === "x" || s === "1";
}

export const ADVANCEMENT_KEYS = [
  "capabilities",
  "perfection",
  "effort",
  "training",
  "other",
] as const;

/** Author shorthand -> canonical advancement key. */
const ADVANCEMENT_ALIASES: Record<string, (typeof ADVANCEMENT_KEYS)[number]> = {
  capabilities: "capabilities",
  increase_capabilities: "capabilities",
  pools: "capabilities",
  perfection: "perfection",
  move_toward_perfection: "perfection",
  edge: "perfection",
  effort: "effort",
  extra_effort: "effort",
  training: "training",
  skill: "training",
  skill_training: "training",
  other: "other",
};

function advancementKey(raw: string): (typeof ADVANCEMENT_KEYS)[number] | null {
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ADVANCEMENT_ALIASES[k] ?? null;
}

/**
 * Accept either a map (`{effort: true}`) or a list of the advancements bought
 * this tier (`[capabilities, effort]`); anything unrecognized leaves the boxes
 * unchecked so the sheet prints blank for hand-tracking.
 */
function normAdvancement(v: unknown): Advancement {
  const adv: Advancement = {
    capabilities: false,
    perfection: false,
    effort: false,
    training: false,
    other: false,
  };
  if (Array.isArray(v)) {
    for (const entry of v) {
      const key = advancementKey(String(entry ?? ""));
      if (key) adv[key] = true;
    }
    return adv;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const [rawKey, rawVal] of Object.entries(o)) {
      const key = advancementKey(rawKey);
      if (key) adv[key] = bool(rawVal);
    }
    if (o.note != null) adv.note = String(o.note);
  }
  return adv;
}

/** Turn loose frontmatter into a clean Character with all defaults filled. */
export function normalize(fm: Frontmatter): Character {
  const cypherLimit = num(fm.cypher_limit, 2);
  return {
    name: str(fm.name, "Unnamed"),
    sentence: str(fm.sentence),
    descriptor: str(fm.descriptor),
    type: str(fm.type),
    focus: str(fm.focus),
    tier: num(fm.tier, 1),
    effort: num(fm.effort, 1),
    cypher_limit: cypherLimit,
    cyphers: num(fm.cyphers, cypherLimit),
    might: normStat(fm.might),
    speed: normStat(fm.speed),
    intellect: normStat(fm.intellect),
    wounds: normWounds(fm.wounds),
    defend: str(fm.defend),
    armor: str(fm.armor, "—"),
    skills: asArray(fm.skills).map(normSkill),
    abilities: asArray(fm.abilities).map(normAbility),
    attacks: asArray(fm.attacks).map(normAttack),
    gear: asArray(fm.gear).map((g) => String(g)),
    advancement: normAdvancement(fm.advancement),
    background: fm.background != null ? String(fm.background) : undefined,
  };
}

/**
 * Detect whether a note is a Cypher character sheet. v1 heuristic: it has a
 * `cypher` flag, or it carries the three stat pools. Keeps the plugin from
 * trying to render arbitrary notes.
 */
export function isCharacterNote(fm: Frontmatter | null | undefined): boolean {
  if (!fm) return false;
  if (fm.cypher === true || fm.cypher_sheet === true) return true;
  return "might" in fm && "speed" in fm && "intellect" in fm;
}
