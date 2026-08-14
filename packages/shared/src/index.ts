// ─── Appareils des gens ─────────────────────────────────────
//
// ⚠️ À ne pas confondre avec les « appareils » de la maison, qui sont les
// entités Home Assistant (lampes, prises, volets) et vivent dans `Device` côté
// web. Ici ce sont les téléphones, tablettes et écrans qui portent l'app.

/**
 * Ce qui décide de tout : qui rapporte la présence (seuls les `phone`), par
 * quel canal on alerte (push pour les téléphones, WebSocket pour les écrans
 * toujours ouverts), et quelle icône s'affiche.
 */
export type UserDeviceType = 'phone' | 'tablet' | 'pc' | 'tv' | 'kiosk';

export interface UserDevice {
  /** Généré par le client et stable : c'est lui qui évite les doublons. */
  id: string;
  name: string;
  /** Jamais vide : les écrans partagés portent le profil « Maison ». */
  profileId: string;
  type: UserDeviceType;
  platform: string | null;
  model: string | null;
  osVersion: string | null;
  /** Présence d'un jeton push, jamais sa valeur — un secret ne s'affiche pas. */
  hasPushToken: boolean;
  batteryPct: number | null;
  batteryCharging: boolean | null;
  isHome: boolean | null;
  /** Où se trouve l'écran — seulement pour les fixes : un téléphone bouge. */
  roomId: string | null;
  lastSeenAt: string | null;
  /** **Calculé**, jamais stocké : `now - lastSeenAt < 90 s`. */
  online: boolean;
  createdAt: string;
}

/** Première connexion d'un appareil : ce que l'écran d'accueil fait valider. */
export type UserDeviceRegister = Pick<UserDevice, 'id' | 'name' | 'profileId'> &
  Partial<Pick<UserDevice, 'type' | 'platform' | 'model' | 'osVersion' | 'roomId'>> & {
    pushToken?: string;
  };

/** Battement de cœur : uniquement ce qui bouge. */
export interface UserDeviceHeartbeat {
  batteryPct?: number | null;
  batteryCharging?: boolean | null;
  isHome?: boolean | null;
  pushToken?: string;
}

export type UserDeviceUpdate = Partial<Pick<UserDevice, 'name' | 'profileId' | 'type' | 'roomId'>>;

/** Qui est là — dérivé des appareils, jamais stocké sur la personne. */
export interface PresenceEntry {
  profileId: string;
  name: string;
  avatar: string;
  color: string;
  /**
   * Vrai si **au moins un** téléphone de la personne est à la maison.
   * **`null` = on ne sait pas** — aucun téléphone enregistré, ou aucun n'a
   * encore rapporté. À ne surtout pas confondre avec « sorti ».
   */
  isHome: boolean | null;
  lastSeenAt: string | null;
}

// ─── Profils (façon Netflix) ────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  /** Emoji utilisé comme avatar (simple, fun, zéro upload) */
  avatar: string;
  /** Couleur d'accent du profil (hex) */
  color: string;
  /**
   * Personne, ou le profil « Maison » auquel se rattachent les écrans partagés
   * (tablette murale, TV). La Maison n'est pas quelqu'un : elle ne doit
   * apparaître ni dans « qui est là », ni comme destinataire d'un message.
   */
  kind: 'person' | 'house';
  /**
   * Pièces attitrées — souvent la chambre, plusieurs possibles. Stockées dans
   * la table de liaison `profile_rooms`, plus dans un tableau JSON.
   */
  roomIds: string[];
  /** entity_ids favoris affichés en premier sur le dashboard */
  favorites: string[];
  /**
   * Blocs du dashboard, dans l'ordre. Vide = disposition par défaut.
   * Ids connus : status, favorite-rooms, favorite-devices, energy,
   * shopping, intercom.
   */
  dashboardLayout: string[];
  createdAt: string;
}

export type ProfileCreate = Pick<Profile, 'name'> &
  Partial<Pick<Profile, 'avatar' | 'color' | 'roomIds'>>;

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    'name' | 'avatar' | 'color' | 'roomIds' | 'favorites' | 'dashboardLayout'
  >
>;

// ─── Liste de courses ───────────────────────────────────────

export const SHOPPING_CATEGORIES = [
  'alimentaire',
  'maison',
  'hygiene',
  'vetements',
  'loisirs',
  'autre',
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  alimentaire: 'Alimentaire',
  maison: 'Maison',
  hygiene: 'Hygiène',
  vetements: 'Vêtements',
  loisirs: 'Loisirs',
  autre: 'Autre',
};

export interface ShoppingItem {
  id: string;
  title: string;
  category: ShoppingCategory;
  /** Quantité en texte libre : "2", "1kg", "x3"… */
  quantity: string | null;
  /** Profil qui a ajouté l'article */
  authorId: string | null;
  status: 'todo' | 'bought';
  /** Récurrence en jours (7 = chaque semaine). null = pas récurrent */
  recurrenceDays: number | null;
  /** Prochaine réapparition automatique (items récurrents achetés) */
  nextDue: string | null;
  createdAt: string;
  boughtAt: string | null;
  /** Profil qui a coché l'article */
  boughtBy: string | null;
}

export type ShoppingItemCreate = Pick<ShoppingItem, 'title'> &
  Partial<Pick<ShoppingItem, 'category' | 'quantity' | 'authorId' | 'recurrenceDays'>>;

export type ShoppingItemUpdate = Partial<
  Pick<ShoppingItem, 'title' | 'category' | 'quantity' | 'recurrenceDays'>
> & {
  /** Cocher/décocher — le serveur gère boughtAt/boughtBy/récurrence */
  status?: 'todo' | 'bought';
  boughtBy?: string | null;
};

// ─── Pièces de la maison ────────────────────────────────────

export type Floor = 'RDC' | 'Étage';

export interface Room {
  id: string;
  name: string;
  floor: Floor;
  /** Nom d'icône Lucide (kebab-case), résolu côté web */
  icon: string;
  sortOrder: number;
}

export type RoomCreate = Pick<Room, 'name'> & Partial<Pick<Room, 'floor' | 'icon'>>;
export type RoomUpdate = Partial<Pick<Room, 'name' | 'floor' | 'icon' | 'sortOrder'>>;

// ─── Surcharges d'appareils (partagées entre écrans) ────────

export interface Position {
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
}

export interface DeviceOverride {
  displayName?: string;      // custom name (overrides HA friendly_name)
  roomId?: string;           // manual room assignment (overrides HA area)
  hidden?: boolean;          // hide from all views
  position?: Position;       // floor plan position
}

export type DeviceOverrideUpdate = Partial<DeviceOverride>;

// ─── Messages WebSocket ─────────────────────────────────────

export type WsTopic = 'profiles' | 'shopping' | 'rooms' | 'device-overrides' | 'user-devices';

/** Invalidation : les clients refetchent le topic */
export interface WsChangedMessage {
  type: 'changed';
  topic: WsTopic;
}

/** Interphone : diffusé à tous les écrans Trano ouverts */
export interface WsIntercomMessage {
  type: 'intercom';
  from: { name: string; avatar: string; color: string };
  /** null = tous les écrans, sinon seuls les écrans sur ce profil sonnent */
  toProfileId: string | null;
  message: string;
}

export type WsMessage = WsChangedMessage | WsIntercomMessage;
