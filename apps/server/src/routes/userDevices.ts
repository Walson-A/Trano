import type { FastifyInstance } from 'fastify';
import type {
  PresenceEntry,
  UserDevice,
  UserDeviceHeartbeat,
  UserDeviceRegister,
  UserDeviceUpdate,
} from '@trano/shared';
import { HOUSE_PROFILE_ID, db } from '../db.ts';
import { broadcast } from '../ws.ts';

/**
 * Les appareils des gens : téléphones, tablettes, écrans muraux, TV.
 *
 * C'est ce qui manquait au modèle : rien ne reliait une personne à un
 * téléphone, donc l'interphone acceptait un destinataire sans savoir où
 * l'envoyer, et « qui est là » n'avait aucune source.
 *
 * Le protocole est repris de l'engine Oby (`presence-hub.md`) : le client
 * génère un identifiant stable, s'enregistre une fois, puis bat le cœur. Rien
 * n'est poussé par le serveur.
 */

/**
 * Au-delà, l'appareil est considéré hors ligne.
 *
 * `online` n'est **jamais stocké** : une colonne « en ligne » serait fausse dès
 * qu'un appareil s'éteint sans prévenir — ce qu'un téléphone fait tout le
 * temps. Se la calculer à la lecture est la seule façon qu'elle soit vraie.
 */
const ONLINE_WINDOW_MS = 90_000;

const DEVICE_TYPES = new Set(['phone', 'tablet', 'pc', 'tv', 'kiosk']);

interface DeviceRow {
  id: string;
  name: string;
  profile_id: string;
  type: string;
  platform: string | null;
  model: string | null;
  os_version: string | null;
  push_token: string | null;
  battery_pct: number | null;
  battery_charging: number | null;
  is_home: number | null;
  room_id: string | null;
  last_seen_at: string | null;
  created_at: string;
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  return Number.isFinite(t) && Date.now() - t < ONLINE_WINDOW_MS;
}

function toDevice(row: DeviceRow): UserDevice {
  return {
    id: row.id,
    name: row.name,
    profileId: row.profile_id,
    type: (DEVICE_TYPES.has(row.type) ? row.type : 'phone') as UserDevice['type'],
    platform: row.platform,
    model: row.model,
    osVersion: row.os_version,
    // On expose l'existence du jeton, pas le jeton : il n'a aucune raison de
    // circuler vers un écran, et `/api/user-devices` est ouvert comme le reste.
    hasPushToken: Boolean(row.push_token),
    batteryPct: row.battery_pct,
    batteryCharging: row.battery_charging === null ? null : row.battery_charging === 1,
    isHome: row.is_home === null ? null : row.is_home === 1,
    roomId: row.room_id,
    lastSeenAt: row.last_seen_at,
    online: isOnline(row.last_seen_at),
    createdAt: row.created_at,
  };
}

function readDevice(id: string): UserDevice | null {
  const row = db.prepare('SELECT * FROM user_devices WHERE id = ?').get(id) as unknown as
    | DeviceRow
    | undefined;
  return row ? toDevice(row) : null;
}

