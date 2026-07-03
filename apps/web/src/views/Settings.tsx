import React, { useMemo, useState } from 'react';
import {
  Lightbulb, ToggleLeft, Thermometer, Lock, Tv, Blinds, Fan, Gauge, Camera,
  Search, Eye, EyeOff, Pencil, Check, X, Server, Wifi,
} from 'lucide-react';
import { Device, DeviceType } from '../types';
import { ROOMS } from '../config/rooms';
import { useConfigStore } from '../core/store/useConfigStore';
import { useHA } from '../context/HAContext';
import { cn } from '../utils';

const TYPE_ICONS: Record<DeviceType, React.ComponentType<{ className?: string }>> = {
  light: Lightbulb,
  switch: ToggleLeft,
  climate: Thermometer,
  lock: Lock,
  media: Tv,
  cover: Blinds,
  fan: Fan,
  sensor: Gauge,
  camera: Camera,
};

interface SettingsProps {
  devices: Device[];
}

const DeviceRow: React.FC<{ device: Device }> = ({ device }) => {
  const { deviceOverrides, setDeviceName, setDeviceRoom, setDeviceHidden, removeDeviceOverride } =
    useConfigStore();
  const override = deviceOverrides[device.id];
  const hidden = override?.hidden ?? false;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(device.name);

  const saveName = () => {
    if (draft.trim() && draft.trim() !== device.name) {
      setDeviceName(device.id, draft.trim());
    }
    setEditing(false);
  };

  const Icon = TYPE_ICONS[device.type] ?? ToggleLeft;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5",
      hidden && "opacity-50"
    )}>
      <Icon className="w-5 h-5 text-zinc-400 shrink-0" />

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              className="flex-1 min-w-0 bg-zinc-100 dark:bg-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
            />
            <button onClick={saveName} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg" aria-label="Valider">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1.5 text-zinc-400 hover:bg-white/10 rounded-lg" aria-label="Annuler">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(device.name); setEditing(true); }}
            className="group flex items-center gap-2 min-w-0 text-left"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{device.name}</span>
            <Pencil className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
        <p className="text-xs text-zinc-500 truncate">{device.id}</p>
      </div>

      <select
        value={device.roomId ?? ''}
        onChange={(e) => {
          if (e.target.value) setDeviceRoom(device.id, e.target.value);
        }}
        className={cn(
          "text-sm rounded-xl px-3 py-2 outline-none cursor-pointer border-none shrink-0 max-w-36",
          device.roomId
            ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100"
            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
        )}
      >
        <option value="" disabled>Non assigné</option>
        {ROOMS.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      <button
        onClick={() => setDeviceHidden(device.id, !hidden)}
        title={hidden ? 'Réafficher cet appareil' : 'Masquer cet appareil'}
        className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0"
      >
        {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      {override && (
        <button
          onClick={() => removeDeviceOverride(device.id)}
          title="Réinitialiser (nom et pièce d'origine HA)"
          className="text-xs text-zinc-400 hover:text-red-400 transition-colors shrink-0 hidden sm:block"
        >
          Réinit.
        </button>
      )}
    </div>
  );
};

export function Settings({ devices }: SettingsProps) {
  const { status, error } = useHA();
  const [search, setSearch] = useState('');
  const [serverInfo, setServerInfo] = useState<{ ok: boolean; uptime?: number } | null>(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setServerInfo({ ok: d.status === 'ok', uptime: d.uptime }))
      .catch(() => setServerInfo({ ok: false }));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? devices.filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
      : devices;
    // Non assignés d'abord (le mapping est en cours), puis par nom
    return [...list].sort((a, b) => {
      if (!a.roomId !== !b.roomId) return a.roomId ? 1 : -1;
      return a.name.localeCompare(b.name, 'fr');
    });
  }, [devices, search]);

  const unassignedCount = devices.filter((d) => !d.roomId).length;

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-4">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Réglages
        </h1>
      </header>

      {/* État des systèmes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            status === 'connected' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500" : "bg-red-100 dark:bg-red-900/30 text-red-500"
          )}>
            <Wifi className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Home Assistant</p>
            <p className="text-xs text-zinc-500 truncate">
              {status === 'connected' ? 'Connecté' : status === 'connecting' ? 'Connexion…' : error ?? 'Déconnecté'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl px-5 py-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            serverInfo?.ok ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500" : "bg-red-100 dark:bg-red-900/30 text-red-500"
          )}>
            <Server className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Serveur Trano</p>
            <p className="text-xs text-zinc-500 truncate">
              {serverInfo === null ? 'Vérification…' : serverInfo.ok
                ? `En ligne depuis ${Math.floor((serverInfo.uptime ?? 0) / 3600)}h${Math.floor(((serverInfo.uptime ?? 0) % 3600) / 60).toString().padStart(2, '0')}`
                : 'Injoignable'}
            </p>
          </div>
        </div>
      </div>

      {/* Gestion des appareils */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Appareils</h2>
        {unassignedCount > 0 && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
            {unassignedCount} sans pièce
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 mb-4">
        Renommez, assignez une pièce ou masquez les appareils remontés par Home Assistant.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un appareil…"
          className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((device) => (
          <DeviceRow key={device.id} device={device} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-10">
            {devices.length === 0 ? 'Aucun appareil remonté par Home Assistant.' : 'Aucun résultat.'}
          </p>
        )}
      </div>
    </div>
  );
}
