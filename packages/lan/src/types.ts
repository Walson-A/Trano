export const MEDIA_ACTIONS = [
  'volume_set', 'mute_set', 'play', 'pause', 'stop', 'next', 'previous',
  'volume_up', 'volume_down', 'mute_toggle', 'play_pause', 'power_toggle',
] as const;
export type MediaAction = typeof MEDIA_ACTIONS[number];

export interface MediaCommand {
  action: MediaAction;
  volume?: number;
  muted?: boolean;
}

export interface DeviceConfig {
  id: string;
  name: string;
  kind: 'samsung' | 'freebox-player';
  host: string;
  /** Samsung UPnP port; default 9197. */
  port?: number;
  /** Freebox network remote code, stored only in the local config. */
  remoteCode?: string;
  /** Optional Spotify Zeroconf port discovered through mDNS. */
  spotifyPort?: number;
  /** Pin the Samsung MAC so a reassigned DHCP address cannot select another TV. */
  mac?: string;
  samsungControl?: 'upnp' | 'remote';
  samsungPort?: number;
  samsungToken?: string;
  samsungFingerprint256?: string;
}

export interface RelayConfig {
  token: string;
  listenHost: string;
  port: number;
  allowControl: boolean;
  devices: DeviceConfig[];
}

export interface MediaDevice {
  id: string;
  name: string;
  kind: DeviceConfig['kind'];
  host: string;
  model: string | null;
  reachable: boolean;
  observedAt: string;
  state: {
    volume: number | null;
    muted: boolean | null;
    playback: 'playing' | 'paused' | 'stopped' | 'unknown';
  };
  capabilities: MediaAction[];
  transports: string[];
  setupRequired: 'remote_code' | 'samsung_pairing' | null;
  error: string | null;
}

export class LanError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'LanError';
    this.status = status;
  }
}
