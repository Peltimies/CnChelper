# C&C Helper App

A Castles & Crusades RPG helper app for spell management, monster browsing, and combat tracking.

## Features

- **Character Management**: Create characters with multiclass and class-and-a-half support
- **Homebrew Spellcasting**: Unlimited casts/day, each requiring a spellcasting check (d20 + level + attribute mod vs CL 12 + spell level)
- **Tinder-style Swipe UI**: Learn spells at level up and memorize spells after rest
- **Mishap System**: Custom 20-entry mishap table triggered on natural 1 rolls
- **Bestiary**: Browse and search monsters from C&C Monsters & Treasure
- **Combat Tracker**: GM tool for managing combat sessions with initiative tracking
- **PWA**: Installable on mobile devices for offline use

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS + Framer Motion + PWA
- **Backend**: Node.js + Express + TypeScript + MongoDB + Mongoose
- **Auth**: JWT-based authentication

## Project Structure

```
c&c_helper/
├── backend/           # Express API server
│   ├── src/
│   │   ├── config/    # Database connection
│   │   ├── models/    # Mongoose models (User, Character, Spell, Monster, etc.)
│   │   ├── middleware/# Auth middleware
│   │   ├── routes/    # API route handlers
│   │   └── index.ts   # Express app entry point
│   └── scripts/       # Data import scripts for spells and monsters
├── frontend/          # React PWA
│   ├── src/
│   │   ├── components/# Reusable UI components (Layout, SwipeCard)
│   │   ├── lib/       # API client
│   │   ├── pages/     # Route pages (Login, Characters, SpellDeck, Bestiary, etc.)
│   │   ├── stores/    # Zustand state management
│   │   ├── types/     # TypeScript interfaces
│   │   └── main.tsx   # React app entry point
│   └── vite.config.ts # Vite + PWA configuration
```

## Setup

### Backend

1. Copy `.env.example` to `.env` and configure:
   - `PORT` - Server port (default 5000)
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret for JWT signing
   - `CLIENT_URL` - Frontend URL for CORS

2. Install and run:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. Import spell and monster data (optional):
   ```bash
   npm run import:spells
   npm run import:monsters
   ```

### Frontend

1. Copy `.env.example` to `.env` if needed (defaults to proxying `/api` to localhost:5000)

2. Install and run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Spellcasting Mechanics

- **Check**: d20 + character level + primary attribute modifier vs CL (12 + spell level)
- **Success**: Spell casts successfully, remains memorized
- **Failure**: Spell is lost until next rest
- **Natural 1**: Roll on mishap table, spell is also lost
- **Natural 20**: Spell casts, remains memorized (no check needed)
- **Rest**: All lost spells return to memorized pool
