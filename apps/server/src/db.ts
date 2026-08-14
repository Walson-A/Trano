import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Base SQLite via node:sqlite (intégré à Node 22.5+) : aucune dépendance
 * native à compiler — crucial pour l'image Docker ARM64 de la Freebox.
 * TRANO_DB_PATH pointe vers /data/trano.db dans le conteneur (persisté
 * et inclus dans les sauvegardes HA).
 */
export const DB_PATH =
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
    favorites      TEXT NOT NULL DEFAULT '[]',
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

ensureColumn('profiles', 'dashboard_layout', "TEXT NOT NULL DEFAULT '[]'");

// ─── Pièces (personnalisables depuis l'app) ─────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    floor       TEXT NOT NULL DEFAULT 'RDC',
    icon        TEXT NOT NULL DEFAULT 'sofa',
    sort_order  INTEGER NOT NULL DEFAULT 0
  );
`);

// Amorçage : les 10 pièces historiques de la maison (une seule fois)
const roomCount = (db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }).n;
if (roomCount === 0) {
  const seed = db.prepare('INSERT INTO rooms (id, name, floor, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
  const DEFAULT_ROOMS: Array<[string, string, string, string]> = [
    ['salon', 'Salon', 'RDC', 'sofa'],
    ['cuisine', 'Cuisine', 'RDC', 'cooking-pot'],
    ['garage', 'Garage', 'RDC', 'car'],
    ['sdb-bas', 'Salle de bain (bas)', 'RDC', 'bath'],
    ['chambre-parents', 'Chambre Parents', 'Étage', 'bed-double'],
    ['chambre-mahalia', 'Chambre Mahalia', 'Étage', 'baby'],
    ['chambre-kevin', 'Chambre Kevin', 'Étage', 'bed-single'],
    ['chambre-argan', 'Chambre Argan', 'Étage', 'baby'],
    ['chambres-enfants', 'Chambres des enfants', 'Étage', 'users'],
    ['sdb-etage', 'Salle de bain (étage)', 'Étage', 'bath'],
  ];
  DEFAULT_ROOMS.forEach(([id, name, floor, icon], i) => seed.run(id, name, floor, icon, i));
}

// ─── Surcharges d'appareils (partagées entre tous les écrans) ─

db.exec(`
  CREATE TABLE IF NOT EXISTS device_overrides (
    entity_id    TEXT PRIMARY KEY,
    display_name TEXT,
    room_id      TEXT,
    hidden       INTEGER NOT NULL DEFAULT 0,
    position_x   REAL,
    position_y   REAL
  );
`);

// ─── Étape A du socle « famille » (2026-08-14) ────────────────
//
// Voir docs/plans/2026-08-14-modele-donnees-famille.md.
//
// On AJOUTE sans rien retirer : `room_ids`, `is_kid` et `favorite_rooms`
// restent en place et continuent d'être lus par le code existant. Le
// basculement (étape B) puis la suppression (étape C) viendront après, chacun
// déployable seul. Onze fichiers dépendent de ces colonnes : les retirer dans
// le même mouvement, ce serait un déploiement sans état intermédiaire sûr —
// et la maison n'a qu'une seule app.

/**
 * `kind` distingue les personnes du profil « Maison ».
 *
 * Sans ce discriminant, la Maison apparaîtrait comme une personne partout :
 * dans « qui est là », dans le sélecteur de profils, et elle aurait des
 * préférences de notification.
 */
ensureColumn('profiles', 'kind', "TEXT NOT NULL DEFAULT 'person'");

/**
 * Les pièces d'une personne, en table de liaison plutôt qu'en tableau JSON.
 *
 * Une personne a plusieurs pièces ET une pièce a plusieurs personnes : c'est du
 * plusieurs-à-plusieurs. Le tableau JSON `room_ids` ne pouvait ni être joint ni
 * être contraint — supprimer une pièce y laissait un identifiant mort que rien
 * ne nettoyait. `ON DELETE CASCADE` s'en charge désormais, et `PRAGMA
 * foreign_keys = ON` (posé plus haut) fait que la contrainte s'applique
 * vraiment.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS profile_rooms (
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    room_id    TEXT NOT NULL REFERENCES rooms(id)    ON DELETE CASCADE,
    PRIMARY KEY (profile_id, room_id)
  );
`);

