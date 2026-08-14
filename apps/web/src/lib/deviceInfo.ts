import type { UserDeviceType } from '@trano/shared';

/**
 * Ce que le navigateur veut bien dire de l'appareil.
 *
 * La récolte dépend entièrement du navigateur, et l'écart est brutal :
 *
 * |                        | modèle | OS + version |
 * |------------------------|--------|--------------|
 * | Chrome Android         | ✅     | ✅           |
 * | Chrome / Edge PC       | ❌     | ✅           |
 * | iPhone/iPad, tous nav. | ❌     | partiel      |
 *
 * Les **Client Hints** (`getHighEntropyValues`, seuls à donner `model`) sont
 * une API Chromium ; Safari et Firefox ne l'ont pas du tout. Et comme Apple
 * impose WebKit à tous les navigateurs iOS, aucun navigateur d'iPhone n'y a
 * accès. On y récolte donc presque rien.
 *
 * C'est exactement pourquoi l'écran de première connexion **fait valider** au
 * lieu de deviner en silence : il se dégrade proprement là où on ne sait rien.
 */

const DEVICE_ID_KEY = 'trano-device-id';

/**
 * L'identifiant est **généré par le client et gardé** : c'est lui qui permet de
 * reconnaître un appareil déjà vu plutôt que d'en créer un doublon à chaque
 * ouverture. Vider le stockage du navigateur revient donc à présenter un
 * nouvel appareil — c'est le comportement voulu, ce n'est plus le même.
 */
export function getDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null; // navigation privée, stockage bloqué : on ne s'enregistre pas
  }
}

/**
 * Un identifiant unique, y compris hors contexte sécurisé.
 *
 * `crypto.randomUUID()` n'existe **que** en HTTPS ou sur localhost. Or Trano
 * est servi en clair sur le réseau de la maison (`http://192.168.1.65:3001`) :
 * la fonction y est purement absente, et l'appel plantait l'enregistrement avec
 * « crypto.randomUUID is not a function ».
 *
 * `crypto.getRandomValues`, lui, reste disponible partout — seuls `randomUUID`
 * et `crypto.subtle` sont réservés aux contextes sécurisés. On fabrique donc un
 * UUID v4 à la main à partir de lui, et on ne retombe sur `Math.random` que si
 * même ça manque : un identifiant un peu moins solide vaut mieux qu'un appareil
 * qui ne peut pas s'enregistrer.
 */
function randomUuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante RFC 4122
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createDeviceId(): string {
  const id = randomUuid();
  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // Sans stockage, l'appareil se réenregistrera à la prochaine visite. Mieux
    // vaut un doublon occasionnel qu'un écran bloqué.
  }
  return id;
}

export interface DetectedDevice {
  type: UserDeviceType;
  platform: string | null;
  model: string | null;
  osVersion: string | null;
  /** Proposition de nom, que l'utilisateur corrige. */
  suggestedName: string;
}

interface UaDataLike {
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platformVersion?: string;
    platform?: string;
  }>;
}

function guessPlatform(ua: string): string | null {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua)) return 'linux';
  return null;
}

/**
 * Le type se devine mieux par la taille de l'écran que par la chaîne
 * d'agent : un iPad se déclare « Macintosh » depuis iPadOS 13, et beaucoup de
 * PC portables ont un écran tactile.
 */
function guessType(ua: string): UserDeviceType {
  const touch = navigator.maxTouchPoints > 0;
  const min = Math.min(window.screen.width, window.screen.height);
  if (/iPhone|iPod/i.test(ua)) return 'phone';
  if (/iPad/i.test(ua)) return 'tablet';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'phone' : 'tablet';
  if (touch && min <= 500) return 'phone';
  if (touch && min <= 900) return 'tablet';
  return 'pc';
}

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iPhone',
  android: 'Android',
  windows: 'PC Windows',
  macos: 'Mac',
  linux: 'PC Linux',
};

export async function detectDevice(): Promise<DetectedDevice> {
  const ua = navigator.userAgent;
  const type = guessType(ua);
  let platform = guessPlatform(ua);
  let model: string | null = null;
  let osVersion: string | null = null;

  const uaData = (navigator as Navigator & { userAgentData?: UaDataLike }).userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const hints = await uaData.getHighEntropyValues(['model', 'platformVersion', 'platform']);
      model = hints.model?.trim() || null;
      osVersion = hints.platformVersion?.trim() || null;
      if (hints.platform) platform = hints.platform.toLowerCase().replace(/\s/g, '') || platform;
    } catch {
      // Client Hints refusés par une Permissions-Policy : on garde l'estimation.
    }
  }

  const label = model ?? (platform ? PLATFORM_LABELS[platform] : null);
  const suggestedName =
    label ?? (type === 'tv' ? 'Télé' : type === 'kiosk' ? 'Écran mural' : 'Cet appareil');

  return { type, platform, model, osVersion, suggestedName };
}
