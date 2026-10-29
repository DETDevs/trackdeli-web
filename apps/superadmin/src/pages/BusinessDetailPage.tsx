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
  Receipt,
  Wallet,
  CalendarBlank,
  Key,
  Lock,
  LockOpen,
  PencilSimple,
  Trash,
  Warning,
  Desktop,
  Info,
  Tag,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  useBusinessDetail,
  useToggleBusiness,
  useUpdateBusiness,
  useUpdateUserQuota,
  type BusinessType,
} from '../hooks/useBusinesses';
import {
  useBusinessMemberships,
  MembershipItem,
} from '../hooks/useMemberships';
import { formatDateTime, formatDateShort } from '../utils/format';
import {
  resolveBusinessBillingInfo,
  getMembershipPeriodDates,
} from '../utils/membershipDates';
import { RegisterMembershipModal } from '../components/modals/RegisterMembershipModal';
import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { ImageViewerModal } from '../components/modals/ImageViewerModal';
import { BusinessProductsSection } from '../components/business/BusinessProductsSection';
import { BusinessProductFieldsSection } from '../components/business/BusinessProductFieldsSection';
import { BusinessPosDevicesSection } from '../components/business/BusinessPosDevicesSection';
import { useBusinessProducts, type BusinessProductType } from '../hooks/useBusinessProducts';
import { useSuperAdminUsers } from '../hooks/useSuperAdminUsers';
import { type AdminUser } from 'api-client';
import { CreateSuperAdminUserModal } from '../components/modals/users/CreateSuperAdminUserModal';
import { UserPasswordModal } from '../components/modals/users/UserPasswordModal';
import { ChangeUserPasswordModal } from '../components/modals/users/ChangeUserPasswordModal';
import { DeactivateUserModal } from '../components/modals/users/DeactivateUserModal';
import { EditBusinessModal } from '../components/modals/EditBusinessModal';
import { DeleteBusinessModal } from '../components/modals/DeleteBusinessModal';
import toast from 'react-hot-toast';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const BusinessDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: business, isLoading, isError } = useBusinessDetail(id!);
  const { data: memberships = [], isLoading: loadingMemberships } = useBusinessMemberships(id!);
  const { data: productsData } = useBusinessProducts(id!);
  const toggleMutation = useToggleBusiness();
  const updateMutation = useUpdateBusiness();
  const updateQuotaMutation = useUpdateUserQuota();

  const [extraSlotsInput, setExtraSlotsInput] = useState<string>('');
  
  useEffect(() => {
    if (business?.userUsage) {
      setExtraSlotsInput(String(business.userUsage.extra));
    }
  }, [business?.userUsage?.extra]);

  const isDeliveryActive = productsData
    ? productsData.products.DELIVERY.status === 'ACTIVE'
    : (business?.hasTrackDeli ?? false);
  const isPosActive = productsData
    ? productsData.products.POS.status === 'ACTIVE'
    : (business?.hasPOS ?? false);
  const isCarteraActive = productsData
    ? productsData.products.CARTERA_COBRO?.status === 'ACTIVE'
    : ((business as any)?.hasCarteraCobro ?? false);
  const isCitasActive = productsData
    ? productsData.products.CITAS?.status === 'ACTIVE'
    : ((business as any)?.hasCitas ?? false);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerModalInitialProductType, setRegisterModalInitialProductType] =
    useState<BusinessProductType | undefined>(undefined);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const handleOpenRegisterPayment = (productType?: BusinessProductType) => {
    setRegisterModalInitialProductType(productType);
    setIsRegisterModalOpen(true);
  };

  const { data: businessUsers = [], isLoading: loadingBusinessUsers } = useSuperAdminUsers({
    businessId: id,
  });
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<AdminUser | null>(null);
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState<AdminUser | null>(null);
  const [deactivateTargetUser, setDeactivateTargetUser] = useState<AdminUser | null>(null);

  const activeEncargados = businessUsers.filter(
    (u) => u.role === 'ENCARGADO' && u.isActive
  );
  const isTargetOnlyActiveEncargado =
    deactivateTargetUser?.role === 'ENCARGADO' &&
    deactivateTargetUser?.isActive &&
    activeEncargados.length === 1 &&
    activeEncargados[0].id === deactivateTargetUser.id;

  const [modelBusinessType, setModelBusinessType] = useState<BusinessType>('NEGOCIO');
  const [modelCommissionRate, setModelCommissionRate] = useState('15');
  const [modelAltCommissionRate, setModelAltCommissionRate] = useState('12');
  const [modelAltCommissionDistanceKm, setModelAltCommissionDistanceKm] = useState('40');
  const [modelDispatchTimeoutMin, setModelDispatchTimeoutMin] = useState('3');

  const [isActivateBatchesModalOpen, setIsActivateBatchesModalOpen] = useState(false);
  const [isDeactivateBatchesModalOpen, setIsDeactivateBatchesModalOpen] = useState(false);
  const [deactivateBatchesError, setDeactivateBatchesError] = useState<string | null>(null);

  const handleConfirmActivateBatches = () => {
    if (!business) return;
    updateMutation.mutate(
      { id: business.id, data: { tracksBatches: true } },
      {
        onSuccess: () => {
          setIsActivateBatchesModalOpen(false);
          toast.success('Control de lotes activado');
        },
      }
    );
  };

  const handleDeactivateBatchesClick = () => {
    if (!business) return;
    updateMutation.mutate(
      { id: business.id, data: { tracksBatches: false } },
      {
        onSuccess: () => {
          toast.success('Control de lotes desactivado');
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message;
          const errorText = Array.isArray(msg) ? msg.join(', ') : msg;
          setDeactivateBatchesError(errorText || 'El negocio tiene lotes con existencias activas.');
          setIsDeactivateBatchesModalOpen(true);
        },
      }
    );
  };

  const handleConfirmDeactivateBatchesWithConfirm = () => {
    if (!business) return;
    updateMutation.mutate(
      { id: business.id, data: { tracksBatches: false, confirm: true } },
      {
        onSuccess: () => {
          setIsDeactivateBatchesModalOpen(false);
          setDeactivateBatchesError(null);
          toast.success('Control de lotes desactivado');
        },
      }
    );
  };

  const handleToggleUseListPrice = () => {
    if (!business) return;
    const nextVal = !business.useListPrice;
    updateMutation.mutate(
      { id: business.id, data: { useListPrice: nextVal } },
      {
        onSuccess: () => {
          toast.success(nextVal ? 'Precio de etiqueta activado' : 'Precio de etiqueta desactivado');
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message;
          toast.error(msg || 'Error al actualizar precio de etiqueta');
        },
      }
    );
  };

  const [isEditingTtl, setIsEditingTtl] = useState(false);
  const [ttlInput, setTtlInput] = useState<number>(4);

  useEffect(() => {
    if (business) {
      setTtlInput(business.twoStepTicketTtlHours || 4);
    }
  }, [business?.twoStepTicketTtlHours]);

  const handleToggleTwoStepSale = () => {
    if (!business) return;
    const nextVal = !business.twoStepSaleEnabled;
    updateMutation.mutate(
      {
        id: business.id,
        data: {
          twoStepSaleEnabled: nextVal,
          twoStepTicketTtlHours: business.twoStepTicketTtlHours || 4,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            nextVal ? 'Venta en dos pasos activada' : 'Venta en dos pasos desactivada'
          );
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message;
          toast.error(msg || 'Error al actualizar venta en dos pasos');
        },
      }
    );
  };

  const handleSaveTtl = () => {
    if (!business) return;
    const hours = Math.max(1, Math.min(72, Number(ttlInput) || 4));
    updateMutation.mutate(
      {
        id: business.id,
        data: {
          twoStepTicketTtlHours: hours,
        },
      },
      {
        onSuccess: () => {
          toast.success('Vencimiento del ticket actualizado');
          setIsEditingTtl(false);
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message;
          toast.error(msg || 'Error al actualizar vencimiento del ticket');
        },
      }
    );
  };

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

  const latestMembership: MembershipItem | undefined =
    memberships[0] || (business as any).latestMembership;

  const billingInfo = resolveBusinessBillingInfo(business, latestMembership, productsData);

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
      case 'ALTA_INICIAL':
        return 'Alta inicial';
      case 'AUTOMATICO':
        return 'Automático';
      default:
        return method ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() : 'Otro';
    }
  };

  const handleSaveModel = (e: React.FormEvent) => {
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
              onClick={() => setIsEditDataModalOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <PencilSimple size={15} />
              <span>Editar datos</span>
            </button>

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/businesses')}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver a Negocios</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {isDeliveryActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80">
                <Motorcycle size={13} weight="duotone" className="text-amber-700" />
                <span>{business.businessType === 'EMPRESA_RIDERS' ? 'Delivery (Riders)' : 'TrackDeli Delivery'}</span>
              </span>
            )}
            {isPosActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-900 border border-purple-200/80">
                <Receipt size={13} weight="duotone" className="text-purple-700" />
                <span>POS {productsData?.products?.POS?.posVertical === 'RETAIL' ? 'Retail' : 'Restaurante'}</span>
              </span>
            )}
            {isCarteraActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                <Wallet size={13} weight="duotone" className="text-emerald-700" />
                <span>Finanzas</span>
              </span>
            )}
            {isCitasActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-900 border border-sky-200/80">
                <CalendarBlank size={13} weight="duotone" className="text-sky-700" />
                <span>Citas</span>
              </span>
            )}
            {!isDeliveryActive && !isPosActive && !isCarteraActive && !isCitasActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                <span>Sin productos contratados</span>
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

        {isDeliveryActive ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Membresía"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${billingInfo.statusBadge.dotClass}`} />
                  <span>{billingInfo.statusBadge.text}</span>
                </span>
              }
              subtitle={
                billingInfo.hasMembership && billingInfo.dueDateFormatted !== '—'
                  ? `Vence el ${billingInfo.dueDateFormatted}${billingInfo.daysRemainingText ? ` · ${billingInfo.daysRemainingText}` : ''}`
                  : 'Sin membresía activa'
              }
              icon={<CreditCard size={18} />}
            />
            <StatCard
              title="Próximo Cobro"
              value={billingInfo.priceFormatted}
              subtitle={
                billingInfo.dueDateFormatted !== '—'
                  ? `Cobro el ${billingInfo.dueDateFormatted}`
                  : 'Sin fecha programada'
              }
              icon={<Coins size={18} />}
            />
            <StatCard
              title="Computadoras"
              value={`${business.activeDevices ?? 0} activa${(business.activeDevices ?? 0) === 1 ? '' : 's'} / ${business.maxDevices ?? 1} permitida${(business.maxDevices ?? 1) === 1 ? '' : 's'}`}
              subtitle="Dispositivos POS autorizados"
              icon={<Desktop size={18} />}
            />
            <StatCard
              title="Usuarios"
              value={`${business.userUsage?.used ?? businessUsers.filter((u) => u.isActive).length} de ${business.userUsage?.limit ?? (businessUsers.length || 5)} activos`}
              subtitle={`Cupo base: ${business.userUsage?.base ?? 5}${business.userUsage?.extra ? ` (+${business.userUsage.extra} extra)` : ''}`}
              icon={<Users size={18} />}
            />
          </div>
        )}

        <BusinessProductsSection
          businessId={business.id}
          businessName={business.name}
          businessType={business.businessType}
          businessCommissionRate={business.commissionRate}
          businessAltCommissionRate={business.altCommissionRate}
          businessAltCommissionDistanceKm={business.altCommissionDistanceKm}
          businessDispatchTimeoutMin={business.dispatchTimeoutMin}
          salonProfile={business.salonProfile}
          maxDevices={business.maxDevices}
          activeDevices={business.activeDevices}
          onRegisterPaymentClick={handleOpenRegisterPayment}
        />

        {(business.hasPOS || productsData?.products?.POS?.status === 'ACTIVE') && (
          <BusinessPosDevicesSection business={business} />
        )}

        <BusinessProductFieldsSection
          businessId={business.id}
          industryName={business.industry?.name}
          posVertical={productsData?.products?.POS?.posVertical || undefined}
        />

        {/* Sección: Control de lotes y vencimientos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0 mt-0.5">
                <Package size={22} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    Control de lotes y vencimientos
                  </h3>
                  {business.tracksBatches ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                  Agrega Lote y Fecha de Vencimiento a compras, ventas, alertas y a la plantilla Excel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {business.tracksBatches ? (
                <button
                  type="button"
                  onClick={handleDeactivateBatchesClick}
                  disabled={updateMutation.isPending}
                  className="h-9 px-4 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Desactivar control de lotes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsActivateBatchesModalOpen(true)}
                  disabled={updateMutation.isPending}
                  className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Activar control de lotes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sección: Usar precio de etiqueta */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                <Tag size={22} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    Usar precio de etiqueta
                  </h3>
                  {business.useListPrice ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                  Muestra precio de etiqueta y descuento en productos y comprobantes (farmacias)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleToggleUseListPrice}
                disabled={updateMutation.isPending}
                className={`h-9 px-4 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 ${
                  business.useListPrice
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {business.useListPrice ? 'Desactivar precio de etiqueta' : 'Activar precio de etiqueta'}
              </button>
            </div>
          </div>
        </div>

        {/* Sección: Venta en dos pasos (vendedor → caja) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <Receipt size={22} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    Venta en dos pasos (vendedor → caja)
                  </h3>
                  {business.twoStepSaleEnabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                  El vendedor arma la orden y la envía a caja; el cajero la cobra.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleToggleTwoStepSale}
                disabled={updateMutation.isPending}
                className={`h-9 px-4 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 ${
                  business.twoStepSaleEnabled
                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80'
                    : 'text-white bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {business.twoStepSaleEnabled
                  ? 'Desactivar venta en dos pasos'
                  : 'Activar venta en dos pasos'}
              </button>
            </div>
          </div>

          {business.twoStepSaleEnabled && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900">
                    Vencimiento del ticket
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Los tickets no cobrados se cancelan o vencen después de este tiempo.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditingTtl ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={72}
                        value={ttlInput}
                        onChange={(e) => setTtlInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 px-2.5 py-1 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-gray-600 font-medium">horas</span>
                      <button
                        type="button"
                        onClick={handleSaveTtl}
                        disabled={updateMutation.isPending}
                        className="px-2.5 py-1 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-black cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTtlInput(business.twoStepTicketTtlHours || 4);
                          setIsEditingTtl(false);
                        }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                        {business.twoStepTicketTtlHours || 4} horas
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingTtl(true)}
                        className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-2 cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Aviso de límite del plan y versión mínima */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-100/70 border border-amber-300/70 text-amber-950 text-xs">
                <Info size={18} className="text-amber-700 shrink-0 mt-0.5" weight="fill" />
                <div>
                  <p className="font-bold">Aviso del modo venta en dos pasos:</p>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    Las computadoras de vendedores cuentan en el límite del plan.
                    {business?.twoStepMinVersion
                      ? ` Requiere el POS de escritorio versión ${business.twoStepMinVersion} o superior.`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

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
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Membresía
                    </h3>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge variant={billingInfo.variant} dot size="md">
                      {billingInfo.label}
                    </Badge>
                    {billingInfo.status === 'EN_GRACIA' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                        {billingInfo.graceText}
                      </span>
                    )}
                    {billingInfo.daysRemainingText && billingInfo.status !== 'SIN_MEMBRESIA' && (
                      <span className="text-xs text-gray-500 font-medium">
                        ({billingInfo.daysRemainingText})
                      </span>
                    )}
                  </div>
                </div>

                <button
                  id="btn-register-membership-payment"
                  onClick={() => handleOpenRegisterPayment(undefined)}
                  className={`flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all shadow-xs self-start sm:self-auto cursor-pointer ${
                    billingInfo.isGraceOrExpired
                      ? 'bg-orange-600 hover:bg-orange-700 text-white ring-2 ring-orange-400 ring-offset-2 shadow-md'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  <Plus size={14} weight="bold" />
                  <span>Registrar nuevo pago</span>
                </button>
              </div>

              {/* Bloque principal de membresía: Vence / Período / Próximo cobro */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Vence
                    </span>
                    {billingInfo.daysRemainingText && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          billingInfo.status === 'EN_GRACIA'
                            ? 'bg-orange-100 text-orange-800'
                            : billingInfo.status === 'VENCIDO'
                            ? 'bg-red-100 text-red-800'
                            : billingInfo.status === 'POR_VENCER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {billingInfo.daysRemainingText}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {billingInfo.hasMembership ? billingInfo.dueDateFormatted : '—'}
                  </p>
                  {billingInfo.status === 'EN_GRACIA' ? (
                    <p className="text-xs font-semibold text-orange-700">
                      {billingInfo.graceText}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500">
                      Gracia de 3 días post-vencimiento
                    </p>
                  )}
                </div>

                <div className="space-y-1 md:border-l md:border-gray-200/80 md:pl-4">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Período
                  </span>
                  <p className="text-sm sm:text-base font-bold text-gray-900">
                    {billingInfo.hasMembership ? billingInfo.periodStr : '—'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Día de cobro: {billingInfo.anchorDay} de cada mes
                  </p>
                </div>

                <div className="space-y-1 md:border-l md:border-gray-200/80 md:pl-4">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Próximo cobro
                  </span>
                  <p className="text-base font-bold text-gray-900">
                    {billingInfo.hasMembership ? `${billingInfo.dueDateFormatted} · ${billingInfo.priceFormatted}` : '—'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Tarifa mensual según productos contratados
                  </p>
                </div>
              </div>

              {/* Texto de ayuda breve */}
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                <Info size={15} className="text-gray-400 shrink-0" />
                <span>La renovación solo se confirma al registrar el comprobante de pago.</span>
              </div>

              {latestMembership ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
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
                      Producto(s)
                    </span>
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {latestMembership.products && latestMembership.products.length > 0 ? (
                        latestMembership.products.map((p) => (
                          <span
                            key={p.id || p.businessProductSubscriptionId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900 text-white"
                          >
                            {p.productType === 'DELIVERY'
                              ? 'Delivery'
                              : p.productType === 'POS'
                              ? 'POS'
                              : p.productType === 'CARTERA_COBRO'
                              ? 'Finanzas'
                              : p.productType === 'CITAS'
                              ? 'Citas'
                              : p.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Sin especificar</span>
                      )}
                    </div>
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
                      <th className="py-2.5 px-3">Vence</th>
                      <th className="py-2.5 px-3">Producto(s)</th>
                      <th className="py-2.5 px-3">Monto</th>
                      <th className="py-2.5 px-3">Método</th>
                      <th className="py-2.5 px-3">Pago recibido</th>
                      <th className="py-2.5 px-3">Comprobante</th>
                      <th className="py-2.5 px-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {memberships.map((m) => {
                      const mPeriod = getMembershipPeriodDates(m, billingInfo.anchorDay);
                      const isCurrent =
                        m.status === 'ACTIVE' &&
                        billingInfo.hasMembership &&
                        billingInfo.dueDateFormatted === mPeriod.dueFormatted;

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                            {mPeriod.periodStr}
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700 whitespace-nowrap">
                            {mPeriod.dueFormatted}
                          </td>
                          <td className="py-3 px-3">
                            {m.products && m.products.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {m.products.map((p) => {
                                  if (p.productType === 'DELIVERY') {
                                    return (
                                      <span
                                        key={p.id || p.businessProductSubscriptionId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80"
                                      >
                                        <Motorcycle size={11} weight="duotone" className="text-amber-700" />
                                        <span>Delivery</span>
                                      </span>
                                    );
                                  }
                                  if (p.productType === 'POS') {
                                    return (
                                      <span
                                        key={p.id || p.businessProductSubscriptionId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-900 border border-purple-200/80"
                                      >
                                        <Receipt size={11} weight="duotone" className="text-purple-700" />
                                        <span>POS</span>
                                      </span>
                                    );
                                  }
                                  if (p.productType === 'CARTERA_COBRO') {
                                    return (
                                      <span
                                        key={p.id || p.businessProductSubscriptionId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80"
                                      >
                                        <Wallet size={11} weight="duotone" className="text-emerald-700" />
                                        <span>Finanzas</span>
                                      </span>
                                    );
                                  }
                                  if (p.productType === 'CITAS') {
                                    return (
                                      <span
                                        key={p.id || p.businessProductSubscriptionId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-900 border border-sky-200/80"
                                      >
                                        <CalendarBlank size={11} weight="duotone" className="text-sky-700" />
                                        <span>Citas</span>
                                      </span>
                                    );
                                  }
                                  return (
                                    <span
                                      key={p.id || p.businessProductSubscriptionId}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700"
                                    >
                                      {p.name}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500">
                                Sin especificar
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                            ${Number(m.amount).toFixed(2)} {m.currency}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {getPaymentMethodLabel(m.paymentMethod)}
                          </td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
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
                        <td colSpan={8} className="py-6 text-center text-gray-400">
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

        <div className={isDeliveryActive ? "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" : "space-y-6"}>
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Usuarios y cupo
                  </h3>
                </div>
                <button
                  id="btn-add-biz-user"
                  onClick={() => setIsAddUserModalOpen(true)}
                  disabled={business?.userUsage && business.userUsage.used >= business.userUsage.limit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title={business?.userUsage && business.userUsage.used >= business.userUsage.limit ? "Límite de usuarios alcanzado" : ""}
                >
                  <Plus size={14} weight="bold" />
                  <span>Agregar Usuario</span>
                </button>
              </div>

              {business?.userUsage && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${business.userUsage.used >= business.userUsage.limit ? 'text-red-600' : 'text-gray-800'}`}>
                          {business.userUsage.used} de {business.userUsage.limit} usuarios activos
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        El cupo base es de {business.userUsage.base} usuarios. Cada usuario extra se cobra aparte.
                      </p>
                      {business.userUsage.used >= business.userUsage.limit && (
                        <p className="text-[11px] text-red-600 mt-1 font-medium">
                          Este negocio supera su cupo. No se pueden crear más usuarios hasta ampliarlo.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 font-medium">Extras:</label>
                      <input 
                        type="number" 
                        min="0"
                        className="w-16 h-7 px-2 border border-gray-300 rounded text-xs focus:border-gray-900 focus:outline-none"
                        value={extraSlotsInput}
                        onChange={(e) => setExtraSlotsInput(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          const extra = parseInt(extraSlotsInput, 10);
                          if (!isNaN(extra) && extra >= 0) {
                            if (window.confirm(`¿Actualizar los cupos extra a ${extra}?`)) {
                              updateQuotaMutation.mutate({ id: business.id, extraUserSlots: extra });
                            }
                          }
                        }}
                        disabled={updateQuotaMutation.isPending || parseInt(extraSlotsInput, 10) === business.userUsage.extra}
                        className="text-[11px] px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 rounded font-medium transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {businessUsers.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{u.name}</p>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          u.role === 'ENCARGADO'
                            ? 'bg-green-50 text-green-700 border border-green-200/60'
                            : u.role === 'CAJERO'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : u.role === 'VENDEDOR'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role === 'ENCARGADO'
                          ? 'Encargado'
                          : u.role === 'CAJERO'
                          ? 'Cajero'
                          : u.role === 'VENDEDOR'
                          ? 'Vendedor'
                          : u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <EnvelopeSimple size={12} />
                        {u.email}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {u.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={u.isActive ? 'success' : 'neutral'} size="sm">
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>

                    <div className="flex items-center gap-1 ml-1 border-l border-gray-100 pl-2">
                      <button
                        onClick={() => setPasswordTargetUser(u)}
                        title="Cambiar contraseña"
                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Key size={15} />
                      </button>

                      <button
                        onClick={() => setDeactivateTargetUser(u)}
                        title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          u.isActive
                            ? 'text-gray-400 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-gray-400 hover:text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {u.isActive ? <Lock size={15} /> : <LockOpen size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!loadingBusinessUsers && businessUsers.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-gray-400">
                    No hay usuarios registrados para este negocio.
                  </p>
                  <button
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                  >
                    + Agregar el primer usuario
                  </button>
                </div>
              )}
            </div>
          </div>

          {isDeliveryActive && (
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
          )}
        </div>

        {isDeliveryActive && (
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
        )}

        {business.latitude && business.longitude && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Ubicación del Negocio</h3>
            <div className="h-64 rounded-xl overflow-hidden border border-gray-100">
              <div ref={mapContainer} className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Zona de peligro */}
        <div className="bg-red-50/40 rounded-xl border border-red-200/80 p-5 sm:p-6 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-900 font-semibold text-sm">
              <Warning size={18} weight="fill" className="text-red-600" />
              <span>Zona de peligro</span>
            </div>
            <p className="text-xs text-red-700/80">
              Eliminar este negocio borrará de forma permanente todos sus usuarios, ventas, productos y configuraciones asociadas.
            </p>
          </div>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash size={15} />
            <span>Eliminar negocio definitivamente</span>
          </button>
        </div>
      </div>

      <RegisterMembershipModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setRegisterModalInitialProductType(undefined);
        }}
        businessId={business.id}
        businessName={business.name}
        businessType={business.businessType}
        initialSelectedProductType={registerModalInitialProductType}
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

      <CreateSuperAdminUserModal
        isOpen={isAddUserModalOpen}
        presetBusinessId={business.id}
        presetBusinessName={business.name}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={(newUser, initialPass) => {
          setIsAddUserModalOpen(false);
          setCreatedUser(newUser);
          setCreatedUserPassword(initialPass);
        }}
      />

      <UserPasswordModal
        isOpen={Boolean(createdUser && createdUserPassword)}
        user={createdUser}
        password={createdUserPassword}
        onClose={() => {
          setCreatedUser(null);
          setCreatedUserPassword(null);
        }}
      />

      <ChangeUserPasswordModal
        isOpen={Boolean(passwordTargetUser)}
        user={passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
      />

      <DeactivateUserModal
        isOpen={Boolean(deactivateTargetUser)}
        user={deactivateTargetUser}
        isOnlyActiveEncargado={isTargetOnlyActiveEncargado}
        onClose={() => setDeactivateTargetUser(null)}
      />

      <EditBusinessModal
        isOpen={isEditDataModalOpen}
        onClose={() => setIsEditDataModalOpen(false)}
        business={business}
      />

      <DeleteBusinessModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
        onSuccess={() => navigate('/businesses')}
      />

      {/* Modal Confirmar Activación de Lotes */}
      {isActivateBatchesModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsActivateBatchesModalOpen(false)}
          title="Activar Control de Lotes y Vencimientos"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs text-purple-900 leading-relaxed">
              Agrega Lote y Fecha de Vencimiento a compras, ventas, alertas y a la plantilla Excel para este negocio.
            </div>
            <p className="text-xs text-gray-600">
              Los productos nuevos y las importaciones podrán registrar números de lote y fechas de vencimiento con rotación FEFO.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsActivateBatchesModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmActivateBatches}
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Activando...' : 'Confirmar y Activar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Confirmación de Desactivación con lotes con saldo */}
      {isDeactivateBatchesModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsDeactivateBatchesModalOpen(false);
            setDeactivateBatchesError(null);
          }}
          title="Confirmar Desactivación de Lotes"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <Warning size={20} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {deactivateBatchesError || 'El negocio tiene lotes con existencias activas.'}
                </p>
                <p className="text-amber-800">
                  Al desactivar el control de lotes, los productos dejarán de descontar existencias por lote y los vencimientos no se validarán en ventas ni compras.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              ¿Estás seguro de que deseas desactivar el control de lotes y vencimientos para <strong>{business.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeactivateBatchesModalOpen(false);
                  setDeactivateBatchesError(null);
                }}
                className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivateBatchesWithConfirm}
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Desactivando...' : 'Confirmar y Desactivar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
