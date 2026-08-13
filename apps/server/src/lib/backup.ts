import { backup, DatabaseSync } from 'node:sqlite';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DB_PATH, db } from '../db.ts';

/**
 * Sauvegardes locales de `trano.db`.
 *
 * Repris du système d'Oby (`Atlas/engine/src/db/backup.rs`), dont l'ordre des
 * opérations *est* le contenu réel :
 *
 * 1. **`quick_check` d'abord.** Une base corrompue n'est **jamais** sauvegardée :
 *    son dernier backup sain reste en place. Sans ça, la première nuit après une
 *    corruption écraserait la seule copie encore valable.
 * 2. **Online Backup API**, pas une copie de fichier. Relevé sur le serveur le
 *    2026-08-14 : `trano.db` faisait 4 Ko et `trano.db-wal` 214 Ko. Un `cp` aurait
 *    produit une base quasi vide, **sans erreur** — on ne l'aurait découvert qu'en
 *    tentant de restaurer. La copie mesurée par l'API : 28 Ko, contenu identique.
 * 3. **Vérification par réouverture.** On rouvre la copie, on relance `quick_check`
 *    et on recompte les lignes. Une sauvegarde jamais relue n'est pas une
 *    sauvegarde. (Oby ne le fait qu'au drill mensuel ; ici ça coûte une
 *    milliseconde, autant que chaque copie se prouve elle-même.)
 * 4. **`wal_checkpoint(TRUNCATE)`** ensuite, pour que le WAL ne gonfle pas sans fin.
 *
 * Chaque fichier produit est **une base complète et autonome** : restaurer, c'est
 * arrêter le conteneur et reposer le fichier à la place de `trano.db`.
 *
 * ⚠️ Ces copies vivent dans le **même volume Docker** que la base. Elles protègent
 * d'une fausse manœuvre ou d'une migration ratée — **pas de la perte du volume**.
 * La copie hors-site est un second sujet (voir la note en bas de fichier).
 */

const RETENTION_DAILY = 7;
const RETENTION_WEEKLY = 4;

const BACKUP_ROOT = process.env.TRANO_BACKUP_DIR ?? join(dirname(DB_PATH), 'backups');
const REPORT_PATH = join(BACKUP_ROOT, 'last-run.json');

/**
 * Heure de la passe quotidienne, `HH:MM`. Par défaut **01:30**, délibérément
 * *avant* les jobs de 02:00 d'Oby : le jour où l'on dépose la copie du jour dans
 * son dossier de backups, son envoi vers le coffre Drive chiffré doit trouver le
 * fichier déjà écrit.
 *
 * ⚠️ **Cette heure est locale, donc `TZ` doit être posée sur le conteneur.**
 * Relevé le 2026-08-14 : le conteneur Trano n'avait aucun `TZ` et tournait en UTC,
 * ce qui faisait passer ce `01:30` à 03:30 heure de Paris — soit *après* la passe
 * d'Oby, l'inverse de l'intention. `TZ=Europe/Paris` est à poser dans le
 * `docker-compose.yml` (voir `deploy/README.md`), comme l'unité systemd d'Oby le
 * fait déjà pour la même raison.
 */
const SCHEDULE = process.env.TRANO_BACKUP_TIME ?? '01:30';

export interface BackupReport {
  /** Jour de la tentative (`YYYY-MM-DD`, heure locale) — sert aussi de garde anti-rejeu. */
  date: string;
  at: string;
  ok: boolean;
  detail: string;
  file?: string;
  pages?: number;
  bytes?: number;
  rows?: Record<string, number>;
}

function today(): string {
  return new Date().toLocaleDateString('sv-SE'); // sv-SE = YYYY-MM-DD, en heure locale
}

/**
 * Le nombre de lignes de chaque table, listées depuis le schéma plutôt qu'en dur :
 * une table ajoutée demain sera vérifiée sans que personne n'ait à y penser.
 */
function tableCounts(handle: DatabaseSync): Record<string, number> {
  const tables = handle
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>;
  const counts: Record<string, number> = {};
  for (const { name } of tables) {
    counts[name] = (handle.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get() as { n: number }).n;
  }
  return counts;
}

/** Ne garde que les `keep` dossiers les plus récents (nommés par date, donc triables). */
function rotate(dir: string, keep: number): void {
  if (!existsSync(dir)) return;
  const days = readdirSync(dir)
    .filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n))
    .sort()
    .reverse();
  for (const old of days.slice(keep)) {
    rmSync(join(dir, old), { recursive: true, force: true });
  }
}

export function lastReport(): BackupReport | null {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as BackupReport;
  } catch {
    return null;
  }
}

