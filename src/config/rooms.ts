import { RoomConfig } from '../types';

/**
 * Source unique de vérité pour les pièces de la maison.
 * L'icône est stockée comme string (nom Lucide) pour être sérialisable.
 * Le mapping vers le composant Lucide se fait dans les vues.
 */
export const ROOMS: RoomConfig[] = [
  // RDC
  { id: 'salon',            name: 'Salon',                 floor: 'RDC',   icon: 'sofa' },
  { id: 'cuisine',          name: 'Cuisine',               floor: 'RDC',   icon: 'cooking-pot' },
  { id: 'garage',           name: 'Garage',                floor: 'RDC',   icon: 'car' },
  { id: 'sdb-bas',          name: 'Salle de bain (bas)',   floor: 'RDC',   icon: 'bath' },

  // Étage
  { id: 'chambre-parents',  name: 'Chambre Parents',       floor: 'Étage', icon: 'bed-double' },
  { id: 'chambre-mahalia',  name: 'Chambre Mahalia',       floor: 'Étage', icon: 'baby' },
  { id: 'chambre-kevin',    name: 'Chambre Kevin',         floor: 'Étage', icon: 'bed-single' },
  { id: 'chambre-argan',    name: 'Chambre Argan',         floor: 'Étage', icon: 'baby' },
  { id: 'chambres-enfants', name: 'Chambres des enfants',  floor: 'Étage', icon: 'users' },
  { id: 'sdb-etage',        name: 'Salle de bain (étage)', floor: 'Étage', icon: 'bath' },
];

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

export function getRoomById(id: string): RoomConfig | undefined {
  return ROOMS.find(r => r.id === id);
}

export function getRoomsByFloor(floor: RoomConfig['floor']): RoomConfig[] {
  return ROOMS.filter(r => r.floor === floor);
}
