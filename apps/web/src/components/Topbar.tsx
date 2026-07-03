import React, { useState, useEffect } from 'react';
import { WeatherWidget } from '../features/Weather/WeatherWidget';
import { SystemStatus } from '../features/System/SystemStatus';
import { Sun, Moon, Megaphone } from 'lucide-react';

interface TopbarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenIntercom: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ isDarkMode, toggleDarkMode, onOpenIntercom }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const rawDate = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  const dateString = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <header className="flex items-center justify-between px-6 py-3 lg:px-12 lg:py-5 bg-zinc-50/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-200/50 dark:border-white/5">
      {/* Gauche : heure & date */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tighter text-zinc-900 dark:text-zinc-100 tabular-nums">
          {timeString}
        </h1>
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 capitalize hidden sm:inline">
          {dateString}
        </span>
      </div>

      {/* Droite : actions essentielles */}
      <div className="flex items-center gap-1 sm:gap-2">
        <WeatherWidget />
        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1 hidden sm:block" />
        <div className="hidden sm:block"><SystemStatus /></div>
        <button
          onClick={onOpenIntercom}
          title="Interphone"
          aria-label="Ouvrir l'interphone"
          className="p-2.5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all active:scale-90"
        >
          <Megaphone size={20} />
        </button>
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          className="p-2.5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all active:scale-90"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};