function saveReport(report: BackupReport): void {
  mkdirSync(BACKUP_ROOT, { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

/** La passe complète. Appelée par l'ordonnanceur et par `POST /api/backup/run`. */
export async function runBackup(): Promise<BackupReport> {
  const date = today();
  const at = new Date().toISOString();

  // 1. La base est-elle saine ? Sinon on ne touche à rien.
  const check = (db.prepare('PRAGMA quick_check').get() as { quick_check: string }).quick_check;
  if (check !== 'ok') {
    const report: BackupReport = {
      date,
      at,
      ok: false,
      detail: `quick_check a répondu « ${check} » — base non sauvegardée, dernière copie saine conservée`,
    };
    saveReport(report);
    return report;
  }

  const expected = tableCounts(db);
  const dayDir = join(BACKUP_ROOT, 'daily', date);
  const dest = join(dayDir, `trano-${date}.db`);
  mkdirSync(dayDir, { recursive: true });

  // `backup()` est typé `void` par node:sqlite, mais rend en réalité le nombre de
  // pages copiées (vérifié en exécution : 7). On prend la valeur si elle est là,
  // sans en dépendre — c'est une information de confort dans le rapport.
  let pages: number | undefined;
  try {
    const result: unknown = await backup(db, dest);
    pages = typeof result === 'number' ? result : undefined;
  } catch (e) {
    const report: BackupReport = { date, at, ok: false, detail: `copie échouée : ${String(e)}` };
    saveReport(report);
    return report;
  }

  // 3. On rouvre la copie et on la compare à la source.
  try {
    const copy = new DatabaseSync(dest, { readOnly: true });
    const copyCheck = (copy.prepare('PRAGMA quick_check').get() as { quick_check: string }).quick_check;
    const actual = tableCounts(copy);
    copy.close();
    // Ouvrir une base en WAL crée ses annexes, même en lecture seule. Les laisser
    // serait un piège à la restauration : un `-wal` périmé posé à côté d'une
    // sauvegarde peut être rejoué par SQLite. La copie, elle, est déjà complète.
    for (const side of ['-wal', '-shm']) rmSync(`${dest}${side}`, { force: true });

    if (copyCheck !== 'ok' || JSON.stringify(actual) !== JSON.stringify(expected)) {
      // Une copie douteuse est pire qu'une copie absente : elle inspire confiance.
      rmSync(dest, { force: true });
      const report: BackupReport = {
        date,
        at,
        ok: false,
        detail:
          copyCheck !== 'ok'
            ? `la copie est corrompue (quick_check : ${copyCheck}) — supprimée`
            : `la copie diverge de la source (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}) — supprimée`,
      };
      saveReport(report);
      return report;
    }
  } catch (e) {
    rmSync(dest, { force: true });
    const report: BackupReport = { date, at, ok: false, detail: `copie illisible : ${String(e)} — supprimée` };
    saveReport(report);
    return report;
  }

  // 4. Le WAL est compacté seulement maintenant, la copie étant validée.
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    // non fatal : la sauvegarde est faite, le WAL se compactera au prochain passage
  }

  rotate(join(BACKUP_ROOT, 'daily'), RETENTION_DAILY);

  // Dimanche : la copie du jour est promue en hebdomadaire.
  if (new Date().getDay() === 0) {
    const weekly = join(BACKUP_ROOT, 'weekly', date);
    if (!existsSync(weekly)) {
      try {
        cpSync(dayDir, weekly, { recursive: true });
      } catch {
        // la promotion hebdo est un confort, son échec ne compromet pas le quotidien
      }
    }
    rotate(join(BACKUP_ROOT, 'weekly'), RETENTION_WEEKLY);
  }

  const report: BackupReport = {
    date,
    at,
    ok: true,
    detail: 'sauvegarde vérifiée',
    file: dest,
    pages,
    bytes: statSync(dest).size,
    rows: expected,
  };
  saveReport(report);
  return report;
}

/**
 * Ordonnanceur. Sémantique reprise d'Oby : « **pas fait aujourd'hui ET heure
 * dépassée** » plutôt qu'un réveil à heure fixe. Un conteneur redémarré à 09:00
 * rattrape donc la passe qu'il a manquée à 01:30, au lieu d'attendre le lendemain.
 *
 * Le rapport est écrit **même en cas d'échec** : sans ça, une base corrompue
 * relancerait une tentative toutes les cinq minutes jusqu'au matin.
 */
export function startBackupScheduler(log: (msg: string) => void): void {
  const [h, m] = SCHEDULE.split(':').map(Number);

  const tick = async (): Promise<void> => {
    const now = new Date();
    const due = now.getHours() * 60 + now.getMinutes() >= (h ?? 1) * 60 + (m ?? 30);
    if (!due || lastReport()?.date === today()) return;

    const report = await runBackup();
    log(
      report.ok
        ? `Sauvegarde ${report.date} : ${report.detail} (${report.bytes} octets)`
        : `Sauvegarde ${report.date} EN ÉCHEC : ${report.detail}`,
    );
  };

  void tick();
  setInterval(() => void tick(), 5 * 60_000).unref();
}

/*
 * ─── Hors-site, un jour ────────────────────────────────────────────────────────
 *
 * L'engine Oby tourne sur la même machine et pousse chaque nuit un coffre chiffré
 * (tar → age → Google Drive) avec canari anti-échec silencieux et drill mensuel.
 * Sa sélection (`backup_cloud/mod.rs::database_entries`) ne travaille **pas** sur
 * une liste figée : elle ramasse **tout `*.db`** présent dans son dossier du jour.
 *
 * Déposer `trano-<date>.db` dans `<OBY_DATA_DIR>/backups/daily/<date>/` suffirait
 * donc à obtenir le hors-site chiffré, sans une ligne de code côté Oby.
 *
 * ⚠️ Ce serait un **couplage implicite** : le jour où quelqu'un durcit
 * `database_entries` en liste explicite — ce qui serait raisonnable — la copie
 * hors-site de Trano s'arrêterait **en silence**. À n'entreprendre qu'en le
 * documentant des deux côtés.
 */