/**
 * Les appareils des gens : téléphones, tablettes, écrans muraux, TV.
 *
 * ⚠️ À ne pas confondre avec les « appareils » de la maison, qui sont les
 * entités Home Assistant (lampes, prises, volets) — celles-ci ne sont pas
 * stockées ici, elles viennent de HA en direct et n'ont que des surcharges
 * (`device_overrides`). D'où le nom `user_devices`, délibérément distinct.
 *
 * C'est le trou principal du modèle actuel : rien ne relie une personne à un
 * téléphone, donc l'interphone ne peut désigner personne et « qui est là » n'a
 * aucune source.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS user_devices (
    -- Généré par le client et stable dans le temps : c'est lui qui permet de
    -- reconnaître un appareil déjà vu plutôt que d'en créer un doublon.
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    -- Jamais NULL : les écrans partagés appartiennent au profil « Maison ».
    profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- phone | tablet | pc | tv | kiosk — le champ le plus structurant : il
    -- décide qui rapporte la présence, par quel canal on alerte, quelle icône.
    type          TEXT NOT NULL DEFAULT 'phone',
    -- Ce qui ne bouge jamais, en colonnes : ça s'affiche et ça se requête.
    platform      TEXT,
    model         TEXT,
    os_version    TEXT,
    -- Rempli uniquement par l'app native : le Web Push n'est pas un jeton mais
    -- un abonnement (endpoint + clés), qui ne rentrerait pas ici.
    push_token    TEXT,
    -- Valeurs courantes, écrasées à chaque heartbeat. Pas d'historique : si les
    -- courbes de batterie deviennent un besoin, ce sera une table dédiée.
    battery_pct   INTEGER,
    battery_charging INTEGER,
    is_home       INTEGER,
    -- Uniquement pour les ecrans fixes : ou est cet ecran. Un telephone bouge,
    -- la question n'a pas de sens pour lui. ON DELETE SET NULL : supprimer une
    -- piece ne doit pas emporter l'appareil qui s'y trouvait.
    room_id       TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    last_seen_at  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

ensureColumn('user_devices', 'room_id', 'TEXT REFERENCES rooms(id) ON DELETE SET NULL');

/** Le profil auquel se rattachent les écrans partagés (tablette murale, TV). */
export const HOUSE_PROFILE_ID = 'maison';

// Création unique du profil « Maison ». Sa suppression est interdite côté API :
// sans lui, tous les écrans partagés deviendraient orphelins.
{
  const exists = db.prepare('SELECT 1 FROM profiles WHERE id = ?').get(HOUSE_PROFILE_ID);
  if (!exists) {
    // Uniquement les colonnes qui survivent à l'étape C : `favorites` et
    // `dashboard_layout` ont leur propre valeur par défaut. Lister ici une
    // colonne supprimée casserait la création d'une base neuve — sans que ça
    // se voie jamais sur une base existante, où elle existe encore à ce
    // moment-là (la suppression n'intervient qu'ensuite).
    db.prepare(
      `INSERT INTO profiles (id, name, avatar, color, kind)
       VALUES (?, 'Maison', '🏠', '#64748b', 'house')`,
    ).run(HOUSE_PROFILE_ID);
  }
}

// Reprise unique de `room_ids` vers la table de liaison. Ne s'exécute que si
// celle-ci est vide : une reprise rejouée écraserait des choix faits depuis.
function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

{
  const already = (db.prepare('SELECT COUNT(*) AS n FROM profile_rooms').get() as { n: number }).n;
  // Sur une base neuve, `room_ids` n'existe plus du tout : il n'y a rien à
  // reprendre, et la lire ferait échouer le démarrage.
  if (already === 0 && hasColumn('profiles', 'room_ids')) {
    const rows = db.prepare('SELECT id, room_ids FROM profiles').all() as Array<{
      id: string;
      room_ids: string;
    }>;
    const known = new Set(
      (db.prepare('SELECT id FROM rooms').all() as Array<{ id: string }>).map((r) => r.id),
    );
    const link = db.prepare('INSERT OR IGNORE INTO profile_rooms (profile_id, room_id) VALUES (?, ?)');
    for (const row of rows) {
      let ids: unknown;
      try {
        ids = JSON.parse(row.room_ids || '[]');
      } catch {
        continue; // JSON illisible : on préfère perdre le lien que planter au boot
      }
      if (!Array.isArray(ids)) continue;
      // Les pièces supprimées depuis laissaient un identifiant mort dans le
      // JSON — précisément le bug que la table de liaison corrige. On ne
      // reprend donc que ce qui existe encore.
      for (const roomId of ids) {
        if (typeof roomId === 'string' && known.has(roomId)) link.run(row.id, roomId);
      }
    }
  }
}

// ─── Étape C du socle « famille » (2026-08-14) ────────────────
//
// Les trois colonnes de l'ancien modèle partent. Plus rien ne les lit depuis
// l'étape B, et **elles ne sont plus alimentées** : les garder « au cas où »
// aurait offert un retour en arrière vers un état figé au jour de la migration,
// qui aurait silencieusement perdu tout changement survenu depuis. Un filet qui
// pourrit sans le dire est pire qu'aucun filet.
//
// Le vrai retour en arrière, c'est la sauvegarde (`lib/backup.ts`) : quotidienne,
// vérifiée, hors site, et cohérente.
for (const column of ['room_ids', 'is_kid', 'favorite_rooms']) {
  if (hasColumn('profiles', column)) {
    db.exec(`ALTER TABLE profiles DROP COLUMN ${column}`);
  }
}

export function newId(): string {
  return crypto.randomUUID();
}
