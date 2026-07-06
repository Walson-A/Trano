import { useMemo, useRef, useState } from 'react';
import type { Connection, HassEntity } from 'home-assistant-js-websocket';

export type Status = 'idle' | 'pending' | 'ok' | 'error';

/** Props communes à toutes les fiches de contrôle (lumière, média, volet…). */
export interface SheetProps {
  entityId: string;
  entity: HassEntity;
  onClose: () => void;
}

/**
 * UI optimiste + retour visuel pour piloter une entité HA :
 * - l'état local `opt` reflète immédiatement l'action de l'utilisateur,
 *   puis expire (4 s) une fois que HA a rattrapé la vérité ;
 * - `status` alimente la pastille (envoi… / ok / échec) ;
 * - `debouncedCall` regroupe les rafales de sliders, un slot par contrôle
 *   pour que luminosité et volume ne s'annulent pas entre eux.
 */
export function useOptimistic<T extends object>(key: string | null, connection: Connection | null) {
  const EMPTY = useMemo(() => ({} as Partial<T>), []);
  const [opt, setOpt] = useState<Partial<T>>(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slots = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastKey = useRef<string | null>(key);

  // Changement d'appareil : on repart de la vérité HA
  if (key !== lastKey.current) {
    lastKey.current = key;
    if (opt !== EMPTY) setOpt(EMPTY);
    if (status !== 'idle') setStatus('idle');
  }

  const applyOptimistic = (patch: Partial<T>) => {
    setOpt((o) => ({ ...o, ...patch }));
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOpt(EMPTY), 4000);
  };

  const flash = (s: Status, ms: number) => {
    setStatus(s);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setStatus('idle'), ms);
  };

  const call = async (
    domain: string,
    service: string,
    entityId: string,
    data: Record<string, unknown> | undefined,
    patch: Partial<T>
  ) => {
    applyOptimistic(patch);
    setStatus('pending');
    try {
      await connection?.sendMessagePromise({
        type: 'call_service',
        domain,
        service,
        target: { entity_id: entityId },
        ...(data ? { service_data: data } : {}),
      });
      flash('ok', 900);
    } catch {
      setOpt(EMPTY); // échec : retour à la vérité HA
      flash('error', 2500);
    }
  };

  const debouncedCall = (
    slot: string,
    domain: string,
    service: string,
    entityId: string,
    data: Record<string, unknown>,
    patch: Partial<T>,
    delay = 180
  ) => {
    applyOptimistic(patch);
    if (slots.current[slot]) clearTimeout(slots.current[slot]);
    slots.current[slot] = setTimeout(() => call(domain, service, entityId, data, patch), delay);
  };

  return { opt, status, call, debouncedCall };
}
