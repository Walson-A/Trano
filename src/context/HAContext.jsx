import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectHA } from '../lib/ha';
import { subscribeEntities } from 'home-assistant-js-websocket';

const HAContext = createContext();

export const useHA = () => useContext(HAContext);

export const HAProvider = ({ children }) => {
  const [connection, setConnection] = useState(null);
  const [entities, setEntities] = useState({});
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, error

  useEffect(() => {
    const url = import.meta.env.VITE_HA_URL;
    const token = import.meta.env.VITE_HA_TOKEN;

    if (!url || !token || url.includes('192.168.1.X') || token === 'your_long_lived_access_token') {
      setError("Veuillez configurer VITE_HA_URL et VITE_HA_TOKEN dans le fichier .env.local.");
      setStatus('error');
      return;
    }

    let unsubEntities;

    const initHA = async () => {
      setStatus('connecting');
      try {
        const conn = await connectHA(url, token);
        setConnection(conn);
        setStatus('connected');
        
        // S'abonner aux changements d'états
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
      if (connection) connection.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <HAContext.Provider value={{ connection, entities, status, error }}>
      {children}
    </HAContext.Provider>
  );
};
