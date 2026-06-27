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
