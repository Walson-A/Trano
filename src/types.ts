export type DeviceType = 'light' | 'climate' | 'lock' | 'media' | 'sensor';

export interface Position {
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
  floor: 'RDC' | 'Etage';
  position: Position;
  state: any; // Flexible state depending on type
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  favorites: string[]; // Array of Device IDs
}
