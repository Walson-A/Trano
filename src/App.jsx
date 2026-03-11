import React, { useEffect, useState } from 'react';
import useAppStore from './core/store/useAppStore';
import { useHA } from './context/HAContext';
import { Typography } from './ui/Typography/Typography';
import { Dock } from './ui/Dock/Dock';
import { Home, Settings, Bell, BatteryFull, Sun, Moon } from 'lucide-react';
import { WeatherWidget } from './features/Weather/WeatherWidget';
import { SystemStatus } from './features/System/SystemStatus';

// Pages
import { HomeView } from './pages/Home/HomeView';
import { RoomsView } from './pages/Rooms/RoomsView';
import { EnergyView } from './pages/Energy/EnergyView';
import { SettingsView } from './pages/Settings/SettingsView';

function App() {
  const { theme, toggleTheme, currentPage } = useAppStore();
  const { connection, status } = useHA();
  const isConnected = status === 'connected';

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
          gridTemplateColumns: 'auto 1fr auto', /* Reshaped symmetry */
          alignItems: 'center', 
          marginBottom: '2.5rem',
          padding: '10px 0',
          position: 'relative',
        }}>
          
          {/* Left Side: Clock & Date - Enlarged for Tablet */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <div style={{ 
              fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', 
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '700', 
              letterSpacing: '-1px', 
              color: 'var(--text-main)',
              lineHeight: 1
            }}>
              {timeString}
            </div>
            
            {/* Elegant Subtle Separator */}
            <div style={{ width: '1px', height: '1.2rem', backgroundColor: 'var(--text-muted)', opacity: 0.2, alignSelf: 'center', margin: '0 4px' }} />

            <div style={{ 
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', 
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '600', 
              color: 'var(--text-main)', 
              letterSpacing: '0.2px',
            }}>
              {dateString}
            </div>
          </div>


          {/* Center: Dynamic Context Area (Empty for now) */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {/* Future dynamic content (Now playing, door alerts, greetings...) */}
          </div>

          {/* Right Side: Weather, Status, Controls */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: '12px' 
          }}>
            
            {/* Weather Widget */}
            <WeatherWidget entityId="weather.forecast_maison" />
            
            {/* Separator */}
            <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--text-muted)', opacity: 0.2, margin: '0 8px' }} />

            {/* Connection Indicator: System Status Feature */}
            <SystemStatus />

            {/* Quick Actions: Naked Style, Enlarged for Tablet */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {[
                { id: 'theme', icon: theme === 'dark' ? <Sun size={24} strokeWidth={2} /> : <Moon size={24} strokeWidth={2} />, action: toggleTheme },
                { id: 'alerts', icon: <div style={{ position: 'relative' }}>
                  <Bell size={24} strokeWidth={2} />
                  <div style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
                </div> },
                { id: 'settings', icon: <Settings size={24} strokeWidth={2} />, action: () => console.log('Ouvrir les paramètres') }
              ].map(btn => (
                <button 
                  key={btn.id}
                  onClick={btn.action}
                  className="header-action-btn"
                  style={{ 
                    color: 'var(--text-main)',
                    background: 'transparent',
                    border: 'none',
                    width: '44px', height: '44px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
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
