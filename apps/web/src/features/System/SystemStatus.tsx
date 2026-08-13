import React, { useEffect, useState, useRef } from 'react';
import type { HassEntities } from 'home-assistant-js-websocket';
import { useHA } from '../../context/HAContext';
import { Wifi, WifiOff, Activity, Landmark, Cloud, RefreshCw } from 'lucide-react';
import { cn } from '../../utils';

/**
 * Mise a jour de Home Assistant disponible ?
 *
 * HA tourne en conteneur sur le serveur : il ne sait pas se mettre a jour tout
 * seul (pas de Supervisor), la commande est `~/homeassistant/maj.sh` en SSH.
 * On se contente donc de prevenir. L'integration Version publie deux entites :
 * un binary_sensor `device_class: update` qui dit s'il existe plus recent — la
 * comparaison est faite par HA — et un sensor qui porte le numero.
 *
 * On cible le device_class plutot qu'un entity_id en dur : celui-ci derive du
 * titre de l'entree de configuration, donc du nom que HA lui a donne.
 * Absent, tout ce bloc ne s'affiche simplement pas.
 */
function useHaUpdate(entities: HassEntities) {
  const flag = Object.values(entities).find(
    (e) => e.entity_id.startsWith('binary_sensor.') && e.attributes?.device_class === 'update',
  );
  if (flag?.state !== 'on') return { available: false, latest: null };

  const base = flag.entity_id.replace(/^binary_sensor\./, '').replace(/_update_available$/, '');
  const versionSensor = Object.values(entities).find(
    (e) => e.entity_id.startsWith(`sensor.${base}`) && /^\d{4}\.\d+/.test(e.state),
  );
  return { available: true, latest: versionSensor?.state ?? null };
}

export function SystemStatus() {
  const { connection, status, entities } = useHA();
  const isConnected = status === 'connected';
  const update = useHaUpdate(entities);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-away logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSystemStatus(false);
      }
    }
    if (showSystemStatus) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSystemStatus]);

  // Calculate Ping/Latency
  useEffect(() => {
    if (!connection || status !== 'connected') {
      setLatency(null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const start = Date.now();
        await connection.ping();
        setLatency(Date.now() - start);
      } catch (e) {
        console.error("Ping error:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connection, status]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Connection Indicator Trigger */}
      <button 
        onClick={() => isConnected && setShowSystemStatus(!showSystemStatus)}
        className={cn(
          "relative flex items-center gap-2.5 p-2.5 rounded-2xl transition-all duration-300",
          "border backdrop-blur-md h-[44px]",
          isConnected
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
            : "bg-red-500/10 border-red-500/20 text-red-500",
          showSystemStatus && "ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10"
        )}
      >
        {isConnected ? <Wifi size={20} strokeWidth={2.5} /> : <WifiOff size={20} strokeWidth={2.5} />}
        <span className="text-[10px] font-black tracking-widest uppercase opacity-80 pr-1">HA</span>
        {isConnected && update.available && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-900"
            title="Mise à jour Home Assistant disponible"
          />
        )}
      </button>

      {/* System Status Popover */}
      {showSystemStatus && isConnected && (
        <div 
          className={cn(
            "absolute right-0 mt-3 w-64 z-50 overflow-hidden",
            "bg-zinc-900/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200"
          )}
          style={{ backdropFilter: 'blur(30px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-3 border-b border-white/5 bg-white/5">
            <h3 className="text-xs font-bold text-white/90 tracking-tight">Statut Système</h3>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110">
                <Activity size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Latence</p>
                <p className="text-xs font-bold text-white tabular-nums">{latency !== null ? `${latency}ms` : '--'}</p>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all group",
              update.available
                ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15"
                : "bg-white/5 border-white/5 hover:bg-white/10"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                update.available ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"
              )}>
                <Landmark size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Version</p>
                <p className="text-xs font-bold text-white">{connection?.haVersion || '...'}</p>
                {update.available && (
                  <p className="text-[9px] font-bold text-amber-400 truncate">
                    {update.latest ? `${update.latest} disponible` : 'mise à jour disponible'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center transition-transform group-hover:scale-110">
                <Cloud size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Point d'Accès</p>
                <p className="text-xs font-bold text-white truncate">
                  {connection?.options?.auth?.data?.hassUrl?.replace(/^https?:\/\//, '') || 'Local'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 pt-0">
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 active:scale-[0.98] transition-all border border-white/5 shadow-inner"
            >
              <RefreshCw size={12} strokeWidth={3} className="opacity-70" />
              Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
