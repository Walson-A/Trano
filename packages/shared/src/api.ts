import type {
  DeviceOverride,
  DeviceOverrideUpdate,
  PresenceEntry,
  Profile,
  ProfileCreate,
  ProfileUpdate,
  Room,
  RoomCreate,
  RoomUpdate,
  ShoppingItem,
  ShoppingItemCreate,
  ShoppingItemUpdate,
  UserDevice,
  UserDeviceHeartbeat,
  UserDeviceRegister,
  UserDeviceUpdate,
  WsIntercomMessage,
  WsMessage,
  WsTopic,
} from './index.ts';

/**
 * Client du serveur Trano, partagé par le web et l'app native.
 *
 * Il vit ici et pas dans l'une des deux apps pour une raison précise : deux
 * clients recopiés dérivent. Une route renommée d'un côté et pas de l'autre ne
 * se voit qu'au moment où quelqu'un ouvre l'app et tombe sur un écran vide.
 *
 * La seule différence entre les deux appelants est **l'adresse** :
 *
 * - le web est servi par le serveur lui-même, donc chemins relatifs
 *   (`baseUrl` vide) ;
 * - l'app native est un binaire posé sur un téléphone, elle doit désigner la
 *   machine : `http://192.168.1.65:3001`.
 */

export interface ApiOptions {
  /** Vide pour le web (même origine). Sans barre oblique finale. */
  baseUrl?: string;
  /**
   * Au-delà, on abandonne. Indispensable sur téléphone : hors du réseau de la
   * maison, l'adresse du serveur n'est pas *refusée*, elle ne répond pas — et
   * `fetch` attendrait indéfiniment, laissant un écran en chargement perpétuel
   * au lieu de dire « injoignable ».
   */
  timeoutMs?: number;
}

/**
 * Un appareil pilotable, tel que le serveur le voit (`lib/ha.ts`).
 * Les noms de champs sont en français : ils viennent de la couche métier, qui
 * sert aussi les outils MCP lus par un LLM.
 */
export interface HouseDevice {
  entity_id: string;
  nom: string;
  etat: string;
  piece: string | null;
}

/** Réponse de `GET /api/house`. */
export interface HouseState {
  energie: {
    /** Négatif = on exporte vers EDF (bien), positif = on importe (à éviter). */
    reseau_W: number | null;
    commentaire_reseau: string | null;
    solaire_W: number | null;
    batterie_pct: number | null;
    production_du_jour_kWh: number | null;
  } | null;
  meteo: unknown;
  favoris: HouseDevice[];
  /** Ce qui est allumé maintenant — pas l'inventaire complet. */
  allumes: HouseDevice[];
  total_appareils: number;
  profil_connu: boolean;
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

export type TranoApi = ReturnType<typeof createApi>;

export function createApi(options: ApiOptions = {}) {
  const base = (options.baseUrl ?? '').replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        // Content-Type uniquement s'il y a un corps : Fastify répond 400 sur
        // un DELETE annoncé JSON mais vide (FST_ERR_CTP_EMPTY_JSON_BODY).
        headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
        signal: controller.signal,
        ...init,
      });
    } catch (e) {
      // Une coupure réseau et un délai dépassé arrivent tous deux ici. On les
      // distingue : « le serveur ne répond pas » et « pas de réseau » appellent
      // des gestes différents de la part de qui lit le message.
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Le serveur de la maison ne répond pas');
      }
      throw new Error('Serveur injoignable');
    } finally {
      clearTimeout(timer);
    }

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
    return res.json() as Promise<T>;
  }

  return {
    /** L'adresse effectivement utilisée — pratique à afficher dans les réglages. */
    baseUrl: base,
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
        request<ShoppingItem>(`/api/shopping/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      remove: (id: string) => request<void>(`/api/shopping/${id}`, { method: 'DELETE' }),
    },
    presence: {
      list: () => request<PresenceEntry[]>('/api/presence'),
    },
    userDevices: {
      list: () => request<UserDevice[]>('/api/user-devices'),
      register: (data: UserDeviceRegister) =>
        request<UserDevice>('/api/user-devices/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
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
    /**
     * L'état de la maison, **par le serveur**.
     *
     * Le web ouvre une WebSocket vers Home Assistant avec le jeton ; l'app
     * native, elle, ne parlera jamais à HA directement — ce serait mettre un
     * jeton d'administrateur dans cinq poches. Elle passe donc par ici, où le
     * serveur a déjà fait le travail et posé ses garde-fous (`controlDevice`
     * refuse les serrures et l'alarme).
     */
    house: {
      state: (profileId?: string | null) =>
        request<HouseState>(
          profileId ? `/api/house?profile=${encodeURIComponent(profileId)}` : '/api/house',
        ),
      control: (entityId: string, action: 'toggle' | 'turn_on' | 'turn_off' = 'toggle') =>
        request<{ ok: boolean; message: string }>('/api/house/device', {
          method: 'POST',
          body: JSON.stringify({ entity_id: entityId, action }),
        }),
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
        request<void>(`/api/device-overrides/${encodeURIComponent(entityId)}`, {
          method: 'DELETE',
        }),
    },
  };
}

export interface TranoWsHandlers {
  /** Invalidation d'un topic : refetch */
  onChanged: (topic: WsTopic) => void;
  /** Message d'interphone reçu */
  onIntercom?: (msg: WsIntercomMessage) => void;
  /** Reconnexion WS après coupure : refetch complet */
  onReconnect?: () => void;
}

/**
 * Connexion WebSocket au serveur, avec reconnexion à délai croissant.
 *
 * `url` est complète (`ws://192.168.1.65:3001/api/ws`) : c'est l'appelant qui
 * sait la construire — le web depuis `window.location`, le natif depuis
 * l'adresse enregistrée. Le `WebSocket` de React Native suit la même interface
 * que celui du navigateur, le corps de la fonction est donc commun.
 */
export function connectTranoWs(url: string, handlers: TranoWsHandlers): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retryDelay = 1000;
  let hasConnectedOnce = false;

  function connect() {
    if (closed) return;
    socket = new WebSocket(url);

    socket.onopen = () => {
      const wasReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      retryDelay = 1000;
      // Après une coupure réseau, les événements d'invalidation ont été
      // perdus : on refetch tout pour rattraper le retard.
      if (wasReconnect) handlers.onReconnect?.();
    };
    socket.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(String(event.data));
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
    // Sans ce gestionnaire, React Native journalise l'échec comme une erreur non
    // capturée à chaque tentative — bruyant, et alarmant pour rien : `onclose`
    // suit toujours, et c'est lui qui replanifie.
    socket.onerror = () => {};
  }

  connect();
  return () => {
    closed = true;
    socket?.close();
  };
}
