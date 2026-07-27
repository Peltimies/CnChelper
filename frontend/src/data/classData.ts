export interface ClassInfo {
  name: string;
  primeAttribute: 'str' | 'int' | 'wis' | 'dex' | 'con' | 'cha';
  hitDie: number;
  isSpellcaster: boolean;
  spellType: 'arcane' | 'divine' | null;
  spellTable: number[][]; // [level] = [spellsPerDay for spell levels 0-9]
}

const WIZARD_SPELLS: number[][] = [
  [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 1, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
  [5, 4, 2, 1, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
  [5, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  [5, 5, 4, 3, 2, 1, 0, 0, 0, 0],
  [6, 5, 4, 3, 3, 2, 0, 0, 0, 0],
  [6, 5, 4, 4, 3, 2, 1, 0, 0, 0],
  [6, 5, 4, 4, 3, 3, 2, 0, 0, 0],
  [6, 5, 5, 4, 4, 3, 2, 1, 0, 0],
  [6, 6, 5, 4, 4, 3, 3, 2, 0, 0],
  [6, 6, 5, 5, 4, 4, 3, 2, 1, 0],
  [7, 6, 5, 5, 4, 4, 3, 3, 2, 0],
  [7, 6, 5, 5, 5, 4, 4, 3, 2, 1],
  [7, 6, 6, 5, 5, 4, 4, 3, 3, 2],
  [7, 6, 6, 5, 5, 5, 4, 4, 3, 2],
  [7, 7, 6, 6, 5, 5, 4, 4, 3, 3],
];

const CLERIC_SPELLS: number[][] = [
  [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
  [5, 3, 3, 2, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
  [5, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  [5, 4, 4, 3, 2, 1, 0, 0, 0, 0],
  [5, 4, 4, 3, 3, 2, 0, 0, 0, 0],
  [6, 5, 4, 4, 3, 2, 1, 0, 0, 0],
  [6, 5, 4, 4, 3, 3, 2, 0, 0, 0],
  [6, 5, 5, 4, 4, 3, 2, 1, 0, 0],
  [6, 5, 5, 4, 4, 3, 3, 2, 0, 0],
  [6, 5, 5, 5, 4, 4, 3, 2, 1, 0],
  [6, 6, 5, 5, 4, 4, 3, 3, 2, 0],
  [7, 6, 5, 5, 5, 4, 4, 3, 2, 1],
  [7, 6, 6, 5, 5, 4, 4, 3, 3, 2],
  [7, 6, 6, 5, 5, 5, 4, 4, 3, 2],
  [7, 6, 6, 6, 5, 5, 4, 4, 3, 3],
];

export const CLASSES: Record<string, ClassInfo> = {
  Assassin: { name: 'Assassin', primeAttribute: 'dex', hitDie: 6, isSpellcaster: false, spellType: null, spellTable: [] },
  Barbarian: { name: 'Barbarian', primeAttribute: 'con', hitDie: 12, isSpellcaster: false, spellType: null, spellTable: [] },
  Bard: { name: 'Bard', primeAttribute: 'cha', hitDie: 10, isSpellcaster: true, spellType: 'arcane', spellTable: WIZARD_SPELLS },
  Cleric: { name: 'Cleric', primeAttribute: 'wis', hitDie: 8, isSpellcaster: true, spellType: 'divine', spellTable: CLERIC_SPELLS },
  Druid: { name: 'Druid', primeAttribute: 'wis', hitDie: 8, isSpellcaster: true, spellType: 'divine', spellTable: CLERIC_SPELLS },
  Fighter: { name: 'Fighter', primeAttribute: 'str', hitDie: 10, isSpellcaster: false, spellType: null, spellTable: [] },
  Illusionist: { name: 'Illusionist', primeAttribute: 'int', hitDie: 4, isSpellcaster: true, spellType: 'arcane', spellTable: WIZARD_SPELLS },
  Knight: { name: 'Knight', primeAttribute: 'cha', hitDie: 10, isSpellcaster: false, spellType: null, spellTable: [] },
  Monk: { name: 'Monk', primeAttribute: 'con', hitDie: 12, isSpellcaster: false, spellType: null, spellTable: [] },
  Paladin: { name: 'Paladin', primeAttribute: 'cha', hitDie: 10, isSpellcaster: false, spellType: null, spellTable: [] },
  Ranger: { name: 'Ranger', primeAttribute: 'str', hitDie: 10, isSpellcaster: false, spellType: null, spellTable: [] },
  Rogue: { name: 'Rogue', primeAttribute: 'dex', hitDie: 6, isSpellcaster: false, spellType: null, spellTable: [] },
  Wizard: { name: 'Wizard', primeAttribute: 'int', hitDie: 4, isSpellcaster: true, spellType: 'arcane', spellTable: WIZARD_SPELLS },
};

export const CLASS_NAMES = Object.keys(CLASSES).sort();

export function getSpellsPerDay(className: string, level: number, primeAttrScore: number): number[] {
  const cls = CLASSES[className];
  if (!cls || !cls.isSpellcaster || level < 1) return [];
  const row = cls.spellTable[level - 1] || [];
  const bonusSpells = Math.floor((primeAttrScore - 12) / 2);
  return row.map((spells, i) => {
    if (spells === 0) return 0;
    const bonus = i === 0 ? bonusSpells : Math.floor(bonusSpells / 2);
    return spells + Math.max(0, bonus);
  });
}

export function getStartingSpellCount(className: string, level: number, primeAttrScore: number): { level0: number; level1: number } {
  const spd = getSpellsPerDay(className, level, primeAttrScore);
  return {
    level0: spd[0] || 0,
    level1: spd[1] || 0,
  };
}

export function getMaxKnownSpells(className: string, level: number, primeAttrScore: number): number {
  const cls = CLASSES[className];
  if (!cls || !cls.isSpellcaster) return 0;
  const spd = getSpellsPerDay(className, level, primeAttrScore);
  return spd.reduce((sum, n) => sum + n, 0);
}

export function getMaxKnownSpellsPerLevel(className: string, level: number, primeAttrScore: number): number[] {
  return getSpellsPerDay(className, level, primeAttrScore);
}

export function isCharacterSpellcaster(classes: { name: string; level: number; isHalfClass: boolean }[]): boolean {
  return classes.some((c) => {
    const cls = CLASSES[c.name];
    if (!cls || !cls.isSpellcaster) return false;
    // For class-and-a-half, spellcasting level is full level; for half-class, it's floor(level/2)
    const effectiveLevel = c.isHalfClass ? Math.floor(c.level / 2) : c.level;
    return effectiveLevel >= 1;
  });
}

export function getCharacterSpellcastingInfo(classes: { name: string; level: number; isHalfClass: boolean }[], attributes: Record<string, number>): {
  className: string;
  level: number;
  primeAttr: 'str' | 'int' | 'wis' | 'dex' | 'con' | 'cha';
  primeAttrScore: number;
} | null {
  for (const c of classes) {
    const cls = CLASSES[c.name];
    if (cls && cls.isSpellcaster) {
      const effectiveLevel = c.isHalfClass ? Math.floor(c.level / 2) : c.level;
      if (effectiveLevel >= 1) {
        return {
          className: c.name,
          level: effectiveLevel,
          primeAttr: cls.primeAttribute,
          primeAttrScore: attributes[cls.primeAttribute] || 10,
        };
      }
    }
  }
  return null;
}

export function roll3d6(): number {
  return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
}

export function attrMod(score: number): number {
  if (score >= 18) return 3;
  if (score >= 16) return 2;
  if (score >= 13) return 1;
  if (score >= 9) return 0;
  if (score >= 6) return -1;
  if (score >= 4) return -2;
  return -3;
}

export type AttrKey = 'str' | 'int' | 'wis' | 'dex' | 'con' | 'cha';

export interface RaceInfo {
  name: string;
  size: 'Small' | 'Medium';
  movement: number;
  attrModifiers: Partial<Record<AttrKey, number>>;
  extraPrimaryAttributes: number; // humans get 1 extra (total 3 instead of 2)
  abilities: string[];
}

export const RACES: Record<string, RaceInfo> = {
  Human: {
    name: 'Human',
    size: 'Medium',
    movement: 30,
    attrModifiers: {},
    extraPrimaryAttributes: 1,
    abilities: ['Extra primary attribute (3 total)', 'Any class'],
  },
  Dwarf: {
    name: 'Dwarf',
    size: 'Small',
    movement: 20,
    attrModifiers: { con: 1, dex: -1 },
    extraPrimaryAttributes: 0,
    abilities: ['Deepvision 120ft', 'Stonecraft', 'Resist poison +2', 'Resist arcane magic +3', 'Resist fear +2', 'Enmity vs goblins/orcs'],
  },
  Elf: {
    name: 'Elf',
    size: 'Medium',
    movement: 30,
    attrModifiers: { dex: 1, con: -1 },
    extraPrimaryAttributes: 0,
    abilities: ['Twilight vision', 'Enhanced senses (+2 listen)', 'Spell resistance vs charm/sleep +10', 'Spot hidden doors', 'Weapon training (+1 bow/sword)'],
  },
  Gnome: {
    name: 'Gnome',
    size: 'Small',
    movement: 20,
    attrModifiers: { int: 1, str: -1 },
    extraPrimaryAttributes: 0,
    abilities: ['Darkvision 60ft', 'Enhanced hearing (+3 listen)', 'Innate spells (dancing lights, ghost sound, prestidigitation)', 'Combat expertise vs goblins/kobolds +1'],
  },
  'Half-Elf': {
    name: 'Half-Elf',
    size: 'Medium',
    movement: 30,
    attrModifiers: { dex: 1, con: -1 },
    extraPrimaryAttributes: 0,
    abilities: ['Choose lineage (elf or human)', 'Empathy (+2 charisma checks)', 'Move silently', 'Spot hidden doors', 'Spell resistance vs charm/sleep'],
  },
  Halfling: {
    name: 'Halfling',
    size: 'Small',
    movement: 20,
    attrModifiers: { dex: 1, str: -1 },
    extraPrimaryAttributes: 0,
    abilities: ['Duskvision', 'Resist constitution saves +1', 'Move silently', 'Conceal'],
  },
  'Half-Orc': {
    name: 'Half-Orc',
    size: 'Medium',
    movement: 30,
    attrModifiers: { con: 1, str: 1, cha: -2 },
    extraPrimaryAttributes: 0,
    abilities: ['Darkvision 60ft', 'Enhanced smell', 'Martial prowess (+1 AC unarmored)', 'Resist disease +2'],
  },
};

export const RACE_NAMES = Object.keys(RACES).sort();

export function applyRacialModifiers(baseAttrs: Record<AttrKey, number>, raceName: string): Record<AttrKey, number> {
  const race = RACES[raceName];
  if (!race) return baseAttrs;
  const result = { ...baseAttrs };
  for (const [key, mod] of Object.entries(race.attrModifiers)) {
    result[key as AttrKey] = Math.max(3, Math.min(18, result[key as AttrKey] + (mod as number)));
  }
  return result;
}

// EPP tables: XP needed to reach each level (index 0 = level 1 = 0 XP)
const EPP_TABLES: Record<string, number[]> = {
  Assassin:  [0, 1751, 3501, 7001, 14001, 25001, 50001, 90001, 150001, 200001, 350001, 500001],
  Barbarian: [0, 2101, 4701, 9401, 20001, 40001, 80001, 170001, 340001, 600001, 800001, 1000001],
  Bard:      [0, 1501, 3251, 7501, 15001, 30001, 60001, 120001, 240001, 450001, 625001, 800001],
  Cleric:    [0, 2251, 5001, 9001, 18001, 35001, 70001, 140001, 300001, 425001, 650001, 900001],
  Druid:     [0, 2001, 4251, 8501, 17001, 35001, 70001, 180001, 275001, 400001, 525001, 650001],
  Fighter:   [0, 2001, 4001, 8501, 17001, 34001, 68001, 136001, 272001, 500001, 750001, 1000001],
  Illusionist:[0, 2601, 5201, 10401, 20801, 42501, 85001, 170001, 340001, 500001, 750001, 900001],
  Knight:    [0, 2251, 4501, 9001, 18001, 36001, 72001, 150001, 300001, 600001, 725001, 900001],
  Monk:      [0, 1751, 4001, 8501, 20001, 40001, 80001, 160001, 325001, 550001, 750001, 1250001],
  Paladin:   [0, 2701, 5501, 12001, 24001, 48001, 95001, 180001, 360001, 700001, 1000001, 1300001],
  Ranger:    [0, 2251, 4501, 9001, 18001, 40001, 75001, 150001, 250001, 500001, 725001, 950001],
  Rogue:     [0, 1251, 2501, 6001, 12001, 24001, 48001, 80001, 120001, 175001, 325001, 450001],
  Wizard:    [0, 2601, 5201, 10401, 20801, 42501, 85001, 170001, 340001, 500001, 750001, 1000001],
};

const EPP_POST12: Record<string, number> = {
  Assassin: 150000, Barbarian: 200000, Bard: 175000, Cleric: 250000, Druid: 175000,
  Fighter: 250000, Illusionist: 150000, Knight: 175000, Monk: 250000, Paladin: 300000,
  Ranger: 225000, Rogue: 125000, Wizard: 250000,
};

// BtH progression by level (index 0 = level 1)
const BTH_TABLES: Record<string, number[]> = {
  Assassin:  [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
  Barbarian: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Bard:      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Cleric:    [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
  Druid:     [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
  Fighter:   [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  Illusionist:[0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
  Knight:    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Monk:      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Paladin:   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Ranger:    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Rogue:     [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
  Wizard:    [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
};

// HP after level 10: fixed additions instead of HD
const POST10_HP: Record<string, number> = {
  Assassin: 2, Barbarian: 5, Bard: 4, Cleric: 3, Druid: 3,
  Fighter: 4, Illusionist: 1, Knight: 4, Monk: 5, Paladin: 4,
  Ranger: 4, Rogue: 2, Wizard: 1,
};

export function getXpForLevel(className: string, level: number): number {
  const table = EPP_TABLES[className];
  if (!table) return 0;
  if (level <= 12) return table[level - 1] || 0;
  const post12 = EPP_POST12[className] || 100000;
  return table[11] + post12 * (level - 12);
}

export function getBth(className: string, level: number): number {
  const table = BTH_TABLES[className];
  if (!table) return 0;
  if (level <= 12) return table[level - 1] || 0;
  // ponytail: BtH continues +1 per level after 12
  return table[11] + (level - 12);
}

export function getHpForLevel(className: string, level: number, conMod: number): number {
  const cls = CLASSES[className];
  if (!cls) return 1;
  if (level <= 10) {
    return Math.max(1, cls.hitDie + conMod);
  }
  const post10 = POST10_HP[className] || 2;
  return Math.max(1, post10 + conMod);
}

export function canLevelUp(className: string, currentLevel: number, xp: number): boolean {
  return xp >= getXpForLevel(className, currentLevel + 1);
}

export function getLevelFromXp(className: string, xp: number): number {
  const table = EPP_TABLES[className];
  if (!table) return 1;
  for (let i = table.length - 1; i >= 0; i--) {
    if (xp >= table[i]) return i + 1;
  }
  // Beyond level 12
  const post12 = EPP_POST12[className] || 100000;
  let level = 13;
  let threshold = table[11] + post12;
  while (xp >= threshold) {
    level++;
    threshold += post12;
  }
  return level - 1;
}
