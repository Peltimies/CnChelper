// Standalone runner for the Adventurers Spellbook import.
// All parsing/import logic lives in init-db.ts; this is just a CLI entry point.
import { initializeDatabase } from './init-db';

initializeDatabase().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
