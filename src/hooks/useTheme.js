import { useState, useEffect } from 'react';

// Hook pour gérer le thème (Dark/Light) en fonction de l'heure
export const useTheme = () => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      // Light mode de 7h à 19h par exemple, sinon Dark mode
      if (hour >= 7 && hour < 19) {
        setTheme('light');
      } else {
        setTheme('dark');
      }
    };

    checkTime();
    
    // Vérifier toutes les minutes pour changer automatiquement
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Applique une classe globale sur le body pour le css
    document.body.className = theme;
  }, [theme]);

  return theme;
};
