import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db } from '../src/config/database';

dotenv.config();

const PHB_PATH = path.resolve(__dirname, '../../TLG 80107 Players Handbook Alternate Digital.md');

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
}

function extractLevelAndClasses(text: string): { level: number; classes: string[] } | null {
  if (!/lEvEl/i.test(text)) return null;

  const knownClasses = ['wizard', 'illusionist', 'cleric', 'druid', 'all', 'bard', 'knight', 'paladin', 'ranger'];
  const pairs = [...text.matchAll(/(\d+)\s*([A-Za-z]+)/gi)]
    .filter(m => knownClasses.includes(m[2].toLowerCase()));

  if (pairs.length === 0) return null;

  return {
    level: parseInt(pairs[0][1]),
    classes: [...new Set(pairs.map(p => p[2].toLowerCase()))],
  };
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/_([^_]+)_/g, '$1')
    .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/^—\s.*$/gm, '')
    .trim();
}

function parseSpells(content: string): ParsedSpell[] {
  const lines = content.split('\n');
  const spells: ParsedSpell[] = [];
  let inSpellSection = false;
  let i = 0;

  const isSpellHeader = (line: string): boolean => {
    if (line.startsWith('## ') && /lEvEl/i.test(line)) {
      return !line.includes('Spell Descriptions') && !line.includes('SPELL FORMAT') && !line.includes('SPELL DESCRIPTIONS') && !line.includes('MAGIC - Spell Descriptions');
    }
    if (line.startsWith('|') && /lEvEl/i.test(line)) return true;
    if (line.startsWith('**') && /lEvEl/i.test(line) && !line.includes('picture')) return true;
    return false;
  };

  const stripHeader = (line: string): string => {
    return line
      .replace(/^##\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/\|/g, ' ')
      .replace(/<br>/gi, ' ')
      .trim();
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.includes('Spell Descriptions - MAGIC') || line.includes('SPELL DESCRIPTIONS')) {
      inSpellSection = true;
      i++;
      continue;
    }

    if (!inSpellSection) {
      i++;
      continue;
    }

    if (!isSpellHeader(line)) {
      i++;
      continue;
    }

    const headerText = stripHeader(line);

    if (headerText.match(/^[A-Z]$/)) {
      i++;
      continue;
    }

    const levelInfo = extractLevelAndClasses(headerText);
    if (!levelInfo) {
      i++;
      continue;
    }

    const nameMatch = headerText.match(/^(.+?),?\s*lEvEl/i);
    let name = nameMatch ? nameMatch[1].trim() : headerText.split(/lEvEl/i)[0].trim();
    const reversible = name.includes('*');
    name = name.replace(/[,.*]+$/, '').trim();

    const nameParts = name.split(',').map(p => p.trim()).filter(p => p);
    if (nameParts.length > 1) {
      name = nameParts[0];
      for (let j = 1; j < nameParts.length; j++) {
        if (!name.toLowerCase().includes(nameParts[j].toLowerCase())) {
          name += ' ' + nameParts[j];
        }
      }
    }

    const ctMatch = headerText.match(/CT\s+([^\s]+)/i);
    const rMatch = headerText.match(/\bR\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+D\s)/i);
    const dMatch = headerText.match(/\bD\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+SV\s)/i);
    const svMatch = headerText.match(/SV\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+SR\s)/i);
    const srMatch = headerText.match(/SR\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+Comp\s)/i);
    const compMatch = headerText.match(/Comp\s+(.+)$/i);

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
      description: '',
      reversible,
    };

    i++;
    const descLines: string[] = [];

    while (i < lines.length) {
      const nextLine = lines[i].trim();

      if (isSpellHeader(nextLine)) break;

      if (nextLine.startsWith('## ')) {
        if (nextLine.includes('MAGIC - Spell Descriptions') || nextLine.includes('Spell Descriptions - MAGIC') || nextLine.includes('SPELL DESCRIPTIONS')) {
          i++;
          continue;
        }
        const sectionText = nextLine.replace(/^##\s+/, '').replace(/\*\*/g, '').trim();
        if (sectionText.match(/^[A-Z]$/)) {
          i++;
          continue;
        }
        break;
      }

      if (nextLine.startsWith('|') && !nextLine.includes('---')) {
        const cells = nextLine
          .replace(/\*\*/g, '')
          .replace(/<br>/gi, '|')
          .split('|')
          .map(c => c.trim())
          .filter(c => c);

        for (let j = 0; j < cells.length; j++) {
          let cell = cells[j];
          if (/^(CT|R|D|SV|SR|Comp)$/i.test(cell) && j + 1 < cells.length) {
            cell = cell + ' ' + cells[j + 1];
            j++;
          }

          if (cell.match(/^CT\s+/i) && !spell.castingTime) {
            spell.castingTime = cell.replace(/^CT\s+/i, '').trim();
          } else if (cell.match(/^R\s+/i) && !spell.range) {
            spell.range = cell.replace(/^R\s+/i, '').trim();
          } else if (cell.match(/^D\s+/i) && !spell.duration) {
            spell.duration = cell.replace(/^D\s+/i, '').trim();
          } else if (cell.match(/^SV\s+/i) && !spell.savingThrow) {
            spell.savingThrow = cell.replace(/^SV\s+/i, '').trim();
          } else if (cell.match(/^SR\s+/i) && !spell.spellResistance) {
            spell.spellResistance = cell.replace(/^SR\s+/i, '').trim();
          } else if (cell.match(/^Comp\s+/i) && !spell.components) {
            spell.components = cell.replace(/^Comp\s+/i, '').trim();
          }
        }
      } else if (nextLine && !nextLine.startsWith('|') && !nextLine.startsWith('---') && !nextLine.includes('picture') && !nextLine.startsWith('—')) {
        descLines.push(nextLine);
      }

      i++;
    }

    spell.description = cleanMarkdown(descLines.join('\n'));
    spells.push(spell);
  }

  return spells;
}

function importSpells() {
  const content = fs.readFileSync(PHB_PATH, 'utf-8');
  const spells = parseSpells(content);
  console.log(`Parsed ${spells.length} spells`);

  const stmt = db.prepare(`INSERT OR REPLACE INTO spells
    (_id, name, level, classes, castingTime, range, duration, savingThrow, spellResistance, components, description, reversible, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  db.exec('DELETE FROM spells');
  db.exec('BEGIN');
  for (const spell of spells) {
    stmt.run(
      crypto.randomUUID(), spell.name, spell.level, JSON.stringify(spell.classes),
      spell.castingTime, spell.range, spell.duration, spell.savingThrow,
      spell.spellResistance, spell.components, spell.description,
      spell.reversible ? 1 : 0, 'PHB'
    );
  }
  db.exec('COMMIT');

  console.log(`Imported ${spells.length} spells to database`);
}

importSpells();
