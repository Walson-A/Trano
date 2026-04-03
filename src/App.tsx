/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './views/Dashboard';
import { FloorPlan } from './views/FloorPlan';
import { Rooms } from './views/Rooms';
import { Energy } from './views/Energy';
import { mockUsers } from './data';
import { useHAAdapter } from './hooks/useHAAdapter';
import { cn } from './utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'floorplan' | 'rooms' | 'energy' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Real Data from Home Assistant
  const { devices, toggleDevice } = useHAAdapter();
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const currentUser = mockUsers[currentUserIndex];

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const cycleUser = () => {
    setCurrentUserIndex((prev) => (prev + 1) % mockUsers.length);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-[#111111] transition-colors duration-300 font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        currentUser={currentUser.name}
        onUserClick={cycleUser}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Topbar isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-12">
          {activeTab === 'dashboard' && (
          <Dashboard 
            currentUser={currentUser} 
            devices={devices} 
            onToggleDevice={toggleDevice} 
          />
        )}
        
        {activeTab === 'floorplan' && (
          <FloorPlan 
            devices={devices} 
            onToggleDevice={toggleDevice} 
          />
        )}

        {activeTab === 'rooms' && (
          <Rooms 
            devices={devices} 
            onToggleDevice={toggleDevice} 
          />
        )}

        {activeTab === 'energy' && (
          <Energy />
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 p-6 lg:p-12 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-semibold mb-4">Réglages</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
              Ceci est une interface de démonstration. Dans un environnement de production, 
              cette section permettrait de configurer l'URL de Home Assistant, les tokens d'accès, 
              et de gérer les profils utilisateurs.
            </p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
