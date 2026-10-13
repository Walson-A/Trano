import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { connectHA } from '../lib/ha';
import { getRuntimeConfig } from '../lib/runtimeConfig';
import { subscribeEntities, Connection, HassEntities } from 'home-assistant-js-websocket';
import { useHomeStore } from '../core/store/useHomeStore';

interface HAContextType {
  connection: Connection | null;
  entities: HassEntities;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

const HAContext = createContext<HAContextType | undefined>(undefined);

export const useHA = () => {
  const context = useContext(HAContext);
  if (context === undefined) {
    throw new Error('useHA must be used within a HAProvider');
  }
  return context;
};

interface HAProviderProps {
  children: ReactNode;
}

export const HAProvider: React.FC<HAProviderProps> = ({ children }) => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<HAContextType['status']>('disconnected');
  const connRef = useRef<Connection | null>(null);
  const homeId = useHomeStore(s => s.homeId);

  useEffect(() => {
    let live = true;
    let unsubEntities: (() => void) | undefined;
    setEntities({}); setConnection(null); setError(null);
    if (homeId !== 'main') { setStatus('disconnected'); return; }

    const initHA = async () => {
      setStatus('connecting');
      const { haUrl: url, haToken: token } = await getRuntimeConfig();
      if (!live) return;

      if (!url || !token) {
        setError(
          'Connexion Home Assistant non configurée : renseignez le .env.local en dev, ou le .env du conteneur en production.'
        );
        setStatus('error');
        return;
      }

      try {
        const conn = await connectHA(url, token);
        if (!live) { conn.close(); return; }
        connRef.current = conn;
        setConnection(conn);
        setStatus('connected');

        // Accès debug à la connexion HA depuis la console (dev uniquement)
        if (import.meta.env.DEV) {
          (window as unknown as Record<string, unknown>).__haConn = conn;
        }

        unsubEntities = subscribeEntities(conn, (ent) => {
          setEntities(ent);
        });

      } catch (err) {
        if (!live) return;
        console.error("HA Connection Error:", err);
        setError("Impossible de se connecter à Home Assistant. Vérifiez l'URL, le token et le réseau.");
        setStatus('error');
      }
    };

    initHA();

    return () => {
      live = false;
      if (unsubEntities) unsubEntities();
      if (connRef.current) connRef.current.close();
    };
  }, [homeId]);

  return (
    <HAContext.Provider value={{ connection, entities, status, error }}>
      {children}
    </HAContext.Provider>
  );
};
