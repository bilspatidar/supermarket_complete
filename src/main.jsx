
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { StoreSettingsProvider } from './context/StoreSettingsContext';

createRoot(document.getElementById('root')).render(
  <StoreSettingsProvider>
    <App />
  </StoreSettingsProvider>
);
