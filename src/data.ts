import { Device, User } from './types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Papa', favorites: ['l1', 'c1', 'k1'] },
  { id: 'u2', name: 'Maman', favorites: ['l2', 'l3', 'm1'] },
  { id: 'u3', name: 'Enfant', favorites: ['l4', 'm2'] },
];

export const mockDevices: Device[] = [
  // RDC
  { id: 'l1', name: 'Lumière Salon', type: 'light', room: 'Salon', floor: 'RDC', position: { x: 30, y: 40 }, state: { isOn: true, brightness: 80 } },
  { id: 'l2', name: 'Lumière Cuisine', type: 'light', room: 'Cuisine', floor: 'RDC', position: { x: 70, y: 30 }, state: { isOn: false, brightness: 0 } },
  { id: 'c1', name: 'Thermostat RDC', type: 'climate', room: 'Salon', floor: 'RDC', position: { x: 45, y: 50 }, state: { currentTemp: 21.5, targetTemp: 22, mode: 'heat' } },
  { id: 'k1', name: 'Porte d\'entrée', type: 'lock', room: 'Entrée', floor: 'RDC', position: { x: 50, y: 90 }, state: { isLocked: true } },
  { id: 'm1', name: 'TV Salon', type: 'media', room: 'Salon', floor: 'RDC', position: { x: 20, y: 20 }, state: { isPlaying: true, volume: 45, title: 'Netflix' } },
  
  // Etage
  { id: 'l3', name: 'Lumière Chambre Parents', type: 'light', room: 'Chambre 1', floor: 'Etage', position: { x: 25, y: 30 }, state: { isOn: false, brightness: 0 } },
  { id: 'l4', name: 'Lumière Chambre Enfant', type: 'light', room: 'Chambre 2', floor: 'Etage', position: { x: 75, y: 30 }, state: { isOn: true, brightness: 100 } },
  { id: 'l5', name: 'Lumière SDB', type: 'light', room: 'Salle de bain', floor: 'Etage', position: { x: 50, y: 60 }, state: { isOn: false, brightness: 0 } },
  { id: 'c2', name: 'Thermostat Etage', type: 'climate', room: 'Couloir', floor: 'Etage', position: { x: 50, y: 45 }, state: { currentTemp: 19, targetTemp: 19, mode: 'off' } },
  { id: 'm2', name: 'Enceinte Enfant', type: 'media', room: 'Chambre 2', floor: 'Etage', position: { x: 85, y: 20 }, state: { isPlaying: false, volume: 20, title: '' } },
];
