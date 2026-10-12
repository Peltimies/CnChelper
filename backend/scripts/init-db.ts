import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db } from '../src/config/database';

dotenv.config();

const SPELLBOOK_FILENAME = '750063928-Castles-Crusades-TLG-Adventurers-Spellbook-OEF-2022-02-15-TLG.txt';
// __dirname depth differs between ts-node (backend/scripts) and compiled dist (backend/dist/scripts),
// so try both depths plus cwd-relative fallbacks instead of hardcoding one.
const SPELLBOOK_CANDIDATES = [
  path.resolve(__dirname, '../../', SPELLBOOK_FILENAME),
  path.resolve(__dirname, '../../../', SPELLBOOK_FILENAME),
  path.resolve(process.cwd(), '../', SPELLBOOK_FILENAME),
  path.resolve(process.cwd(), SPELLBOOK_FILENAME),
];
const SPELLBOOK_PATH = SPELLBOOK_CANDIDATES.find(p => fs.existsSync(p)) || SPELLBOOK_CANDIDATES[0];

const SOURCE_TAG = 'Adventurers Spellbook';

interface ParsedSpell {
  name: string;
  level: number;
  classes: string[];
  castingTime: string;
  range: string;
  duration: string;
  savingThrow: string;
  spellResistance: string;
  components: string;
  description: string;
  reversible: boolean;
  school: string;
  targetArea: string;
}

const KNOWN_CLASSES = [
  'wizard', 'illusionist', 'cleric', 'druid', 'bard',
  'knight', 'paladin', 'ranger', 'shaman', 'barbarian', 'rogue', 'monk', 'assassin', 'all',
];

// Common UTF-8-as-latin1 mojibake fixes (the source text is double-encoded)
const MOJIBAKE_MAP: [RegExp, string][] = [
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, '"'],
  [/â€\x9d/g, '"'],
  [/â€\x9c/g, '"'],
  [/â€"/g, '–'],
  [/â€"/g, '—'],
  [/â€¦/g, '…'],
  [/â€¢/g, '•'],
  [/Ã©/g, 'é'],
  [/Ã¨/g, 'è'],
  [/Ã¼/g, 'ü'],
  [/Ã¶/g, 'ö'],
  [/Ã¤/g, 'ä'],
  [/Ã§/g, 'ç'],
];

function fixMojibake(text: string): string {
  let out = text;
  for (const [re, rep] of MOJIBAKE_MAP) out = out.replace(re, rep);
  return out;
}

/**
 * The source file is a two-column PDF text extraction: the left column
 * (one spell) and right column (next spell) are interleaved on the same
 * physical lines. Right-column text starts around column 71-80.
 *
 * We split each physical line into its two column fragments, then emit
 * pages in reading order (left column block, then right column block),
 * flushing at each page-footer line containing "ADVENTURERS SPELLBOOK".
 */
function splitColumns(content: string): string[] {
  const GAP_MIN = 60;  // earliest column-end where right-column text may begin
  const GAP_MAX = 95;  // latest
  const RIGHT_ONLY_INDENT = 50; // line starting with this much space = right column only

  const out: string[] = [];
  let leftBuf: string[] = [];
  let rightBuf: string[] = [];

  const flushPage = () => {
    out.push(...leftBuf, ...rightBuf);
    leftBuf = [];
    rightBuf = [];
  };

  for (const raw of content.split('\n')) {
    // Page footer -> end of page (also skip the footer line itself)
    if (/ADVENTURERS SPELLBOOK/i.test(raw)) {
      flushPage();
      continue;
    }

    const leadingSpaces = raw.length - raw.trimStart().length;
    if (leadingSpaces >= RIGHT_ONLY_INDENT) {
      rightBuf.push(raw.trim());
      continue;
    }

    // Find the first 2+ space gap that ENDS within the column boundary range
    // and is followed by non-space text (the start of the right column).
    let gapStart = -1;
    let gapEnd = -1;
    const re = /\s{2,}(?=\S)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      if (m.index === 0) continue; // leading indent, not a column gap
      const end = m.index + m[0].length;
      if (end > GAP_MAX) break;
      if (end >= GAP_MIN) {
        gapStart = m.index;
        gapEnd = end;
        break;
      }
    }

    if (gapStart === -1) {
      leftBuf.push(raw.trim());
    } else {
      leftBuf.push(raw.slice(0, gapStart).trim());
      rightBuf.push(raw.slice(gapEnd).trim());
    }
  }
  flushPage();

  return out;
}

