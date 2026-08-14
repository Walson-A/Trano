import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Battery from 'expo-battery';
import { getApi } from '@/lib/server';
import { getDeviceId } from '@/lib/deviceId';

/**
 * Battement de cœur de cet appareil.
 *
 * C'est lui qui fait exister « en ligne » : le serveur ne stocke pas cet état,
 * il le calcule depuis la date du dernier battement (90 s de fenêtre, voir
 * `apps/server/src/routes/userDevices.ts`). Sans battement, l'appareil reste
 * éternellement « vu il y a longtemps ».
 *
 * Sur téléphone, la batterie **existe vraiment** — contrairement au web, où
 * l'API n'a jamais été implémentée par WebKit et où aucun iPhone ne la donne.
 * C'est l'un des gains concrets du natif, et ça se verra dans « Appareils
 * connectés à Trano ».
 *
 * ⚠️ Ce battement ne dit **rien** de la présence. Il ne bat que quand l'app est
 * au premier plan : iOS gèle les minuteurs d'une app en arrière-plan. « Papa
 * est à la maison » viendra du géofence, qui lui est réveillé par le système.
 */

const PERIOD_MS = 60_000;

async function readBattery(): Promise<{ batteryPct?: number; batteryCharging?: boolean }> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    const state = await Battery.getBatteryStateAsync();
    // -1 sur simulateur : on n'envoie rien plutôt que zéro — une batterie à
    // 0 % affichée serait un mensonge.
    if (level < 0) return {};
    return {
      batteryPct: Math.round(level * 100),
      batteryCharging:
        state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
    };
  } catch {
    return {};
  }
}

export function useDeviceHeartbeat(enabled: boolean): void {
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;

    const beat = async () => {
      const id = await getDeviceId();
      if (!id || stopped.current) return;
      try {
        await getApi().userDevices.heartbeat(id, await readBattery());
      } catch {
        // Serveur injoignable — hors du Wi-Fi de la maison, c'est le cas
        // normal. Le prochain battement réessaiera ; un appareil hors de
        // portée n'a rien à signaler de plus.
      }
    };

    void beat();
    const timer = setInterval(() => void beat(), PERIOD_MS);
    // Revenir sur l'app doit rafraîchir tout de suite : le minuteur n'a pas
    // tourné pendant qu'elle était en arrière-plan.
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void beat();
    };
    const sub = AppState.addEventListener('change', onChange);

    return () => {
      stopped.current = true;
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled]);
}
