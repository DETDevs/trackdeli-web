import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MagnifyingGlass,
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

/**
 * Menú de acciones por fila. Usa posición fija calculada desde el botón para que
 * el contenedor con scroll de la tabla no lo recorte (sobre todo en las últimas filas).
 */
const RowMenu = ({
  row,
  onToggle,
  onDelete,
}: {
  row: BusinessItem;
  onToggle: (row: BusinessItem) => void;
  onDelete: (row: BusinessItem) => void;
}) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    if (pos) {
      setPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 92;
    const openUp = window.innerHeight - rect.bottom < menuHeight + 12;
    setPos({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
        title="Más opciones"
        aria-label="Más opciones"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>

      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div
            style={{ top: pos.top, right: pos.right }}
            className="fixed w-52 rounded-xl bg-white shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            <button
              type="button"
              onClick={() => {
                setPos(null);
                onToggle(row);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
            >
              {row.isActive ? 'Desactivar negocio' : 'Activar negocio'}
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => {
                setPos(null);
                onDelete(row);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            >
              <Trash size={14} />
              <span>Eliminar definitivamente</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};

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
      setSortOrder(field === 'due_date' ? 'asc' : 'desc');
    }
  };

  const renderSortIndicator = (field: 'due_date' | 'monthly_amount' | 'last_sale_at') => {
    if (sortBy !== field) {
      return <ArrowsDownUp size={12} className="text-gray-400 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <CaretUp size={12} className="text-gray-900 font-bold" />
    ) : (
      <CaretDown size={12} className="text-gray-900 font-bold" />
    );
  };

  const columns: Column<BusinessItem>[] = [
    {
      header: 'NEGOCIO',
      accessor: (row) => {
        const typeLabel =
          row.businessType === 'EMPRESA_RIDERS'
            ? 'Riders'
            : row.posVertical
            ? row.posVertical.toLowerCase()
            : row.type || 'Comercio';

        return (
          <div className="flex items-center gap-3 min-w-0 max-w-[230px]">
            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200/80 flex items-center justify-center font-bold text-gray-700 text-sm shrink-0 overflow-hidden">
              {row.logoUrl ? (
                <img src={row.logoUrl} alt={row.name} className="w-full h-full object-cover" />
              ) : (
                row.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/businesses/${row.id}`);
                }}
                className="font-semibold text-gray-900 truncate text-sm leading-tight hover:text-brand-600 transition-colors cursor-pointer"
                title={row.name}
              >
                {row.name}
              </p>
              <p className="text-[11px] text-gray-400 capitalize leading-tight mt-0.5">{typeLabel}</p>
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
          className="flex items-center gap-1.5 hover:text-gray-900 font-semibold cursor-pointer select-none"
        >
          <span>MEMBRESÍA</span>
          {renderSortIndicator('due_date')}
        </button>
      ),
      accessor: (row) => {
        const pill = getMembershipPillInfo(row.membership_status, row.is_trial, row.isActive);
        const dueText = formatDueText(row.due_date, row.days_until_due);

        return (
          <div className="space-y-0.5 whitespace-nowrap min-w-[130px]">
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
          className="flex items-center gap-1.5 hover:text-gray-900 font-semibold cursor-pointer select-none"
        >
          <span>MONTO</span>
          {renderSortIndicator('monthly_amount')}
        </button>
      ),
      accessor: (row) => (
        <div className="whitespace-nowrap min-w-[90px]">
          <span className="font-bold text-xs sm:text-sm text-gray-900 font-mono">
            ${Number(row.monthly_amount ?? 0).toFixed(2)}
          </span>
          <span className="text-[11px] text-gray-400 font-normal"> / mes</span>
        </div>
      ),
    },
    {
      header: 'PRODUCTOS',
      accessor: (row) => {
        const rawProducts =
          row.products && row.products.length > 0
            ? row.products
            : (row.productSubscriptions || []).map((s) => ({
                id: s.id || s.productType,
                type: s.productType,
                status: s.status,
                name: s.productType,
                fee: 0,
              }));

        // Solo productos con status activo contratado
        const productsList = rawProducts.filter((p) => p.status === 'ACTIVE');

        if (productsList.length === 0 && !row.is_trial) {
          return (
            <span className="text-[11px] text-gray-400 italic">
              Sin productos
            </span>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-1 w-[150px]">
            {productsList.map((p) => {
              const isPos = p.type === 'POS';
              const isDel = p.type === 'DELIVERY';
              const isCar = p.type === 'CARTERA_COBRO';
              const isCit = p.type === 'CITAS';

              const displayName =
                p.type === 'CARTERA_COBRO'
                  ? 'Cartera'
                  : p.type === 'DELIVERY'
                  ? 'Delivery'
                  : p.name || p.type;

              return (
                <span
                  key={p.id}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap shrink-0 ${
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
                  {displayName}
                </span>
              );
            })}

            {row.is_trial && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 whitespace-nowrap shrink-0">
                Prueba
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: (
        <button
          type="button"
          onClick={() => handleSort('last_sale_at')}
          className="flex items-center gap-1.5 hover:text-gray-900 font-semibold cursor-pointer select-none"
        >
          <span>USO Y ACTIVIDAD</span>
          {renderSortIndicator('last_sale_at')}
        </button>
      ),
      accessor: (row) => {
        const lastSignal = row.last_sale_at || row.last_seen_at;
        const text = lastSignal ? formatRelativeTime(lastSignal) : 'Sin actividad';

        return (
          <div className="space-y-1 whitespace-nowrap">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="flex items-center gap-1" title="Equipos activos / permitidos">
                <Desktop size={13} className="text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900 font-mono text-[11px]">
                  {row.devices?.active ?? 0}
                </span>
                <span className="text-gray-400 font-mono text-[11px]">/</span>
                <span className="text-gray-500 font-mono text-[11px]">
                  {row.devices?.allowed ?? '∞'}
                </span>
              </div>
              <div className="flex items-center gap-1" title="Usuarios activos / límite">
                <Users size={13} className="text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900 font-mono text-[11px]">
                  {row.users?.active ?? 0}
                </span>
                <span className="text-gray-400 font-mono text-[11px]">/</span>
                <span className="text-gray-500 font-mono text-[11px]">
                  {row.users?.limit ?? 6}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-1 text-gray-500"
              title={
                lastSignal
                  ? `Fecha exacta: ${formatDateClean(lastSignal)}`
                  : 'Sin actividad registrada'
              }
            >
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span className="text-[11px]">{text}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: '',
      className: 'text-right w-px',
      accessor: (row) => (
        <div
          className="flex items-center justify-end gap-1 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPaymentTarget({ id: row.id, name: row.name })}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition-colors whitespace-nowrap cursor-pointer"
            title="Registrar pago o renovar membresía"
          >
            <CreditCard size={13} weight="bold" className="shrink-0" />
            <span>Pago</span>
          </button>

          <RowMenu
            row={row}
            onToggle={handleToggleClick}
            onDelete={(r) => setDeletingBusiness({ id: r.id, name: r.name })}
          />
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
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Nuevo negocio</span>
          </button>
        }
      />

      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
        {/* Barra de búsqueda y Pestañas con contador integradas */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative w-full md:w-80">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200/90 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-2xs transition-all"
            />
          </div>

          {/* Pestañas de estado con contador */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 shadow-2xs self-stretch md:self-auto overflow-x-auto">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-gray-200/70 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
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
