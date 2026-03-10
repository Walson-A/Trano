import { create } from 'zustand';

// Store global pour l'interface de l'application
const useAppStore = create((set) => ({
  theme: 'dark', // 'dark' ou 'light'
  currentPage: 'home', // 'home' ou l'ID d'une pièce ('salon', 'chambre')
  
  // Actions
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  navigateTo: (page) => set({ currentPage: page }),
}));

export default useAppStore;
