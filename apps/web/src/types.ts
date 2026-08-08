// ─── Device Types ───────────────────────────────────────────

export type DeviceType =
  | 'light'
  | 'switch'
  | 'climate'
  | 'lock'
  | 'media'
  | 'sensor'
  | 'cover'
  | 'camera'
  | 'fan';

export const HA_DOMAIN_TO_TYPE: Record<string, DeviceType> = {
  light: 'light',
  switch: 'switch',
  climate: 'climate',
  lock: 'lock',
  media_player: 'media',
  sensor: 'sensor',
  binary_sensor: 'sensor',
  cover: 'cover',
  camera: 'camera',
  fan: 'fan',
};

// Domains we actually show as controllable devices
export const SUPPORTED_DOMAINS = [
  'light', 'switch', 'climate', 'lock',
  'media_player', 'cover', 'fan',
] as const;

// ─── Position (for floor plan) ──────────────────────────────

// Partagé entre frontend et serveur via @trano/shared
export type { Position, DeviceOverride } from '@trano/shared';
import type { Position } from '@trano/shared';

// ─── Device ─────────────────────────────────────────────────

export interface DeviceState {
  isOn?: boolean;
  brightness?: number;       // 0-100
  temperature?: number;      // current temp (climate)
  targetTemp?: number;       // target temp (climate)
  mode?: string;             // climate mode, media state, etc.
  isLocked?: boolean;
  isPlaying?: boolean;
  volume?: number;           // 0-100
  position?: number;         // cover position 0-100
  title?: string;            // media title
  rgbColor?: [number, number, number]; // couleur actuelle d'une lumière
}

export interface Device {
  id: string;                // HA entity_id
  name: string;              // display name (override or friendly_name)
  type: DeviceType;
  roomId: string | null;     // room ID (from override, HA area, or null)
  floor: string | null;      // resolved from room config
  position: Position | null; // floor plan position (from override)
  state: DeviceState;
}

// Les pièces (type Room) vivent dans @trano/shared et leur données dans
// la base du serveur (voir useRoomsStore).

// Les profils utilisateurs vivent dans @trano/shared (type Profile),
// partagés entre le serveur et le frontend.
