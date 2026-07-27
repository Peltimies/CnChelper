import { Router, Response } from 'express';
import { db } from '../config/database';

const router = Router();

router.get('/', (req, res: Response) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM treasures WHERE 1=1';
    const params: string[] = [];
    if (category) {
      sql += ' AND category LIKE ?';
      params.push(`%${category}%`);
    }
    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY name ASC LIMIT 500';
    const treasures = db.prepare(sql).all(...params);
    res.json({ treasures });
  } catch {
    res.status(500).json({ error: 'Failed to fetch treasures' });
  }
});

router.get('/:id', (req, res: Response) => {
  try {
    const treasure = db.prepare('SELECT * FROM treasures WHERE _id = ?').get(req.params.id);
    if (!treasure) {
      res.status(404).json({ error: 'Treasure not found' });
      return;
    }
    res.json({ treasure });
  } catch {
    res.status(500).json({ error: 'Failed to fetch treasure' });
  }
});

export default router;
