import React, { useState } from 'react';
import { Device } from '../types';
import type { Profile } from '@trano/shared';
import { DeviceCard } from '../components/DeviceCard';
import {
  Thermometer, Heart, Star, ChevronRight, Droplets, Sun, Battery,
  Plug, ShoppingCart, Megaphone, SlidersHorizontal, Check, ChevronUp,
  ChevronDown, X, Plus,
} from 'lucide-react';
import { useHA } from '../context/HAContext';
import { getWeatherEntity } from '../lib/runtimeConfig';
import { useProfileStore } from '../core/store/useProfileStore';
import { useShoppingStore } from '../core/store/useShoppingStore';
import { WeatherIcon, WEATHER_MAPPING } from '../features/Weather/WeatherWidget';
import { Modal } from '../ui/Modal/Modal';
import { getRoomIcon } from '../config/rooms';
import { useRoomsStore } from '../core/store/useRoomsStore';
import { ENERGY_LIVE, readPowerW } from '../config/energy';
import type { RoomClimate } from './Rooms';
import type { Tab } from '../App';
import { cn } from '../utils';

interface DashboardProps {
  currentUser: Profile;
  devices: Device[];
  roomClimate: RoomClimate;
  onToggleDevice: (id: string) => void;
  onOpenRoom: (roomId: string) => void;
  onOpenTab: (tab: Tab) => void;
  onOpenIntercom: () => void;
}

/** Blocs disponibles sur le dashboard — chaque profil choisit et ordonne */
const WIDGETS: Array<{ id: string; label: string }> = [
  { id: 'status', label: 'Aperçu (météo, conso…)' },
  { id: 'favorite-rooms', label: 'Mes pièces' },
  { id: 'favorite-devices', label: 'Appareils favoris' },
  { id: 'energy', label: 'Énergie' },
  { id: 'shopping', label: 'Liste de courses' },
  { id: 'intercom', label: 'Interphone' },
];

const DEFAULT_LAYOUT = ['status', 'favorite-rooms', 'favorite-devices'];

