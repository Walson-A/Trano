import type React from 'react';
import {
  Sofa, CookingPot, Bed, BedDouble, BedSingle, Baby, Car, Bath, Users,
  DoorOpen, Utensils, Tv, Trees, Dumbbell, WashingMachine, Warehouse,
  Flower2, Briefcase, Gamepad2, Music,
} from 'lucide-react';

/**
 * Les pièces elles-mêmes vivent dans la base du serveur (personnalisables
 * depuis Réglages → Pièces, voir useRoomsStore). Ici ne restent que :
 * - le catalogue d'icônes proposées,
 * - le mapping des areas HA vers nos ids de pièces.
 */

export const ROOM_ICONS: Record<string, React.ElementType> = {
  'sofa': Sofa,
  'cooking-pot': CookingPot,
  'bed': Bed,
  'bed-double': BedDouble,
  'bed-single': BedSingle,
  'baby': Baby,
  'car': Car,
  'bath': Bath,
  'users': Users,
  'door-open': DoorOpen,
  'utensils': Utensils,
  'tv': Tv,
  'trees': Trees,
  'dumbbell': Dumbbell,
  'washing-machine': WashingMachine,
  'warehouse': Warehouse,
  'flower': Flower2,
  'briefcase': Briefcase,
  'gamepad': Gamepad2,
  'music': Music,
};

export const ROOM_ICON_NAMES = Object.keys(ROOM_ICONS);

export function getRoomIcon(iconName: string): React.ElementType {
  return ROOM_ICONS[iconName] ?? Sofa;
}

/**
 * Maps HA area names/IDs (lowercase) to our room IDs.
 * HA areas are fetched via config/area_registry/list.
 * Add entries here when HA area names don't match our room IDs.
 */
export const HA_AREA_TO_ROOM: Record<string, string> = {
  'salon':              'salon',
  'cuisine':            'cuisine',
  'garage':             'garage',
  'salle de bain':      'sdb-bas',
  'sdb':                'sdb-bas',
  'salle de bain bas':  'sdb-bas',
  'chambre parents':    'chambre-parents',
  'chambre mahalia':    'chambre-mahalia',
  'chambre kevin':      'chambre-kevin',
  'chambre argan':      'chambre-argan',
  'chambres enfants':   'chambres-enfants',
  'chambres des enfants': 'chambres-enfants',
  'salle de bain etage': 'sdb-etage',
  'sdb etage':          'sdb-etage',
};
