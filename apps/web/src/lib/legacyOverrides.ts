import type { DeviceOverride } from '@trano/shared';
import { api } from './api';

/**
 * Récupération unique des surcharges d'appareils restées en local.
 *
 * Jusqu'à la bascule vers SQLite, les renommages, assignations de pièce,
 * masquages et positions du plan vivaient dans l'**IndexedDB de chaque
 * navigateur** (base `trano-config`, magasin `keyval`, clé `trano-config` —
 * avec repli localStorage quand IndexedDB était indisponible). Le nouveau
 * store lit le serveur et ne regarde plus là : sans cette reprise, tout ce
 * travail resterait orphelin dans les navigateurs, invisible et perdu.
 *
 * Personne ne peut aller chercher ces bases à distance : elles ne sont
 * lisibles que par du code tournant dans le navigateur concerné. La reprise
 * est donc embarquée dans l'app et s'exécute sur chaque écran.
 *
 * **Règle anti-collision** : on n'écrit que les entités que le serveur ne
 * connaît pas encore. Quatre écrans qui démarrent l'un après l'autre ne
 * s'écrasent donc jamais — le premier sème, les suivants ne font que
 * combler les trous. En cas de désaccord sur un même appareil (deux écrans,
 * deux noms), le premier arrivé gagne, et rien n'est détruit.
 *
 * **Drapeau local, indispensable** : sans lui, un écran resté sur une vieille
 * IndexedDB ressusciterait à chaque démarrage une surcharge que tu viens de
 * supprimer volontairement.
 */

const LEGACY_DB = 'trano-config';
const LEGACY_STORE = 'keyval';
const LEGACY_KEY = 'trano-config';
const DONE_FLAG = 'trano-overrides-imported';

/** Lit la valeur brute laissée par l'ancien adaptateur (IndexedDB, puis localStorage). */
async function readLegacyBlob(): Promise<string | null> {
  const fromIdb = await readFromIndexedDB().catch(() => null);
  if (fromIdb) return fromIdb;
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

function readFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    // Ouverture **sans numéro de version** : on prend la base telle qu'elle est
    // et on ne déclenche aucune migration. Si elle n'existait pas, le navigateur
    // en crée une vide, sans magasin — d'où le test ci-dessous.
    const req = indexedDB.open(LEGACY_DB);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        db.close();
        return resolve(null);
      }
      try {
        const tx = db.transaction(LEGACY_STORE, 'readonly');
        const getReq = tx.objectStore(LEGACY_STORE).get(LEGACY_KEY);
        getReq.onsuccess = () => {
          db.close();
          const value = getReq.result;
          resolve(typeof value === 'string' ? value : null);
        };
        getReq.onerror = () => {
          db.close();
          reject(getReq.error);
        };
      } catch (err) {
        db.close();
        reject(err);
      }
    };
  });
}

function parseOverrides(blob: string): Record<string, DeviceOverride> {
  try {
    // Forme écrite par zustand/persist : { state: { deviceOverrides }, version }
    const parsed = JSON.parse(blob);
    const found = parsed?.state?.deviceOverrides ?? parsed?.deviceOverrides;
    return found && typeof found === 'object' ? found : {};
  } catch {
    return {};
  }
}

/** Une surcharge vide ne vaut pas la peine d'être remontée. */
function isMeaningful(o: DeviceOverride): boolean {
  return Boolean(o && (o.displayName || o.roomId || o.hidden || o.position));
}

/**
 * Remonte les surcharges locales vers le serveur, une seule fois par appareil.
 * Renvoie le nombre d'entités effectivement importées.
 */
export async function importLegacyOverrides(
  serverOverrides: Record<string, DeviceOverride>
): Promise<number> {
  if (localStorage.getItem(DONE_FLAG)) return 0;

  const blob = await readLegacyBlob();
  if (!blob) {
    localStorage.setItem(DONE_FLAG, 'aucune donnée locale');
    return 0;
  }

  const local = parseOverrides(blob);
  const toImport = Object.entries(local).filter(
    ([entityId, override]) => isMeaningful(override) && !serverOverrides[entityId]
  );

  if (toImport.length === 0) {
    localStorage.setItem(DONE_FLAG, 'rien à reprendre');
    return 0;
  }

  let imported = 0;
  for (const [entityId, override] of toImport) {
    try {
      await api.overrides.set(entityId, override);
      imported += 1;
    } catch {
      // Un échec réseau ne doit pas marquer l'import comme fait : on sort sans
      // poser le drapeau, la reprise sera retentée au prochain démarrage.
      console.warn('[overrides] reprise interrompue sur', entityId);
      return imported;
    }
  }

  localStorage.setItem(DONE_FLAG, `${imported} surcharge(s) reprises`);
  console.info(`[overrides] ${imported} surcharge(s) locales remontées au serveur.`);
  return imported;
}
