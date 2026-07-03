import type {
  Profile,
  ProfileCreate,
  ProfileUpdate,
  ShoppingItem,
  ShoppingItemCreate,
  ShoppingItemUpdate,
  WsMessage,
  WsTopic,
} from '@trano/shared';

/**
 * Client API du serveur Trano. Même origine : en dev le proxy Vite
 * redirige /api vers localhost:3001, en prod le serveur sert l'app.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
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

export const api = {
  profiles: {
    list: () => request<Profile[]>('/api/profiles'),
    create: (data: ProfileCreate) =>
      request<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProfileUpdate) =>
      request<Profile>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
  },
  shopping: {
    list: () => request<ShoppingItem[]>('/api/shopping'),
    create: (data: ShoppingItemCreate) =>
      request<ShoppingItem>('/api/shopping', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ShoppingItemUpdate) =>
      request<ShoppingItem>(`/api/shopping/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/shopping/${id}`, { method: 'DELETE' }),
  },
};

/**
 * Connexion WebSocket au serveur Trano avec reconnexion automatique.
 * Le serveur n'envoie que des invalidations — le callback refetch le topic.
 */
export function connectTranoWs(onTopicChanged: (topic: WsTopic) => void): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retryDelay = 1000;

  function connect() {
    if (closed) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${proto}://${window.location.host}/api/ws`);

    socket.onopen = () => {
      retryDelay = 1000;
    };
    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'changed') onTopicChanged(msg.topic);
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