// A line like "1 illusionist", "cleric, 4 druid, 4 illusionist" or a bare
// class word like "Druid" that continues a wrapped level/class list from
// the header line above.
function isLevelContinuation(line: string): boolean {
  return /^(\d+\s+)?[a-z]+(\s*,\s*(\d+\s+)?[a-z]+)*\s*,?\s*$/i.test(line);
}

// Full spell header: "NAME, Level N class, M class, ..." (may end mid-list)
const HEADER_RE = /^([A-Za-z][A-Za-z0-9\s*'()\-,.]*?),\s*Level\s+(.+)$/;

function parseHeader(line: string): { name: string; levelPart: string } | null {
  const m = line.match(HEADER_RE);
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 2 || name.length > 60) return null;
  const levelPart = m[2];
  // Require at least one "<digit> <known class>" pair; rejects sentences
  // that merely contain "..., level N <word>".
  const hasClass = [...levelPart.matchAll(/(\d+)\s*([a-z]+)/gi)]
    .some(p => KNOWN_CLASSES.includes(p[2].toLowerCase()));
  if (!hasClass) return null;
  return { name, levelPart };
}

function extractLevelAndClasses(levelText: string): { level: number; classes: string[] } | null {
  const pairs = [...levelText.matchAll(/(\d+)\s*([a-z]+)/gi)]
    .filter(p => KNOWN_CLASSES.includes(p[2].toLowerCase()));
  if (pairs.length === 0) return null;
  return {
    level: parseInt(pairs[0][1], 10),
    classes: [...new Set(pairs.map(p => p[2].toLowerCase()))],
  };
}

function parseStatLine(line: string): Partial<ParsedSpell> {
  const out: Partial<ParsedSpell> = {};
  // Handles "CT 1", "CT: 1", "CT1" and the corresponding SV/SR/Comp variants.
  const ctMatch = line.match(/\bCT(?![a-zA-Z]):?\s*(.+?)(?=\s+\bR:?\b|\s{2,}|$)/i);
  const rMatch = line.match(/\bR(?![a-zA-Z]):?\s*(.+?)(?=\s+\bD:?\b|\s{2,}|\s+D:?\s|$)/i);
  const dMatch = line.match(/\bD(?![a-zA-Z]):?\s*(.+?)(?=\s{2,}\S|\s*$)/i);
  const svMatch = line.match(/\bSV(?![a-zA-Z]):?\s*(.+?)(?=\s+\bSR:?\b|\s{2,}|$)/i);
  const srMatch = line.match(/\bSR(?![a-zA-Z]):?\s*(.+?)(?=\s+\bComp:?\b|\s{2,}|$)/i);
  const compMatch = line.match(/\bComp(?![a-zA-Z]):?\s*(.+)$/i);
  const taMatch = line.match(/\bTA:?\s*(.+?)(?=\s+\bSchool:?\b|\s{2,}|$)/i);
  const schoolMatch = line.match(/\bSchool:?\s*(.+?)\s*$/i);

  if (ctMatch) out.castingTime = ctMatch[1].trim();
  if (rMatch) out.range = rMatch[1].trim();
  if (dMatch) out.duration = dMatch[1].trim();
  if (svMatch) out.savingThrow = svMatch[1].trim();
  if (srMatch) out.spellResistance = srMatch[1].trim();
  if (compMatch) out.components = compMatch[1].replace(/^[\s,]+/, '').trim();
  if (taMatch) out.targetArea = taMatch[1].trim();
  if (schoolMatch) out.school = schoolMatch[1].trim();
  return out;
}

function cleanText(text: string): string {
  return fixMojibake(text)
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/^—\s.*$/gm, '')
    .trim();
}

function isNoiseLine(line: string): boolean {
  if (!line) return true;
  if (/^SPELLS$/.test(line)) return true;
  if (/^SPELL DESCRIPTIONS/i.test(line)) return true;
  if (/picture/i.test(line)) return true;
  if (/^-+$/.test(line)) return true;
  return false;
}

const STAT_LINE_RE = /^(CT|SV|TA)[\s:\d]/i;
// Same, but tolerates a short column-bleed fragment before the stat label,
// e.g. "+5          CT 3    R touch    D 2 days/lvl.".
const PREFIXED_STAT_LINE_RE = /^\S{1,8}\s{2,}(CT|SV|TA)[\s:\d]/i;

