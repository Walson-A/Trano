import React, { useState } from 'react';
import { useHA } from './context/HAContext';
import './App.css';

function App() {
  const { status, error, entities } = useHA();
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="app-container" style={{overflow: 'auto', padding: '20px', justifyContent: 'flex-start'}}>
      {status === 'connecting' && <div className="status">Connexion à Home Assistant...</div>}
      
      {status === 'error' && (
        <div className="error-box">
          <h2>Erreur de Connexion</h2>
          <p>{error}</p>
        </div>
      )}
      
      {status === 'connected' && (
        <div className="dashboard" style={{textAlign: 'left', width: '100%', maxWidth: '800px'}}>
          <h1>Analyse des Entités</h1>
          <p className="entity-count">{Object.keys(entities).length} entités trouvées.</p>
          
          <button 
            onClick={() => setShowJson(!showJson)}
            style={{padding: '10px 20px', cursor: 'pointer', margin: '20px 0', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px'}}
          >
            {showJson ? "Cacher les données brutes" : "Voir toutes les données brutes"}
          </button>

          {showJson && (
            <pre style={{
              background: '#1e293b', 
              padding: '20px', 
              borderRadius: '8px', 
              overflowX: 'auto',
              fontSize: '12px',
              color: '#a5b4fc',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              {JSON.stringify(entities, null, 2)}
            </pre>
          )}

          <div style={{marginTop: '30px'}}>
            <h2>Résumé rapide par type :</h2>
            <ul style={{listStyle: 'none', padding: 0}}>
              {Array.from(new Set(Object.keys(entities).map(id => id.split('.')[0]))).map(domain => {
                const count = Object.keys(entities).filter(id => id.startsWith(domain + '.')).length;
                return (
                  <li key={domain} style={{padding: '10px', background: 'rgba(255,255,255,0.05)', marginBottom: '5px', borderRadius: '5px'}}>
                    <strong>{domain}</strong> : {count} entité(s)
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
