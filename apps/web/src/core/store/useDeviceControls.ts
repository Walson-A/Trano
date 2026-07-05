import { create } from 'zustand';

/**
 * Quel appareil affiche sa fiche de contrôle détaillée (luminosité, couleur…).
 * Store léger pour éviter de faire descendre un callback à travers toutes les vues.
 */
interface DeviceControlsState {
  openId: string | null;
  open: (entityId: string) => void;
  close: () => void;
}

export const useDeviceControls = create<DeviceControlsState>((set) => ({
  openId: null,
  open: (entityId) => set({ openId: entityId }),
  close: () => set({ openId: null }),
}));

// Accès debug depuis la console en dev (ouvrir une fiche sans passer par l'UI)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__deviceControls = useDeviceControls;
}
