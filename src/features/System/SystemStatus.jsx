import React, { useEffect, useState, useRef } from 'react';
import { useHA } from '../../context/HAContext';
import { Wifi, WifiOff, Activity, Landmark, Cloud, RefreshCw } from 'lucide-react';
import './SystemStatus.css';

export function SystemStatus() {
  const { connection, status } = useHA();
  const isConnected = status === 'connected';
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [latency, setLatency] = useState(null);
  const containerRef = useRef(null);

  // Click-away logic
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSystemStatus(false);
      }
    }
    if (showSystemStatus) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSystemStatus]);

  // No need to fetch config, usage of connection.haVersion is sufficient

  // Calculate Ping/Latency
  useEffect(() => {
    if (!connection || status !== 'connected') {
      setLatency(null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const start = Date.now();
        await connection.ping();
        setLatency(Date.now() - start);
      } catch (e) {
        console.error("Ping error:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connection, status]);

  return (
    <div className="system-status-container" ref={containerRef}>
      {/* Connection Indicator Trigger */}
      <div 
        onClick={() => isConnected && setShowSystemStatus(!showSystemStatus)}
        className={`status-trigger ${isConnected ? 'connected' : 'disconnected'} ${showSystemStatus ? 'active' : ''}`}
      >
        {isConnected ? <Wifi size={20} strokeWidth={2.5} /> : <WifiOff size={20} strokeWidth={2.5} />}
        <span className="status-label">HA</span>

        {/* System Status Popover */}
        {showSystemStatus && isConnected && (
          <div className="status-popover" onClick={(e) => e.stopPropagation()}>
            <div className="popover-header">État du Système</div>

            <div className="stats-list">
              <div className="stat-item">
                <Activity size={18} className="stat-icon" strokeWidth={2.5} />
                <div className="stat-info">
                  <div className="stat-label">Latence</div>
                  <div className="stat-value">{latency !== null ? `${latency}ms` : '--'}</div>
                </div>
              </div>

              <div className="stat-item">
                <Landmark size={18} className="stat-icon" strokeWidth={2.2} />
                <div className="stat-info">
                  <div className="stat-label">Version HA</div>
                  <div className="stat-value">{connection?.haVersion || 'Chargement...'}</div>
                </div>
              </div>

              <div className="stat-item">
                <Cloud size={18} className="stat-icon" strokeWidth={2.2} />
                <div className="stat-info">
                  <div className="stat-label">Point d'accès</div>
                  <div className="stat-value truncated">
                    {connection?.options?.auth?.data?.hassUrl?.replace(/^https?:\/\//, '') || 'Local'}
                  </div>
                </div>
              </div>
            </div>

            <div className="popover-divider" />

            <button 
              onClick={() => window.location.reload()}
              className="reconnect-button"
            >
              <RefreshCw size={14} strokeWidth={2.5} />
              Forcer la Reconnexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
