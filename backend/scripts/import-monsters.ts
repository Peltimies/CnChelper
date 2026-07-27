import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db } from '../src/config/database';

dotenv.config();

const MONSTERS_PATH = path.resolve(__dirname, '../../TLG 80113 C&amp;C Monsters &amp; Treasure Digital.md');

interface ParsedMonster {
  name: string;
  type: string;
  hd: string;
  hp: string;
  ac: string;
  move: string;
  attacks: string;
  special: string;
  saves: string;
  intelligence: string;
  alignment: string;
  size: string;
  treasure: string;
  xp: string;
  noEncountered: string;
  description: string;
  combat: string;
}

interface ParsedTreasure {
  name: string;
  category: string;
  description: string;
}

// All-caps abbreviations to preserve when fixing casing
const PRESERVE_CAPS = new Set([
  'NO', 'HD', 'HP', 'AC', 'XP', 'SR', 'INT', 'MOVE', 'ATTACKS', 'SAVES',
  'ALIGNMENT', 'TYPE', 'TREASURE', 'SIZE', 'SPECIAL', 'COMBAT', 'M&T',
  'PHB', 'D&D', 'C&C', 'SR', 'DC', 'NPC', 'PC', 'CK', 'XP', 'HP',
  'AC', 'HD', 'HP', 'SR', 'INT', 'STR', 'DEX', 'CON', 'WIS', 'CHA',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
]);

function isAllCaps(word: string): boolean {
  return word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word);
}

function isFunky(word: string): boolean {
  // Has an uppercase letter after position 0, and is not all-caps
  if (word.length < 2) return false;
  if (isAllCaps(word)) return false;
  return /[A-Z]/.test(word.slice(1));
}

