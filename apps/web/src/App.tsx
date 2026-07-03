import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './views/Dashboard';
import { FloorPlan } from './views/FloorPlan';
import { Rooms } from './views/Rooms';
import { Energy } from './views/Energy';
import { Shopping } from './views/Shopping';
import { Settings } from './views/Settings';
import { Assistant } from './views/Assistant';
import { useHAAdapter } from './hooks/useHAAdapter';
import { useProfileStore, useActiveProfile } from './core/store/useProfileStore';
import { useShoppingStore } from './core/store/useShoppingStore';
import { ProfileGate } from './features/Profiles/ProfileGate';
import { connectTranoWs } from './lib/api';

export type Tab = 'dashboard' | 'floorplan' | 'rooms' | 'courses' | 'energy' | 'assistant' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);

  const { devices, allDevices, roomClimate, toggleDevice } = useHAAdapter();
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
              roomClimate={roomClimate}
              onToggleDevice={toggleDevice}
              onOpenRoom={(roomId) => {
                setTargetRoom(roomId);
                setActiveTab('rooms');
              }}
            />
          )}

          {activeTab === 'floorplan' && (
            <FloorPlan devices={devices} onToggleDevice={toggleDevice} />
          )}

          {activeTab === 'rooms' && (
            <Rooms
              devices={devices}
              roomClimate={roomClimate}
              initialRoom={targetRoom}
              onInitialRoomConsumed={() => setTargetRoom(null)}
              onToggleDevice={toggleDevice}
            />
          )}

          {activeTab === 'courses' && <Shopping />}

          {activeTab === 'energy' && <Energy />}

          {activeTab === 'assistant' && <Assistant />}

          {activeTab === 'settings' && !activeProfile.isKid && (
            <Settings devices={allDevices} />
          )}
        </div>
      </main>
    </div>
  );
}
