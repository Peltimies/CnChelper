import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Email, password, and display name are required' });
      return;
    }

    const existing = db.prepare('SELECT _id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (_id, email, passwordHash, displayName) VALUES (?, ?, ?, ?)')
      .run(id, email.toLowerCase(), passwordHash, displayName);

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id, email: email.toLowerCase(), displayName, roles: ['player'] },
    });
  } catch {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
      { _id: string; email: string; passwordHash: string; displayName: string; roles: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, email: user.email, displayName: user.displayName, roles: JSON.parse(user.roles) },
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT _id, email, displayName, roles FROM users WHERE _id = ?').get(req.userId) as
      { _id: string; email: string; displayName: string; roles: string } | undefined;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: { id: user._id, email: user.email, displayName: user.displayName, roles: JSON.parse(user.roles) } });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
