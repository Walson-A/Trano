import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { connectHA } from '../lib/ha';
import { getRuntimeConfig } from '../lib/runtimeConfig';
import { subscribeEntities, Connection, HassEntities } from 'home-assistant-js-websocket';

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

  useEffect(() => {
    let unsubEntities: (() => void) | undefined;

    const initHA = async () => {
      setStatus('connecting');
      const { haUrl: url, haToken: token } = await getRuntimeConfig();

      if (!url || !token) {
        setError(
          'Connexion Home Assistant non configurée : renseignez le .env.local en dev, ou les options de l\'add-on en production.'
        );
        setStatus('error');
        return;
      }

      try {
        const conn = await connectHA(url, token);
        connRef.current = conn;
        setConnection(conn);
        setStatus('connected');

        unsubEntities = subscribeEntities(conn, (ent) => {
          setEntities(ent);
        });

      } catch (err) {
        console.error("HA Connection Error:", err);
        setError("Impossible de se connecter à Home Assistant. Vérifiez l'URL, le token et le réseau.");
        setStatus('error');
      }
    };

    initHA();

    return () => {
      if (unsubEntities) unsubEntities();
      if (connRef.current) connRef.current.close();
    };
  }, []);

  return (
    <HAContext.Provider value={{ connection, entities, status, error }}>
      {children}
    </HAContext.Provider>
  );
};
