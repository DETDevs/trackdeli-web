import { useEffect, useRef, useState } from 'react';
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
  CreditCard,
  Plus,
  Paperclip,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { useBusinessDetail, useToggleBusiness } from '../hooks/useBusinesses';
import {
  useBusinessMemberships,
  MembershipItem,
} from '../hooks/useMemberships';
import { formatDateTime, formatDateShort } from '../utils/format';
import { RegisterMembershipModal } from '../components/modals/RegisterMembershipModal';
import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { ImageViewerModal } from '../components/modals/ImageViewerModal';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const BusinessDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: business, isLoading, isError } = useBusinessDetail(id!);
  const { data: memberships = [], isLoading: loadingMemberships } = useBusinessMemberships(id!);
  const toggleMutation = useToggleBusiness();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

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
        <svg width="16" height="16" viewBox="0 0 256 256" fill="white"><path d="M240,96h-8V48a16,16,0,0,0-16-16H40A16,16,0,0,0,24,48V96H16a8,8,0,0,0,0,16h8v96a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V112h8a8,8,0,0,0,0-16ZM40,48H216V96H40ZM216,208H40V112H216v96Zm-80-64a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16h24A8,8,0,0,1,136,144Z"/></svg>
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

  // Calculate membership status from memberships list or business
  const latestMembership: MembershipItem | undefined =
    memberships[0] || (business as any).latestMembership;

  const now = new Date();
  let isMembershipActive = false;
  let daysLeft = 0;

  if (latestMembership) {
    const end = new Date(latestMembership.endDate);
    const start = new Date(latestMembership.startDate);
    isMembershipActive =
      latestMembership.status === 'ACTIVE' && start <= now && end >= now;
    daysLeft = Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  const handleDeactivateConfirm = (bizId: string) => {
    toggleMutation.mutate(bizId, {
      onSuccess: () => {
        setIsDeactivateModalOpen(false);
      },
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'TRANSFERENCIA':
        return 'Transferencia bancaria';
      case 'EFECTIVO':
        return 'Efectivo';
      case 'PAYPAL':
        return 'PayPal';
      case 'BINANCE':
        return 'Binance';
      default:
        return 'Otro';
    }
  };

  return (
    <div>
      <TopBar
        title={business.name}
        subtitle={`ID: ${business.id}`}
        actions={
          business.isActive ? (
            <button
              onClick={() => setIsDeactivateModalOpen(true)}
              disabled={toggleMutation.isPending}
              className="h-9 px-4 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors shadow-xs"
            >
              Desactivar negocio
            </button>
          ) : (
            <button
              onClick={() => toggleMutation.mutate(business.id)}
              disabled={toggleMutation.isPending}
              className="h-9 px-4 rounded-xl text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 transition-colors shadow-xs"
            >
              Activar negocio
            </button>
          )
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

        {/* 2. SECCIÓN DE MEMBRESÍA ACTUAL */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Membresía
                </h3>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {latestMembership && isMembershipActive ? (
                  <Badge
                    variant={daysLeft <= 7 ? 'warning' : 'success'}
                    dot
                    size="md"
                  >
                    Activa hasta el {formatDateShort(latestMembership.endDate)} ({daysLeft} días restantes)
                  </Badge>
                ) : latestMembership ? (
                  <Badge variant="danger" dot size="md">
                    Membresía Vencida
                  </Badge>
                ) : (
                  <Badge variant="neutral" dot size="md">
                    Sin membresía registrada
                  </Badge>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs self-start sm:self-auto"
            >
              <Plus size={14} weight="bold" />
              <span>Registrar nuevo pago</span>
            </button>
          </div>

          {/* Info del Último Pago */}
          {latestMembership ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase">
                  Monto
                </span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  ${Number(latestMembership.amount).toFixed(2)} {latestMembership.currency}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase">
                  Método de pago
                </span>
                <p className="text-xs font-medium text-gray-800 mt-0.5">
                  {getPaymentMethodLabel(latestMembership.paymentMethod)}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase">
                  Fecha de pago
                </span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {formatDateShort(latestMembership.paidAt || latestMembership.createdAt)}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase">
                  Comprobante
                </span>
                <div className="mt-0.5">
                  {latestMembership.paymentProofUrl ? (
                    <button
                      onClick={() => setSelectedProofUrl(latestMembership.paymentProofUrl)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100/80 px-2.5 py-1 rounded-lg border border-brand-200/50 transition-colors"
                    >
                      <span>Ver foto</span>
                      <Paperclip size={13} />
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Sin comprobante digital</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              Este negocio aún no tiene pagos de membresía registrados. Toca en &quot;Registrar nuevo pago&quot; para activarla.
            </div>
          )}
        </div>

        {/* 3. HISTORIAL DE PAGOS DE MEMBRESÍA */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Historial de Membresías
            </h3>
            <span className="text-xs text-gray-400">
              {memberships.length} pagos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-medium bg-gray-50/50">
                  <th className="py-2.5 px-3">Período</th>
                  <th className="py-2.5 px-3">Monto</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3">Pago recibido</th>
                  <th className="py-2.5 px-3">Comprobante</th>
                  <th className="py-2.5 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {memberships.map((m) => {
                  const end = new Date(m.endDate);
                  const isCurrent =
                    m.status === 'ACTIVE' &&
                    new Date(m.startDate) <= now &&
                    end >= now;

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        {formatDateShort(m.startDate)} — {formatDateShort(m.endDate)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-900">
                        ${Number(m.amount).toFixed(2)} {m.currency}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {getPaymentMethodLabel(m.paymentMethod)}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {formatDateShort(m.paidAt || m.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        {m.paymentProofUrl ? (
                          <button
                            onClick={() => setSelectedProofUrl(m.paymentProofUrl)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
                          >
                            <span>Ver</span>
                            <Paperclip size={12} />
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge
                          variant={
                            isCurrent
                              ? 'success'
                              : m.status === 'EXPIRED'
                              ? 'neutral'
                              : m.status === 'CANCELLED'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {isCurrent ? 'Activa' : m.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {!loadingMemberships && memberships.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No hay historial de membresías registrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Grid Encargados y Repartidores */}
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

        {/* 5. Últimos 10 Pedidos */}
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

        {/* 6. Ubicación en el Mapa */}
        {business.latitude && business.longitude && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Ubicación del Negocio</h3>
            <div className="h-64 rounded-xl overflow-hidden border border-gray-100">
              <div ref={mapContainer} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RegisterMembershipModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
      />

      <DeactivateBusinessModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
        onConfirm={handleDeactivateConfirm}
        isLoading={toggleMutation.isPending}
      />

      <ImageViewerModal
        isOpen={!!selectedProofUrl}
        onClose={() => setSelectedProofUrl(null)}
        imageUrl={selectedProofUrl}
        title={`Comprobante de Pago — ${business.name}`}
      />
    </div>
  );
};
