const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

const dirs = [
  'apps/admin/src/router',
  'apps/admin/src/store',
  'apps/admin/src/pages',
  'apps/admin/src/layouts',
  'apps/admin/src/components',
  'apps/tracking/src/router',
  'apps/tracking/src/pages',
  'apps/tracking/src/components',
  'packages/ui/src',
  'packages/map/src/hooks',
  'packages/api-client/src/endpoints'
];

dirs.forEach(dir => {
  fs.mkdirSync(path.join(rootDir, dir), { recursive: true });
});

const write = (file, content) => {
  fs.writeFileSync(path.join(rootDir, file), content.trim() + '\n');
};

// Root files
write('package.json', `
{
  "name": "trackdeli-web",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:admin": "turbo run dev --filter=admin",
    "dev:tracking": "turbo run dev --filter=tracking",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
`);

write('turbo.json', `
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
`);

write('README.md', `
# trackdeli-web

Monorepo for real-time tracking SaaS for local delivery.

## Requirements
- Node 20+
- npm 10+

## Setup
1. \`npm install\` (installs all workspaces)
2. \`npm run dev\` (starts admin on :5173 and tracking on :5174)

Alternatively:
- \`npm run dev:admin\`
- \`npm run dev:tracking\`

## URLs
- Admin: http://localhost:5173
- Tracking: http://localhost:5174/abc123-token-ejemplo
`);

// Packages: ui
write('packages/ui/package.json', `
{
  "name": "ui",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0"
  }
}
`);
write('packages/ui/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
`);
write('packages/ui/src/index.ts', `
export * from './Button';
export * from './Badge';
export * from './Card';
export * from './Spinner';
export * from './StatusBadge';
`);
write('packages/ui/src/Button.tsx', `
export const Button = ({ children, variant = 'primary' }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'danger' }) => {
  return <button className={\`btn btn-\${variant}\`}>{children}</button>;
};
`);
write('packages/ui/src/Badge.tsx', `
export const Badge = ({ children }: { children: React.ReactNode }) => {
  return <span className="badge">{children}</span>;
};
`);
write('packages/ui/src/Card.tsx', `
export const Card = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-4 bg-surface rounded-lg shadow">{children}</div>;
};
`);
write('packages/ui/src/Spinner.tsx', `
export const Spinner = () => <div className="spinner">Loading...</div>;
`);
write('packages/ui/src/StatusBadge.tsx', `
export const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    PENDIENTE: 'bg-yellow-500',
    TOMADO: 'bg-blue-500',
    EN_CAMINO: 'bg-orange-500',
    CERCA_DEL_DESTINO: 'bg-purple-500',
    VERIFICANDO_ENTREGA: 'bg-indigo-500',
    ENTREGADO: 'bg-green-500',
    CANCELADO: 'bg-red-500',
    INCIDENCIA: 'bg-red-800'
  };
  return <span className={\`px-2 py-1 text-xs text-white rounded \${colors[status] || 'bg-gray-500'}\`}>{status}</span>;
};
`);

// Packages: map
write('packages/map/package.json', `
{
  "name": "map",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "react": "^18.3.1",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0"
  }
}
`);
write('packages/map/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
`);
write('packages/map/src/index.ts', `
export * from './MapView';
export * from './hooks/useTrackingSocket';
`);
write('packages/map/src/MapView.tsx', `
export const MapView = () => {
  return <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">Mapa en tiempo real — se integrará Mapbox aquí</div>;
};
`);
write('packages/map/src/hooks/useTrackingSocket.ts', `
export const useTrackingSocket = () => {
  // Placeholder hook for WebSocket
  return { isConnected: false, lastLocation: null };
};
`);

// Packages: api-client
write('packages/api-client/package.json', `
{
  "name": "api-client",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
`);
write('packages/api-client/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
`);
write('packages/api-client/src/index.ts', `
export * from './client';
export * from './endpoints/auth';
export * from './endpoints/orders';
export * from './endpoints/tracking';
export * from './endpoints/ratings';
`);
write('packages/api-client/src/client.ts', `
import axios from 'axios';
export const apiClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
});
`);
write('packages/api-client/src/endpoints/auth.ts', `
export const login = async () => ({ token: 'mock-token' });
export const refresh = async () => ({ token: 'mock-token-2' });
`);
write('packages/api-client/src/endpoints/orders.ts', `
export const getOrders = async () => [];
export const createOrder = async () => ({ id: 'new-order' });
export const updateStatus = async () => ({ success: true });
`);
write('packages/api-client/src/endpoints/tracking.ts', `
export const getTrackingData = async (token: string) => ({ status: 'PENDIENTE', eta: '10 min' });
`);
write('packages/api-client/src/endpoints/ratings.ts', `
export const submitRating = async () => ({ success: true });
`);

// Apps: admin
write('apps/admin/package.json', `
{
  "name": "admin",
  "private": true,
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc && vite build",
    "lint": "eslint src"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.56.0",
    "zustand": "^5.0.0",
    "axios": "^1.7.0",
    "socket.io-client": "^4.7.0",
    "ui": "*",
    "map": "*",
    "api-client": "*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
`);
write('apps/admin/vite.config.ts', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`);
write('apps/admin/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`);
write('apps/admin/tailwind.config.js', `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00C853',
        secondary: '#1A1A2E',
        accent: '#FF6B35',
        background: '#0F0F1A',
        surface: '#1E1E2E',
      }
    },
  },
  plugins: [],
}
`);
write('apps/admin/postcss.config.js', `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`);
write('apps/admin/.env.example', `
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
`);
write('apps/admin/index.html', `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Trackdeli Admin</title>
  </head>
  <body class="bg-background text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);
write('apps/admin/src/main.tsx', `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);
write('apps/admin/src/index.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;
`);
write('apps/admin/src/App.tsx', `
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import router from './router';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
`);
write('apps/admin/src/router/index.tsx', `
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OrdersPage } from '../pages/OrdersPage';
import { CreateOrderPage } from '../pages/CreateOrderPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { StaffPage } from '../pages/StaffPage';
import { ReportsPage } from '../pages/ReportsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      { path: '', element: <LoginPage /> }
    ]
  },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/new', element: <CreateOrderPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ]
  }
]);

