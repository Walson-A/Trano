import React, { useMemo, useState } from 'react';
import {
  Lightbulb, ToggleLeft, Thermometer, Lock, Tv, Blinds, Fan, Gauge, Camera,
  Search, Eye, EyeOff, Pencil, Check, X, Server, Wifi, Download,
  Upload, Globe, Phone, HardDrive, RotateCcw, BellRing, PhoneMissed, Trash2,
} from 'lucide-react';
import { Device, DeviceType } from '../types';
import type { Room } from '@trano/shared';
import { getRoomIcon, ROOM_ICON_NAMES } from '../config/rooms';
import { FREEBOX, PHONES } from '../config/network';
import { useConfigStore } from '../core/store/useConfigStore';
import { useRoomsStore } from '../core/store/useRoomsStore';
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
  const rooms = useRoomsStore((s) => s.rooms);
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
        {rooms.map((r) => (
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

const FreeboxSection: React.FC = () => {
  const { entities, connection } = useHA();
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [ringing, setRinging] = useState<string | null>(null);

  const wifi = entities[FREEBOX.wifiSwitch];
  if (!wifi) return null; // Intégration Freebox absente : section masquée

  const read = (id: string) => {
    const e = entities[id];
    return e && e.state !== 'unavailable' && e.state !== 'unknown' ? e.state : null;
  };

  const wifiOn = wifi.state === 'on';
  const down = read(FREEBOX.downloadSpeed);
  const up = read(FREEBOX.uploadSpeed);
  const ip = read(FREEBOX.externalIp);
  const calls = read(FREEBOX.missedCalls);
  const disk = read(FREEBOX.diskFreePct);

  const callService = (domain: string, service: string, data: Record<string, unknown>) =>
    connection?.sendMessagePromise({ type: 'call_service', domain, service, ...data });

  const toggleWifi = () =>
    callService('switch', wifiOn ? 'turn_off' : 'turn_on', {
      target: { entity_id: FREEBOX.wifiSwitch },
    });

  const reboot = () => {
    if (!confirmReboot) {
      setConfirmReboot(true);
      setTimeout(() => setConfirmReboot(false), 4000);
      return;
    }
    setConfirmReboot(false);
    callService('button', 'press', { target: { entity_id: FREEBOX.rebootButton } });
  };

  const ringPhone = async (service: string) => {
    setRinging(service);
    try {
      await callService('notify', service, {
        service_data: {
          title: '📳 Trano',
          message: 'Quelqu\'un te cherche à la maison !',
          data: { push: { sound: { name: 'default', critical: 1, volume: 1.0 } } },
        },
      });
    } finally {
      setTimeout(() => setRinging(null), 2000);
    }
  };

  const stat = (icon: React.ReactNode, label: string, value: string | null) => (
    <div className="flex items-center gap-3 bg-zinc-100/60 dark:bg-white/5 rounded-xl px-4 py-3">
      <span className="text-zinc-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {value ?? '--'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Réseau — Freebox</h2>
      <p className="text-sm text-zinc-500 mb-4">Pilotée via l'intégration Freebox de Home Assistant.</p>

      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-3xl p-5">
        {/* WiFi + reboot */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={toggleWifi}
            className={cn(
              'flex items-center gap-3 px-5 py-3 rounded-2xl font-semibold transition-all',
              wifiOn
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
            )}
          >
            <Wifi className="w-5 h-5" />
            Wi-Fi {wifiOn ? 'activé' : 'coupé'}
            <span className={cn('w-2 h-2 rounded-full', wifiOn ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400')} />
          </button>

          <button
            onClick={reboot}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold transition-all',
              confirmReboot
                ? 'bg-red-500 text-white'
                : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            {confirmReboot ? 'Confirmer le redémarrage ?' : 'Redémarrer la Freebox'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {stat(<Download className="w-4 h-4" />, 'Débit ↓', down ? `${down} Mo/s` : null)}
          {stat(<Upload className="w-4 h-4" />, 'Débit ↑', up ? `${up} Mo/s` : null)}
          {stat(<Globe className="w-4 h-4" />, 'IP externe', ip)}
          {stat(<PhoneMissed className="w-4 h-4" />, 'Appels manqués', calls)}
          {stat(<HardDrive className="w-4 h-4" />, 'Disque libre', disk ? `${Math.round(parseFloat(disk))}%` : null)}
        </div>

        {/* Faire sonner un téléphone */}
        <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2 flex items-center gap-2">
          <BellRing className="w-3.5 h-3.5" /> Faire sonner un téléphone
        </p>
        <div className="flex flex-wrap gap-2">
          {PHONES.map((phone) => (
            <button
              key={phone.service}
              onClick={() => ringPhone(phone.service)}
              disabled={ringing === phone.service}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                ringing === phone.service
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10'
              )}
            >
              <Phone className="w-4 h-4" />
              {ringing === phone.service ? 'Sonnerie envoyée !' : phone.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const RoomRow: React.FC<{ room: Room }> = ({ room }) => {
  const { updateRoom, deleteRoom } = useRoomsStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(room.name);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = getRoomIcon(room.icon);

  const saveName = () => {
    if (draft.trim() && draft.trim() !== room.name) updateRoom(room.id, { name: draft.trim() });
    setEditing(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-2xl">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icône : ouvre le sélecteur */}
        <button
          onClick={() => setIconPickerOpen(!iconPickerOpen)}
          title="Changer l'icône"
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            iconPickerOpen
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
              : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          )}
        >
          <Icon className="w-5 h-5" />
        </button>

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
            </div>
          ) : (
            <button
              onClick={() => { setDraft(room.name); setEditing(true); }}
              className="group flex items-center gap-2 min-w-0 text-left"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{room.name}</span>
              <Pencil className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>

        {/* Étage */}
        <div className="flex bg-zinc-100 dark:bg-white/5 rounded-lg p-0.5 shrink-0">
          {(['RDC', 'Étage'] as const).map((f) => (
            <button
              key={f}
              onClick={() => room.floor !== f && updateRoom(room.id, { floor: f })}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                room.floor === f
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (confirmDelete) {
              deleteRoom(room.id);
            } else {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 4000);
            }
          }}
          className={cn(
            'p-2 rounded-xl transition-colors shrink-0 text-sm font-medium',
            confirmDelete
              ? 'bg-red-500 text-white px-3'
              : 'text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400'
          )}
          aria-label="Supprimer la pièce"
        >
          {confirmDelete ? 'Sûr ?' : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Sélecteur d'icône */}
      {iconPickerOpen && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 border-t border-zinc-100 dark:border-white/5 pt-3">
          {ROOM_ICON_NAMES.map((name) => {
            const OptIcon = getRoomIcon(name);
            return (
              <button
                key={name}
                onClick={() => { updateRoom(room.id, { icon: name }); setIconPickerOpen(false); }}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                  room.icon === name
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <OptIcon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RoomsManager: React.FC = () => {
  const { rooms, createRoom } = useRoomsStore();
  const [newName, setNewName] = useState('');
  const [newFloor, setNewFloor] = useState<'RDC' | 'Étage'>('RDC');
  const [creating, setCreating] = useState(false);

  const add = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await createRoom({ name: newName.trim(), floor: newFloor });
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Pièces</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Renommez, changez l'icône ou l'étage — synchronisé sur tous les écrans.
      </p>

      <div className="flex flex-col gap-2 mb-3">
        {(['RDC', 'Étage'] as const).map((floor) => (
          <React.Fragment key={floor}>
            <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mt-2 first:mt-0">{floor}</p>
            {rooms.filter((r) => r.floor === floor).map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Ajouter une pièce */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Nouvelle pièce…"
          className="flex-1 min-w-0 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-colors"
        />
        <div className="flex bg-zinc-100 dark:bg-white/5 rounded-xl p-0.5 shrink-0">
          {(['RDC', 'Étage'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setNewFloor(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                newFloor === f
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={add}
          disabled={!newName.trim() || creating}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
        >
          Ajouter
        </button>
      </div>
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

      <FreeboxSection />

      <RoomsManager />

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
