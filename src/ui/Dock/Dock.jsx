import React from 'react';
import { Home, LayoutGrid, Zap, Settings } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '../../core/store/useAppStore';
import './Dock.css';

const TABS = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'rooms', label: 'Pièces', icon: LayoutGrid },
  { id: 'energy', label: 'Énergie', icon: Zap },
  { id: 'settings', label: 'Réglages', icon: Settings },
];

export const Dock = () => {
  const { currentPage, navigateTo } = useAppStore();

  return (
    <div className="tesla-dock-container">
      <div className="tesla-dock">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          
          return (
            <button
              key={tab.id}
              className={clsx('tesla-dock-item', isActive && 'active')}
              onClick={() => navigateTo(tab.id)}
              aria-label={tab.label}
            >
              <div className="tesla-dock-icon-wrapper">
                <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
