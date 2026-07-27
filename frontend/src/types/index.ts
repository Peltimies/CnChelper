export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface CharacterClass {
  name: string;
  level: number;
  isHalfClass: boolean;
}

export interface Attributes {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  cha: number;
}

export interface Spell {
  _id: string;
  name: string;
  level: number;
  classes: string[];
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  savingThrow: string;
  spellResistance: string;
  components: string;
  targetArea: string;
  description: string;
  reversible: boolean;
  source: string;
}

export interface Character {
  _id: string;
  userId: string;
  name: string;
  race: string;
  classes: CharacterClass[];
  attributes: Attributes;
  primaryAttribute: 'str' | 'int' | 'wis' | 'dex' | 'con' | 'cha';
  secondaryPrimaryAttributes: ('str' | 'int' | 'wis' | 'dex' | 'con' | 'cha')[];
  knownSpells: Spell[];
  memorizedSpells: Spell[];
  lostSpells: Spell[];
  hp: number;
  maxHp: number;
  xp: number;
}

export interface Monster {
  _id: string;
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

export interface Treasure {
  _id: string;
  name: string;
  category: string;
  description: string;
  source: string;
}

export interface MishapEntry {
  _id: string;
  roll: number;
  description: string;
}

export interface Combatant {
  type: 'monster' | 'pc';
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  conditions: string[];
  monsterId?: string;
  hd?: string;
  ac?: string;
  attacks?: string;
  special?: string;
}

export interface CombatSession {
  _id: string;
  name: string;
  isActive: boolean;
  combatants: Combatant[];
  round: number;
  turnIndex: number;
}

export interface CastResult {
  roll: number;
  attrMod: number;
  charLevel: number;
  total: number;
  cl: number;
  success: boolean;
  isNatural1: boolean;
  isNatural20: boolean;
  mishap: { roll: number; description: string } | null;
  character: Character;
}
