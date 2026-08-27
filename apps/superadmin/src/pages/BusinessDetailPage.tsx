import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  ArrowLeft,
  Storefront,
  Users,
  Motorcycle,
  Package,
  Calendar,
  Phone,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { useBusinessDetail, useToggleBusiness } from '../hooks/useBusinesses';
import { formatDateTime, formatDateShort } from '../utils/format';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const BusinessDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: business, isLoading, isError } = useBusinessDetail(id!);
  const toggleMutation = useToggleBusiness();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !business?.latitude || !business?.longitude) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [business.longitude, business.latitude],
      zoom: 14,
    });

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="background: #0F0F0F; color: white; border-radius: 8px; padding: 6px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        🏢
      </div>
    `;

    new mapboxgl.Marker({ element: el })
      .setLngLat([business.longitude, business.latitude])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [business?.latitude, business?.longitude]);

  if (isLoading) {
    return (
      <div>
        <TopBar title="Detalle de Negocio" />
        <div className="p-8 max-w-6xl mx-auto flex items-center justify-center py-24 text-gray-400 text-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent mr-3" />
          <span>Cargando información del negocio...</span>
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div>
        <TopBar title="Detalle de Negocio" />
        <div className="p-8 max-w-6xl mx-auto space-y-4">
          <button
            onClick={() => navigate('/businesses')}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={14} />
            <span>Volver a Negocios</span>
          </button>
          <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            No se pudo encontrar la información del negocio solicitado.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title={business.name}
        subtitle={`ID: ${business.id}`}
        actions={
          <button
            onClick={() => toggleMutation.mutate(business.id)}
            disabled={toggleMutation.isPending}
            className={`h-9 px-4 rounded-xl text-xs font-medium transition-colors shadow-xs ${
              business.isActive
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
                : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200/60'
            }`}
          >
            {business.isActive ? 'Desactivar negocio' : 'Activar negocio'}
          </button>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Back Link & Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/businesses')}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            <span>Volver a Negocios</span>
          </button>

          <div className="flex items-center gap-3">
            <Badge variant={business.isActive ? 'success' : 'neutral'} dot>
              {business.isActive ? 'Negocio Activo' : 'Negocio Inactivo'}
            </Badge>
            <span className="text-xs text-gray-400">
              Registrado el {formatDateShort(business.createdAt)}
            </span>
          </div>
        </div>

        {/* 1. StatCards Fila Superior */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Pedidos Hoy"
            value={business.ordersToday}
            subtitle="Creados hoy por este negocio"
            icon={<Package size={18} />}
          />
          <StatCard
            title="Pedidos Este Mes"
            value={business.monthlyMetrics.ordersCreated}
            subtitle={`${business.monthlyMetrics.ordersDelivered} entregados (${business.monthlyMetrics.deliveryRate}%)`}
            icon={<Calendar size={18} />}
          />
          <StatCard
            title="Total Histórico"
            value={business._count?.orders ?? 0}
            subtitle={`${business.monthlyMetrics.ordersCancelled} cancelados este mes`}
            icon={<Storefront size={18} />}
          />
        </div>

        {/* 2. Grid Encargados y Repartidores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Encargados */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                Encargados ({business.encargados.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {business.encargados.map((enc) => (
                <div key={enc.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-gray-900">{enc.name}</p>
                    <div className="flex items-center gap-3 text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <EnvelopeSimple size={12} />
                        {enc.email}
                      </span>
                      {enc.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {enc.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={enc.isActive ? 'success' : 'neutral'} size="sm">
                    {enc.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              ))}
              {business.encargados.length === 0 && (
                <p className="py-6 text-center text-xs text-gray-400">
                  No hay encargados asociados registrados
                </p>
              )}
            </div>
          </div>

          {/* Repartidores que han trabajado con este negocio */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Motorcycle size={18} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                Repartidores Vinculados ({business.riders.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {business.riders.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-700">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {r.vehicleType || 'Repartidor'}{' '}
                        {r.vehiclePlate ? `· ${r.vehiclePlate}` : ''}
                      </p>
                    </div>
                  </div>
                  {r.phone && (
                    <span className="text-xs text-gray-500 font-mono">
                      {r.phone}
                    </span>
                  )}
                </div>
              ))}
              {business.riders.length === 0 && (
                <p className="py-6 text-center text-xs text-gray-400">
                  Aún ningún repartidor ha tomado pedidos de este negocio
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Últimos 10 Pedidos */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Últimos Pedidos</h3>
            <span className="text-xs text-gray-400">
              Mostrando los 10 más recientes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-medium">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Repartidor</th>
                  <th className="py-2.5 px-3">Monto</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {business.recentOrders.map((o) => {
                  const isDelivered = o.status === 'ENTREGADO';
                  const isCancelled = o.status === 'CANCELADO';
                  const isPending = o.status === 'PENDIENTE';

                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-gray-500">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-900">{o.customerName}</p>
                        <p className="text-[11px] text-gray-400">{o.customerPhone}</p>
                      </td>
                      <td className="py-3 px-3">
                        {o.deliveryUser?.name || <span className="text-gray-400">Sin asignar</span>}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-900">
                        C$ {Number(o.deliveryFee).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge
                          variant={
                            isDelivered
                              ? 'success'
                              : isCancelled
                              ? 'danger'
                              : isPending
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {business.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No hay pedidos registrados para este negocio
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Ubicación en el Mapa */}
        {business.latitude && business.longitude && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Ubicación del Negocio</h3>
            <div className="h-64 rounded-xl overflow-hidden border border-gray-100">
              <div ref={mapContainer} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
