import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createBusinessMarker } from 'map';
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
  Gear,
  Coins,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  useBusinessDetail,
  useToggleBusiness,
  useUpdateBusiness,
  type BusinessType,
} from '../hooks/useBusinesses';
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
  const updateMutation = useUpdateBusiness();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Model Form State
  const [modelBusinessType, setModelBusinessType] = useState<BusinessType>('NEGOCIO');
  const [modelCommissionRate, setModelCommissionRate] = useState('15');
  const [modelAltCommissionRate, setModelAltCommissionRate] = useState('12');
  const [modelAltCommissionDistanceKm, setModelAltCommissionDistanceKm] = useState('40');
  const [modelDispatchTimeoutMin, setModelDispatchTimeoutMin] = useState('3');

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

    const el = createBusinessMarker({ name: business.name });

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
  };  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: business.id,
        data: {
          businessType: modelBusinessType,
          commissionRate: modelBusinessType === 'EMPRESA_RIDERS' ? Number(modelCommissionRate) / 100 : undefined,
          altCommissionRate: modelBusinessType === 'EMPRESA_RIDERS' ? Number(modelAltCommissionRate) / 100 : undefined,
          altCommissionDistanceKm: modelBusinessType === 'EMPRESA_RIDERS' ? Number(modelAltCommissionDistanceKm) : undefined,
          dispatchTimeoutMin: modelBusinessType === 'EMPRESA_RIDERS' ? Number(modelDispatchTimeoutMin) : undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditModelModalOpen(false);
        },
      }
    );
  };

  return (
    <div>
      <TopBar
        title={business.name}
        subtitle={`ID: ${business.id}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModelBusinessType(business.businessType || 'NEGOCIO');
                setModelCommissionRate(String(Math.round((business.commissionRate || 0.15) * 100)));
                setModelAltCommissionRate(String(Math.round((business.altCommissionRate || 0.12) * 100)));
                setModelAltCommissionDistanceKm(String(business.altCommissionDistanceKm || 40));
                setModelDispatchTimeoutMin(String(business.dispatchTimeoutMin || 3));
                setIsEditModelModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Gear size={15} />
              <span>Configurar Modelo</span>
            </button>

            {business.isActive ? (
              <button
                onClick={() => setIsDeactivateModalOpen(true)}
                disabled={toggleMutation.isPending}
                className="h-9 px-4 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors shadow-xs cursor-pointer"
              >
                Desactivar negocio
              </button>
            ) : (
              <button
                onClick={() => toggleMutation.mutate(business.id)}
                disabled={toggleMutation.isPending}
                className="h-9 px-4 rounded-xl text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 transition-colors shadow-xs cursor-pointer"
              >
                Activar negocio
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto">
        {/* Back Link & Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/businesses')}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver a Negocios</span>
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            {business.businessType === 'EMPRESA_RIDERS' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                <Motorcycle size={14} weight="bold" />
                <span>Empresa de Riders</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <Storefront size={14} />
                <span>Comercio Común</span>
              </span>
            )}
            <Badge variant={business.isActive ? 'success' : 'neutral'} dot>
              {business.isActive ? 'Negocio Activo' : 'Negocio Inactivo'}
            </Badge>
            <span className="text-xs text-gray-400">
              Registrado el {formatDateShort(business.createdAt)}
            </span>
          </div>
        </div>

        {/* 1. StatCards Fila Superior */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

        {/* 2. SECCIÓN PRINCIPAL: COMISIONES (si es EMPRESA_RIDERS) O MEMBRESÍA (si es NEGOCIO) */}
        {business.businessType === 'EMPRESA_RIDERS' ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <Coins size={20} className="text-amber-700" weight="duotone" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Comisiones y Liquidaciones
                  </h3>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    <Coins size={14} className="text-amber-700" />
                    <span>Modelo por Comisión (Liquidación mensual)</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setModelBusinessType(business.businessType || 'EMPRESA_RIDERS');
                  setModelCommissionRate(String(Math.round((business.commissionRate || 0.15) * 100)));
                  setModelAltCommissionRate(String(Math.round((business.altCommissionRate || 0.12) * 100)));
                  setModelAltCommissionDistanceKm(String(business.altCommissionDistanceKm || 40));
                  setModelDispatchTimeoutMin(String(business.dispatchTimeoutMin || 3));
                  setIsEditModelModalOpen(true);
                }}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <Gear size={14} />
                <span>Modificar Tasas de Comisión</span>
              </button>
            </div>

            {/* Resumen de Tasas Configuradas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-amber-50/40 p-4 rounded-xl border border-amber-100/80">
              <div>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  Comisión Base
                </span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {(Number(business.commissionRate || 0.15) * 100).toFixed(0)}%
                </p>
                <p className="text-[11px] text-gray-500">Por envío completado</p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  Distancia Larga
                </span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {(Number(business.altCommissionRate || 0.12) * 100).toFixed(0)}%
                </p>
                <p className="text-[11px] text-gray-500">Para &gt;{business.altCommissionDistanceKm || 40} km</p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  Timeout Despacho
                </span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {business.dispatchTimeoutMin || 3} min
                </p>
                <p className="text-[11px] text-gray-500">Por intento a rider</p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  Cobro a Empresa
                </span>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  Sin membresía fija
                </p>
                <p className="text-[11px] text-gray-500">Liquidación mensual</p>
              </div>
            </div>

            {/* Métricas Estimadas de Comisión */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-500 font-medium">Entregas Este Mes</span>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {business.monthlyMetrics.ordersDelivered}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-500 font-medium">Total Cobrado en Envíos</span>
                <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
                  C$ {business.recentOrders.reduce((acc, o) => acc + (o.status === 'ENTREGADO' ? Number(o.deliveryFee || 0) : 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
                <span className="text-xs text-amber-800 font-semibold">Comisión Debida a TrackDeli</span>
                <p className="text-2xl font-bold text-amber-900 mt-1 font-mono">
                  C$ {business.recentOrders.reduce((acc, o) => {
                    if (o.status !== 'ENTREGADO') return acc;
                    const rate = (business.commissionRate || 0.15);
                    return acc + (Number(o.deliveryFee || 0) * rate);
                  }, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 2. SECCIÓN DE MEMBRESÍA ACTUAL (Solo para NEGOCIO) */}
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
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100/80 px-2.5 py-1 rounded-lg border border-brand-200/50 transition-colors cursor-pointer"
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
                          <td className="py-3 px-3 text-gray-600">
                            {formatDateShort(m.paidAt || m.createdAt)}
                          </td>
                          <td className="py-3 px-3">
                            {m.paymentProofUrl ? (
                              <button
                                onClick={() => setSelectedProofUrl(m.paymentProofUrl)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200/50 transition-colors cursor-pointer"
                              >
                                <span>Ver foto</span>
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
                                  : m.status === 'ACTIVE'
                                  ? 'neutral'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {isCurrent
                                ? 'Vigente'
                                : m.status === 'ACTIVE'
                                ? 'Finalizada'
                                : 'Cancelada'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {!loadingMemberships && memberships.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400">
                          No hay historial de membresías registrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 4. Grid Encargados y Repartidores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

      {/* Modal Configurar Modelo de Negocio */}
      <Modal
        isOpen={isEditModelModalOpen}
        onClose={() => setIsEditModelModalOpen(false)}
        title="Configurar Modelo de Negocio"
        subtitle={`Define si ${business.name} opera como comercio común o empresa de riders`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveModel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Modelo de Negocio *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setModelBusinessType('NEGOCIO')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                  modelBusinessType === 'NEGOCIO'
                    ? 'border-gray-900 bg-gray-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-2 rounded-lg ${modelBusinessType === 'NEGOCIO' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Storefront size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">Negocio Común</p>
                    <p className="text-[10px] text-gray-500">Membresía fija mensual</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Restaurantes, farmacias o tiendas tradicionales que pagan suscripción mensual.
                </p>
              </div>

              <div
                onClick={() => setModelBusinessType('EMPRESA_RIDERS')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                  modelBusinessType === 'EMPRESA_RIDERS'
                    ? 'border-gray-900 bg-gray-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-2 rounded-lg ${modelBusinessType === 'EMPRESA_RIDERS' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Motorcycle size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">Empresa de Riders</p>
                    <p className="text-[10px] text-gray-500">Liquidación por Comisión</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Agencia de delivery que opera pedidos de clientes y liquida comisiones por carrera.
                </p>
              </div>
            </div>
          </div>

          {/* Configuración de Comisiones si es EMPRESA_RIDERS */}
          {modelBusinessType === 'EMPRESA_RIDERS' && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Coins size={15} className="text-amber-700" />
                <span>Configuración de Comisiones y Despacho</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Comisión Base (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={modelCommissionRate}
                    onChange={(e) => setModelCommissionRate(e.target.value)}
                    placeholder="15"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Por defecto: 15%</p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Comisión Distancia Larga (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={modelAltCommissionRate}
                    onChange={(e) => setModelAltCommissionRate(e.target.value)}
                    placeholder="12"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Para {modelAltCommissionDistanceKm || '40'} km o más</p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Umbral Distancia (km)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={modelAltCommissionDistanceKm}
                    onChange={(e) => setModelAltCommissionDistanceKm(e.target.value)}
                    placeholder="40"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Timeout Despacho (min)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={modelDispatchTimeoutMin}
                    onChange={(e) => setModelDispatchTimeoutMin(e.target.value)}
                    placeholder="3"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEditModelModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