export default router;
`);
write('apps/admin/src/store/auth.store.ts', `
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false, // Set to true for dev if needed
  setToken: (token) => set({ token, isAuthenticated: true }),
  logout: () => set({ token: null, isAuthenticated: false }),
}));
`);
write('apps/admin/src/layouts/AuthLayout.tsx', `
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Outlet />
    </div>
  );
};
`);
write('apps/admin/src/layouts/AppLayout.tsx', `
import { Outlet, Link } from 'react-router-dom';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-surface p-4 flex flex-col">
        <div className="text-xl font-bold mb-8 text-primary">Trackdeli Admin</div>
        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className="block p-2 hover:bg-secondary rounded">📦 Dashboard</Link>
          <Link to="/orders" className="block p-2 hover:bg-secondary rounded">📋 Pedidos</Link>
          <Link to="/orders/new" className="block p-2 hover:bg-secondary rounded">➕ Nuevo Pedido</Link>
          <Link to="/staff" className="block p-2 hover:bg-secondary rounded">👥 Repartidores</Link>
          <Link to="/reports" className="block p-2 hover:bg-secondary rounded">📊 Reportes</Link>
        </nav>
        <button className="p-2 text-left hover:bg-secondary rounded mt-auto text-red-500">Cerrar sesión</button>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="bg-surface p-4 flex justify-between items-center shadow">
          <div className="font-semibold">Mi Negocio</div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">A</div>
        </header>
        <div className="p-6 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
`);
write('apps/admin/src/components/ProtectedRoute.tsx', `
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  // Bypass for scaffolding, switch to check isAuthenticated later
  return <>{children}</>; 
};
`);
write('apps/admin/src/pages/LoginPage.tsx', `
export const LoginPage = () => {
  return (
    <div className="bg-surface p-8 rounded-lg w-96 shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Iniciar Sesión</h1>
      <p className="text-gray-400 mb-6">Ingresa al panel de administración.</p>
      <div className="space-y-4">
        <input type="email" placeholder="Email" className="w-full p-2 bg-secondary rounded border border-gray-700" />
        <input type="password" placeholder="Password" className="w-full p-2 bg-secondary rounded border border-gray-700" />
        <button className="w-full bg-primary text-white p-2 rounded hover:bg-green-600 transition">Ingresar</button>
      </div>
    </div>
  );
};
`);
write('apps/admin/src/pages/DashboardPage.tsx', `
import { MapView } from 'map';

