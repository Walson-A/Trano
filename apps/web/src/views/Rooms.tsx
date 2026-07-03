import React, { useState, useRef, useEffect } from 'react';
import { Device, RoomConfig } from '../types';
import { DeviceCard } from '../components/DeviceCard';
import {
  Sofa, CookingPot, Bed, BedDouble, BedSingle, Baby, Car, Bath, Users,
  ChevronRight, WifiOff, Thermometer, Droplets, Star,
} from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ROOMS } from '../config/rooms';
import { useProfileStore, useActiveProfile } from '../core/store/useProfileStore';

export type RoomClimate = Record<string, { temperature?: number; humidity?: number }>;

interface RoomsProps {
  devices: Device[];
  roomClimate: RoomClimate;
  /** Pièce à ouvrir automatiquement (venant du Dashboard) */
  initialRoom?: string | null;
  /** Appelé une fois initialRoom appliqué, pour que le parent le réinitialise */
  onInitialRoomConsumed?: () => void;
  onToggleDevice: (id: string) => void;
}

/** Map icon string names from config to Lucide components */
const ICON_MAP: Record<string, React.ElementType> = {
  'sofa': Sofa,
  'cooking-pot': CookingPot,
  'bed': Bed,
  'bed-double': BedDouble,
  'bed-single': BedSingle,
  'baby': Baby,
  'car': Car,
  'bath': Bath,
  'users': Users,
};

export function getIconComponent(iconName: string): React.ElementType {
  return ICON_MAP[iconName] ?? Sofa;
}

function getDevicesForRoom(roomId: string, devices: Device[]): Device[] {
  return devices.filter(d => d.roomId === roomId);
}

