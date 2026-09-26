import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { WaiterLoginPage } from '../pages/WaiterLoginPage';
import { TablesPage } from '../pages/TablesPage';
import { OrderPage } from '../pages/OrderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useWaiterAuth } from '../store/authStore';

// Componente para resolver /mesas/:slug
const MesasSlugRedirect: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useWaiterAuth();

  if (session && session.slug === slug) {
    return <Navigate to={`/mesas/${slug}/tables`} replace />;
  }

  return <WaiterLoginPage />;
};

// Pantalla informativa si acceden a la raíz sin slug
const RootHome: React.FC = () => {
  const { session } = useWaiterAuth();

  if (session?.slug) {
    return <Navigate to={`/mesas/${session.slug}/tables`} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 text-2xl font-black shadow-sm">
        TD
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">TrackDeli Mesero</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Por favor escaneá el código QR provisto por tu negocio o ingresá con el enlace de tu restaurante (ej. /mesas/nombre-del-restaurante).
      </p>
    </div>
  );
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RootHome />} />
      <Route path="/mesas" element={<RootHome />} />
      
      {/* Rutas principales del flujo de mesero */}
      <Route path="/mesas/:slug" element={<MesasSlugRedirect />} />
      <Route path="/mesas/:slug/login" element={<WaiterLoginPage />} />
      <Route path="/mesas/:slug/tables" element={<TablesPage />} />
      <Route path="/mesas/:slug/tables/:tableId" element={<OrderPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
