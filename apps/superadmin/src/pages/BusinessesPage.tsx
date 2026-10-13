import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MagnifyingGlass,
  ArrowRight,
  CreditCard,
  DotsThreeVertical,
  Trash,
  Desktop,
  Users,
  Clock,
  ArrowsDownUp,
  CaretUp,
  CaretDown,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { BusinessCardMobile } from '../components/ui/BusinessCardMobile';
import {
  useBusinessesEnriched,
  useToggleBusiness,
  BusinessItem,
} from '../hooks/useBusinesses';

import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { BusinessCredentialsModal } from '../components/modals/BusinessCredentialsModal';
import { CreateBusinessWizardModal } from '../components/modals/CreateBusinessWizardModal';
import { DeleteBusinessModal } from '../components/modals/DeleteBusinessModal';
import { RegisterMembershipModal } from '../components/modals/RegisterMembershipModal';
import { formatDueText, getMembershipPillInfo, formatDateClean } from '../utils/membershipDates';
import { formatRelativeTime } from '../utils/format';

type TabStatus = 'all' | 'por_vencer' | 'en_gracia' | 'vencido' | 'prueba' | 'inactivo';

export const BusinessesPage = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'monthly_amount' | 'last_sale_at'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: response, isLoading } = useBusinessesEnriched({
    status: activeTab,
    search: searchTerm.trim() ? searchTerm.trim() : undefined,
    sortBy,
    order: sortOrder,
  });

  const businesses = response?.data || [];
  const counters = response?.counters || {
    all: 0,
    activo: 0,
    por_vencer: 0,
    en_gracia: 0,
    vencido: 0,
    prueba: 0,
    inactivo: 0,
  };

  const toggleMutation = useToggleBusiness();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; name: string } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [createdCredentials, setCreatedCredentials] = useState<{
    businessName: string;
    email: string;
    password?: string;
  } | null>(null);

  const [deactivatingBusiness, setDeactivatingBusiness] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [deletingBusiness, setDeletingBusiness] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleToggleClick = (row: BusinessItem) => {
    if (row.isActive) {
      setDeactivatingBusiness({ id: row.id, name: row.name });
    } else {
      toggleMutation.mutate(row.id);
    }
  };

  const handleSort = (field: 'due_date' | 'monthly_amount' | 'last_sale_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // default: due_date asc (urgent first), amounts desc (highest first), last activity desc (most recent first)
      setSortOrder(field === 'due_date' ? 'asc' : 'desc');
    }
  };

  const renderSortIndicator = (field: 'due_date' | 'monthly_amount' | 'last_sale_at') => {
    if (sortBy !== field) {
      return <ArrowsDownUp size={13} className="text-gray-400 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <CaretUp size={13} className="text-gray-900 font-bold" />
    ) : (
      <CaretDown size={13} className="text-gray-900 font-bold" />
    );
  };

  const columns: Column<BusinessItem>[] = [
    {
      header: 'Negocio',
      accessor: (row) => {
        const typeLabel =
          row.businessType === 'EMPRESA_RIDERS'
            ? 'Riders'
            : row.posVertical
            ? row.posVertical.toLowerCase()
            : row.type || 'Comercio';

        return (
          <div className="flex items-center gap-2.5 max-w-[260px]">
            <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200/60 flex items-center justify-center font-bold text-gray-700 text-xs shrink-0 overflow-hidden">
              {row.logoUrl ? (
                <img src={row.logoUrl} alt={row.name} className="w-full h-full object-cover" />
              ) : (
                row.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-gray-900 truncate text-xs sm:text-sm">
                {row.name}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200/60 shrink-0 capitalize">
                {typeLabel}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: (
        <button
          type="button"
          onClick={() => handleSort('due_date')}
          className="flex items-center gap-1 hover:text-gray-900 font-medium cursor-pointer"
        >
          <span>Membresía</span>
          {renderSortIndicator('due_date')}
        </button>
      ),
      accessor: (row) => {
        const pill = getMembershipPillInfo(row.membership_status, row.is_trial, row.isActive);
        const dueText = formatDueText(row.due_date, row.days_until_due);

        return (
          <div className="space-y-0.5">
            <Badge variant={pill.variant} dot size="sm">
              {pill.label}
            </Badge>
            <p className="text-[11px] text-gray-500 font-medium">
              {dueText}
            </p>
          </div>
        );
      },
    },
    {
      header: (
        <button
          type="button"
          onClick={() => handleSort('monthly_amount')}
          className="flex items-center gap-1 hover:text-gray-900 font-medium cursor-pointer"
        >
          <span>Monto mensual</span>
          {renderSortIndicator('monthly_amount')}
        </button>
      ),
      accessor: (row) => (
        <span className="font-bold text-xs sm:text-sm text-gray-900">
          ${Number(row.monthly_amount ?? 0).toFixed(2)}
          <span className="text-[10px] font-normal text-gray-500"> / mes</span>
        </span>
      ),
    },
    {
      header: 'Productos',
      accessor: (row) => {
        const productsList = row.products && row.products.length > 0
          ? row.products
          : (row.productSubscriptions || []).map((s) => ({
              id: s.id || s.productType,
              type: s.productType,
              status: s.status,
              name: s.productType,
              fee: 0,
            }));

        return (
          <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
            {productsList.map((p) => {
              const isPos = p.type === 'POS';
              const isDel = p.type === 'DELIVERY';
              const isCar = p.type === 'CARTERA_COBRO';
              const isCit = p.type === 'CITAS';

              return (
                <span
                  key={p.id}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                    isPos
                      ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                      : isDel
                      ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                      : isCar
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      : isCit
                      ? 'bg-sky-50 text-sky-700 border-sky-200/60'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {p.name || p.type}
                </span>
              );
            })}

            {row.is_trial && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                Prueba
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Uso',
      accessor: (row) => (
        <div className="space-y-0.5 text-[11px] text-gray-600 font-medium">
          <div className="flex items-center gap-1.5" title="Equipos activos / permitidos">
            <Desktop size={13} className="text-gray-400" />
            <span>
              {row.devices?.active ?? 0}/{row.devices?.allowed ?? '∞'} eq.
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="Usuarios activos / límite">
            <Users size={13} className="text-gray-400" />
            <span>
              {row.users?.active ?? 0}/{row.users?.limit ?? 6} usr.
            </span>
          </div>
        </div>
      ),
    },
    {
      header: (
        <button
          type="button"
          onClick={() => handleSort('last_sale_at')}
          className="flex items-center gap-1 hover:text-gray-900 font-medium cursor-pointer"
        >
          <span>Última actividad</span>
          {renderSortIndicator('last_sale_at')}
        </button>
      ),
      accessor: (row) => {
        const lastSignal = row.last_sale_at || row.last_seen_at;
        const text = lastSignal ? formatRelativeTime(lastSignal) : 'Sin actividad';

        return (
          <div
            className="flex items-center gap-1 text-xs text-gray-600"
            title={lastSignal ? `Fecha exacta: ${formatDateClean(lastSignal)}` : 'Sin actividad registrada'}
          >
            <Clock size={13} className="text-gray-400 shrink-0" />
            <span className="truncate">{text}</span>
          </div>
        );
      },
    },
    {
      header: 'Acción',
      className: 'text-right',
      accessor: (row) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPaymentTarget({ id: row.id, name: row.name })}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 shadow-2xs transition-colors cursor-pointer"
          >
            <CreditCard size={13} />
            <span>Registrar pago</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/businesses/${row.id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 transition-colors cursor-pointer"
          >
            <span>Ver</span>
            <ArrowRight size={12} />
          </button>

          {/* Menú de tres puntos */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpenId(menuOpenId === row.id ? null : row.id)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Más opciones"
            >
              <DotsThreeVertical size={16} weight="bold" />
            </button>

            {menuOpenId === row.id && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpenId(null)}
                />
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null);
                      handleToggleClick(row);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {row.isActive ? 'Desactivar negocio' : 'Activar negocio'}
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpenId(null);
                      setDeletingBusiness({ id: row.id, name: row.name });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash size={14} />
                    <span>Eliminar definitivamente</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ),
    },
  ];

  const tabOptions: Array<{ id: TabStatus; label: string; count: number }> = [
    { id: 'all', label: 'Todos', count: counters.all },
    { id: 'por_vencer', label: 'Por vencer', count: counters.por_vencer },
    { id: 'en_gracia', label: 'En gracia', count: counters.en_gracia },
    { id: 'vencido', label: 'Vencidos', count: counters.vencido },
    { id: 'prueba', label: 'En prueba', count: counters.prueba },
    { id: 'inactivo', label: 'Inactivos', count: counters.inactivo },
  ];

  return (
    <div>
      <TopBar
        title="Gestión de Negocios"
        subtitle={`Total de ${counters.all} negocios registrados`}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Nuevo negocio</span>
          </button>
        }
      />

      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
        {/* Barra de búsqueda y Pestañas con contador */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar negocio por nombre..."
                className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            {/* Pestañas de estado con contador del API */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs self-stretch sm:self-auto overflow-x-auto">
              {tabOptions.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla en desktop */}
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            data={businesses}
            keyExtractor={(item) => item.id}
            onRowClick={(row) => navigate(`/businesses/${row.id}`)}
            pageSize={15}
            isLoading={isLoading}
            emptyMessage="No se encontraron negocios para los filtros seleccionados"
          />
        </div>

        {/* Vista en móvil: tarjetas compactas */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">
              Cargando negocios...
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">
              No se encontraron negocios
            </div>
          ) : (
            businesses.map((business) => (
              <BusinessCardMobile
                key={business.id}
                business={business}
                onToggle={(b) => handleToggleClick(b)}
                onDelete={(b) => setDeletingBusiness({ id: b.id, name: b.name })}
                onRegisterPayment={(b) => setPaymentTarget({ id: b.id, name: b.name })}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {paymentTarget && (
        <RegisterMembershipModal
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          businessId={paymentTarget.id}
          businessName={paymentTarget.name}
        />
      )}

      {/* Modal Nuevo Negocio */}
      <CreateBusinessWizardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(credentials) => {
          setCreatedCredentials(credentials);
        }}
      />

      {/* Credenciales tras creación */}
      {createdCredentials && (
        <BusinessCredentialsModal
          isOpen={true}
          onClose={() => setCreatedCredentials(null)}
          businessName={createdCredentials.businessName}
          email={createdCredentials.email}
          password={createdCredentials.password}
        />
      )}

      {/* Modal Desactivar Negocio */}
      {deactivatingBusiness && (
        <DeactivateBusinessModal
          isOpen={true}
          onClose={() => setDeactivatingBusiness(null)}
          businessId={deactivatingBusiness.id}
          businessName={deactivatingBusiness.name}
          onConfirm={(businessId) => {
            toggleMutation.mutate(businessId, {
              onSuccess: () => setDeactivatingBusiness(null),
            });
          }}
        />
      )}

      {/* Modal Eliminar Definitivamente */}
      {deletingBusiness && (
        <DeleteBusinessModal
          isOpen={true}
          onClose={() => setDeletingBusiness(null)}
          businessId={deletingBusiness.id}
          businessName={deletingBusiness.name}
        />
      )}
    </div>
  );
};
