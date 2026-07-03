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
  createdAt: string;
}

export type ProfileCreate = Pick<Profile, 'name'> &
  Partial<Pick<Profile, 'avatar' | 'color' | 'roomIds' | 'isKid'>>;

export type ProfileUpdate = Partial<
  Pick<Profile, 'name' | 'avatar' | 'color' | 'roomIds' | 'isKid' | 'favorites' | 'favoriteRooms'>
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

// ─── Messages WebSocket (invalidation simple) ───────────────

export type WsTopic = 'profiles' | 'shopping';

export interface WsMessage {
  type: 'changed';
  topic: WsTopic;
}
