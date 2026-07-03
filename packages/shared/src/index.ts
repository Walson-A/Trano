// ─── Profils (façon Netflix) ────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  /** Emoji utilisé comme avatar (simple, fun, zéro upload) */
  avatar: string;
  /** Couleur d'accent du profil (hex) */
  color: string;
  /** Pièces attitrées (ids de RoomConfig) — souvent la chambre, plusieurs possibles */
  roomIds: string[];
  /** Profil enfant : interface simplifiée, pas de gestion des profils */
  isKid: boolean;
  /** entity_ids favoris affichés en premier sur le dashboard */
  favorites: string[];
  /** ids de pièces (RoomConfig) épinglées sur le dashboard */
  favoriteRooms: string[];
  /**
   * Blocs du dashboard, dans l'ordre. Vide = disposition par défaut.
   * Ids connus : status, favorite-rooms, favorite-devices, energy,
   * shopping, intercom.
   */
  dashboardLayout: string[];
  createdAt: string;
}

export type ProfileCreate = Pick<Profile, 'name'> &
  Partial<Pick<Profile, 'avatar' | 'color' | 'roomIds' | 'isKid'>>;

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    'name' | 'avatar' | 'color' | 'roomIds' | 'isKid' | 'favorites' | 'favoriteRooms' | 'dashboardLayout'
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

// ─── Messages WebSocket ─────────────────────────────────────

export type WsTopic = 'profiles' | 'shopping' | 'rooms';

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
