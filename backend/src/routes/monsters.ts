import { Router, Response } from 'express';
import { db } from '../config/database';

const router = Router();

router.get('/', (req, res: Response) => {
  try {
    const { type, search } = req.query;
    let sql = 'SELECT * FROM monsters WHERE 1=1';
    const params: string[] = [];
    if (type) {
      sql += ' AND type LIKE ?';
      params.push(`%${type}%`);
    }
    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY name ASC LIMIT 500';
    const monsters = db.prepare(sql).all(...params);
    res.json({ monsters });
  } catch {
    res.status(500).json({ error: 'Failed to fetch monsters' });
  }
});

router.get('/:id', (req, res: Response) => {
  try {
    const monster = db.prepare('SELECT * FROM monsters WHERE _id = ?').get(req.params.id);
    if (!monster) {
      res.status(404).json({ error: 'Monster not found' });
      return;
    }
    res.json({ monster });
  } catch {
    res.status(500).json({ error: 'Failed to fetch monster' });
  }
});

export default router;
