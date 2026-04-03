import React, { useState, useEffect } from 'react';
import { WeatherWidget } from '../features/Weather/WeatherWidget';
import { SystemStatus } from '../features/System/SystemStatus';
import { Bell, Settings, Sun, Moon } from 'lucide-react';

interface TopbarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ isDarkMode, toggleDarkMode }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const rawDate = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  const dateString = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <header className="flex items-center justify-between px-6 py-4 lg:px-12 lg:py-8 bg-zinc-50/50 dark:bg-[#111111]/50 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-200/50 dark:border-white/5">
      {/* Left: Clock & Date */}
      <div className="flex items-baseline gap-4">
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tighter text-zinc-900 dark:text-zinc-100 tabular-nums">
          {timeString}
        </h1>
        <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-800" />
        <span className="text-sm lg:text-base font-semibold text-zinc-500 dark:text-zinc-400 capitalize">
          {dateString}
        </span>
      </div>

      {/* Center: Message/Greeting Area (Optional) */}
      <div className="hidden md:flex items-center justify-center flex-1">
        <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500 italic">
          Bienvenue chez vous
        </span>
      </div>

      {/* Right: Weather & System */}
      <div className="flex items-center gap-2 lg:gap-4">
        <WeatherWidget />
        
        <div className="w-px h-8 bg-zinc-300 dark:bg-zinc-800 mx-1 hidden sm:block" />
        
        <div className="hidden sm:flex items-center gap-4">
          <SystemStatus />
          
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all active:scale-90"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2.5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all active:scale-90 relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-zinc-50 dark:border-[#111111]" />
            </button>
            <button className="p-2.5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all active:scale-90">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
