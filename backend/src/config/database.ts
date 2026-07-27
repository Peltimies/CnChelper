import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../cnc_helper.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    _id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    displayName TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '["player"]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS characters (
    _id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    classes TEXT NOT NULL DEFAULT '[]',
    attributes TEXT NOT NULL DEFAULT '{"str":10,"int":10,"wis":10,"dex":10,"con":10,"cha":10}',
    primaryAttribute TEXT NOT NULL DEFAULT 'int',
    knownSpells TEXT NOT NULL DEFAULT '[]',
    memorizedSpells TEXT NOT NULL DEFAULT '[]',
    lostSpells TEXT NOT NULL DEFAULT '[]',
    hp INTEGER NOT NULL DEFAULT 1,
    maxHp INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spells (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    classes TEXT NOT NULL DEFAULT '[]',
    school TEXT NOT NULL DEFAULT '',
    castingTime TEXT NOT NULL DEFAULT '',
    range TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    savingThrow TEXT NOT NULL DEFAULT '',
    spellResistance TEXT NOT NULL DEFAULT '',
    components TEXT NOT NULL DEFAULT '',
    targetArea TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    reversible INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'PHB'
  );

  CREATE TABLE IF NOT EXISTS monsters (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT '',
    hd TEXT NOT NULL DEFAULT '',
    hp TEXT NOT NULL DEFAULT '',
    ac TEXT NOT NULL DEFAULT '',
    move TEXT NOT NULL DEFAULT '',
    attacks TEXT NOT NULL DEFAULT '',
    special TEXT NOT NULL DEFAULT '',
    saves TEXT NOT NULL DEFAULT '',
    intelligence TEXT NOT NULL DEFAULT '',
    alignment TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    treasure TEXT NOT NULL DEFAULT '',
    xp TEXT NOT NULL DEFAULT '',
    noEncountered TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    combat TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'M&T'
  );

  CREATE TABLE IF NOT EXISTS mishap_entries (
    _id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    roll INTEGER NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(userId, roll)
  );

  CREATE TABLE IF NOT EXISTS combat_sessions (
    _id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1,
    combatants TEXT NOT NULL DEFAULT '[]',
    round INTEGER NOT NULL DEFAULT 1,
    turnIndex INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_characters_userId ON characters(userId);
  CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name);
  CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
  CREATE INDEX IF NOT EXISTS idx_mishap_userId ON mishap_entries(userId);
  CREATE INDEX IF NOT EXISTS idx_combat_userId ON combat_sessions(userId);

  CREATE TABLE IF NOT EXISTS treasures (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'M&T'
  );

  CREATE INDEX IF NOT EXISTS idx_treasures_name ON treasures(name);
  CREATE INDEX IF NOT EXISTS idx_treasures_category ON treasures(category);
`);

// Migrate: add race and secondaryPrimaryAttributes columns if missing
try {
  const cols = db.prepare("PRAGMA table_info(characters)").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('race')) {
    db.exec("ALTER TABLE characters ADD COLUMN race TEXT NOT NULL DEFAULT 'Human'");
  }
  if (!colNames.includes('secondaryPrimaryAttributes')) {
    db.exec("ALTER TABLE characters ADD COLUMN secondaryPrimaryAttributes TEXT NOT NULL DEFAULT '[]'");
  }
  if (!colNames.includes('xp')) {
    db.exec("ALTER TABLE characters ADD COLUMN xp INTEGER NOT NULL DEFAULT 0");
  }
} catch {
  // ignore — columns already exist
}

console.log('SQLite database ready at', dbPath);
