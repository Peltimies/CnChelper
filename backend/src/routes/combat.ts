import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface CombatRow {
  _id: string; userId: string; name: string; isActive: number;
  combatants: string; round: number; turnIndex: number;
  createdAt: string; updatedAt: string;
}

function formatSession(row: CombatRow) {
  return {
    _id: row._id,
    name: row.name,
    isActive: !!row.isActive,
    combatants: JSON.parse(row.combatants),
    round: row.round,
    turnIndex: row.turnIndex,
  };
}

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM combat_sessions WHERE userId = ? ORDER BY updatedAt DESC').all(req.userId) as CombatRow[];
    res.json({ sessions: rows.map(formatSession) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch combat sessions' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM combat_sessions WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CombatRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Combat session not found' });
      return;
    }
    res.json({ session: formatSession(row) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch combat session' });
  }
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, combatants } = req.body;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO combat_sessions (_id, userId, name, combatants) VALUES (?, ?, ?, ?)')
      .run(id, req.userId, name || 'New Combat', JSON.stringify(combatants || []));
    const row = db.prepare('SELECT * FROM combat_sessions WHERE _id = ?').get(id) as CombatRow;
    res.status(201).json({ session: formatSession(row) });
  } catch {
    res.status(500).json({ error: 'Failed to create combat session' });
  }
});

router.post('/:id/combatants', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM combat_sessions WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CombatRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Combat session not found' });
      return;
    }
    const combatants = JSON.parse(row.combatants) as unknown[];
    combatants.push(req.body);
    db.prepare('UPDATE combat_sessions SET combatants=?, updatedAt=datetime(\'now\') WHERE _id=?')
      .run(JSON.stringify(combatants), row._id);
    const updated = db.prepare('SELECT * FROM combat_sessions WHERE _id = ?').get(row._id) as CombatRow;
    res.json({ session: formatSession(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to add combatant' });
  }
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM combat_sessions WHERE _id = ? AND userId = ?').get(req.params.id, req.userId) as CombatRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Combat session not found' });
      return;
    }
    const { name, combatants, round, turnIndex, isActive } = req.body;
    db.prepare(`UPDATE combat_sessions SET name=?, combatants=?, round=?, turnIndex=?, isActive=?, updatedAt=datetime('now')
      WHERE _id=? AND userId=?`).run(
      name ?? row.name,
      combatants ? JSON.stringify(combatants) : row.combatants,
      round ?? row.round,
      turnIndex ?? row.turnIndex,
      isActive !== undefined ? (isActive ? 1 : 0) : row.isActive,
      req.params.id, req.userId
    );
    const updated = db.prepare('SELECT * FROM combat_sessions WHERE _id = ?').get(req.params.id) as CombatRow;
    res.json({ session: formatSession(updated) });
  } catch {
    res.status(500).json({ error: 'Failed to update combat session' });
  }
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM combat_sessions WHERE _id = ? AND userId = ?').run(req.params.id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Combat session not found' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete combat session' });
  }
});

export default router;
