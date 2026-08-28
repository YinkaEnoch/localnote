import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';
import { App } from './App';
import './theme/globals.css';

if (Capacitor.getPlatform() === 'web') {
  jeepSqlite(window);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
