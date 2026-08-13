import type { FastifyInstance } from 'fastify';
import { lastReport, runBackup } from '../lib/backup.ts';

/**
 * État des sauvegardes.
 *
 * Une sauvegarde qui échoue en silence est pire que pas de sauvegarde : on croit
 * être couvert. Ces deux routes existent pour que l'écran Réglages puisse dire
 * « dernière sauvegarde : ce matin, 5 profils, 11 pièces » — ou signaler l'échec.
 */
export function backupRoutes(app: FastifyInstance): void {
  app.get('/api/backup/status', () => {
    const report = lastReport();
    if (!report) return { neverRun: true };
    const ageMs = Date.now() - new Date(report.at).getTime();
    return { ...report, neverRun: false, ageHours: Math.round(ageMs / 3_600_000) };
  });

  // Déclenchement manuel — avant une migration, typiquement.
  app.post('/api/backup/run', async () => runBackup());
}
