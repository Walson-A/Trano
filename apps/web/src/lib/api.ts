import type {
  DeviceOverride,
  PresenceEntry,
  UserDevice,
  UserDeviceHeartbeat,
  UserDeviceRegister,
  UserDeviceUpdate,
  DeviceOverrideUpdate,
  Profile,
  ProfileCreate,
  ProfileUpdate,
  Room,
  RoomCreate,
  RoomUpdate,
  ShoppingItem,
  ShoppingItemCreate,
  ShoppingItemUpdate,
  WsIntercomMessage,
  WsMessage,
  WsTopic,
} from '@trano/shared';

/**
 * Client API du serveur Trano. Même origine : en dev le proxy Vite
 * redirige /api vers localhost:3001, en prod le serveur sert l'app.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    // Content-Type uniquement s'il y a un corps : Fastify répond 400 sur
    // un DELETE annoncé JSON mais vide (FST_ERR_CTP_EMPTY_JSON_BODY).
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // corps non-JSON, on garde le message générique
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Rapport de la dernière sauvegarde (voir apps/server/src/lib/backup.ts). */
export interface BackupStatus {
  neverRun: boolean;
  date?: string;
  at?: string;
  ok?: boolean;
  detail?: string;
  bytes?: number;
  rows?: Record<string, number>;
  /** « déposé » quand la copie est partie chez Oby pour le coffre chiffré. */
  offsite?: string;
  ageHours?: number;
}

export const api = {
  profiles: {
    list: () => request<Profile[]>('/api/profiles'),
    create: (data: ProfileCreate) =>
      request<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProfileUpdate) =>
      request<Profile>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
  },
  rooms: {
    list: () => request<Room[]>('/api/rooms'),
    create: (data: RoomCreate) =>
      request<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: RoomUpdate) =>
      request<Room>(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/rooms/${id}`, { method: 'DELETE' }),
  },
  shopping: {
    list: () => request<ShoppingItem[]>('/api/shopping'),
    create: (data: ShoppingItemCreate) =>
      request<ShoppingItem>('/api/shopping', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ShoppingItemUpdate) =>
      request<ShoppingItem>(`/api/shopping/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/shopping/${id}`, { method: 'DELETE' }),
  },
  presence: {
    list: () => request<PresenceEntry[]>('/api/presence'),
  },
  userDevices: {
    list: () => request<UserDevice[]>('/api/user-devices'),
    register: (data: UserDeviceRegister) =>
      request<UserDevice>('/api/user-devices/register', { method: 'POST', body: JSON.stringify(data) }),
    heartbeat: (id: string, data: UserDeviceHeartbeat) =>
      request<UserDevice>(`/api/user-devices/${encodeURIComponent(id)}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UserDeviceUpdate) =>
      request<UserDevice>(`/api/user-devices/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/api/user-devices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  backup: {
    status: () => request<BackupStatus>('/api/backup/status'),
    run: () => request<BackupStatus>('/api/backup/run', { method: 'POST' }),
  },
  overrides: {
    list: () => request<Record<string, DeviceOverride>>('/api/device-overrides'),
    set: (entityId: string, data: DeviceOverrideUpdate) =>
      request<DeviceOverride>(`/api/device-overrides/${encodeURIComponent(entityId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    remove: (entityId: string) =>
      request<void>(`/api/device-overrides/${encodeURIComponent(entityId)}`, { method: 'DELETE' }),
  },
};

export interface TranoWsHandlers {
  /** Invalidation d'un topic : refetch */
  onChanged: (topic: WsTopic) => void;
  /** Message d'interphone reçu */
  onIntercom?: (msg: WsIntercomMessage) => void;
  /** Reconnexion WS après coupure : refetch complet */
  onReconnect?: () => void;
}

/** Connexion WebSocket au serveur Trano avec reconnexion automatique. */
export function connectTranoWs(handlers: TranoWsHandlers): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retryDelay = 1000;
  let hasConnectedOnce = false;

  function connect() {
    if (closed) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${proto}://${window.location.host}/api/ws`);

    socket.onopen = () => {
      const wasReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      retryDelay = 1000;
      // Après une coupure réseau, les événements d'invalidation ont été
      // perdus : on refetch tout pour rattraper le retard.
      if (wasReconnect) handlers.onReconnect?.();
    };
    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'changed') handlers.onChanged(msg.topic);
        if (msg.type === 'intercom') handlers.onIntercom?.(msg);
      } catch {
        // message inattendu, on ignore
      }
    };
    socket.onclose = () => {
      if (!closed) {
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      }
    };
  }

  connect();
  return () => {
    closed = true;
    socket?.close();
  };
}
