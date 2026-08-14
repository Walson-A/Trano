import React, { useCallback, useEffect, useState } from 'react';
import { House, Loader2, Monitor, Smartphone, Tablet, Trash2, Tv } from 'lucide-react';
import type { UserDevice, UserDeviceType } from '@trano/shared';
import { api } from '../../lib/api';
import { getDeviceId } from '../../lib/deviceInfo';
import { useProfileStore } from '../../core/store/useProfileStore';
import { useRoomsStore } from '../../core/store/useRoomsStore';
import { cn } from '../../utils';

/**
 * Les appareils de la maison : qui est connecté, depuis quoi, d'où, vu quand.
 *
 * C'est volontairement ça, et pas un explorateur de base de données : ce qu'on
 * veut savoir, ce n'est pas le contenu d'une table, c'est si le téléphone de
 * Papa parle encore à la maison.
 *
 * **On interroge périodiquement plutôt que d'attendre le WebSocket.** Le
 * serveur diffuse bien un signal quand un appareil est ajouté ou renommé, mais
 * « en ligne » se dégrade **par le silence** : rien n'est émis au moment où un
 * téléphone s'éteint. Seule une relecture régulière voit un appareil s'éteindre.
 */

const PERIOD_MS = 30_000;

const TYPE_ICONS: Record<UserDeviceType, React.ComponentType<{ className?: string }>> = {
  phone: Smartphone,
  tablet: Tablet,
  pc: Monitor,
  tv: Tv,
  kiosk: House,
};

const TYPE_LABELS: Record<UserDeviceType, string> = {
  phone: 'Téléphone',
  tablet: 'Tablette',
  pc: 'Ordinateur',
  tv: 'Télé',
  kiosk: 'Écran mural',
};

/** « il y a 3 min » plutôt qu'un horodatage : c'est la fraîcheur qui compte. */
function vuQuand(iso: string | null): string {
  if (!iso) return 'jamais vu';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 'jamais vu';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return j === 1 ? 'hier' : `il y a ${j} jours`;
}

export function HouseDevices() {
  const [devices, setDevices] = useState<UserDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const profiles = useProfileStore((s) => s.profiles);
  const rooms = useRoomsStore((s) => s.rooms);
  const thisDeviceId = getDeviceId();

  const refresh = useCallback(async () => {
    try {
      setDevices(await api.userDevices.list());
      setError(null);
    } catch {
      setError('Liste indisponible');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), PERIOD_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const forget = async (d: UserDevice) => {
    setBusyId(d.id);
    try {
      await api.userDevices.remove(d.id);
      await refresh();
    } catch {
      setError("Impossible d'oublier cet appareil");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Appareils de la maison
      </h2>
      <p className="text-sm text-zinc-500 mb-3">
        Les téléphones et écrans qui utilisent Trano. Un appareil oublié réapparaîtra tout seul
        à sa prochaine visite.
      </p>

      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">{error}</p>}

      {devices === null ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : devices.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm text-zinc-500">
            Aucun appareil enregistré pour l'instant. Chacun se présente tout seul à sa première
            ouverture de Trano.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => {
            const Icon = TYPE_ICONS[d.type] ?? Smartphone;
            const owner = profiles.find((p) => p.id === d.profileId);
            const room = rooms.find((r) => r.id === d.roomId);
            const isThis = d.id === thisDeviceId;
            return (
              <div
                key={d.id}
                className="flex items-center gap-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-4"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-500 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={cn(
                      'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900',
                      d.online ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700',
                    )}
                    title={d.online ? 'En ligne' : 'Hors ligne'}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {d.name}
                    {isThis && <span className="ml-2 text-xs font-normal text-zinc-500">cet appareil</span>}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {[
                      TYPE_LABELS[d.type],
                      owner ? (owner.kind === 'house' ? 'écran partagé' : owner.name) : null,
                      room?.name,
                      d.online ? 'en ligne' : vuQuand(d.lastSeenAt),
                      d.batteryPct !== null ? `${d.batteryPct} %${d.batteryCharging ? ' ⚡' : ''}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {/* Le modèle n'est pas toujours connu : les Client Hints sont
                      une API Chromium, absente de tous les navigateurs iOS. */}
                  {(d.model || d.platform) && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 truncate">
                      {[d.model, d.osVersion ? `${d.platform ?? ''} ${d.osVersion}`.trim() : d.platform]
                        .filter(Boolean)
                        .join(' · ')}
                      {d.hasPushToken && ' · notifications actives'}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => forget(d)}
                  disabled={busyId === d.id}
                  title="Oublier cet appareil"
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                >
                  {busyId === d.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
