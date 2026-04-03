import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HAProvider } from './context/HAContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HAProvider>
      <App />
    </HAProvider>
  </StrictMode>,
);
