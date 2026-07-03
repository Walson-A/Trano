import React, { useState } from 'react';
import { Device } from '../types';
import type { Profile } from '@trano/shared';
import { DeviceCard } from '../components/DeviceCard';
import { Thermometer, Zap, Lock, Heart, Star, ChevronRight, Droplets } from 'lucide-react';
import { useHA } from '../context/HAContext';
import { getWeatherEntity } from '../lib/runtimeConfig';
import { useProfileStore } from '../core/store/useProfileStore';
import { WeatherIcon, WEATHER_MAPPING } from '../features/Weather/WeatherWidget';
import { Modal } from '../ui/Modal/Modal';
import { getRoomById } from '../config/rooms';
import { getIconComponent } from './Rooms';
import type { RoomClimate } from './Rooms';
import { cn } from '../utils';

interface DashboardProps {
  currentUser: Profile;
  devices: Device[];
  roomClimate: RoomClimate;
  onToggleDevice: (id: string) => void;
  onOpenRoom: (roomId: string) => void;
}

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

export function Dashboard({ currentUser, devices, roomClimate, onToggleDevice, onOpenRoom }: DashboardProps) {
  const { entities } = useHA();
  const toggleFavorite = useProfileStore((s) => s.toggleFavorite);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);

  const favoriteDevices = devices.filter(d => currentUser.favorites.includes(d.id));
  const favoriteRooms = currentUser.favoriteRooms
    .map((id) => getRoomById(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Get weather data
  const weatherEntityId = getWeatherEntity();
  const weatherEntity = entities[weatherEntityId];
  const weatherAvailable = weatherEntity && weatherEntity.state !== 'unavailable' && weatherEntity.state !== 'unknown';
  const weatherTemp = weatherAvailable && typeof weatherEntity.attributes.temperature === 'number'
    ? Math.round(weatherEntity.attributes.temperature)
    : null;
  const weatherState = weatherAvailable ? weatherEntity.state : 'cloudy';

  // Real data mapping
  const gridPower = Math.round(parseFloat(entities['sensor.shellypro3em_ac15187b3e18_puissance']?.state || '0'));
  const insideTemp = entities['sensor.temperature_salon']?.state || '--';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-12 pb-28 md:pb-12 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Bonjour, {currentUser.name}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm sm:text-base font-medium">
          La maison est sécurisée. Température moyenne {insideTemp}°C.
        </p>
      </header>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        <StatusCard
          icon={<WeatherIcon state={weatherState} size={20} />}
          label="Météo"
          value={weatherTemp !== null ? `${weatherTemp}°C` : 'Non disponible'}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-500"
          onClick={() => setIsWeatherModalOpen(true)}
        />
        <StatusCard
          icon={<Thermometer className="size-5" />}
          label="Intérieur"
          value={`${insideTemp}°C`}
          color="bg-orange-500/10 text-orange-600 dark:text-orange-500"
        />
        <StatusCard
          icon={<Zap className="size-5" />}
          label="Conso"
          value={`${gridPower} W`}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
        />
        <StatusCard
          icon={<Lock className="size-5" />}
          label="Sécurité"
          value="Armée"
          color="bg-red-500/10 text-red-600 dark:text-red-500"
        />
      </div>

      {favoriteRooms.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Star className="w-5 h-5 text-amber-500 fill-current" />
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mes pièces</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {favoriteRooms.map((room) => {
              const roomDevices = devices.filter((d) => d.roomId === room.id);
              const active = countActive(roomDevices);
              const climate = roomClimate[room.id];
              const Icon = getIconComponent(room.icon);
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
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">Favoris</h2>
        </div>
        
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
