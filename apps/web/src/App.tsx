import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './views/Dashboard';
import { FloorPlan } from './views/FloorPlan';
import { Rooms } from './views/Rooms';
import { Energy } from './views/Energy';
import { Shopping } from './views/Shopping';
import { useHAAdapter } from './hooks/useHAAdapter';
import { useProfileStore, useActiveProfile } from './core/store/useProfileStore';
import { useShoppingStore } from './core/store/useShoppingStore';
import { ProfileGate } from './features/Profiles/ProfileGate';
import { connectTranoWs } from './lib/api';

export type Tab = 'dashboard' | 'floorplan' | 'rooms' | 'courses' | 'energy' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const { devices, toggleDevice } = useHAAdapter();
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
  const activeProfile = useActiveProfile();

  // Chargement initial + sync temps réel entre tous les écrans de la maison
  useEffect(() => {
    fetchProfiles();
    useShoppingStore.getState().fetchItems();
    const disconnect = connectTranoWs((topic) => {
      if (topic === 'profiles') fetchProfiles();
      if (topic === 'shopping') useShoppingStore.getState().fetchItems();
    });
    return disconnect;
  }, [fetchProfiles]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Pas de profil actif sur cet appareil → écran de sélection façon Netflix
  if (!activeProfile) {
    return <ProfileGate />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        profile={activeProfile}
        onProfileClick={() => setActiveProfile(null)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Topbar isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-12">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentUser={activeProfile}
              devices={devices}
              onToggleDevice={toggleDevice}
            />
          )}

          {activeTab === 'floorplan' && (
            <FloorPlan devices={devices} onToggleDevice={toggleDevice} />
          )}

          {activeTab === 'rooms' && (
            <Rooms devices={devices} onToggleDevice={toggleDevice} />
          )}

          {activeTab === 'courses' && <Shopping />}

          {activeTab === 'energy' && <Energy />}

          {activeTab === 'settings' && (
            <div className="flex-1 p-6 lg:p-12 flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold mb-4">Réglages</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
                La configuration de Home Assistant, de la Freebox et des
                intégrations arrivera ici prochainement.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