export function parseSpells(content: string): ParsedSpell[] {
  const lines = splitColumns(content);
  const spells: ParsedSpell[] = [];
  const seen = new Set<string>();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    const header = parseHeader(line);
    if (!header) {
      i++;
      continue;
    }

    // Gather wrapped level/class continuation lines. Continuations are
    // strict enough (comma-separated "N class" items only) that probing
    // unconditionally is safe.
    let levelText = header.levelPart;
    let j = i + 1;
    while (j < lines.length && isLevelContinuation(lines[j].trim())) {
      levelText += ' ' + lines[j].trim();
      j++;
    }

    const levelInfo = extractLevelAndClasses(levelText);
    if (!levelInfo) {
      i++;
      continue;
    }

    let name = header.name.replace(/\s*,\s*$/, '').trim();
    // Strip leftover column fragments stuck to the front of a name,
    // e.g. "CL           GREATER SMOKE TRAP".
    name = name.replace(/^[A-Za-z]{1,3}\s{3,}/, '');
    const reversible = name.includes('*');
    name = name.replace(/[*]+$/, '').trim();
    name = name.replace(/\s+/g, ' ');
    name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    const spell: ParsedSpell = {
      name,
      level: levelInfo.level,
      classes: levelInfo.classes,
      castingTime: '',
      range: '',
      duration: '',
      savingThrow: '',
      spellResistance: '',
      components: '',
      targetArea: '',
      school: '',
      description: '',
      reversible,
    };

    i = j;

    // Stat lines: "CT .. R .. D .." and "SV .. SR .. Comp .." — scan a small
    // window, skipping stray fragments (e.g. wrapped parenthetical lines).
    for (let k = 0; k < 6 && i < lines.length; k++) {
      const next = lines[i].trim();
      if (STAT_LINE_RE.test(next) || PREFIXED_STAT_LINE_RE.test(next)) {
        Object.assign(spell, parseStatLine(next));
        i++;
      } else if (next === '' || (k === 0 && next.length <= 15)) {
        i++; // blank line, or a short leftover fragment right after the header
      } else {
        break;
      }
    }

    // Description until the next header
    const descLines: string[] = [];
    while (i < lines.length) {
      const next = lines[i].trim();
      if (parseHeader(next)) break;
      if (!isNoiseLine(next)) descLines.push(next);
      i++;
    }

    spell.description = cleanText(descLines.join('\n'));

    const key = spell.name.toLowerCase();
    if (!seen.has(key) && spell.name) {
      seen.add(key);
      spells.push(spell);
    }
  }

  return spells;
}

function getExistingSpellNames(): Set<string> {
  try {
    const rows = db.prepare('SELECT name FROM spells').all() as { name: string }[];
    return new Set(rows.map(r => r.name.toLowerCase()));
  } catch {
    return new Set();
  }
}

export async function initializeDatabase() {
  console.log('Initializing database...');

  if (!fs.existsSync(SPELLBOOK_PATH)) {
    console.log(`Spellbook file not found (looked in ${SPELLBOOK_CANDIDATES.join(', ')}), skipping import`);
    return;
  }

  const content = fs.readFileSync(SPELLBOOK_PATH, 'utf-8');
  const newSpells = parseSpells(content);
  console.log(`Parsed ${newSpells.length} spells from Adventurers Spellbook`);

  // Remove previously imported spellbook spells so a re-import replaces
  // them with correctly parsed data instead of skipping by name.
  try {
    const deleted = db.prepare('DELETE FROM spells WHERE source = ?').run(SOURCE_TAG);
    console.log(`Removed ${deleted.changes} previously imported '${SOURCE_TAG}' spells`);
  } catch (err) {
    console.error('Failed to clean old spellbook imports:', err);
  }

  const existingNames = getExistingSpellNames();
  console.log(`Found ${existingNames.size} existing spells in database`);

  const spellsToAdd = newSpells.filter(spell => !existingNames.has(spell.name.toLowerCase()));
  console.log(`${spellsToAdd.length} new spells to add`);

  if (spellsToAdd.length === 0) {
    console.log('No new spells to add.');
    return;
  }

  const stmt = db.prepare(`INSERT INTO spells
    (_id, name, level, classes, castingTime, range, duration, savingThrow, spellResistance, components, targetArea, description, reversible, school, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  db.exec('BEGIN');
  let added = 0;
  for (const spell of spellsToAdd) {
    try {
      stmt.run(
        crypto.randomUUID(),
        spell.name,
        spell.level,
        JSON.stringify(spell.classes),
        spell.castingTime,
        spell.range,
        spell.duration,
        spell.savingThrow,
        spell.spellResistance,
        spell.components,
        spell.targetArea,
        spell.description,
        spell.reversible ? 1 : 0,
        spell.school,
        SOURCE_TAG
      );
      added++;
    } catch (err) {
      console.error(`Error inserting spell "${spell.name}":`, err);
    }
  }
  db.exec('COMMIT');

  console.log(`Successfully imported ${added} new spells to database`);
}
