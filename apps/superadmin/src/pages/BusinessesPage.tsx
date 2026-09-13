import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MagnifyingGlass,
  Storefront,
  ArrowRight,
  ShieldCheck,
  Motorcycle,
  Coins,
  Receipt,
  ForkKnife,
  ShoppingBag,
  Check,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/apiClient';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { BusinessCardMobile } from '../components/ui/BusinessCardMobile';
import {
  useBusinesses,
  useToggleBusiness,
  useCreateBusiness,
  BusinessItem,
  CreateBusinessResult,
  type BusinessType,
} from '../hooks/useBusinesses';
import { type PosVertical } from '../hooks/useBusinessProducts';
import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { BusinessCredentialsModal } from '../components/modals/BusinessCredentialsModal';

export const BusinessesPage = () => {
  const navigate = useNavigate();
  const { data: businesses = [], isLoading } = useBusinesses();
  const toggleMutation = useToggleBusiness();
  const createMutation = useCreateBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  const [hasDelivery, setHasDelivery] = useState(true);
  const [hasPOS, setHasPOS] = useState(false);

  const [businessType, setBusinessType] = useState<BusinessType>('NEGOCIO');
  const [commissionRate, setCommissionRate] = useState('15');
  const [altCommissionRate, setAltCommissionRate] = useState('12');
  const [altCommissionDistanceKm, setAltCommissionDistanceKm] = useState('40');
  const [dispatchTimeoutMin, setDispatchTimeoutMin] = useState('3');

  const [posVertical, setPosVertical] = useState<PosVertical>('RESTAURANTE');
  const [posMonthlyFee, setPosMonthlyFee] = useState('');

  const [encargadoName, setEncargadoName] = useState('');
  const [encargadoEmail, setEncargadoEmail] = useState('');
  const [encargadoPassword, setEncargadoPassword] = useState('');

  const [createdCredentials, setCreatedCredentials] = useState<{
    businessName: string;
    email: string;
    password?: string;
  } | null>(null);

  const [deactivatingBusiness, setDeactivatingBusiness] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.type && b.type.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return b.isActive;
    if (statusFilter === 'INACTIVE') return !b.isActive;
    return true;
  });

  const handleToggleClick = (e: React.MouseEvent, row: BusinessItem) => {
    e.stopPropagation();
    if (row.isActive) {
      setDeactivatingBusiness({ id: row.id, name: row.name });
    } else {
      toggleMutation.mutate(row.id);
    }
  };

  const handleDeactivateConfirm = (id: string) => {
    toggleMutation.mutate(id, {
      onSuccess: () => {
        setDeactivatingBusiness(null);
      },
    });
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !encargadoName || !encargadoEmail || !encargadoPassword) return;

    if (!hasDelivery && !hasPOS) {
      toast.error('Debes seleccionar al menos un producto contratado (Delivery o POS)');
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        type: type.trim() || undefined,
        businessType: hasDelivery ? businessType : 'NEGOCIO',
        commissionRate:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(commissionRate) / 100 || 0.15
            : undefined,
        altCommissionRate:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(altCommissionRate) / 100 || 0.12
            : undefined,
        altCommissionDistanceKm:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(altCommissionDistanceKm) || 40
            : undefined,
        dispatchTimeoutMin:
          hasDelivery && businessType === 'EMPRESA_RIDERS'
            ? Number(dispatchTimeoutMin) || 3
            : undefined,
        encargado: {
          name: encargadoName.trim(),
          email: encargadoEmail.trim(),
          password: encargadoPassword,
        },
      },
      {
        onSuccess: async (data: CreateBusinessResult) => {
          const bizId = data.business.id;

          try {
            if (hasDelivery) {
              await apiClient.post(`/businesses/${bizId}/products/DELIVERY/activate`, {
                commissionRate:
                  businessType === 'EMPRESA_RIDERS'
                    ? Number(commissionRate) / 100 || 0.15
                    : 0.15,
                altCommissionRate:
                  businessType === 'EMPRESA_RIDERS'
                    ? Number(altCommissionRate) / 100 || 0.12
                    : 0.12,
                altCommissionDistanceKm:
                  businessType === 'EMPRESA_RIDERS'
                    ? Number(altCommissionDistanceKm) || 40
                    : 40,
                dispatchTimeoutMin:
                  businessType === 'EMPRESA_RIDERS'
                    ? Number(dispatchTimeoutMin) || 3
                    : 3,
                reason: 'Activación inicial al crear negocio',
              });
            }

            if (hasPOS) {
              await apiClient.post(`/businesses/${bizId}/products/POS/activate`, {
                posVertical,
                posMonthlyFee: posMonthlyFee ? Number(posMonthlyFee) : undefined,
                reason: 'Activación inicial al crear negocio',
              });
            }
          } catch (activateErr) {
            console.error('Error al activar productos tras crear negocio:', activateErr);
          }

          setIsModalOpen(false);
          setName('');
          setType('');
          setHasDelivery(true);
          setHasPOS(false);
          setBusinessType('NEGOCIO');
          setCommissionRate('15');
          setAltCommissionRate('12');
          setAltCommissionDistanceKm('40');
          setDispatchTimeoutMin('3');
          setPosVertical('RESTAURANTE');
          setPosMonthlyFee('');
          setEncargadoName('');
          setEncargadoEmail('');
          setEncargadoPassword('');

          setCreatedCredentials({
            businessName: data.business.name,
            email: data.encargado.email,
            password: data.encargado.temporaryPassword,
          });
        },
      }
    );
  };

  const columns: Column<BusinessItem>[] = [
    {
      header: 'Negocio',
      accessor: (row) => {
        const deliverySub = row.productSubscriptions?.find((s) => s.productType === 'DELIVERY');
        const posSub = row.productSubscriptions?.find((s) => s.productType === 'POS');
        const hasDelivery = deliverySub ? deliverySub.status === 'ACTIVE' : (row.hasTrackDeli ?? true);
        const hasPos = posSub ? posSub.status === 'ACTIVE' : (row.hasPOS ?? false);
        const isRiders = row.businessType === 'EMPRESA_RIDERS';

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
              {isRiders ? (
                <Motorcycle size={18} className="text-amber-700" />
              ) : !hasDelivery && hasPos ? (
                <Receipt size={18} className="text-purple-700" />
              ) : (
                <Storefront size={18} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 leading-tight">{row.name}</p>
                {isRiders && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                    Riders
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 capitalize">
                {isRiders
                  ? row.type || 'Empresa de Riders'
                  : !hasDelivery && hasPos
                  ? row.type || 'Comercio POS'
                  : row.type || 'Comercio'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Pedidos Hoy',
      accessor: (row) => (
        <span className="font-medium text-gray-900">{row.ordersToday}</span>
      ),
    },
    {
      header: 'Este Mes',
      accessor: (row) => (
        <span className="text-gray-600">{row.ordersThisMonth}</span>
      ),
    },
    {
      header: 'Total Histórico',
      accessor: (row) => (
        <span className="font-medium text-gray-900">{row._count?.orders ?? 0}</span>
      ),
    },
    {
      header: 'Membresía / Modelo',
      accessor: (row) => {
        const deliverySub = row.productSubscriptions?.find((s) => s.productType === 'DELIVERY');
        const posSub = row.productSubscriptions?.find((s) => s.productType === 'POS');

        const hasDelivery = deliverySub ? deliverySub.status === 'ACTIVE' : (row.hasTrackDeli ?? true);
        const hasPos = posSub ? posSub.status === 'ACTIVE' : (row.hasPOS ?? false);

        if (!hasDelivery && !hasPos) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
              Sin productos activos
            </span>
          );
        }

        const renderDeliveryBadge = (compact = false) => {
          if (row.businessType === 'EMPRESA_RIDERS') {
            const rate = row.commissionRate ? `${(row.commissionRate * 100).toFixed(0)}%` : '15%';
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                <Coins size={12} className="text-amber-700" />
                <span>{compact ? rate : `Comisión (${rate})`}</span>
              </span>
            );
          }

          const mem = row.membership;
          if (mem && mem.status === 'ACTIVE') {
            const days = mem.daysLeft ?? 0;
            if (days <= 7) {
              return (
                <Badge variant="warning" dot size="sm">
                  {compact ? `${days}d` : `Vence en ${days}d`}
                </Badge>
              );
            }
            return (
              <Badge variant="success" dot size="sm">
                {compact ? `${days}d` : `Activa ${days}d`}
              </Badge>
            );
          }
          if (!mem || mem.status === 'NOT_CONTRACTED' || mem.status === 'NONE') {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                {compact ? 'Delivery' : 'Sin membresía'}
              </span>
            );
          }
          return (
            <Badge variant="danger" dot size="sm">
              Vencida
            </Badge>
          );
        };

        const renderPosBadge = (compact = false) => {
          const vertical = posSub?.posVertical || 'RESTAURANTE';
          const label = vertical === 'RETAIL' ? 'Retail' : 'Rest.';
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200/80">
              <Receipt size={12} className="text-purple-700" />
              <span>{compact ? 'POS' : `Solo POS (${label})`}</span>
            </span>
          );
        };

        if (hasDelivery && hasPos) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {renderDeliveryBadge(true)}
              {renderPosBadge(true)}
            </div>
          );
        }

        if (!hasDelivery && hasPos) {
          return renderPosBadge(false);
        }

        return renderDeliveryBadge(false);
      },
    },
    {
      header: 'Estado',
      accessor: (row) => (
        <button
          onClick={(e) => handleToggleClick(e, row)}
          disabled={toggleMutation.isPending}
          className="group flex items-center gap-2 text-xs font-medium cursor-pointer"
        >
          <Badge variant={row.isActive ? 'success' : 'neutral'} dot size="sm">
            {row.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </button>
      ),
    },
    {
      header: 'Acción',
      className: 'text-right',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/businesses/${row.id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 transition-colors"
        >
          <span>Ver</span>
          <ArrowRight size={12} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <TopBar
        title="Gestión de Negocios"
        subtitle={`Total de ${businesses.length} negocios registrados`}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs"
          >
            <Plus size={14} weight="bold" />
            <span>Nuevo negocio</span>
          </button>
        }
      />

      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar negocio por nombre o tipo..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs self-stretch sm:self-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-center shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todos ({businesses.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-center shrink-0 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Activos ({businesses.filter((b) => b.isActive).length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-center shrink-0 ${
                statusFilter === 'INACTIVE'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Inactivos ({businesses.filter((b) => !b.isActive).length})
            </button>
          </div>
        </div>

        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={filteredBusinesses}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => navigate(`/businesses/${row.id}`)}
            pageSize={10}
            isLoading={isLoading}
            emptyMessage="No se encontraron negocios con los filtros aplicados"
          />
        </div>

        <div className="md:hidden space-y-2.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse h-28" />
            ))
          ) : filteredBusinesses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-xs text-gray-400">
              No se encontraron negocios con los filtros aplicados
            </div>
          ) : (
            filteredBusinesses.map((biz) => (
              <BusinessCardMobile
                key={biz.id}
                business={biz}
                onToggle={handleToggleClick}
              />
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Negocio"
        subtitle="Registra la empresa y su usuario encargado inicial"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateBusiness} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre del negocio *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Pollos El Buen Sabor"
                required
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Categoría descriptiva (opcional)
              </label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Ej: Restaurante, cafetería, tienda de conveniencia..."
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Productos Contratados *
              </label>
              <span className="text-[10px] text-gray-400">Selecciona al menos uno</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setHasDelivery(!hasDelivery)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between ${
                  hasDelivery
                    ? 'border-gray-900 bg-gray-50/80 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      hasDelivery ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Motorcycle size={17} weight="duotone" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900 leading-tight">
                      TrackDeli (Delivery)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Despacho y pedidos a domicilio
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                    hasDelivery
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {hasDelivery && <Check size={12} weight="bold" />}
                </div>
              </div>

              <div
                onClick={() => setHasPOS(!hasPOS)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between ${
                  hasPOS
                    ? 'border-gray-900 bg-gray-50/80 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      hasPOS ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Receipt size={17} weight="duotone" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900 leading-tight">
                      Sistema POS
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Punto de venta, mesas y caja
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                    hasPOS
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {hasPOS && <Check size={12} weight="bold" />}
                </div>
              </div>
            </div>

            {!hasDelivery && !hasPOS && (
              <p className="text-[11px] text-red-600 font-medium mt-2">
                Debes seleccionar al menos un producto contratado para continuar.
              </p>
            )}
          </div>

          {hasDelivery && (
            <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <Motorcycle size={16} className="text-amber-700" />
                <span>Configuración de TrackDeli (Delivery)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Modelo de Delivery *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setBusinessType('NEGOCIO')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      businessType === 'NEGOCIO'
                        ? 'border-gray-900 bg-white shadow-2xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Storefront size={15} />
                      <span className="font-semibold text-xs text-gray-900">Comercio Común</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Membresía mensual tradicional</p>
                  </div>

                  <div
                    onClick={() => setBusinessType('EMPRESA_RIDERS')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      businessType === 'EMPRESA_RIDERS'
                        ? 'border-gray-900 bg-white shadow-2xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Motorcycle size={15} />
                      <span className="font-semibold text-xs text-gray-900">Empresa de Riders</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Comisión liquidada por carrera</p>
                  </div>
                </div>
              </div>

              {businessType === 'EMPRESA_RIDERS' && (
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-amber-200/50">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-1">
                      Comisión Base (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="15"
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-1">
                      Distancia Larga (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={altCommissionRate}
                      onChange={(e) => setAltCommissionRate(e.target.value)}
                      placeholder="12"
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-1">
                      Umbral Distancia (km)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={altCommissionDistanceKm}
                      onChange={(e) => setAltCommissionDistanceKm(e.target.value)}
                      placeholder="40"
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-1">
                      Timeout Despacho (min)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="60"
                      value={dispatchTimeoutMin}
                      onChange={(e) => setDispatchTimeoutMin(e.target.value)}
                      placeholder="3"
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {hasPOS && (
            <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-200/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                <Receipt size={16} className="text-purple-700" />
                <span>Configuración de Sistema POS</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Vertical de Punto de Venta *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setPosVertical('RESTAURANTE')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      posVertical === 'RESTAURANTE'
                        ? 'border-gray-900 bg-white shadow-2xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ForkKnife size={15} />
                      <span className="font-semibold text-xs text-gray-900">Restaurante</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Comandas, mesas y cocina</p>
                  </div>

                  <div
                    onClick={() => setPosVertical('RETAIL')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      posVertical === 'RETAIL'
                        ? 'border-gray-900 bg-white shadow-2xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingBag size={15} />
                      <span className="font-semibold text-xs text-gray-900">Retail / Comercio</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Venta rápida y control de stock</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-1">
                  Tarifa Mensual POS en USD (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={posMonthlyFee}
                    onChange={(e) => setPosMonthlyFee(e.target.value)}
                    placeholder="25.00"
                    className="w-full h-8 pl-6 pr-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 mb-3">
              <ShieldCheck size={16} className="text-brand-600" />
              <span>Primer Encargado del Negocio</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre del encargado *
                </label>
                <input
                  type="text"
                  value={encargadoName}
                  onChange={(e) => setEncargadoName(e.target.value)}
                  placeholder="Ej: Carlos López"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email del encargado *
                </label>
                <input
                  type="email"
                  value={encargadoEmail}
                  onChange={(e) => setEncargadoEmail(e.target.value)}
                  placeholder="carlos@demo.com"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contraseña temporal *
                </label>
                <input
                  type="password"
                  value={encargadoPassword}
                  onChange={(e) => setEncargadoPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  El usuario podrá ingresar tanto al panel web como al POS con estas credenciales.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={(!hasDelivery && !hasPOS) || createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Negocio'}
            </button>
          </div>
        </form>
      </Modal>

      {createdCredentials && (
        <BusinessCredentialsModal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          businessName={createdCredentials.businessName}
          email={createdCredentials.email}
          password={createdCredentials.password}
        />
      )}

      {deactivatingBusiness && (
        <DeactivateBusinessModal
          isOpen={!!deactivatingBusiness}
          onClose={() => setDeactivatingBusiness(null)}
          businessId={deactivatingBusiness.id}
          businessName={deactivatingBusiness.name}
          onConfirm={handleDeactivateConfirm}
          isLoading={toggleMutation.isPending}
        />
      )}
    </div>
  );
};
