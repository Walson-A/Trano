import React from 'react';
import { Lightbulb, Thermometer, Lock, Tv, Power, Volume2 } from 'lucide-react';
import { Device } from '../types';
import { cn } from '../utils';

interface DeviceCardProps {
  device: Device;
  onToggle: (id: string) => void;
  key?: string | number;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle }) => {
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
      case 'climate': return `${device.state.currentTemp}°C (Cible: ${device.state.targetTemp}°C)`;
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

  return (
    <button
      onClick={() => onToggle(device.id)}
      className={cn(
        "flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-300 text-left h-32 sm:h-36 w-full shadow-sm hover:shadow-md active:scale-95 border-2",
        "bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100",
        active 
          ? "border-blue-500 dark:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_15px_rgba(96,165,250,0.1)]" 
          : "border-zinc-200 dark:border-zinc-700/50"
      )}
    >
      <div className="flex justify-between items-start w-full">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-full transition-colors duration-300",
          active ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
        )}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {device.type === 'light' && active && (
          <span className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400">{device.state.brightness}%</span>
        )}
      </div>
      
      <div className="mt-auto">
        <h3 className="font-semibold text-xs sm:text-sm truncate">{device.name}</h3>
        <p className={cn(
          "text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate transition-colors duration-300",
          active ? "text-blue-600 dark:text-blue-400 font-medium" : "text-zinc-500 dark:text-zinc-400"
        )}>
          {getStatus()}
        </p>
      </div>
    </button>
  );
}
