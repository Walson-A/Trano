import React from 'react';
import { Home, Map, Settings, LayoutGrid, Zap, ShoppingCart } from 'lucide-react';
import type { Profile } from '@trano/shared';
import type { Tab } from '../App';
import { cn } from '../utils';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  profile: Profile;
  /** Retour à l'écran de sélection de profil */
  onProfileClick: () => void;
}

export function Sidebar({ activeTab, setActiveTab, profile, onProfileClick }: SidebarProps) {
  // Destinations principales (au centre). Réglages est une utilité (en bas).
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    { id: 'floorplan', icon: Map, label: 'Plan' },
    { id: 'rooms', icon: LayoutGrid, label: 'Pièces' },
    { id: 'courses', icon: ShoppingCart, label: 'Courses' },
    { id: 'energy', icon: Zap, label: 'Énergie' },
  ] as const;

  const showSettings = !profile.isKid;

  const avatarBadge = (size: string) => (
    <div
      className={cn('rounded-full flex items-center justify-center shrink-0', size)}
      style={{ backgroundColor: `${profile.color}26`, border: `1.5px solid ${profile.color}` }}
    >
      {profile.avatar}
    </div>
  );

  const navButton = (item: { id: string; icon: React.ElementType; label: string }, isActive: boolean) => (
    <button
      key={item.id}
      onClick={() => setActiveTab(item.id as Tab)}
      className={cn(
        'flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition-all duration-200 group',
        isActive
          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
      )}
    >
      <item.icon className={cn('w-6 h-6', isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')} />
      <span className="hidden lg:block font-medium">{item.label}</span>
    </button>
  );

  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-24 lg:w-64 h-screen bg-zinc-100 dark:bg-[#0a0a0a] border-r border-zinc-200 dark:border-white/5 transition-colors duration-300 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col items-center lg:items-start p-4 lg:p-6 flex-1 min-h-0">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mb-8 shadow-md shrink-0">
            <Home className="w-5 h-5 lg:w-6 lg:h-6 text-zinc-100 dark:text-zinc-900" />
          </div>

          <nav className="flex flex-col gap-2 lg:gap-4 w-full overflow-y-auto scrollbar-hide pb-4">
            {navItems.map((item) => navButton(item, activeTab === item.id))}
          </nav>
        </div>

        <div className="p-4 lg:p-6 flex flex-col gap-2 shrink-0">
          {showSettings && navButton({ id: 'settings', icon: Settings, label: 'Réglages' }, activeTab === 'settings')}

          <button
            onClick={onProfileClick}
            title="Changer de profil"
            className="flex items-center justify-center lg:justify-start gap-4 p-3 mt-1 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
          >
            {avatarBadge('w-8 h-8 text-lg')}
            <span className="hidden lg:block font-medium truncate">{profile.name}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar (Réglages inclus ici puisqu'il n'y a pas de sidebar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-zinc-100/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-zinc-200 dark:border-white/5 flex items-center justify-around px-1 z-50">
        {[...navItems, ...(showSettings ? [{ id: 'settings', icon: Settings, label: 'Réglages' } as const] : [])].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 transition-all duration-200',
                isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'opacity-100' : 'opacity-70')} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <button onClick={onProfileClick} className="flex flex-col items-center gap-1 p-2" title="Profil">
          {avatarBadge('w-5 h-5 text-xs')}
          <span className="text-[9px] font-medium text-zinc-500 truncate max-w-12">{profile.name}</span>
        </button>
      </nav>
    </>
  );
}
