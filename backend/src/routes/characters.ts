import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const HIT_DICE: Record<string, number> = {
  Assassin: 6, Barbarian: 12, Bard: 6, Cleric: 8, Druid: 8,
  Fighter: 10, Illusionist: 4, Knight: 10, Monk: 8, Paladin: 10,
  Ranger: 10, Rogue: 6, Wizard: 4,
};

const WIZARD_SPELLS: number[][] = [
  [4, 2, 0, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 3, 1, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0, 0], [5, 4, 2, 1, 0, 0, 0, 0, 0, 0], [5, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 1, 0, 0, 0, 0, 0], [5, 4, 3, 3, 2, 0, 0, 0, 0, 0], [5, 5, 4, 3, 2, 1, 0, 0, 0, 0],
  [6, 5, 4, 3, 3, 2, 0, 0, 0, 0], [6, 5, 4, 4, 3, 2, 1, 0, 0, 0], [6, 5, 4, 4, 3, 3, 2, 0, 0, 0],
  [6, 5, 5, 4, 4, 3, 2, 1, 0, 0], [6, 6, 5, 4, 4, 3, 3, 2, 0, 0], [6, 6, 5, 5, 4, 4, 3, 2, 1, 0],
  [7, 6, 5, 5, 4, 4, 3, 3, 2, 0], [7, 6, 5, 5, 5, 4, 4, 3, 2, 1], [7, 6, 6, 5, 5, 4, 4, 3, 3, 2],
  [7, 6, 6, 5, 5, 5, 4, 4, 3, 2], [7, 7, 6, 6, 5, 5, 4, 4, 3, 3],
];

const CLERIC_SPELLS: number[][] = [
  [3, 1, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 1, 0, 0, 0, 0, 0, 0], [5, 3, 3, 2, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 1, 0, 0, 0, 0, 0], [5, 4, 3, 3, 2, 0, 0, 0, 0, 0], [5, 4, 4, 3, 2, 1, 0, 0, 0, 0],
  [5, 4, 4, 3, 3, 2, 0, 0, 0, 0], [6, 5, 4, 4, 3, 2, 1, 0, 0, 0], [6, 5, 4, 4, 3, 3, 2, 0, 0, 0],
  [6, 5, 5, 4, 4, 3, 2, 1, 0, 0], [6, 5, 5, 4, 4, 3, 3, 2, 0, 0], [6, 5, 5, 5, 4, 4, 3, 2, 1, 0],
  [6, 6, 5, 5, 4, 4, 3, 3, 2, 0], [7, 6, 5, 5, 5, 4, 4, 3, 2, 1], [7, 6, 6, 5, 5, 4, 4, 3, 3, 2],
  [7, 6, 6, 5, 5, 5, 4, 4, 3, 2], [7, 6, 6, 6, 5, 5, 4, 4, 3, 3],
];

function getSpellsPerDayTable(className: string, level: number, primeAttrScore: number): number[] {
  const ARCANE = ['Wizard', 'Illusionist', 'Bard'];
  const DIVINE = ['Cleric', 'Druid'];
  let table: number[][] | undefined;
  if (ARCANE.includes(className)) table = WIZARD_SPELLS;
  else if (DIVINE.includes(className)) table = CLERIC_SPELLS;
  if (!table || level < 1) return new Array(10).fill(0);
  const row = table[level - 1] || new Array(10).fill(0);
  const bonusSpells = Math.floor((primeAttrScore - 12) / 2);
  return row.map((spells: number, i: number) => {
    if (spells === 0) return 0;
    const bonus = i === 0 ? bonusSpells : Math.floor(bonusSpells / 2);
    return spells + Math.max(0, bonus);
  });
}

interface SpellRow {
  _id: string; name: string; level: number; classes: string; school: string;
  castingTime: string; range: string; duration: string; savingThrow: string;
  spellResistance: string; components: string; targetArea: string;
  description: string; reversible: number; source: string;
}

interface CharRow {
  _id: string; userId: string; name: string; race: string; classes: string; attributes: string;
  primaryAttribute: string; secondaryPrimaryAttributes: string; knownSpells: string; memorizedSpells: string;
  lostSpells: string; hp: number; maxHp: number; xp: number; createdAt: string; updatedAt: string;
}

function formatSpell(row: SpellRow) {
  return { ...row, classes: JSON.parse(row.classes), reversible: !!row.reversible };
}

function getSpellsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM spells WHERE _id IN (${placeholders})`).all(...ids) as SpellRow[];
  const map = new Map(rows.map(r => [r._id, formatSpell(r)]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

function formatCharacter(row: CharRow) {
  const knownIds = JSON.parse(row.knownSpells) as string[];
  const memIds = JSON.parse(row.memorizedSpells) as string[];
  const lostIds = JSON.parse(row.lostSpells) as string[];
  return {
    _id: row._id,
    userId: row.userId,
    name: row.name,
    race: row.race || 'Human',
    classes: JSON.parse(row.classes),
    attributes: JSON.parse(row.attributes),
    primaryAttribute: row.primaryAttribute,
    secondaryPrimaryAttributes: JSON.parse(row.secondaryPrimaryAttributes || '[]'),
    knownSpells: getSpellsByIds(knownIds),
    memorizedSpells: getSpellsByIds(memIds),
    lostSpells: getSpellsByIds(lostIds),
    hp: row.hp,
    maxHp: row.maxHp,
    xp: row.xp || 0,
  };
}

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM characters WHERE userId = ? ORDER BY updatedAt DESC').all(req.userId) as CharRow[];
    res.json({ characters: rows.map(formatCharacter) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json({ character: formatCharacter(row) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, race, classes, attributes, primaryAttribute, secondaryPrimaryAttributes, hp, maxHp, xp } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO characters (_id, userId, name, race, classes, attributes, primaryAttribute, secondaryPrimaryAttributes, hp, maxHp, xp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, req.userId, name, race || 'Human',
      JSON.stringify(classes || []),
      JSON.stringify(attributes || { str: 10, int: 10, wis: 10, dex: 10, con: 10, cha: 10 }),
      primaryAttribute || 'int',
      JSON.stringify(secondaryPrimaryAttributes || []),
      hp || 1, maxHp || 1, xp || 0
    );
    const row = db.prepare('SELECT * FROM characters WHERE _id = ?').get(id) as CharRow;
    res.status(201).json({ character: formatCharacter(row) });
  } catch {
    res.status(500).json({ error: 'Failed to create character' });
  }
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    const { name, race, classes, attributes, primaryAttribute, secondaryPrimaryAttributes, hp, maxHp, xp } = req.body;
    db.prepare(`UPDATE characters SET name=?, race=?, classes=?, attributes=?, primaryAttribute=?, secondaryPrimaryAttributes=?, hp=?, maxHp=?, xp=?, updatedAt=datetime('now')
      WHERE _id=? AND userId=?`).run(
      name ?? row.name,
      race ?? row.race,
      classes ? JSON.stringify(classes) : row.classes,
      attributes ? JSON.stringify(attributes) : row.attributes,
      primaryAttribute ?? row.primaryAttribute,
      secondaryPrimaryAttributes ? JSON.stringify(secondaryPrimaryAttributes) : row.secondaryPrimaryAttributes,
      hp ?? row.hp,
      maxHp ?? row.maxHp,
      xp ?? row.xp,
      req.params.id, req.userId
    );
    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(req.params.id) as CharRow;
    res.json({ character: formatCharacter(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to update character' });
  }
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM characters WHERE _id = ? AND userId = ?').run(req.params.id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

router.post('/:id/add-xp', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json({ error: 'Invalid XP amount' });
      return;
    }
    const newXp = (row.xp || 0) + amount;
    db.prepare(`UPDATE characters SET xp=?, updatedAt=datetime('now') WHERE _id=? AND userId=?`).run(newXp, req.params.id, req.userId);
    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(req.params.id) as CharRow;
    res.json({ character: formatCharacter(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to add XP' });
  }
});

router.post('/:id/level-up', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    const classes = JSON.parse(row.classes) as { name: string; level: number; isHalfClass: boolean }[];
    const attrs = JSON.parse(row.attributes) as Record<string, number>;
    const { xp } = req.body;
    const conMod = Math.floor((attrs.con - 10) / 2);
    const className = classes[0]?.name || 'Fighter';
    const hitDie = HIT_DICE[className] || 6;
    const hpGain = Math.max(1, Math.floor(Math.random() * hitDie) + 1 + conMod);

    const newClasses = classes.map((c) => ({ ...c, level: c.level + 1 }));
    const newMaxHp = row.maxHp + hpGain;

    db.prepare(`UPDATE characters SET classes=?, maxHp=?, hp=?, xp=?, updatedAt=datetime('now')
      WHERE _id=? AND userId=?`).run(
      JSON.stringify(newClasses),
      newMaxHp,
      newMaxHp,
      xp ?? row.xp,
      req.params.id, req.userId
    );

    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(req.params.id) as CharRow;
    res.json({ character: formatCharacter(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to level up' });
  }
});

router.post('/:id/learn-spell', (req: AuthRequest, res: Response) => {
  try {
    const { spellId } = req.body;
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    // Validate the spell exists
    const spell = db.prepare('SELECT * FROM spells WHERE _id = ?').get(spellId) as SpellRow | undefined;
    if (!spell) {
      res.status(404).json({ error: 'Spell not found' });
      return;
    }

    // Validate character has a spellcasting class
    const classes = JSON.parse(row.classes) as { name: string; level: number; isHalfClass: boolean }[];
    const SPELLCASTERS = ['Wizard', 'Illusionist', 'Cleric', 'Druid', 'Bard'];
    const castingClass = classes.find((c) => SPELLCASTERS.includes(c.name));
    if (!castingClass) {
      res.status(400).json({ error: 'Character is not a spellcaster' });
      return;
    }

    // Validate spell level: character can only learn spells up to their highest castable level
    const effectiveLevel = castingClass.isHalfClass ? Math.floor(castingClass.level / 2) : castingClass.level;
    const attrs = JSON.parse(row.attributes) as Record<string, number>;
    const PRIME_ATTRS: Record<string, string> = { Wizard: 'int', Illusionist: 'int', Cleric: 'wis', Druid: 'wis', Bard: 'cha' };
    const primeAttr = PRIME_ATTRS[castingClass.name] || 'int';
    const primeScore = attrs[primeAttr] || 10;
    const maxPerLevel = getSpellsPerDayTable(castingClass.name, effectiveLevel, primeScore);
    const highestCastableLevel = maxPerLevel.reduce((highest, n, i) => (n > 0 ? i : highest), -1);
    if (spell.level > highestCastableLevel) {
      res.status(400).json({ error: `Cannot learn level ${spell.level} spells at effective casting level ${effectiveLevel}` });
      return;
    }

    // Validate per-level max known spells (level 0 cantrips are always all known — no cap)
    const known = JSON.parse(row.knownSpells) as string[];
    if (spell.level > 0) {
      const knownSpellRows = known.length > 0
        ? db.prepare(`SELECT _id, level FROM spells WHERE _id IN (${known.map(() => '?').join(',')})`).all(...known) as { _id: string; level: number }[]
        : [];
      const knownPerLevel = new Array(10).fill(0);
      for (const s of knownSpellRows) knownPerLevel[s.level] = (knownPerLevel[s.level] || 0) + 1;
      const maxForThisLevel = maxPerLevel[spell.level] || 0;
      if (knownPerLevel[spell.level] >= maxForThisLevel) {
        res.status(400).json({ error: `Already at max (${maxForThisLevel}) known spells for level ${spell.level}` });
        return;
      }
    }

    // Validate spell belongs to the right class list
    const spellClasses = JSON.parse(spell.classes) as string[];
    const charClassLower = castingClass.name.toLowerCase();
    if (!spellClasses.some((c) => c.toLowerCase() === charClassLower)) {
      res.status(400).json({ error: `Spell is not available to ${castingClass.name}` });
      return;
    }

    if (!known.includes(spellId)) {
      known.push(spellId);
      db.prepare('UPDATE characters SET knownSpells=?, updatedAt=datetime(\'now\') WHERE _id=?').run(JSON.stringify(known), row._id);
    }
    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(row._id) as CharRow;
    res.json({ character: formatCharacter(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to learn spell' });
  }
});

router.post('/:id/memorize-spells', (req: AuthRequest, res: Response) => {
  try {
    const { spellIds } = req.body;
    db.prepare('UPDATE characters SET memorizedSpells=?, lostSpells=?, updatedAt=datetime(\'now\') WHERE _id=? AND userId=?')
      .run(JSON.stringify(spellIds), '[]', req.params.id, req.userId);
    const row = db.prepare('SELECT * FROM characters WHERE _id = ?').get(req.params.id) as CharRow;
    res.json({ character: formatCharacter(row) });
  } catch {
    res.status(500).json({ error: 'Failed to memorize spells' });
  }
});

router.post('/:id/cast-spell', (req: AuthRequest, res: Response) => {
  try {
    const { spellId } = req.body;
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const spell = db.prepare('SELECT * FROM spells WHERE _id = ?').get(spellId) as SpellRow | undefined;
    if (!spell) {
      res.status(404).json({ error: 'Spell not found' });
      return;
    }

    const memIds = JSON.parse(row.memorizedSpells) as string[];
    if (!memIds.includes(spellId)) {
      res.status(400).json({ error: 'Spell is not memorized' });
      return;
    }

    const roll = Math.floor(Math.random() * 20) + 1;
    const attrs = JSON.parse(row.attributes) as Record<string, number>;
    const attrMod = Math.floor((attrs[row.primaryAttribute] - 10) / 2);
    const classes = JSON.parse(row.classes) as { level: number; isHalfClass: boolean }[];
    const charLevel = classes.reduce((sum, c) => sum + (c.isHalfClass ? Math.floor(c.level / 2) : c.level), 0);
    const total = roll + charLevel + attrMod;
    const cl = 12 + spell.level;
    const success = total >= cl;
    const isNatural1 = roll === 1;
    const isNatural20 = roll === 20;

    let mishapResult = null;
    if (isNatural1) {
      const mishapRoll = Math.floor(Math.random() * 20) + 1;
      const mishapEntry = db.prepare('SELECT description FROM mishap_entries WHERE userId = ? AND roll = ?').get(req.userId, mishapRoll) as { description: string } | undefined;
      mishapResult = { roll: mishapRoll, description: mishapEntry?.description || 'No mishap table entry found' };
      const lost = JSON.parse(row.lostSpells) as string[];
      lost.push(spellId);
      db.prepare('UPDATE characters SET memorizedSpells=?, lostSpells=?, updatedAt=datetime(\'now\') WHERE _id=?')
        .run(JSON.stringify(memIds.filter(s => s !== spellId)), JSON.stringify(lost), row._id);
    } else if (!success && !isNatural20) {
      const lost = JSON.parse(row.lostSpells) as string[];
      lost.push(spellId);
      db.prepare('UPDATE characters SET memorizedSpells=?, lostSpells=?, updatedAt=datetime(\'now\') WHERE _id=?')
        .run(JSON.stringify(memIds.filter(s => s !== spellId)), JSON.stringify(lost), row._id);
    }

    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(row._id) as CharRow;

    res.json({
      roll, attrMod, charLevel, total, cl, success, isNatural1, isNatural20,
      mishap: mishapResult,
      character: formatCharacter(updated),
    });
  } catch {
    res.status(500).json({ error: 'Failed to cast spell' });
  }
});

router.post('/:id/spell-lost', (req: AuthRequest, res: Response) => {
  try {
    const { spellId } = req.body;
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) { res.status(404).json({ error: 'Character not found' }); return; }
    const memIds = JSON.parse(row.memorizedSpells) as string[];
    if (!memIds.includes(spellId)) { res.status(400).json({ error: 'Spell not memorized' }); return; }
    const lost = JSON.parse(row.lostSpells) as string[];
    lost.push(spellId);
    db.prepare('UPDATE characters SET memorizedSpells=?, lostSpells=?, updatedAt=datetime(\'now\') WHERE _id=?')
      .run(JSON.stringify(memIds.filter(s => s !== spellId)), JSON.stringify(lost), row._id);
    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(row._id) as CharRow;
    res.json({ character: formatCharacter(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to mark spell lost' });
  }
});

router.post('/:id/spell-mishap', (req: AuthRequest, res: Response) => {
  try {
    const { spellId } = req.body;
    const row = db.prepare('SELECT * FROM characters WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CharRow | undefined;
    if (!row) { res.status(404).json({ error: 'Character not found' }); return; }
    const memIds = JSON.parse(row.memorizedSpells) as string[];
    if (!memIds.includes(spellId)) { res.status(400).json({ error: 'Spell not memorized' }); return; }
    const mishapRoll = Math.floor(Math.random() * 20) + 1;
    const mishapEntry = db.prepare('SELECT description FROM mishap_entries WHERE userId = ? AND roll = ?').get(req.userId, mishapRoll) as { description: string } | undefined;
    const mishap = { roll: mishapRoll, description: mishapEntry?.description || 'No mishap entry for this roll' };
    const lost = JSON.parse(row.lostSpells) as string[];
    lost.push(spellId);
    db.prepare('UPDATE characters SET memorizedSpells=?, lostSpells=?, updatedAt=datetime(\'now\') WHERE _id=?')
      .run(JSON.stringify(memIds.filter(s => s !== spellId)), JSON.stringify(lost), row._id);
    const updated = db.prepare('SELECT * FROM characters WHERE _id = ?').get(row._id) as CharRow;
    res.json({ character: formatCharacter(updated), mishap });
  } catch {
    res.status(500).json({ error: 'Failed to resolve mishap' });
  }
});

router.post('/:id/rest', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE characters SET lostSpells=?, memorizedSpells=?, updatedAt=datetime(\'now\') WHERE _id=? AND userId=?')
      .run('[]', '[]', req.params.id, req.userId);
    const row = db.prepare('SELECT * FROM characters WHERE _id = ?').get(req.params.id) as CharRow;
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json({ character: formatCharacter(row) });
  } catch {
    res.status(500).json({ error: 'Failed to rest' });
  }
});

// ponytail: self-check that a 1st-level wizard can learn level 1 spells
if (getSpellsPerDayTable('Wizard', 1, 10).reduce((h, n, i) => (n > 0 ? i : h), -1) <= 0) {
  throw new Error('Bug: a 1st-level wizard should be able to learn level 1 spells');
}

export default router;
