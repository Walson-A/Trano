import { create } from 'zustand';

interface AppState {
  theme: 'dark' | 'light';
  currentPage: 'dashboard' | 'floorplan' | 'rooms' | 'energy' | 'settings';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  navigateTo: (page: AppState['currentPage']) => void;
}

const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  currentPage: 'dashboard',
  
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  navigateTo: (page) => set({ currentPage: page }),
}));

export default useAppStore;
