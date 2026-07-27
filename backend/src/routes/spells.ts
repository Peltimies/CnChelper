import { Router, Response } from 'express';
import { db } from '../config/database';

const router = Router();

interface SpellRow {
  _id: string; name: string; level: number; classes: string; school: string;
  castingTime: string; range: string; duration: string; savingThrow: string;
  spellResistance: string; components: string; targetArea: string;
  description: string; reversible: number; source: string;
}

function formatSpell(row: SpellRow) {
  return { ...row, classes: JSON.parse(row.classes), reversible: !!row.reversible };
}

router.get('/', (req, res: Response) => {
  try {
    const { class: spellClass, level, search } = req.query;
    let sql = 'SELECT * FROM spells WHERE 1=1';
    const params: (string | number)[] = [];
    if (spellClass) {
      sql += ' AND classes LIKE ?';
      params.push(`%"${spellClass}"%`);
    }
    if (level) {
      sql += ' AND level = ?';
      params.push(Number(level));
    }
    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY name ASC';
    const rows = db.prepare(sql).all(...params) as SpellRow[];
    res.json({ spells: rows.map(formatSpell) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch spells' });
  }
});

router.get('/:id', (req, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM spells WHERE _id = ?').get(req.params.id) as SpellRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Spell not found' });
      return;
    }
    res.json({ spell: formatSpell(row) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch spell' });
  }
});

export default router;
