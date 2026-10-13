import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { db } from '../db.ts';

export interface HomeConfig {
  id: string;
  name: string;
  provider: 'ha' | 'tuya';
  haUrl?: string;
  haToken?: string;
  /** Reuse main HA, while selecting this home's entities explicitly. */
  haSource?: 'main';
  entityIds?: string[];
  tuya?: { region: 'eu' | 'us' | 'cn' | 'in'; clientId: string; secret: string; uid: string; deviceIds: string[] };
}
const context = new AsyncLocalStorage<HomeConfig>();

/** Secrets loaded only on the server. Never return this object to a browser. */
export function homeConfigs(): HomeConfig[] {
  if (process.env.TRANO_HOMES_FILE) {
    const homes: unknown = JSON.parse(readFileSync(process.env.TRANO_HOMES_FILE, 'utf8'));
    if (!Array.isArray(homes) || !homes.length) throw new Error('Configuration des logements invalide.');
    const ids = new Set<string>();
    for (const home of homes as HomeConfig[]) {
      if (!home || !/^[a-z][a-z0-9-]{0,39}$/.test(home.id) || ids.has(home.id)
        || typeof home.name !== 'string' || !home.name.trim() || !['ha', 'tuya'].includes(home.provider)) {
        throw new Error('Configuration des logements invalide.');
      }
      if ((home.haSource !== undefined && (home.id === 'main' || home.haSource !== 'main'))
        || (home.entityIds !== undefined && (!Array.isArray(home.entityIds) || home.entityIds.some(id => typeof id !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(id))))) {
        throw new Error('Source ou appareils du logement invalides.');
      }
      if (home.tuya && (!['eu', 'us', 'cn', 'in'].includes(home.tuya.region)
        || !['clientId', 'secret', 'uid'].every(key => typeof (home.tuya as unknown as Record<string, unknown>)[key] === 'string')
        || !Array.isArray(home.tuya.deviceIds) || !home.tuya.deviceIds.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id)))) {
        throw new Error('Configuration Tuya invalide.');
      }
      ids.add(home.id);
    }
    if (!ids.has('main')) throw new Error('Le logement historique main doit être conservé.');
    if ((homes as HomeConfig[]).find(home => home.id === 'main')?.provider !== 'ha') throw new Error('main conserve son connecteur Home Assistant historique.');
    return withAssignments(homes as HomeConfig[]);
  }
  return withAssignments([
    { id: 'main', name: 'Maison familiale', provider: 'ha' },
    { id: 'apartment', name: 'Appartement', provider: 'ha', haSource: 'main' },
  ]);
}
function withAssignments(homes: HomeConfig[]): HomeConfig[] {
  return homes.map(home => {
    if (home.provider !== 'ha') return home;
    const ids = db.prepare('SELECT entity_id FROM home_devices WHERE home_id = ? AND source_id = ?').all(home.id, home.haSource ?? home.id) as { entity_id: string }[];
    return { ...home, entityIds: [...new Set([...(home.entityIds ?? []), ...ids.map(row => row.entity_id)])] };
  });
}
export function resolveHome(id: unknown = 'main'): HomeConfig {
  if (typeof id !== 'string') throw new Error('Logement invalide.');
  const home = homeConfigs().find(home => home.id === id);
  if (!home) throw new Error('Logement inconnu.');
  return home;
}
export function currentHome(): HomeConfig { return context.getStore() ?? resolveHome(); }
export function withHome<T>(home: HomeConfig, run: () => T): T { return context.run(home, run); }
export function haCredentials(): { url: string | null; token: string | null } {
  const home = currentHome();
  if (home.provider !== 'ha') return { url: null, token: null };
  if (home.haSource === 'main') return withHome(resolveHome('main'), haCredentials);
  return { url: home.haUrl ?? (home.id === 'main' ? process.env.TRANO_HA_URL ?? null : null),
    token: home.haToken ?? (home.id === 'main' ? process.env.TRANO_HA_TOKEN ?? null : null) };
}
export function publicHomes() {
  return withAssignments(homeConfigs()).map(home => ({ id: home.id, name: home.name, provider: home.provider,
    entityIds: home.entityIds ?? [],
    excludedEntityIds: excludedEntities(home),
    sharedHA: home.haSource === 'main',
    configured: home.provider === 'tuya'
      ? Boolean(home.tuya?.clientId && home.tuya.secret && home.tuya.uid && home.tuya.deviceIds.length)
      : withHome(home, () => Boolean(haCredentials().url && haCredentials().token && (home.id === 'main' || home.entityIds?.length))),
  }));
}

export function excludedEntities(home: HomeConfig): string[] {
  if (home.provider !== 'ha' || home.id !== 'main') return [];
  return withAssignments(homeConfigs()).filter(other => other.haSource === 'main' && other.id !== 'main').flatMap(other => other.entityIds ?? []);
}
export function homeEntities<T extends { entity_id: string }>(entities: T[], home = currentHome()): T[] {
  if (home.provider !== 'ha') return entities;
  if (home.id !== 'main') {
    // Re-resolve DB assignments; default homes carry no explicit entities yet.
    const fresh = withAssignments([home])[0];
    return entities.filter(entity => fresh.entityIds?.includes(entity.entity_id));
  }
  const excluded = new Set(excludedEntities(home));
  return entities.filter(entity => !excluded.has(entity.entity_id)
    // Tuya scenes do not list their members. Once HA serves two homes, require
    // explicit scene assignment instead of assuming they only affect main.
    && (!entity.entity_id.startsWith('scene.') || !excluded.size || home.entityIds?.includes(entity.entity_id)));
}
