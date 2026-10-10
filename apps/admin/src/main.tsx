import React from 'react';
import ReactDOM from 'react-dom/client';
import { setClientPlatformHeaderEnabled } from 'api-client';
import App from './App';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

// Activar cabecera X-Client-Platform exclusivamente para la app admin (Ticket 167b)
setClientPlatformHeaderEnabled(true);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
