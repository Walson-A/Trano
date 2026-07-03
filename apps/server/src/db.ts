import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Base SQLite via node:sqlite (intégré à Node 22.5+) : aucune dépendance
 * native à compiler — crucial pour l'image Docker ARM64 de la Freebox.
 * TRANO_DB_PATH pointe vers /data/trano.db dans l'add-on HAOS (persisté
 * et inclus dans les sauvegardes HA).
 */
const DB_PATH =
  process.env.TRANO_DB_PATH ?? fileURLToPath(new URL('../data/trano.db', import.meta.url));

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profiles (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    avatar         TEXT NOT NULL DEFAULT '😀',
    color          TEXT NOT NULL DEFAULT '#f59e0b',
    room_ids       TEXT NOT NULL DEFAULT '[]',
    is_kid         INTEGER NOT NULL DEFAULT 0,
    favorites      TEXT NOT NULL DEFAULT '[]',
    favorite_rooms TEXT NOT NULL DEFAULT '[]',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shopping_items (
    id               TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    category         TEXT NOT NULL DEFAULT 'autre',
    quantity         TEXT,
    author_id        TEXT,
    status           TEXT NOT NULL DEFAULT 'todo',
    recurrence_days  INTEGER,
    next_due         TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    bought_at        TEXT,
    bought_by        TEXT
  );
`);

/**
 * Migrations légères : ajoute les colonnes manquantes aux bases déjà créées.
 * SQLite n'a pas d'"ADD COLUMN IF NOT EXISTS" → on inspecte le schéma.
 */
function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('profiles', 'favorite_rooms', "TEXT NOT NULL DEFAULT '[]'");

export function newId(): string {
  return crypto.randomUUID();
}