export function userDeviceRoutes(app: FastifyInstance): void {
  app.get('/api/user-devices', () => {
    const rows = db
      .prepare('SELECT * FROM user_devices ORDER BY created_at')
      .all() as unknown as DeviceRow[];
    return rows.map(toDevice);
  });

  /**
   * Première connexion, ou reprise après réinstallation.
   *
   * Un upsert plutôt qu'un create : l'identifiant vient du client et il est
   * stable, donc réinstaller l'app ne doit pas fabriquer un doublon. `created_at`
   * est préservé — c'est la date de la première fois, pas de la dernière.
   */
  app.post<{ Body: UserDeviceRegister }>('/api/user-devices/register', (req, reply) => {
    const b = req.body ?? ({} as UserDeviceRegister);
    if (!b.id?.trim()) return reply.code(400).send({ error: "L'identifiant d'appareil est requis" });
    if (!b.name?.trim()) return reply.code(400).send({ error: 'Le nom est requis' });

    // Un appareil sans propriétaire n'existe pas : les écrans partagés
    // appartiennent à la Maison. Un profil inconnu (supprimé entre-temps sur un
    // autre écran) y retombe plutôt que d'être refusé — mieux vaut un appareil
    // rattaché à la maison qu'un appareil qui n'arrive pas à s'enregistrer.
    const profileExists = db.prepare('SELECT 1 FROM profiles WHERE id = ?').get(b.profileId);
    const profileId = profileExists ? b.profileId : HOUSE_PROFILE_ID;

    const type = b.type && DEVICE_TYPES.has(b.type) ? b.type : 'phone';
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO user_devices (id, name, profile_id, type, platform, model, os_version, push_token, room_id, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         profile_id = excluded.profile_id,
         type = excluded.type,
         platform = excluded.platform,
         model = excluded.model,
         os_version = excluded.os_version,
         -- Un ré-enregistrement sans jeton (le web n'en a pas) ne doit pas
         -- effacer celui que l'app native avait déjà posé.
         push_token = COALESCE(excluded.push_token, user_devices.push_token),
         room_id = excluded.room_id,
         last_seen_at = excluded.last_seen_at`,
    ).run(
      b.id.trim(),
      b.name.trim(),
      profileId,
      type,
      b.platform ?? null,
      b.model ?? null,
      b.osVersion ?? null,
      b.pushToken ?? null,
      // Une pièce inconnue devient NULL plutôt que de faire échouer
      // l'enregistrement : mieux vaut un écran sans pièce qu'un écran absent.
      b.roomId && db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(b.roomId) ? b.roomId : null,
      now,
    );

    broadcast('user-devices');
    return reply.code(201).send(readDevice(b.id.trim()));
  });

  /**
   * Battement de cœur. Ne touche que ce qui bouge : batterie, présence, et
   * l'horodatage dont `online` se déduit.
   */
  app.post<{ Params: { id: string }; Body: UserDeviceHeartbeat }>(
    '/api/user-devices/:id/heartbeat',
    (req, reply) => {
      const exists = db.prepare('SELECT 1 FROM user_devices WHERE id = ?').get(req.params.id);
      // 404 plutôt qu'une création implicite : au client de s'enregistrer
      // d'abord, sinon on fabriquerait des appareils anonymes sans propriétaire.
      if (!exists) return reply.code(404).send({ error: 'Appareil inconnu — enregistrez-le' });

      const b = req.body ?? {};
      const sets = ['last_seen_at = ?'];
      const values: (string | number | null)[] = [new Date().toISOString()];

      if (b.batteryPct !== undefined) { sets.push('battery_pct = ?'); values.push(b.batteryPct); }
      if (b.batteryCharging !== undefined) {
        sets.push('battery_charging = ?');
        values.push(b.batteryCharging === null ? null : b.batteryCharging ? 1 : 0);
      }
      if (b.isHome !== undefined) {
        sets.push('is_home = ?');
        values.push(b.isHome === null ? null : b.isHome ? 1 : 0);
      }
      if (b.pushToken !== undefined) { sets.push('push_token = ?'); values.push(b.pushToken); }

      values.push(req.params.id);
      db.prepare(`UPDATE user_devices SET ${sets.join(', ')} WHERE id = ?`).run(...values);

      // Pas de broadcast ici : un heartbeat par appareil et par minute
      // réveillerait tous les écrans en permanence pour un pourcentage de
      // batterie. Les clients relisent quand ils affichent.
      return readDevice(req.params.id);
    },
  );

  app.patch<{ Params: { id: string }; Body: UserDeviceUpdate }>(
    '/api/user-devices/:id',
    (req, reply) => {
      const exists = db.prepare('SELECT 1 FROM user_devices WHERE id = ?').get(req.params.id);
      if (!exists) return reply.code(404).send({ error: 'Appareil introuvable' });

      const b = req.body ?? {};
      const sets: string[] = [];
      const values: (string | number | null)[] = [];

      if (b.name !== undefined) { sets.push('name = ?'); values.push(b.name.trim()); }
      if (b.type !== undefined && DEVICE_TYPES.has(b.type)) { sets.push('type = ?'); values.push(b.type); }
      if (b.roomId !== undefined) {
        const ok = b.roomId === null || db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(b.roomId);
        if (!ok) return reply.code(400).send({ error: 'Pièce inconnue' });
        sets.push('room_id = ?');
        values.push(b.roomId);
      }
      if (b.profileId !== undefined) {
        const ok = db.prepare('SELECT 1 FROM profiles WHERE id = ?').get(b.profileId);
        if (!ok) return reply.code(400).send({ error: 'Profil inconnu' });
        sets.push('profile_id = ?');
        values.push(b.profileId);
      }

      if (sets.length > 0) {
        values.push(req.params.id);
        db.prepare(`UPDATE user_devices SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        broadcast('user-devices');
      }
      return readDevice(req.params.id);
    },
  );

  app.delete<{ Params: { id: string } }>('/api/user-devices/:id', (req, reply) => {
    const result = db.prepare('DELETE FROM user_devices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Appareil introuvable' });
    broadcast('user-devices');
    return reply.code(204).send();
  });

  /**
   * Qui est là.
   *
   * **Dérivé, jamais stocké.** Une personne est présente si au moins un de ses
   * téléphones l'est. Stocker la présence sur le profil *et* sur l'appareil,
   * ce serait deux sources de vérité pour une seule question — et c'est
   * toujours celle affichée qui aurait tort.
   *
   * Seuls les téléphones comptent : un kiosque « à la maison » ne dit rien de
   * son propriétaire, il est vissé au mur.
   */
  app.get('/api/presence', () => {
    const rows = db
      .prepare(
        `SELECT p.id, p.name, p.avatar, p.color, d.is_home, d.last_seen_at
           FROM profiles p
           LEFT JOIN user_devices d
             ON d.profile_id = p.id AND d.type = 'phone'
          WHERE p.kind = 'person'
          ORDER BY p.created_at`,
      )
      .all() as Array<{
      id: string;
      name: string;
      avatar: string;
      color: string;
      is_home: number | null;
      last_seen_at: string | null;
    }>;

    const byProfile = new Map<string, PresenceEntry>();
    for (const r of rows) {
      const seen = byProfile.get(r.id);
      const entry: PresenceEntry = seen ?? {
        profileId: r.id,
        name: r.name,
        avatar: r.avatar,
        color: r.color,
        // `null` = on ne sait pas, et c'est très différent de « sorti ».
        // Quelqu'un sans téléphone enregistré ne doit pas être affiché absent :
        // ce serait une affirmation fausse, et la famille la croirait.
        isHome: null,
        lastSeenAt: null,
      };
      if (r.is_home !== null) entry.isHome = entry.isHome === true || r.is_home === 1;
      // On garde le passage le plus récent, tous téléphones confondus.
      if (r.last_seen_at && (!entry.lastSeenAt || r.last_seen_at > entry.lastSeenAt)) {
        entry.lastSeenAt = r.last_seen_at;
      }
      byProfile.set(r.id, entry);
    }
    return [...byProfile.values()];
  });
}
