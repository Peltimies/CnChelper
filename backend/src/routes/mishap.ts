import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const entries = db.prepare('SELECT * FROM mishap_entries WHERE userId = ? ORDER BY roll ASC').all(req.userId);
    res.json({ entries });
  } catch {
    res.status(500).json({ error: 'Failed to fetch mishap table' });
  }
});

router.put('/', (req: AuthRequest, res: Response) => {
  try {
    const { entries } = req.body;
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM mishap_entries WHERE userId = ?').run(req.userId);
      for (const e of entries as { roll: number; description: string }[]) {
        db.prepare('INSERT INTO mishap_entries (_id, userId, roll, description) VALUES (?, ?, ?, ?)')
          .run(crypto.randomUUID(), req.userId, e.roll, e.description);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    const saved = db.prepare('SELECT * FROM mishap_entries WHERE userId = ? ORDER BY roll ASC').all(req.userId);
    res.json({ entries: saved });
  } catch {
    res.status(500).json({ error: 'Failed to update mishap table' });
  }
});

router.post('/roll', (req: AuthRequest, res: Response) => {
  try {
    const roll = Math.floor(Math.random() * 20) + 1;
    const entry = db.prepare('SELECT description FROM mishap_entries WHERE userId = ? AND roll = ?').get(req.userId, roll) as { description: string } | undefined;
    res.json({ roll, description: entry?.description || 'No mishap table entry found' });
  } catch {
    res.status(500).json({ error: 'Failed to roll mishap' });
  }
});

export default router;
