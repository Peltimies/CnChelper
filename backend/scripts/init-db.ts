import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db } from '../src/config/database';

dotenv.config();

const SPELLBOOK_FILENAME = '750063928-Castles-Crusades-TLG-Adventurers-Spellbook-OEF-2022-02-15-TLG.txt';
// ponytail: __dirname depth differs between ts-node (backend/scripts) and compiled dist (backend/dist/scripts),
// so try both depths plus cwd-relative fallbacks instead of hardcoding one.
const SPELLBOOK_CANDIDATES = [
  path.resolve(__dirname, '../../', SPELLBOOK_FILENAME),
  path.resolve(__dirname, '../../../', SPELLBOOK_FILENAME),
  path.resolve(process.cwd(), '../', SPELLBOOK_FILENAME),
  path.resolve(process.cwd(), SPELLBOOK_FILENAME),
];
const SPELLBOOK_PATH = SPELLBOOK_CANDIDATES.find(p => fs.existsSync(p)) || SPELLBOOK_CANDIDATES[0];

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

function extractLevelAndClasses(text: string): { level: number; classes: string[] } | null {
  if (!/level/i.test(text)) return null;

  const knownClasses = ['wizard', 'illusionist', 'cleric', 'druid', 'all', 'bard', 'knight', 'paladin', 'ranger'];
  const pairs = [...text.matchAll(/(\d+)\s*([A-Za-z]+)/gi)]
    .filter(m => knownClasses.includes(m[2].toLowerCase()));

  if (pairs.length === 0) return null;

  return {
    level: parseInt(pairs[0][1]),
    classes: [...new Set(pairs.map(p => p[2].toLowerCase()))],
  };
}

function cleanText(text: string): string {
  return text
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/^—\s.*$/gm, '')
    .trim();
}

function parseSpells(content: string): ParsedSpell[] {
  const lines = content.split('\n');
  const spells: ParsedSpell[] = [];
  let i = 0;

  // Find the start of spell descriptions
  while (i < lines.length) {
    if (/spell descriptions/i.test(lines[i])) {
      i++;
      break;
    }
    i++;
  }

  const isSpellHeader = (line: string): boolean => {
    return /^[A-Z][A-Za-z\s'-]+,?\s+lEvEl\s+\d+/i.test(line) || 
           /^[A-Z][A-Za-z\s'-]+\s+lEvEl\s+\d+/i.test(line);
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!isSpellHeader(line)) {
      i++;
      continue;
    }

    const headerMatch = line.match(/^([A-Z][A-Za-z\s'-]*?),?\s+lEvEl\s+(.+)$/i);
    if (!headerMatch) {
      i++;
      continue;
    }

    let name = headerMatch[1].trim();
    const levelInfo = extractLevelAndClasses(`lEvEl ${headerMatch[2]}`);
    
    if (!levelInfo) {
      i++;
      continue;
    }

    const reversible = name.includes('*');
    name = name.replace(/[,.*]+$/, '').trim();

    const fullHeader = line;
    const ctMatch = fullHeader.match(/CT\s+([^\s]+)/i);
    const rMatch = fullHeader.match(/\bR\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+D\s)/i);
    const dMatch = fullHeader.match(/\bD\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+SV\s)/i);
    const svMatch = fullHeader.match(/SV\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+SR\s)/i);
    const srMatch = fullHeader.match(/SR\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+Comp\s)/i);
    const compMatch = fullHeader.match(/Comp\s+(.+?)(?=\s+TA\s|$)/i);
    const taMatch = fullHeader.match(/TA\s+(.+?)(?=\s+School\s|$)/i);
    const schoolMatch = fullHeader.match(/School\s+([^\s]+)/i);

    const spell: ParsedSpell = {
      name: name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
      level: levelInfo.level,
      classes: levelInfo.classes,
      castingTime: ctMatch ? ctMatch[1] : '',
      range: rMatch ? rMatch[1].trim() : '',
      duration: dMatch ? dMatch[1].trim() : '',
      savingThrow: svMatch ? svMatch[1].trim() : '',
      spellResistance: srMatch ? srMatch[1].trim() : '',
      components: compMatch ? compMatch[1].trim() : '',
      targetArea: taMatch ? taMatch[1].trim() : '',
      school: schoolMatch ? schoolMatch[1].trim() : '',
      description: '',
      reversible,
    };

    i++;
    const descLines: string[] = [];

    while (i < lines.length) {
      const nextLine = lines[i].trim();

      if (isSpellHeader(nextLine)) break;

      if (/^[A-Z][A-Za-z\s]+$/.test(nextLine) && nextLine.length < 50 && /spell|rune|magic/i.test(nextLine)) {
        break;
      }

      if (nextLine && !nextLine.startsWith('---') && !nextLine.includes('picture')) {
        descLines.push(nextLine);
      }

      i++;
    }

    spell.description = cleanText(descLines.join('\n'));
    spells.push(spell);
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

  // Check if spellbook file exists
  if (!fs.existsSync(SPELLBOOK_PATH)) {
    console.log('Spellbook file not found, skipping import');
    return;
  }

  const content = fs.readFileSync(SPELLBOOK_PATH, 'utf-8');
  const newSpells = parseSpells(content);
  console.log(`Parsed ${newSpells.length} spells from Adventurers Spellbook`);

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
        'Adventurers Spellbook'
      );
      added++;
    } catch (err) {
      console.error(`Error inserting spell "${spell.name}":`, err);
    }
  }
  db.exec('COMMIT');

  console.log(`Successfully imported ${added} new spells to database`);
}
