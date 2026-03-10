import React, { useEffect } from 'react';
import useAppStore from './core/store/useAppStore';
import { Card } from './ui/Card/Card';
import { Typography } from './ui/Typography/Typography';
import { Button } from './ui/Button/Button';
import { useHA } from './context/HAContext';

function App() {
  const { theme, toggleTheme } = useAppStore();
  const { isConnected, error } = useHA();

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Background style to simulate a subtle gradient under the glassmorphism
  const appStyle = {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    position: 'relative',
    zIndex: 1,
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: '-20%', left: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, var(--accent-switch) 0%, transparent 60%)',
          opacity: 0.05,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div 
        style={{
          position: 'fixed',
          bottom: '-20%', right: '-10%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 60%)',
          opacity: 0.03,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      
      <div style={appStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography variant="title">Home Assistant</Typography>
            <Typography variant="subtitle" color="secondary">
              {isConnected ? 'Connecté' : error ? 'Erreur de connexion' : 'Connexion en cours...'}
            </Typography>
          </div>
          <Button onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
          </Button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <Card>
            <Typography variant="subtitle" weight="bold">Salon</Typography>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '1.5rem', display: 'block' }}>
              2 lumières allumées • 21.5°C
            </Typography>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button active>Allumer tout</Button>
              <Button>Éteindre</Button>
            </div>
          </Card>

          <Card active>
            <Typography variant="subtitle" weight="bold">Énergie & Solaire</Typography>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '1rem', display: 'block' }}>
              Recharge Batterie en cours
            </Typography>
            <Typography variant="title" style={{ color: 'var(--accent-energy)' }}>
              + 1.2 kW
            </Typography>
          </Card>

          <Card>
            <Typography variant="subtitle" weight="bold">Tesla Model 3</Typography>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '1.5rem', display: 'block' }}>
              Stationné • 85%
            </Typography>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button>Dégivrer</Button>
              <Button>Ouvrir le coffre</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default App;
