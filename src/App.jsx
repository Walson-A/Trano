import React, { useEffect, useState } from 'react';
import useAppStore from './core/store/useAppStore';
import { useHA } from './context/HAContext';
import { Typography } from './ui/Typography/Typography';
import { Dock } from './ui/Dock/Dock';
import { Home, Settings, Bell, Wifi, BatteryFull, WifiOff } from 'lucide-react';
import { WeatherWidget } from './features/Weather/WeatherWidget';

// Pages
import { HomeView } from './pages/Home/HomeView';
import { RoomsView } from './pages/Rooms/RoomsView';
import { EnergyView } from './pages/Energy/EnergyView';
import { SettingsView } from './pages/Settings/SettingsView';

function App() {
  const { theme, toggleTheme, currentPage } = useAppStore();
  const { isConnected } = useHA();

  // Real-time clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const appStyle = {
    padding: 'clamp(1rem, 3vw, 2.5rem)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100vh',
    overflow: 'hidden',
    zIndex: 1,
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'home': return <HomeView />;
      case 'rooms': return <RoomsView />;
      case 'energy': return <EnergyView />;
      case 'settings': return <SettingsView />;
      default: return <HomeView />;
    }
  };

  const timeString = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const rawDate = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  const dateString = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <>
      {/* Premium Animated Mesh Gradient Background (Disabled in Light Mode via CSS var overrides if desired, but perfect for Dark Mode) */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 0, pointerEvents: 'none', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%', width: '70vw', height: '70vw',
          background: 'radial-gradient(circle, var(--gradient-glow-1) 0%, transparent 60%)',
          filter: 'blur(80px)', animation: 'mesh-movement-1 25s ease-in-out infinite alternate',
          opacity: theme === 'dark' ? 0.8 : 0.4
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%', width: '80vw', height: '80vw',
          background: 'radial-gradient(circle, var(--gradient-glow-2) 0%, transparent 60%)',
          filter: 'blur(100px)', animation: 'mesh-movement-2 30s ease-in-out infinite alternate-reverse',
          opacity: theme === 'dark' ? 0.6 : 0.3
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '40%', width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, var(--gradient-glow-3) 0%, transparent 50%)',
          filter: 'blur(90px)', animation: 'mesh-movement-3 35s ease-in-out infinite alternate',
          opacity: theme === 'dark' ? 0.5 : 0.2
        }} />
        {/* Subtle noise overlay for texture (Optional, adds premium grain) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          opacity: theme === 'dark' ? 0.04 : 0.02,
          mixBlendMode: 'overlay',
        }} />
      </div>
      
      <div style={appStyle}>
        {/* Topbar Recreated Pixel-Perfect from Mockup */}
        {/* Premium Floating Topbar */}
        <header style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto 1fr', /* Perfect 3-column symmetry */
          alignItems: 'center', 
          marginBottom: '2.5rem',
          padding: '10px 0',
          position: 'relative',
        }}>
          
          {/* Left Side: Weather */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Native Home Assistant Weather Widget */}
            <WeatherWidget entityId="weather.forecast_maison" />
          </div>

          {/* Center: Hero Clock Widget */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <div style={{ 
              fontSize: '4.5rem', /* Much larger for a hero effect */
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '200', /* Ultra light for premium feel */
              letterSpacing: '2px', 
              lineHeight: 1,
              color: 'var(--text-main)',
            }}>
              {timeString}
            </div>
            <div style={{ 
              fontSize: '1.2rem', /* Refined date size */
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '500', 
              color: 'var(--text-muted)', /* Muted white/grey as requested */
              marginTop: '12px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              opacity: 0.8
            }}>
              {dateString}
            </div>
          </div>

          {/* Right Side: Minimalist Icons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: '12px' 
          }}>
            {/* General Connection Indicator */}
            <div 
              title={isConnected ? 'Connecté à Home Assistant' : 'Déconnecté du réseau'}
              style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 8px',
              color: isConnected ? 'var(--text-muted)' : 'var(--color-error)',
            }}>
              {isConnected ? <Wifi size={24} strokeWidth={1.2} /> : <WifiOff size={24} strokeWidth={1.2} />}
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--text-muted)', opacity: 0.3, margin: '0 4px' }} />

            {/* Action Buttons in glass style */}
            {[
              { id: 'alerts', icon: <div style={{ position: 'relative' }}>
                <Bell size={24} strokeWidth={1.2} />
                <div style={{ position: 'absolute', top: '0', right: '2px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
              </div> },
              { id: 'settings', icon: <Settings size={24} strokeWidth={1.2} />, action: toggleTheme }
            ].map(btn => (
              <div 
                key={btn.id}
                onClick={btn.action}
                style={{ 
                  color: 'var(--text-main)', 
                  cursor: 'pointer', 
                  width: '48px', height: '48px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '14px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'var(--card-bg-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'var(--card-bg)';
                }}
              >
                {btn.icon}
              </div>
            ))}
          </div>
        </header>

        {/* View Content Area */}
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingBottom: '120px', /* Space for Dock */
          padding: '0 0.5rem'
        }}>
          {renderActivePage()}
        </main>

        <Dock />
      </div>
    </>
  );
}

export default App;