const StatusCard = ({ icon, label, value, color, onClick }: {
  icon: React.ReactNode,
  label: string,
  value: string,
  color: string,
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-zinc-800/50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 sm:gap-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
  >
    <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full ${color} flex items-center justify-center`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate uppercase tracking-wider">{label}</p>
      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{value}</p>
    </div>
  </button>
);

function countActive(devices: Device[]): number {
  return devices.filter((d) => {
    if (d.type === 'light') return d.state.isOn;
    if (d.type === 'climate') return d.state.mode !== 'off';
    if (d.type === 'media') return d.state.isPlaying;
    return false;
  }).length;
}

export function Dashboard({ currentUser, devices, roomClimate, onToggleDevice, onOpenRoom, onOpenTab, onOpenIntercom }: DashboardProps) {
  const { entities } = useHA();
  const toggleFavorite = useProfileStore((s) => s.toggleFavorite);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const shoppingItems = useShoppingStore((s) => s.items);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const rooms = useRoomsStore((s) => s.rooms);
  const favoriteDevices = devices.filter(d => currentUser.favorites.includes(d.id));
  const favoriteRooms = currentUser.favoriteRooms
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const layout = currentUser.dashboardLayout.length > 0 ? currentUser.dashboardLayout : DEFAULT_LAYOUT;
  const availableWidgets = WIDGETS.filter((w) => !layout.includes(w.id));

  const saveLayout = (next: string[]) => updateProfile(currentUser.id, { dashboardLayout: next });
  const moveWidget = (id: string, dir: -1 | 1) => {
    const idx = layout.indexOf(id);
    const target = idx + dir;
    if (target < 0 || target >= layout.length) return;
    const next = [...layout];
    [next[idx], next[target]] = [next[target], next[idx]];
    saveLayout(next);
  };
  const removeWidget = (id: string) => saveLayout(layout.filter((w) => w !== id));
  const addWidget = (id: string) => saveLayout([...layout, id]);

  // Météo
  const weatherEntityId = getWeatherEntity();
  const weatherEntity = entities[weatherEntityId];
  const weatherAvailable = weatherEntity && weatherEntity.state !== 'unavailable' && weatherEntity.state !== 'unknown';
  const weatherTemp = weatherAvailable && typeof weatherEntity.attributes.temperature === 'number'
    ? Math.round(weatherEntity.attributes.temperature)
    : null;
  const weatherState = weatherAvailable ? weatherEntity.state : 'cloudy';

  // Énergie temps réel
  const gridW = readPowerW(entities, ENERGY_LIVE.grid);
  const solarW = ENERGY_LIVE.solar.reduce((sum, s) => sum + readPowerW(entities, s), 0);
  const socRaw = parseFloat(entities[ENERGY_LIVE.batterySoc[0].id]?.state ?? '');
  const soc = Number.isNaN(socRaw) ? null : Math.round(socRaw);

  const todoCount = shoppingItems.filter((i) => i.status === 'todo').length;
  const todoPreview = shoppingItems.filter((i) => i.status === 'todo').slice(0, 3);

  // ─── Rendu des blocs ──────────────────────────────────────
  const renderWidget = (id: string): React.ReactNode => {
    switch (id) {
      case 'status':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatusCard
              icon={<WeatherIcon state={weatherState} size={20} />}
              label="Météo"
              value={weatherTemp !== null ? `${weatherTemp}°C` : 'Non disponible'}
              color="bg-amber-500/10 text-amber-600 dark:text-amber-500"
              onClick={() => setIsWeatherModalOpen(true)}
            />
            <StatusCard
              icon={<Sun className="size-5" />}
              label="Solaire"
              value={`${(solarW / 1000).toFixed(1)} kW`}
              color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              onClick={() => onOpenTab('energy')}
            />
            <StatusCard
              icon={<Battery className="size-5" />}
              label="Batterie"
              value={soc !== null ? `${soc}%` : '--'}
              color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              onClick={() => onOpenTab('energy')}
            />
            <StatusCard
              icon={<Plug className="size-5" />}
              label={gridW < -50 ? 'Export EDF' : gridW > 50 ? 'Import EDF' : 'Réseau'}
              value={`${Math.abs(Math.round(gridW))} W`}
              color={gridW > 50
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}
              onClick={() => onOpenTab('energy')}
            />
          </div>
        );

      case 'favorite-rooms':
        if (favoriteRooms.length === 0 && !editing) return null;
        return (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500 fill-current" />
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mes pièces</h2>
            </div>
            {favoriteRooms.length === 0 ? (
              <p className="text-sm text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-6 text-center">
                Étoilez une pièce (★) dans l'onglet Pièces pour la voir ici.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {favoriteRooms.map((room) => {
                  const roomDevices = devices.filter((d) => d.roomId === room.id);
                  const active = countActive(roomDevices);
                  const climate = roomClimate[room.id];
                  const Icon = getRoomIcon(room.icon);
                  return (
                    <button
                      key={room.id}
                      onClick={() => onOpenRoom(room.id)}
                      className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                        active > 0
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-zinc-100 dark:bg-white/5 text-zinc-400"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{room.name}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                          <span>{roomDevices.length} appareil{roomDevices.length > 1 ? 's' : ''}{active > 0 && ` · ${active} actif${active > 1 ? 's' : ''}`}</span>
                          {climate?.temperature !== undefined && (
                            <span className="flex items-center gap-0.5"><Thermometer className="w-3 h-3" />{climate.temperature.toFixed(1)}°</span>
                          )}
                          {climate?.humidity !== undefined && (
                            <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" />{Math.round(climate.humidity)}%</span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );

      case 'favorite-devices':
        return (
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Favoris</h2>
            {favoriteDevices.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {favoriteDevices.map(device => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onToggle={onToggleDevice}
                    isFavorite
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                <Heart className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-zinc-500">
                  Aucun favori pour l'instant — touchez le ♥ d'un appareil dans l'onglet Pièces
                  pour l'épingler ici.
                </p>
              </div>
            )}
          </section>
        );

      case 'energy':
        return (
          <button
            onClick={() => onOpenTab('energy')}
            className="w-full flex flex-wrap items-center gap-4 sm:gap-6 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Solaire</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{(solarW / 1000).toFixed(1)} kW</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Battery className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Batterie</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{soc !== null ? `${soc}%` : '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                gridW > 50 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-zinc-500/10 text-zinc-500"
              )}>
                <Plug className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                  {gridW < -50 ? 'Export EDF' : gridW > 50 ? 'Import EDF' : 'Réseau'}
                </p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.abs(Math.round(gridW))} W</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 ml-auto shrink-0" />
          </button>
        );

      case 'shopping':
        return (
          <button
            onClick={() => onOpenTab('courses')}
            className="w-full flex items-center gap-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {todoCount === 0 ? 'Liste de courses vide' : `${todoCount} article${todoCount > 1 ? 's' : ''} à acheter`}
              </p>
              {todoPreview.length > 0 && (
                <p className="text-xs text-zinc-500 truncate">
                  {todoPreview.map((i) => i.title).join(' · ')}{todoCount > 3 ? ' · …' : ''}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
          </button>
        );

      case 'intercom':
        return (
          <button
            onClick={onOpenIntercom}
            className="w-full flex items-center gap-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Interphone</p>
              <p className="text-xs text-zinc-500">Appeler quelqu'un dans la maison</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-12 pb-28 md:pb-12 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <header className="mb-8 md:mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Bonjour, {currentUser.name}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm sm:text-base font-medium">
            Bienvenue chez vous.
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0',
            editing
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-white/5'
          )}
        >
          {editing ? <Check className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
          <span className="hidden sm:inline">{editing ? 'Terminé' : 'Personnaliser'}</span>
        </button>
      </header>

      <div className="flex flex-col gap-8">
        {layout.map((id, index) => {
          const content = renderWidget(id);
          if (content === null && !editing) return null;
          const widget = WIDGETS.find((w) => w.id === id);
          return (
            <div key={id} className={cn(editing && 'rounded-3xl ring-2 ring-dashed ring-zinc-300 dark:ring-zinc-700 p-3')}>
              {editing && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex-1">
                    {widget?.label ?? id}
                  </span>
                  <button
                    onClick={() => moveWidget(id, -1)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
                    aria-label="Monter"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveWidget(id, 1)}
                    disabled={index === layout.length - 1}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
                    aria-label="Descendre"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeWidget(id)}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-red-500"
                    aria-label="Retirer du dashboard"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {content}
            </div>
          );
        })}

        {/* Ajout de blocs en mode édition */}
        {editing && availableWidgets.length > 0 && (
          <div className="rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Ajouter un bloc</p>
            <div className="flex flex-wrap gap-2">
              {availableWidgets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => addWidget(w.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weather Modal Portal */}
      <Modal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        title="Météo Détaillée"
      >
        <div className="p-8 text-center flex flex-col items-center">
          <div className="mb-4">
            <WeatherIcon state={weatherState} size={64} />
          </div>
          <h3 className="text-4xl font-bold mb-2">{weatherTemp !== null ? `${weatherTemp}°C` : '--°C'}</h3>
          <p className="text-zinc-500 capitalize">{WEATHER_MAPPING[weatherState]?.label || weatherState}</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-1">Humidité</p>
              <p className="font-semibold">{weatherEntity?.attributes.humidity}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-1">Vent</p>
              <p className="font-semibold">{weatherEntity?.attributes.wind_speed} km/h</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-1">Pression</p>
              <p className="font-semibold">{weatherEntity?.attributes.pressure} hPa</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