const RoomAccordion: React.FC<{
  room: RoomConfig;
  devices: Device[];
  climate?: { temperature?: number; humidity?: number };
  isSelected: boolean;
  favorites: string[];
  isFavoriteRoom: boolean;
  onToggle: () => void;
  onToggleDevice: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleFavoriteRoom: () => void;
}> = ({ room, devices, climate, isSelected, favorites, isFavoriteRoom, onToggle, onToggleDevice, onToggleFavorite, onToggleFavoriteRoom }) => {
  const Icon = getIconComponent(room.icon);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCount = devices.filter(d => {
    if (d.type === 'light') return d.state.isOn;
    if (d.type === 'climate') return d.state.mode !== 'off';
    if (d.type === 'media') return d.state.isPlaying;
    return false;
  }).length;

  useEffect(() => {
    if (isSelected && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isSelected]);

  return (
    <motion.div
      ref={containerRef}
      layout
      initial={false}
      className={cn(
        "rounded-3xl border transition-all duration-500 overflow-hidden",
        isSelected
          ? "bg-white dark:bg-zinc-800/20 border-zinc-200 dark:border-white/10 shadow-2xl mb-4"
          : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 sm:p-6 text-left relative"
      >
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
          isSelected
            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
            : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400"
        )}>
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-50">{room.name}</h3>
            {activeCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {devices.length} appareil{devices.length > 1 ? 's' : ''} {activeCount > 0 && ` · ${activeCount} actif${activeCount > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats d'ambiance — affichées uniquement si un capteur réel existe */}
          {(climate?.temperature !== undefined || climate?.humidity !== undefined) && (
            <div className="hidden sm:flex items-center gap-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {climate.temperature !== undefined && (
                <span className="flex items-center gap-1">
                  <Thermometer className="w-4 h-4" />
                  {climate.temperature.toFixed(1)}°
                </span>
              )}
              {climate.humidity !== undefined && (
                <span className="flex items-center gap-1">
                  <Droplets className="w-4 h-4" />
                  {Math.round(climate.humidity)}%
                </span>
              )}
            </div>
          )}
          <span
            role="button"
            tabIndex={0}
            aria-label={isFavoriteRoom ? 'Retirer la pièce des favoris' : 'Ajouter la pièce aux favoris'}
            onClick={(e) => { e.stopPropagation(); onToggleFavoriteRoom(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleFavoriteRoom(); } }}
            className={cn(
              "p-1.5 rounded-full transition-all",
              isFavoriteRoom
                ? "text-amber-500"
                : "text-zinc-300 dark:text-zinc-600 hover:text-amber-400 dark:hover:text-amber-400"
            )}
          >
            <Star className={cn("w-5 h-5", isFavoriteRoom && "fill-current")} />
          </span>
          <ChevronRight className={cn(
            "w-5 h-5 transition-transform duration-500",
            isSelected ? "rotate-90 text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-600"
          )} />
        </div>
      </button>

      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
          >
            <div className="p-5 sm:p-6 pt-0 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
              {devices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 py-4">
                  {devices.map((device, idx) => (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <DeviceCard
                        device={device}
                        onToggle={onToggleDevice}
                        isFavorite={favorites.includes(device.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <WifiOff className="w-10 h-10 text-zinc-300 dark:text-zinc-800 mb-4" />
                  <p className="text-sm font-medium text-zinc-400 dark:text-zinc-600">
                    Aucun appareil connecté
                  </p>
                  <p className="text-xs text-zinc-400/60 dark:text-zinc-700/60 mt-1 max-w-[200px]">
                    Assigne des appareils à cette pièce dans Home Assistant
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function Rooms({ devices, roomClimate, initialRoom, onInitialRoomConsumed, onToggleDevice }: RoomsProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(initialRoom ?? null);
  const [floorFilter, setFloorFilter] = useState<'all' | 'RDC' | 'Étage'>('all');

  // Ouverture d'une pièce demandée depuis le Dashboard, puis on prévient
  // le parent pour qu'il réinitialise (sinon l'onglet rouvrirait toujours
  // cette pièce).
  useEffect(() => {
    if (initialRoom) {
      setSelectedRoom(initialRoom);
      onInitialRoomConsumed?.();
    }
  }, [initialRoom, onInitialRoomConsumed]);
  const toggleFavorite = useProfileStore((s) => s.toggleFavorite);
  const toggleFavoriteRoom = useProfileStore((s) => s.toggleFavoriteRoom);
  const activeProfile = useActiveProfile();
  const favorites = activeProfile?.favorites ?? [];
  const favoriteRooms = activeProfile?.favoriteRooms ?? [];

  const filteredRooms = floorFilter === 'all'
    ? ROOMS
    : ROOMS.filter(r => r.floor === floorFilter);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 lg:p-12 pb-28 md:pb-12 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <header className="mb-8 md:mb-10 max-w-4xl">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-0.5 w-8 bg-amber-500 rounded-full" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Vue par pièce</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
          Ma Maison
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base font-medium">
          {ROOMS.length} zones configurées · {devices.length} appareils opérationnels
        </p>
      </header>

      {/* Floor filter */}
      <div className="flex p-1 bg-zinc-200/50 dark:bg-white/5 rounded-2xl w-fit mb-8 backdrop-blur-md">
        {(['all', 'RDC', 'Étage'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFloorFilter(f)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300",
              floorFilter === f
                ? "bg-white dark:bg-white text-zinc-900 dark:text-zinc-900 shadow-xl"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            )}
          >
            {f === 'all' ? 'Toutes les pièces' : f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 max-w-5xl">
        <AnimatePresence mode="popLayout">
          {filteredRooms.map(room => (
            <RoomAccordion
              key={room.id}
              room={room}
              devices={getDevicesForRoom(room.id, devices)}
              climate={roomClimate[room.id]}
              isSelected={selectedRoom === room.id}
              favorites={favorites}
              isFavoriteRoom={favoriteRooms.includes(room.id)}
              onToggle={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
              onToggleDevice={onToggleDevice}
              onToggleFavorite={toggleFavorite}
              onToggleFavoriteRoom={() => toggleFavoriteRoom(room.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