function toTitleCase(word: string): string {
  if (PRESERVE_CAPS.has(word.toUpperCase())) return word.toUpperCase();
  if (isAllCaps(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function fixWordInSentence(word: string, isFirst: boolean): string {
  if (PRESERVE_CAPS.has(word.toUpperCase())) return word.toUpperCase();
  if (isAllCaps(word)) return word;
  if (!isFunky(word)) return word;
  // Funky word — fix it
  if (isFirst) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  return word.toLowerCase();
}

function fixFunkyCasing(text: string): string {
  // Process **bold** sections and regular text separately
  return text.replace(/(\*\*[^*]+\*\*)|([^*]+)/g, (match, bold, regular) => {
    if (bold) {
      // Fix casing inside **bold** markers — title case each word
      const inner = bold.slice(2, -2);
      const fixed = inner.split(/(\s+|[–—-])/).map((part: string) => {
        if (/^\s+$/.test(part) || /^[–—-]$/.test(part)) return part;
        if (!part) return part;
        // Handle words with trailing punctuation like "enSlave:" 
        const m = part.match(/^([a-zA-Z]+)([^a-zA-Z]*)$/);
        if (m) return toTitleCase(m[1]) + m[2];
        return part;
      }).join('');
      return `**${fixed}**`;
    }
    if (regular) {
      // Fix funky words in regular text
      const words = regular.split(/(\s+)/);
      let sentenceStart = true;
      return words.map((w: string) => {
        if (/^\s+$/.test(w) || !w) return w;
        // Strip leading punctuation for checking
        const m = w.match(/^(["'(]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
        if (m) {
          const prefix = m[1];
          const word = m[2];
          const suffix = m[3];
          const fixed = fixWordInSentence(word, sentenceStart);
          sentenceStart = /[.!?]$/.test(suffix) || suffix === '' && /[.!?]/.test(w);
          return prefix + fixed + suffix;
        }
        sentenceStart = /[.!?]/.test(w);
        return w;
      }).join('');
    }
    return match;
  });
}

function cleanMarkdown(text: string): string {
  return fixFunkyCasing(text)
    .replace(/_([^_]+)_/g, '$1')
    .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/^—\s.*$/gm, '')
    .replace(/\[th\]/g, 'th')
    .replace(/\[st\]/g, 'st')
    .replace(/\[rd\]/g, 'rd')
    .replace(/\[nd\]/g, 'nd')
    .replace(/~~/g, '')
    .replace(/–/g, '-')
    .trim();
}

function extractField(text: string, field: string): string {
  const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^*]+?)(?=\\*\\*[A-Z]|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

const SECTION_SKIP = /^(MONSTERS [A-Z]|INTRODUCTION|MONSTER CHARACTERISTICS|MONSTER EXPERIENCE|MONSTER CREATION|WHAT ARE|TABLE OF|OGL|UPON|WHAT LIES|[A-Z]—|NO\. ENCOUNTERED|OTHER RACES|D MONSTERS|COMMON POISONS|SPECIAL POISONS)/i;

function parseMonsters(content: string): ParsedMonster[] {
  const lines = content.split('\n');
  const monsters: ParsedMonster[] = [];
  let inMonsterSection = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.match(/^## \*\*MONSTERS\*\*/i) && i > 10) {
      inMonsterSection = true;
      i++;
      continue;
    }

    if (inMonsterSection && line.match(/^## \*\*TREASURE\*\*/i)) {
      break;
    }

    if (inMonsterSection && line.startsWith('## **')) {
      const name = line.replace(/^##\s+\*\*/, '').replace(/\*\*$/, '').replace(/\*\*\s*$/, '').trim();

      // Skip section headers and non-monster ## headings
      if (SECTION_SKIP.test(name)) {
        i++;
        continue;
      }

      i++;
      let statBlock = '';
      let descLines: string[] = [];
      let combatLines: string[] = [];
      let inCombat = false;

      while (i < lines.length) {
        const nextLine = lines[i].trim();

        if (nextLine.startsWith('## **')) {
          // Check if it's a NO. ENCOUNTERED continuation (stat line split across headings)
          const subName = nextLine.replace(/^##\s+\*\*/, '').replace(/\*\*$/, '').replace(/\*\*\s*$/, '').trim();
          if (subName.startsWith('NO. ENCOUNTERED')) {
            statBlock += ' ' + subName;
            i++;
            continue;
          }
          break;
        }

        if (nextLine.startsWith('**NO. ENCOUNTERED:**')) {
          statBlock += ' ' + nextLine;
        } else if (nextLine.startsWith('**SIZE:**') || nextLine.startsWith('**HD:**') || nextLine.startsWith('**HP:**') || nextLine.startsWith('**MOVE:**') || nextLine.startsWith('**AC:**') || nextLine.startsWith('**ATTACKS:**') || nextLine.startsWith('**SPECIAL:**') || nextLine.startsWith('**SAVES:**') || nextLine.startsWith('**INT:') || nextLine.startsWith('**INTelligence') || nextLine.startsWith('**ALIGNMENT:**') || nextLine.startsWith('**TYPE:**') || nextLine.startsWith('**TREASURE:**') || nextLine.startsWith('**XP:**')) {
          statBlock += ' ' + nextLine;
        } else if (nextLine.startsWith('**Combat:**')) {
          inCombat = true;
        } else if (inCombat && nextLine && !nextLine.startsWith('##')) {
          if (!nextLine.startsWith('—') && !nextLine.includes('picture')) {
            combatLines.push(nextLine);
          }
        } else if (nextLine && !nextLine.startsWith('##') && !nextLine.startsWith('**Monsters') && !nextLine.startsWith('—') && !nextLine.includes('picture')) {
          if (nextLine.startsWith('**') && !nextLine.startsWith('**NO.')) {
            // skip other bold headers (ability descriptions etc)
          } else if (!inCombat) {
            descLines.push(nextLine);
          }
        }

        i++;
      }

      const monster: ParsedMonster = {
        name,
        noEncountered: extractField(statBlock, 'NO\\. ENCOUNTERED'),
        size: extractField(statBlock, 'SIZE'),
        hd: extractField(statBlock, 'HD'),
        hp: extractField(statBlock, 'HP'),
        move: extractField(statBlock, 'MOVE'),
        ac: extractField(statBlock, 'AC'),
        attacks: extractField(statBlock, 'ATTACKS'),
        special: extractField(statBlock, 'SPECIAL'),
        saves: extractField(statBlock, 'SAVES'),
        intelligence: extractField(statBlock, 'INT'),
        alignment: extractField(statBlock, 'ALIGNMENT'),
        type: extractField(statBlock, 'TYPE'),
        treasure: extractField(statBlock, 'TREASURE'),
        xp: extractField(statBlock, 'XP'),
        description: cleanMarkdown(descLines.join('\n')),
        combat: cleanMarkdown(combatLines.join('\n')),
      };

      monsters.push(monster);
      continue;
    }

    i++;
  }

  return monsters;
}

const TREASURE_SECTIONS = [
  'POTIONS', 'WEAPONS', 'SCROLLS', 'MISCELLANEOUS WEAPONS',
  'ARMOR & SHIELD DESCRIPTIONS', 'MISCELLANEOUS MAGIC',
  'RINGS', 'RODS', 'STAVES', 'WANDS', 'ARTIFACTS',
  'DECK OF MANY THINGS',
];

const TREASURE_SECTION_SKIP = /^(TREASURE|COIN|UNWORKED|MAGIC ITEMS|CREATING|CALCULATING|SPECIAL MATERIALS|DESTROYING|SENTIENT|ALIGNMENT|LANGUAGE|WILL|weapon will|CONTROLLING|LAND|SERVICES|EXAMPLES|intelligent|ChanCe|APPENDIX|POISON|typeS|CoSt|making|COMMON|SPECIAL)/i;

function parseTreasures(content: string): ParsedTreasure[] {
  const lines = content.split('\n');
  const treasures: ParsedTreasure[] = [];
  let inTreasureSection = false;
  let currentCategory = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.match(/^## \*\*TREASURE\*\*/i) && i > 1000) {
      inTreasureSection = true;
      i++;
      continue;
    }

    if (inTreasureSection && line.match(/^## \*\*APPENDIX/i)) {
      break;
    }

    if (inTreasureSection && line.startsWith('## **')) {
      const name = line.replace(/^##\s+\*\*/, '').replace(/\*\*$/, '').replace(/\*\*\s*$/, '').trim();

      if (TREASURE_SECTIONS.includes(name.toUpperCase())) {
        currentCategory = name;
        i++;
        // collect section intro text
        const introLines: string[] = [];
        while (i < lines.length && !lines[i].trim().startsWith('## **') && !lines[i].trim().startsWith('**')) {
          const l = lines[i].trim();
          if (l && !l.startsWith('—') && !l.includes('picture') && !l.startsWith('|')) {
            introLines.push(l);
          }
          i++;
        }
        if (introLines.length > 0) {
          treasures.push({
            name: cleanMarkdown(name),
            category: cleanMarkdown(name),
            description: cleanMarkdown(introLines.join('\n')),
          });
        }
        continue;
      }

      if (TREASURE_SECTION_SKIP.test(name)) {
        i++;
        continue;
      }

      // Named item like "Ring of aiR elemental CommanD" or "gRay ColoReD bag"
      i++;
      const descLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('## **')) {
        const l = lines[i].trim();
        if (l && !l.startsWith('—') && !l.includes('picture') && !l.startsWith('|')) {
          descLines.push(l);
        }
        i++;
      }
      if (descLines.length > 0) {
        treasures.push({
          name: cleanMarkdown(name),
          category: currentCategory,
          description: cleanMarkdown(descLines.join('\n')),
        });
      }
      continue;
    }

    // Also capture **Item Name:** entries within treasure sections
    if (inTreasureSection && line.startsWith('**') && line.includes(':**') && !line.startsWith('**TREASURE') && !line.startsWith('**NO.')) {
      const nameMatch = line.match(/^\*\*(.+?):\*\*/);
      if (nameMatch) {
        const itemName = nameMatch[1].trim();
        const restOfLine = line.replace(/^\*\*.+?:\*\*/, '').trim();
        const descLines: string[] = [];
        if (restOfLine) descLines.push(restOfLine);

        i++;
        while (i < lines.length && !lines[i].trim().startsWith('## **') && !lines[i].trim().startsWith('**') && !lines[i].trim().startsWith('|')) {
          const l = lines[i].trim();
          if (l && !l.startsWith('—') && !l.includes('picture')) {
            descLines.push(l);
          }
          i++;
        }

        if (descLines.length > 0) {
          treasures.push({
            name: cleanMarkdown(itemName),
            category: currentCategory,
            description: cleanMarkdown(descLines.join('\n')),
          });
        }
        continue;
      }
    }

    i++;
  }

  return treasures;
}

function importMonsters() {
  const content = fs.readFileSync(MONSTERS_PATH, 'utf-8');
  const monsters = parseMonsters(content);
  console.log(`Parsed ${monsters.length} monsters`);

  const stmt = db.prepare(`INSERT OR REPLACE INTO monsters
    (_id, name, type, hd, hp, ac, move, attacks, special, saves, intelligence, alignment, size, treasure, xp, noEncountered, description, combat, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  db.exec('DELETE FROM monsters');
  db.exec('BEGIN');
  for (const m of monsters) {
    stmt.run(
      crypto.randomUUID(), m.name, m.type, m.hd, m.hp, m.ac, m.move, m.attacks,
      m.special, m.saves, m.intelligence, m.alignment, m.size, m.treasure, m.xp,
      m.noEncountered, m.description, m.combat, 'M&T'
    );
  }
  db.exec('COMMIT');

  console.log(`Imported ${monsters.length} monsters to database`);

  const treasures = parseTreasures(content);
  console.log(`Parsed ${treasures.length} treasures`);

  const tstmt = db.prepare(`INSERT OR REPLACE INTO treasures
    (_id, name, category, description, source)
    VALUES (?, ?, ?, ?, ?)`);

  db.exec('DELETE FROM treasures');
  db.exec('BEGIN');
  for (const t of treasures) {
    tstmt.run(crypto.randomUUID(), t.name, t.category, t.description, 'M&T');
  }
  db.exec('COMMIT');

  console.log(`Imported ${treasures.length} treasures to database`);
}

importMonsters();
