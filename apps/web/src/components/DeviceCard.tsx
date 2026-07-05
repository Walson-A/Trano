import React from 'react';
import { Lightbulb, Thermometer, Lock, Tv, Power, Heart, SlidersHorizontal } from 'lucide-react';
import { Device } from '../types';
import { useDeviceControls } from '../core/store/useDeviceControls';
import { cn } from '../utils';

interface DeviceCardProps {
  device: Device;
  onToggle: (id: string) => void;
  /** Si fournis, affiche le cœur d'épinglage aux favoris du profil */
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle, isFavorite, onToggleFavorite }) => {
  const openControls = useDeviceControls((s) => s.open);
  // Les lumières ouvrent la fiche de contrôle (luminosité, couleur) ; les
  // autres appareils basculent directement.
  const hasRichControls = device.type === 'light';
  const activate = () => (hasRichControls ? openControls(device.id) : onToggle(device.id));

  const getIcon = () => {
    switch (device.type) {
      case 'light': return Lightbulb;
      case 'climate': return Thermometer;
      case 'lock': return Lock;
      case 'media': return Tv;
      default: return Power;
    }
  };

  const Icon = getIcon();

  const getStatus = () => {
    switch (device.type) {
      case 'light': return device.state.isOn ? `${device.state.brightness}%` : 'Éteint';
      case 'climate': return `${device.state.temperature ?? '--'}°C (Cible: ${device.state.targetTemp ?? '--'}°C)`;
      case 'lock': return device.state.isLocked ? 'Verrouillé' : 'Déverrouillé';
      case 'media': return device.state.isPlaying ? device.state.title : 'En pause';
      default: return '';
    }
  };

  const isActive = () => {
    switch (device.type) {
      case 'light': return device.state.isOn;
      case 'climate': return device.state.mode !== 'off';
      case 'lock': return !device.state.isLocked; // Unlocked is "active/warning" state
      case 'media': return device.state.isPlaying;
      default: return false;
    }
  };

  const active = isActive();

  // Couleur réelle de la lampe (si allumée et colorée) — sinon ambre par défaut
  const rgb = device.type === 'light' && active && device.state.rgbColor ? device.state.rgbColor : null;
  const lightRgb = rgb ? `rgb(${rgb.join(',')})` : null;
  const rgba = (a: number) => `rgba(${rgb!.join(',')}, ${a})`;
  const iconStyle = rgb ? { backgroundColor: rgba(0.16), color: lightRgb! } : undefined;
  const borderStyle = rgb ? { borderColor: rgba(0.5), boxShadow: `0 0 18px ${rgba(0.18)}` } : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => e.key === 'Enter' && activate()}
      style={borderStyle}
      className={cn(
        "flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-500 text-left h-32 sm:h-36 w-full shadow-sm active:scale-95 border cursor-pointer select-none",
        "bg-white/80 dark:bg-white/5 backdrop-blur-md text-zinc-900 dark:text-zinc-100",
        !borderStyle && (active
          ? device.type === 'light'
            ? "border-amber-500/50 dark:border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] dark:shadow-[0_0_20px_rgba(245,158,11,0.05)]"
            : "border-blue-500/50 dark:border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] dark:shadow-[0_0_20px_rgba(59,130,246,0.05)]"
          : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10")
      )}
    >
      <div className="flex justify-between items-start w-full">
        <div
          style={iconStyle}
          className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-500",
            !iconStyle && (active
              ? device.type === 'light'
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500")
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div className="flex items-center gap-1.5">
          {hasRichControls && (
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" aria-hidden />
          )}
          {onToggleFavorite && (
            <span
              role="button"
              tabIndex={0}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(device.id); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleFavorite(device.id); } }}
              className={cn(
                "p-1.5 rounded-full transition-all",
                isFavorite
                  ? "text-red-500"
                  : "text-zinc-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="font-bold text-xs sm:text-sm truncate tracking-tight">{device.name}</h3>
        <p
          style={rgb ? { color: lightRgb! } : undefined}
          className={cn(
            "text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate transition-colors duration-500 font-semibold",
            !rgb && (active
              ? device.type === 'light' ? "text-amber-600/80 dark:text-amber-400/80" : "text-blue-600/80 dark:text-blue-400/80"
              : "text-zinc-500/60 dark:text-zinc-400/40 font-normal")
          )}
        >
          {getStatus()}
        </p>
      </div>
    </div>
  );
}
