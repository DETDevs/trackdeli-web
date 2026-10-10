import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MagnifyingGlass,
  Storefront,
  ArrowRight,
  Motorcycle,
  Coins,
  Receipt,
  Wallet,
  CalendarBlank,
  Clock,
  Globe,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { BusinessCardMobile } from '../components/ui/BusinessCardMobile';
import {
  useBusinesses,
  useToggleBusiness,
  BusinessItem,
} from '../hooks/useBusinesses';

import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { BusinessCredentialsModal } from '../components/modals/BusinessCredentialsModal';
import { CreateBusinessWizardModal } from '../components/modals/CreateBusinessWizardModal';

export const BusinessesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: businesses = [], isLoading } = useBusinesses();
  const toggleMutation = useToggleBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const columns: Column<BusinessItem>[] = [
    {
      header: 'Negocio',
      accessor: (row) => {
        const isDeliveryActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'DELIVERY' && s.status === 'ACTIVE')
          : (row.hasTrackDeli ?? false);
        const isPosActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'POS' && s.status === 'ACTIVE')
          : (row.hasPOS ?? false);
        const isCarteraActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'CARTERA_COBRO' && s.status === 'ACTIVE')
          : (row.hasCarteraCobro ?? false);
        const isCitasActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'CITAS' && s.status === 'ACTIVE')
          : (row.hasCitas ?? false);
        const isRiders = row.businessType === 'EMPRESA_RIDERS';

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
              {isRiders ? (
                <Motorcycle size={18} className="text-amber-700" />
              ) : isPosActive && !isDeliveryActive ? (
                <Receipt size={18} className="text-purple-700" />
              ) : isCarteraActive && !isDeliveryActive && !isPosActive ? (
                <Wallet size={18} className="text-emerald-700" />
              ) : isCitasActive && !isDeliveryActive && !isPosActive ? (
                <CalendarBlank size={18} className="text-sky-700" />
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
                {row.industry && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
                    {row.industry.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 capitalize">
                {isRiders
                  ? 'Empresa de Riders'
                  : isPosActive && !isDeliveryActive
                  ? 'Comercio POS'
                  : 'Comercio'}
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
        const isDeliveryActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'DELIVERY' && s.status === 'ACTIVE')
          : (row.hasTrackDeli ?? false);
        const isPosActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'POS' && s.status === 'ACTIVE')
          : (row.hasPOS ?? false);
        const isCarteraActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'CARTERA_COBRO' && s.status === 'ACTIVE')
          : (row.hasCarteraCobro ?? false);
        const isCitasActive = row.productSubscriptions
          ? row.productSubscriptions.some((s) => s.productType === 'CITAS' && s.status === 'ACTIVE')
          : (row.hasCitas ?? false);

        if (!isDeliveryActive && !isPosActive && !isCarteraActive && !isCitasActive) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
              Sin productos activos
            </span>
          );
        }

        const badges: React.ReactNode[] = [];

        // 1. Badge Delivery
        if (isDeliveryActive) {
          if (row.businessType === 'EMPRESA_RIDERS') {
            const rate = row.commissionRate ? `${(row.commissionRate * 100).toFixed(0)}%` : '15%';
            badges.push(
              <span key="delivery" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                <Coins size={12} className="text-amber-700" />
                <span>{`Comisión (${rate})`}</span>
              </span>
            );
          } else {
            const mem = row.membership;
            if (mem && mem.status === 'ACTIVE') {
              const days = mem.daysLeft ?? 0;
              badges.push(
                <Badge key="delivery" variant={days <= 7 ? 'warning' : 'success'} dot size="sm">
                  {days <= 7 ? `Vence en ${days}d` : `Activa ${days}d`}
                </Badge>
              );
            } else if (mem?.status === 'EXPIRED') {
              badges.push(
                <Badge key="delivery" variant="danger" dot size="sm">
                  Vencida
                </Badge>
              );
            } else {
              badges.push(
                <span key="delivery" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                  <Motorcycle size={12} weight="duotone" className="text-amber-700" />
                  <span>Delivery</span>
                </span>
              );
            }
          }
        }

        // 2. Badge POS
        if (isPosActive) {
          const posSub = row.productSubscriptions?.find((s) => s.productType === 'POS');
          const isTaller = row.salonProfile === 'TALLER' || posSub?.salonProfile === 'TALLER';
          const vertical = isTaller ? 'Taller' : (posSub?.posVertical === 'RETAIL' ? 'Retail' : 'Rest.');
          badges.push(
            <span key="pos" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200/80">
              <Receipt size={12} className="text-purple-700" />
              <span>POS ({vertical})</span>
            </span>
          );

          // Insignia discreta "Prueba" (ámbar si en curso, gris si venció)
          const trialHoursVal = (posSub as any)?.trialHours ?? row.trialHours;
          const trialEndsAtVal = (posSub as any)?.trialEndsAt ?? row.trialEndsAt;
          if (trialHoursVal) {
            const isExpired = trialEndsAtVal && new Date(trialEndsAtVal).getTime() <= Date.now();
            badges.push(
              <span
                key="pos-trial"
                title={isExpired ? 'Prueba POS vencida' : 'Prueba POS activa/en curso'}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isExpired
                    ? 'bg-gray-100 text-gray-600 border border-gray-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/80'
                }`}
              >
                <Clock size={12} weight="bold" className={isExpired ? 'text-gray-500' : 'text-amber-600'} />
                <span>Prueba</span>
              </span>
            );
          }

          // Insignia discreta por nivel de acceso web (ticket 166b)
          const hasWebAdmin = (posSub as any)?.webAdminEnabled ?? (row as any)?.webAdminEnabled ?? true;
          const hasWebBilling = (posSub as any)?.webBillingEnabled ?? (row as any)?.webBillingEnabled ?? false;

          if (hasWebAdmin && hasWebBilling) {
            badges.push(
              <span
                key="pos-web-billing"
                title="Acceso web y facturación web habilitados"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100/90 text-purple-900 border border-purple-300"
              >
                <Globe size={12} weight="duotone" className="text-purple-700" />
                <span>Web + facturación</span>
              </span>
            );
          } else if (hasWebAdmin) {
            badges.push(
              <span
                key="pos-web-basic"
                title="Acceso web admin básico (reportes y consulta)"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/80"
              >
                <Globe size={12} className="text-blue-600" />
                <span>Web básico</span>
              </span>
            );
          }
        }

        // 3. Badge Cartera de Cobro
        if (isCarteraActive) {
          badges.push(
            <span key="cartera" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <Wallet size={12} className="text-emerald-700" />
              <span>Cartera</span>
            </span>
          );
        }

        // 4. Badge Citas
        if (isCitasActive) {
          badges.push(
            <span key="citas" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200/80">
              <CalendarBlank size={12} className="text-sky-700" />
              <span>Citas</span>
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {badges}
          </div>
        );
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

      <CreateBusinessWizardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(credentials) => {
          setIsModalOpen(false);
          setCreatedCredentials({
            businessName: credentials.businessName,
            email: credentials.email,
            password: credentials.password,
          });
          queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
          queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
        }}
      />

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
