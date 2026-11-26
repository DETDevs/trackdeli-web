import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  WhatsappLogo,
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
import { useBusinessesSummary } from '../hooks/useSuperAdminSummary';

import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { BusinessCredentialsModal } from '../components/modals/BusinessCredentialsModal';
import { CreateBusinessWizardModal } from '../components/modals/CreateBusinessWizardModal';
import { DeleteBusinessModal } from '../components/modals/DeleteBusinessModal';
import { RegisterMembershipModal } from '../components/modals/RegisterMembershipModal';
import { formatDueText, getMembershipPillInfo, formatDateClean } from '../utils/membershipDates';
import { formatRelativeTime, formatDateShort, formatCurrency } from '../utils/format';

type TabKey =
  | 'clientes'
  | 'demos'
  | 'por_vencer'
  | 'en_gracia'
  | 'vencido'
  | 'inactivo'
  | 'all';

const VALID_TABS: TabKey[] = [
  'clientes',
  'demos',
  'por_vencer',
  'en_gracia',
  'vencido',
  'inactivo',
  'all',
];

function cleanWhatsappDigits(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.length === 8 ? `505${digits}` : digits;
}

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
            className="fixed w-52 rounded-xl bg-white shadow-lg border border-gray-200/80 py-1.5 z-50 text-left"
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
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTabParam = (searchParams.get('tab') || '').toLowerCase() as TabKey;
  const activeTab: TabKey = VALID_TABS.includes(initialTabParam) ? initialTabParam : 'clientes';

  const setActiveTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'clientes') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: true });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'due_date' | 'monthly_amount' | 'last_sale_at'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const queryParams = {
    accountType:
      activeTab === 'clientes'
        ? 'CLIENTE'
        : activeTab === 'demos'
        ? 'DEMO'
        : undefined,
    status:
      activeTab === 'por_vencer' ||
      activeTab === 'en_gracia' ||
      activeTab === 'vencido' ||
      activeTab === 'inactivo'
        ? activeTab
        : undefined,
    search: searchTerm.trim() ? searchTerm.trim() : undefined,
    sortBy,
    order: sortOrder,
  };

  const { data: summary, isLoading: loadingSummary } = useBusinessesSummary();
  const { data: response, isLoading } = useBusinessesEnriched(queryParams);

  const businesses = response?.data || [];
  const counters = response?.counters || {
    all: 0,
    clientes: 0,
    demos: 0,
    internos: 0,
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

  const totalRegistered = counters.all;
  const clientesCount = summary?.counts.clientes ?? counters.clientes ?? 0;
  const demosCount = summary?.counts.demos ?? counters.demos ?? 0;
  const internosCount = summary?.counts.internos ?? counters.internos ?? 0;

  const subtitleText =
    internosCount > 0
      ? `${totalRegistered} ${totalRegistered === 1 ? 'registrado' : 'registrados'}: ${clientesCount} ${clientesCount === 1 ? 'cliente' : 'clientes'}, ${demosCount} ${demosCount === 1 ? 'demo' : 'demos'} y ${internosCount} ${internosCount === 1 ? 'interno' : 'internos'}`
      : `${totalRegistered} ${totalRegistered === 1 ? 'registrado' : 'registrados'}: ${clientesCount} ${clientesCount === 1 ? 'cliente' : 'clientes'} y ${demosCount} ${demosCount === 1 ? 'demo' : 'demos'}`;

  const enGraciaCount = summary?.counts.enGracia ?? counters.en_gracia;
  const vencidosCount = summary?.counts.vencidos ?? counters.vencido;
  const atRiskTotal = enGraciaCount + vencidosCount;

  const columns: Column<BusinessItem>[] = [
    {
      header: 'Negocio',
      accessor: (row) => {
        const acct = row.accountType || 'CLIENTE';
        const isDemoOrInterno = acct === 'DEMO' || acct === 'INTERNO';
        const rubroLabel =
          row.industry?.name ||
          (row.businessType === 'EMPRESA_RIDERS'
            ? 'Riders'
            : row.type || (row.posVertical ? row.posVertical.toLowerCase() : 'Comercio'));

        const cName = row.contactName || row.contact?.name || null;
        const cPhone = row.contactPhone || row.contact?.phone || row.contactWhatsapp || row.contact?.whatsapp || null;
        const waDigits = cleanWhatsappDigits(row.contactWhatsapp || row.contact?.whatsapp || cPhone);
        const hasContact = Boolean(cName || cPhone);

        return (
          <div className="flex items-start gap-3 min-w-0 max-w-[300px]">
            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200/80 flex items-center justify-center font-semibold text-gray-700 text-xs shrink-0 overflow-hidden mt-0.5">
              {row.logoUrl ? (
                <img src={row.logoUrl} alt={row.name} className="w-full h-full object-cover" />
              ) : (
                row.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/businesses/${row.id}`);
                  }}
                  className="font-semibold text-gray-900 truncate text-sm leading-tight hover:text-gray-700 transition-colors cursor-pointer"
                  title={row.name}
                >
                  {row.name}
                </p>
                {isDemoOrInterno && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200/80 text-gray-700 border border-gray-300/70">
                    {acct === 'INTERNO' ? 'Interno' : 'Demo'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 capitalize leading-tight">{rubroLabel}</p>

              {hasContact ? (
                <div
                  className="flex items-center gap-1.5 flex-wrap text-xs text-gray-600 pt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate max-w-[190px]">
                    {[cName, cPhone].filter(Boolean).join(' · ')}
                  </span>
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium hover:underline shrink-0"
                    >
                      <WhatsappLogo size={13} weight="fill" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              ) : (
                <div
                  className="text-xs text-gray-400 pt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Sin contacto · </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/businesses/${row.id}?tab=resumen&editContact=1`)}
                    className="text-gray-700 hover:text-gray-900 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              )}
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
          <span>Membresía</span>
          {renderSortIndicator('due_date')}
        </button>
      ),
      accessor: (row) => {
        const acct = row.accountType || 'CLIENTE';
        if (acct === 'DEMO' || acct === 'INTERNO') {
          return (
            <div className="space-y-0.5 whitespace-nowrap min-w-[160px]">
              <Badge variant="neutral" size="sm">
                Sin vencimiento
              </Badge>
              <p className="text-xs text-gray-500">No se cobra ni se bloquea</p>
            </div>
          );
        }

        const pill = getMembershipPillInfo(row.membership_status, row.is_trial, row.isActive);
        const dueText = formatDueText(row.due_date, row.days_until_due);
        const isMaintenanceFree = row.coverage_source === 'MAINTENANCE_FREE';

        return (
          <div className="space-y-0.5 whitespace-nowrap min-w-[140px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={pill.variant} dot size="sm">
                {pill.label}
              </Badge>
              {row.commercial_overdue && (
                <Badge variant="danger" dot size="sm">
                  Cuota vencida
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {isMaintenanceFree && row.maintenance_free_ends_at
                ? `Mantenimiento incluido hasta ${formatDateShort(row.maintenance_free_ends_at)}`
                : dueText}
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
          <span>Monto</span>
          {renderSortIndicator('monthly_amount')}
        </button>
      ),
      accessor: (row) => {
        const acct = row.accountType || 'CLIENTE';
        if (acct === 'DEMO' || acct === 'INTERNO') {
          return (
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Sin cobro
            </span>
          );
        }

        if (row.coverage_source === 'MAINTENANCE_FREE') {
          return (
            <div className="whitespace-nowrap min-w-[90px]">
              <span className="font-semibold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Incluido
              </span>
            </div>
          );
        }

        if (row.monthly_amount_nio != null && row.monthly_amount_nio > 0) {
          return (
            <div className="whitespace-nowrap min-w-[90px]">
              <span className="font-semibold text-xs sm:text-sm text-gray-900 font-mono">
                {formatCurrency(row.monthly_amount_nio, 'NIO')}
              </span>
              <span className="text-xs text-gray-500 font-normal"> / mes</span>
            </div>
          );
        }

        return (
          <div className="whitespace-nowrap min-w-[90px]">
            <span className="font-semibold text-xs sm:text-sm text-gray-900 font-mono">
              ${Number(row.monthly_amount ?? 0).toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 font-normal"> / mes</span>
          </div>
        );
      },
    },
    {
      header: 'Productos',
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

        const productsList = rawProducts.filter((p) => p.status === 'ACTIVE');

        if (productsList.length === 0 && !row.is_trial) {
          return <span className="text-xs text-gray-400">Sin productos</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
            {productsList.map((p) => {
              const displayName =
                p.type === 'CARTERA_COBRO'
                  ? 'Finanzas'
                  : p.type === 'DELIVERY'
                  ? 'Delivery'
                  : p.name || p.type;

              return (
                <span
                  key={p.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80 whitespace-nowrap"
                >
                  {displayName}
                </span>
              );
            })}

            {row.is_trial && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
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
          <span>Uso y actividad</span>
          {renderSortIndicator('last_sale_at')}
        </button>
      ),
      accessor: (row) => {
        const lastSignal = row.last_sale_at || row.last_seen_at;
        const text = lastSignal ? formatRelativeTime(lastSignal) : 'Sin actividad';

        return (
          <div className="space-y-1 whitespace-nowrap">
            <div className="flex items-center gap-3 text-gray-600 text-xs">
              <div className="flex items-center gap-1" title="Equipos activos / permitidos">
                <Desktop size={13} className="text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900 font-mono">
                  {row.devices?.active ?? 0}
                </span>
                <span className="text-gray-400 font-mono">/</span>
                <span className="text-gray-500 font-mono">
                  {row.devices?.allowed ?? '∞'}
                </span>
              </div>
              <div className="flex items-center gap-1" title="Usuarios activos / límite">
                <Users size={13} className="text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900 font-mono">
                  {row.users?.active ?? 0}
                </span>
                <span className="text-gray-400 font-mono">/</span>
                <span className="text-gray-500 font-mono">
                  {row.users?.limit ?? 6}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-1 text-gray-500 text-xs"
              title={
                lastSignal
                  ? `Fecha exacta: ${formatDateClean(lastSignal)}`
                  : 'Sin actividad registrada'
              }
            >
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span>{text}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: '',
      className: 'text-right w-px',
      accessor: (row) => {
        const acct = row.accountType || 'CLIENTE';
        const isClient = acct === 'CLIENTE';

        return (
          <div
            className="flex items-center justify-end gap-1.5 whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            {isClient && (
              <button
                type="button"
                onClick={() => setPaymentTarget({ id: row.id, name: row.name })}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 transition-colors whitespace-nowrap cursor-pointer"
                title="Registrar pago o renovar membresía"
              >
                <CreditCard size={13} weight="bold" className="shrink-0 text-gray-600" />
                <span>Cobrar</span>
              </button>
            )}

            <RowMenu
              row={row}
              onToggle={handleToggleClick}
              onDelete={(r) => setDeletingBusiness({ id: r.id, name: r.name })}
            />
          </div>
        );
      },
    },
  ];

  const tabOptions: Array<{ id: TabKey; label: string; count: number }> = [
    { id: 'clientes', label: 'Clientes', count: clientesCount },
    { id: 'demos', label: 'Demos', count: demosCount },
    { id: 'por_vencer', label: 'Por vencer', count: counters.por_vencer },
    { id: 'en_gracia', label: 'En gracia', count: counters.en_gracia },
    { id: 'vencido', label: 'Vencidos', count: counters.vencido },
    { id: 'inactivo', label: 'Inactivos', count: counters.inactivo },
    { id: 'all', label: 'Todos', count: counters.all },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <TopBar
        title="Negocios"
        subtitle={subtitleText}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Nuevo negocio</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
        {/* Cuatro números del resumen del 307a (solo clientes) */}
        <div className="bg-white rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/70">
          {/* 1. Ingreso mensual */}
          <div className="p-4 sm:p-5 space-y-1">
            <p className="text-[13px] font-medium text-gray-500">Ingreso mensual</p>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight font-mono">
              {loadingSummary
                ? '—'
                : `$${Number(summary?.monthlyRevenueUsd ?? 0).toFixed(2)}`}
            </p>
            {summary && summary.maintenanceMonthlyNio > 0 && (
              <p className="text-xs text-gray-600 font-mono">
                + {formatCurrency(summary.maintenanceMonthlyNio, 'NIO')} mantenimiento
              </p>
            )}
            <p className="text-[13px] text-gray-500">Las demos no cuentan</p>
          </div>

          {/* 2. Clientes que pagan */}
          <div className="p-4 sm:p-5 space-y-1">
            <p className="text-[13px] font-medium text-gray-500">Clientes que pagan</p>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              {loadingSummary ? '—' : summary?.payingClientsCount ?? 0}
            </p>
            <p className="text-[13px] text-gray-500">
              de {clientesCount} {clientesCount === 1 ? 'cliente activo o registrado' : 'clientes registrados'}
            </p>
          </div>

          {/* 3. Próximo cobro */}
          <div className="p-4 sm:p-5 space-y-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-500">Próximo cobro</p>
            {loadingSummary ? (
              <p className="text-xl font-semibold text-gray-400">—</p>
            ) : summary?.nextCollection ? (
              <>
                <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {formatDateShort(summary.nextCollection.dueDate)} ·{' '}
                  {summary.nextCollection.currency === 'NIO'
                    ? formatCurrency(summary.nextCollection.amount, 'NIO')
                    : `$${Number(summary.nextCollection.amount).toFixed(2)}`}
                </p>
                <p
                  onClick={() => navigate(`/businesses/${summary.nextCollection!.businessId}`)}
                  className="text-[13px] text-gray-600 hover:text-gray-900 truncate cursor-pointer underline-offset-2 hover:underline"
                  title={summary.nextCollection.businessName}
                >
                  {summary.nextCollection.businessName}
                </p>
              </>
            ) : (
              <>
                <p className="text-base sm:text-lg font-semibold text-gray-900">Sin cobros próximos</p>
                <p className="text-[13px] text-gray-500">No hay vencimientos programados</p>
              </>
            )}
          </div>

          {/* 4. En gracia o vencidos */}
          <div className="p-4 sm:p-5 space-y-1">
            <p className="text-[13px] font-medium text-gray-500">En gracia o vencidos</p>
            <p
              className={`text-xl sm:text-2xl font-semibold tracking-tight ${
                atRiskTotal > 0 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {loadingSummary ? '—' : atRiskTotal}
            </p>
            <p className="text-[13px] text-gray-500">
              {enGraciaCount} en gracia · {vencidosCount} vencidos
            </p>
          </div>
        </div>

        {/* Buscador y pestañas */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="relative w-full xl:w-96">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por negocio, contacto o teléfono"
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/80 self-stretch xl:self-auto overflow-x-auto max-w-full">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-2xs border border-gray-200/80'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      isActive ? 'bg-gray-100 text-gray-800' : 'bg-gray-200/70 text-gray-600'
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
            rowClassName={(row) =>
              row.accountType === 'DEMO' || row.accountType === 'INTERNO'
                ? 'bg-gray-50/90'
                : ''
            }
            pageSize={15}
            isLoading={isLoading}
            emptyMessage="No se encontraron negocios para los filtros seleccionados"
          />
        </div>

        {/* Vista en móvil */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200/80">
              Cargando negocios...
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200/80">
              No se encontraron negocios
            </div>
          ) : (
            businesses.map((business) => (
              <BusinessCardMobile
                key={business.id}
                business={business}
                onToggle={(b) => handleToggleClick(b)}
                onDelete={(b) => setDeletingBusiness({ id: b.id, name: b.name })}
                onRegisterPayment={
                  (business.accountType || 'CLIENTE') === 'CLIENTE'
                    ? (b) => setPaymentTarget({ id: b.id, name: b.name })
                    : undefined
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Modal Registrar pago */}
      {paymentTarget && (
        <RegisterMembershipModal
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          businessId={paymentTarget.id}
          businessName={paymentTarget.name}
        />
      )}

      {/* Modal Nuevo negocio */}
      <CreateBusinessWizardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(credentials) => {
          setIsModalOpen(false);
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

      {/* Modal Desactivar negocio */}
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

      {/* Modal Eliminar definitivamente */}
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
