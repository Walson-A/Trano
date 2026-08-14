import { useEffect } from 'react';
import { api } from '../lib/api';
import { getDeviceId } from '../lib/deviceInfo';

/**
 * Battement de cœur de cet appareil.
 *
 * C'est lui qui fait exister « en ligne » : le serveur ne stocke pas cet état,
 * il le calcule depuis la date du dernier battement. Sans battement, un écran
 * reste éternellement « vu il y a longtemps ».
 *
 * La batterie n'est lue que là où elle existe : l'API n'a jamais été
 * implémentée par WebKit (jugée trop identifiante), donc aucun navigateur
 * d'iPhone ne la donne. Absente, on n'envoie rien plutôt que zéro — une
 * batterie à 0 % affichée serait un mensonge.
 */
const PERIOD_MS = 60_000;

interface BatteryLike {
  level: number;
  charging: boolean;
}

async function readBattery(): Promise<{ batteryPct?: number; batteryCharging?: boolean }> {
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }).getBattery;
  if (!getBattery) return {};
  try {
    const b = await getBattery.call(navigator);
    return { batteryPct: Math.round(b.level * 100), batteryCharging: b.charging };
  } catch {
    return {};
  }
}

export function useDeviceHeartbeat(): void {
  useEffect(() => {
    let stopped = false;

    const beat = async () => {
      const id = getDeviceId();
      if (!id || stopped) return;
      try {
        await api.userDevices.heartbeat(id, await readBattery());
      } catch {
        // Serveur injoignable : le prochain battement réessaiera. Un écran
        // hors ligne n'a rien à signaler de plus.
      }
    };

    void beat();
    const timer = setInterval(() => void beat(), PERIOD_MS);
    // Revenir sur l'onglet doit rafraîchir tout de suite : sur mobile, les
    // minuteurs d'un onglet en arrière-plan sont gelés par le système.
    const onVisible = () => { if (document.visibilityState === 'visible') void beat(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