export const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-400">Mapa en vivo y contadores de hoy.</p>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg">Pendientes: 10</div>
        <div className="bg-surface p-4 rounded-lg">En camino: 5</div>
        <div className="bg-surface p-4 rounded-lg">Entregados hoy: 45</div>
        <div className="bg-surface p-4 rounded-lg">Repartidores activos: 3</div>
      </div>
      <div className="h-96 bg-surface rounded-lg overflow-hidden">
        <MapView />
      </div>
    </div>
  );
};
`);
write('apps/admin/src/pages/OrdersPage.tsx', `
export const OrdersPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <p className="text-gray-400">Lista de pedidos del día.</p>
      <div className="bg-surface p-4 rounded-lg">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Cliente</th>
              <th className="p-2">Dirección</th>
              <th className="p-2">Repartidor</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Juan Pérez</td>
              <td className="p-2">Av Siempre Viva 123</td>
              <td className="p-2">Carlos R.</td>
              <td className="p-2">EN_CAMINO</td>
              <td className="p-2">12:30 PM</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
`);
write('apps/admin/src/pages/CreateOrderPage.tsx', `
export const CreateOrderPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Pedido</h1>
      <p className="text-gray-400">Crear un pedido para enviar a un cliente.</p>
      <div className="bg-surface p-6 rounded-lg max-w-2xl space-y-4">
        <input type="text" placeholder="Nombre cliente" className="w-full p-2 bg-secondary rounded" />
        <input type="text" placeholder="WhatsApp" className="w-full p-2 bg-secondary rounded" />
        <input type="text" placeholder="Dirección" className="w-full p-2 bg-secondary rounded" />
        <textarea placeholder="Descripción del pedido" className="w-full p-2 bg-secondary rounded h-24"></textarea>
        <select className="w-full p-2 bg-secondary rounded">
          <option>Estado de pago: Pagado</option>
          <option>Estado de pago: Contra entrega</option>
          <option>Estado de pago: Gratis</option>
        </select>
        <input type="number" placeholder="Monto de envío" className="w-full p-2 bg-secondary rounded" />
        <button className="bg-primary px-4 py-2 rounded text-white font-semibold hover:bg-green-600">Crear Pedido</button>
      </div>
    </div>
  );
};
`);
write('apps/admin/src/pages/OrderDetailPage.tsx', `
export const OrderDetailPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detalle del Pedido</h1>
      <p className="text-gray-400">Información completa y estado del envío.</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface p-4 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold">Datos</h2>
          <p>Cliente: María Gómez</p>
          <p>Dirección: Calle Falsa 123</p>
        </div>
        <div className="bg-surface p-4 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold">Timeline de estados</h2>
          <div className="pl-4 border-l-2 border-primary space-y-2">
            <p>12:00 PM - PENDIENTE</p>
            <p>12:15 PM - TOMADO</p>
            <p>12:30 PM - EN_CAMINO</p>
          </div>
        </div>
      </div>
      <div className="bg-surface p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Galería de fotos</h2>
        <div className="flex gap-4">
          <div className="w-32 h-32 bg-secondary flex items-center justify-center text-sm">Foto Paquete</div>
          <div className="w-32 h-32 bg-secondary flex items-center justify-center text-sm">Foto Domicilio</div>
        </div>
      </div>
    </div>
  );
};
`);
write('apps/admin/src/pages/StaffPage.tsx', `
export const StaffPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Repartidores</h1>
      <p className="text-gray-400">Gestión del equipo de entrega.</p>
      <div className="bg-surface p-4 rounded-lg">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Nombre</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Pedidos hoy</th>
              <th className="p-2">Calificación</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Carlos R.</td>
              <td className="p-2 text-green-400">Activo</td>
              <td className="p-2">12</td>
              <td className="p-2">4.8 ⭐</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
