import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import './config/database';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import spellRoutes from './routes/spells';
import monsterRoutes from './routes/monsters';
import treasureRoutes from './routes/treasures';
import mishapRoutes from './routes/mishap';
import combatRoutes from './routes/combat';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/spells', spellRoutes);
app.use('/api/monsters', monsterRoutes);
app.use('/api/treasures', treasureRoutes);
app.use('/api/mishap', mishapRoutes);
app.use('/api/combat', combatRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV === 'production') {
  const staticPath = path.resolve(__dirname, '../../../frontend/dist');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
