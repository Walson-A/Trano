import { create } from 'zustand';
import { useEffect } from 'react';
import { useHomeStore } from './useHomeStore';
import { homeRequest } from '../../lib/api';

interface HouseConnection {
  homeId: string | null;
  status: 'connecting' | 'connected' | 'error';
  weather: { etat: string; temperature: number | null } | null;
}
export const useHomeConnection = create<HouseConnection>(() => ({ homeId: null, status: 'connecting', weather: null }));

/** One poll for the header; a successful scoped HA read proves the server path. */
export function useHomeConnectionPolling() {
  const homeId = useHomeStore(s => s.homeId);
  const homes = useHomeStore(s => s.homes);
  const provider = homes.find(home => home.id === homeId)?.provider;
  useEffect(() => {
    let live = true;
    useHomeConnection.setState({ homeId, status: 'connecting', weather: null });
    const load = async () => {
      try {
        const house = await homeRequest<{ home_id: string; meteo: HouseConnection['weather'] }>('/api/house');
        if (house.home_id !== homeId) throw new Error('Le serveur ne confirme pas le logement.');
        if (live) useHomeConnection.setState({ homeId, status: 'connected', weather: house.meteo });
      } catch {
        if (live) useHomeConnection.setState({ homeId, status: 'error', weather: null });
      }
    };
    void load();
    const timer = setInterval(load, provider === 'tuya' ? 120_000 : 10_000);
    return () => { live = false; clearInterval(timer); };
  }, [homeId, provider]);
}