`);
write('apps/admin/src/pages/ReportsPage.tsx', `
export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>
      <p className="text-gray-400">Métricas de rendimiento.</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface p-6 rounded-lg text-center">
          <p className="text-sm text-gray-400">Entregas del día</p>
          <p className="text-3xl font-bold text-primary mt-2">145</p>
        </div>
        <div className="bg-surface p-6 rounded-lg text-center">
          <p className="text-sm text-gray-400">Tiempo promedio</p>
          <p className="text-3xl font-bold text-primary mt-2">24 min</p>
        </div>
        <div className="bg-surface p-6 rounded-lg text-center">
          <p className="text-sm text-gray-400">Calificación promedio</p>
          <p className="text-3xl font-bold text-primary mt-2">4.9 ⭐</p>
        </div>
      </div>
    </div>
  );
};
`);


// Apps: tracking
write('apps/tracking/package.json', `
{
  "name": "tracking",
  "private": true,
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc && vite build",
    "lint": "eslint src"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.56.0",
    "zustand": "^5.0.0",
    "socket.io-client": "^4.7.0",
    "ui": "*",
    "map": "*",
    "api-client": "*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
`);
write('apps/tracking/vite.config.ts', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`);
write('apps/tracking/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`);
write('apps/tracking/tailwind.config.js', `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00C853',
        secondary: '#1A1A2E',
        accent: '#FF6B35',
        background: '#0F0F1A',
        surface: '#1E1E2E',
      }
    },
  },
  plugins: [],
}
`);
write('apps/tracking/postcss.config.js', `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`);
write('apps/tracking/.env.example', `
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
`);
write('apps/tracking/index.html', `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Trackdeli</title>
  </head>
  <body class="bg-background text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);
write('apps/tracking/src/main.tsx', `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);
write('apps/tracking/src/index.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;
`);
write('apps/tracking/src/App.tsx', `
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import router from './router';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
`);
write('apps/tracking/src/router/index.tsx', `
import { createBrowserRouter } from 'react-router-dom';

import { TrackingPage } from '../pages/TrackingPage';
import { DeliveredPage } from '../pages/DeliveredPage';
import { ExpiredPage } from '../pages/ExpiredPage';

const router = createBrowserRouter([
  { path: '/expired', element: <ExpiredPage /> },
  { path: '/:token', element: <TrackingPage /> },
  { path: '/:token/delivered', element: <DeliveredPage /> },
]);

export default router;
`);
write('apps/tracking/src/pages/TrackingPage.tsx', `
import { MapView } from 'map';
import { OrderStatusTimeline } from '../components/OrderStatusTimeline';
import { OrderPhotos } from '../components/OrderPhotos';

export const TrackingPage = () => {
  return (
    <div className="flex flex-col h-screen bg-background text-white">
      <header className="p-4 flex items-center justify-between shadow-md bg-surface z-10">
        <div className="font-bold">Mi Negocio</div>
        <div className="text-sm bg-primary px-3 py-1 rounded-full text-white font-medium">Llega en ~10 min</div>
      </header>
      <div className="flex-1 relative">
        <MapView />
      </div>
      <div className="bg-surface rounded-t-2xl p-4 -mt-4 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
        <h2 className="text-lg font-bold mb-2">Tu pedido está en camino</h2>
        <OrderStatusTimeline />
        <div className="mt-4">
          <OrderPhotos />
        </div>
        <a href="tel:123456789" className="block w-full bg-secondary border border-gray-600 text-center py-3 rounded-lg mt-4 font-semibold">
          Llamar al repartidor
        </a>
      </div>
    </div>
  );
};
`);
write('apps/tracking/src/pages/DeliveredPage.tsx', `
import { RatingForm } from '../components/RatingForm';

export const DeliveredPage = () => {
  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pt-12">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-8">¡Tu pedido fue entregado!</h1>
      <div className="w-full max-w-md bg-surface p-6 rounded-xl space-y-6">
        <RatingForm />
        <button className="w-full bg-accent py-3 rounded-lg font-semibold" onClick={() => alert('Link propina')}>
          Dejar Propina ☕
        </button>
      </div>
    </div>
  );
};
`);
write('apps/tracking/src/pages/ExpiredPage.tsx', `
export const ExpiredPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <h1 className="text-xl font-bold mb-4">Trackdeli</h1>
      <p className="text-gray-400">Este link ya no está disponible o ha expirado.</p>
    </div>
  );
};
`);
write('apps/tracking/src/components/OrderStatusTimeline.tsx', `
export const OrderStatusTimeline = () => {
  return (
    <div className="pl-4 border-l-2 border-primary space-y-4 my-4">
      <div className="relative">
        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[22px] top-1"></div>
        <p className="font-semibold">PENDIENTE</p>
      </div>
      <div className="relative">
        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[22px] top-1"></div>
        <p className="font-semibold">EN_CAMINO</p>
      </div>
    </div>
  );
};
`);
write('apps/tracking/src/components/OrderPhotos.tsx', `
export const OrderPhotos = () => {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400">Fotos del pedido:</p>
      <div className="flex gap-2 overflow-x-auto">
        <div className="w-24 h-24 bg-secondary rounded flex-shrink-0 flex items-center justify-center text-xs">Foto 1</div>
        <div className="w-24 h-24 bg-secondary rounded flex-shrink-0 flex items-center justify-center text-xs">Foto 2</div>
      </div>
    </div>
  );
};
`);
write('apps/tracking/src/components/RatingForm.tsx', `
export const RatingForm = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-center font-semibold">¿Cómo estuvo la entrega?</h3>
      <div className="flex justify-center gap-2 text-3xl">
        <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
      </div>
      <textarea className="w-full bg-secondary p-3 rounded" placeholder="Deja un comentario..."></textarea>
      <button className="w-full bg-primary py-3 rounded-lg font-semibold">Enviar calificación</button>
    </div>
  );
};
`);
