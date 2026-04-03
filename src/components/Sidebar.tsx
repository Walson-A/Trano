import React from 'react';
import { Home, Map, Settings, User, Moon, Sun, Menu, LayoutGrid, Zap } from 'lucide-react';
import { cn } from '../utils';

interface SidebarProps {
  activeTab: 'dashboard' | 'floorplan' | 'rooms' | 'energy' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'floorplan' | 'rooms' | 'energy' | 'settings') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentUser: string;
  onUserClick: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isDarkMode, toggleDarkMode, currentUser, onUserClick }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    { id: 'floorplan', icon: Map, label: 'Plan' },
    { id: 'rooms', icon: LayoutGrid, label: 'Pièces' },
    { id: 'energy', icon: Zap, label: 'Énergie' },
    { id: 'settings', icon: Settings, label: 'Réglages' },
  ] as const;

  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-24 lg:w-64 h-screen bg-zinc-100 dark:bg-[#0a0a0a] border-r border-zinc-200 dark:border-white/5 transition-colors duration-300 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col items-center lg:items-start p-4 lg:p-6 flex-1 min-h-0">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mb-8 shadow-md shrink-0">
            <Home className="w-5 h-5 lg:w-6 lg:h-6 text-zinc-100 dark:text-zinc-900" />
          </div>
          
          <nav className="flex flex-col gap-2 lg:gap-4 w-full overflow-y-auto scrollbar-hide pb-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                  <span className="hidden lg:block font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 lg:p-6 flex flex-col gap-3 shrink-0">
          <button 
            onClick={toggleDarkMode}
            className="flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all"
          >
            {isDarkMode ? <Sun className="w-5 h-5 lg:w-6 lg:h-6" /> : <Moon className="w-5 h-5 lg:w-6 lg:h-6" />}
            <span className="hidden lg:block font-medium">{isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>
          
          <button 
            onClick={onUserClick}
            className="flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <span className="hidden lg:block font-medium truncate">{currentUser}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-zinc-100/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-zinc-200 dark:border-white/5 flex items-center justify-around px-6 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-all duration-200",
                isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive ? "opacity-100" : "opacity-70")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
