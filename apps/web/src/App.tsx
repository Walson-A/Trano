import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './views/Dashboard';
import { FloorPlan } from './views/FloorPlan';
import { Rooms } from './views/Rooms';
import { Energy } from './views/Energy';
import { Shopping } from './views/Shopping';
import { Settings } from './views/Settings';
import { AssistantFab, AssistantPanel } from './features/Assistant/AssistantPanel';
import { IntercomModal } from './features/Intercom/IntercomModal';
import { IntercomOverlay } from './features/Intercom/IntercomOverlay';
import { DeviceControlSheet } from './features/Devices/DeviceControlSheet';
import type { WsIntercomMessage } from '@trano/shared';
import { useHAAdapter } from './hooks/useHAAdapter';
import { useProfileStore, useActiveProfile } from './core/store/useProfileStore';
import { useShoppingStore } from './core/store/useShoppingStore';
import { useRoomsStore } from './core/store/useRoomsStore';
import { ProfileGate } from './features/Profiles/ProfileGate';
import { DeviceSetup } from './features/Devices/DeviceSetup';
import { getDeviceId } from './lib/deviceInfo';
import { useDeviceHeartbeat } from './hooks/useDeviceHeartbeat';
import { connectTranoWs } from './lib/api';
import { useConfigStore } from './core/store/useConfigStore';

export type Tab = 'dashboard' | 'floorplan' | 'rooms' | 'courses' | 'energy' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [intercomOpen, setIntercomOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<WsIntercomMessage | null>(null);

  const { devices, allDevices, roomClimate, toggleDevice } = useHAAdapter();
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
  const activeProfile = useActiveProfile();
  // Un appareil inconnu se présente avant tout le reste : c'est ce qui relie
  // ensuite une personne à un téléphone, sans quoi l'interphone ne peut
  // désigner personne et « qui est là » n'a aucune source.
  const [deviceKnown, setDeviceKnown] = useState(() => Boolean(getDeviceId()));
  useDeviceHeartbeat();

  // Chargement initial + sync temps réel entre tous les écrans de la maison
  useEffect(() => {
    fetchProfiles();
    useShoppingStore.getState().fetchItems();
    useRoomsStore.getState().fetchRooms();
    useConfigStore.getState().fetchOverrides();

    const refetchAll = () => {
      fetchProfiles();
      useShoppingStore.getState().fetchItems();
      useRoomsStore.getState().fetchRooms();
      useConfigStore.getState().fetchOverrides();
    };

    const disconnect = connectTranoWs({
      onChanged: (topic) => {
        if (topic === 'profiles') fetchProfiles();
        if (topic === 'shopping') useShoppingStore.getState().fetchItems();
        if (topic === 'rooms') useRoomsStore.getState().fetchRooms();
        if (topic === 'device-overrides') useConfigStore.getState().fetchOverrides();
        // Arrivée ou départ : diffusé par le serveur au moment exact du
        // franchissement. La relecture périodique de PresenceRow reste, mais
        // comme filet pour le cas silencieux — un téléphone qui s'éteint
        // n'émet rien.
        if (topic === 'presence') window.dispatchEvent(new CustomEvent('trano:presence'));
      },
      onIntercom: (msg) => {
        const activeId = useProfileStore.getState().activeProfileId;
        // Message ciblé : seuls les écrans du destinataire sonnent
        if (msg.toProfileId && msg.toProfileId !== activeId) return;
        setIncomingCall(msg);
      },
      onReconnect: refetchAll,
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
  if (!deviceKnown) {
    return <DeviceSetup onDone={() => setDeviceKnown(true)} />;
  }

  if (!activeProfile) {
    return <ProfileGate />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-300 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={activeProfile}
        onProfileClick={() => setActiveProfile(null)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Topbar
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onOpenIntercom={() => setIntercomOpen(true)}
        />

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
              onOpenTab={setActiveTab}
              onOpenIntercom={() => setIntercomOpen(true)}
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

          {activeTab === 'settings' && activeProfile.kind !== 'house' && (
            <Settings devices={allDevices} />
          )}
        </div>
      </main>

      {/* Assistant à portée de main sur toutes les pages */}
      <AssistantFab onClick={() => setAssistantOpen(true)} />
      <AssistantPanel isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />

      {/* Interphone : envoi (modal) et réception (overlay plein écran) */}
      <IntercomModal isOpen={intercomOpen} onClose={() => setIntercomOpen(false)} />
      <IntercomOverlay message={incomingCall} onDismiss={() => setIncomingCall(null)} />

      {/* Fiche de contrôle détaillée (luminosité, couleur des lumières) */}
      <DeviceControlSheet />
    </div>
  );
}
