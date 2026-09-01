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
} from '@phosphor-icons/react';
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
import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { BusinessCredentialsModal } from '../components/modals/BusinessCredentialsModal';

export const BusinessesPage = () => {
  const navigate = useNavigate();
  const { data: businesses = [], isLoading } = useBusinesses();
  const toggleMutation = useToggleBusiness();
  const createMutation = useCreateBusiness();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal Create Business State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('NEGOCIO');
  const [commissionRate, setCommissionRate] = useState('15');
  const [altCommissionRate, setAltCommissionRate] = useState('12');
  const [altCommissionDistanceKm, setAltCommissionDistanceKm] = useState('40');
  const [dispatchTimeoutMin, setDispatchTimeoutMin] = useState('3');
  const [encargadoName, setEncargadoName] = useState('');
  const [encargadoEmail, setEncargadoEmail] = useState('');
  const [encargadoPassword, setEncargadoPassword] = useState('');

  // Modal Credentials State
  const [createdCredentials, setCreatedCredentials] = useState<{
    businessName: string;
    email: string;
    password?: string;
  } | null>(null);

  // Modal Deactivate State
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
      // Show confirmation modal to deactivate
      setDeactivatingBusiness({ id: row.id, name: row.name });
    } else {
      // Activate directly
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

    createMutation.mutate(
      {
        name: name.trim(),
        type: type.trim() || undefined,
        businessType,
        commissionRate: businessType === 'EMPRESA_RIDERS' ? (Number(commissionRate) / 100 || 0.15) : undefined,
        altCommissionRate: businessType === 'EMPRESA_RIDERS' ? (Number(altCommissionRate) / 100 || 0.12) : undefined,
        altCommissionDistanceKm: businessType === 'EMPRESA_RIDERS' ? (Number(altCommissionDistanceKm) || 40) : undefined,
        dispatchTimeoutMin: businessType === 'EMPRESA_RIDERS' ? (Number(dispatchTimeoutMin) || 3) : undefined,
        encargado: {
          name: encargadoName.trim(),
          email: encargadoEmail.trim(),
          password: encargadoPassword,
        },
      },
      {
        onSuccess: (data: CreateBusinessResult) => {
          setIsModalOpen(false);
          setName('');
          setType('');
          setBusinessType('NEGOCIO');
          setCommissionRate('15');
          setAltCommissionRate('12');
          setAltCommissionDistanceKm('40');
          setDispatchTimeoutMin('3');
          setEncargadoName('');
          setEncargadoEmail('');
          setEncargadoPassword('');

          // Open credentials modal
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
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
            {row.businessType === 'EMPRESA_RIDERS' ? (
              <Motorcycle size={18} className="text-amber-700" />
            ) : (
              <Storefront size={18} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 leading-tight">{row.name}</p>
              {row.businessType === 'EMPRESA_RIDERS' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                  Riders
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 capitalize">
              {row.businessType === 'EMPRESA_RIDERS' ? (row.type || 'Empresa de Riders') : (row.type || 'Comercio')}
            </p>
          </div>
        </div>
      ),
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
        if (row.businessType === 'EMPRESA_RIDERS') {
          const rate = row.commissionRate ? `${(row.commissionRate * 100).toFixed(0)}%` : '15%';
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              <Coins size={13} className="text-amber-700" />
              <span>Comisión ({rate})</span>
            </span>
          );
        }

        const mem = row.membership;
        if (mem && mem.status === 'ACTIVE') {
          const days = mem.daysLeft ?? 0;
          if (days <= 7) {
            return (
              <Badge variant="warning" dot size="sm">
                Vence en {days}d
              </Badge>
            );
          }
          return (
            <Badge variant="success" dot size="sm">
              Activa {days}d
            </Badge>
          );
        }
        return (
          <Badge variant="danger" dot size="sm">
            Vencida
          </Badge>
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
        {/* Controles de búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Input de Búsqueda */}
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

          {/* Filtros de Estado */}
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

        {/* Tabla Desktop */}
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

        {/* Mobile Cards */}
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

      {/* Modal Crear Negocio */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Negocio"
        subtitle="Registra la empresa y su usuario encargado inicial"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateBusiness} className="space-y-4">
          <div>
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

          {/* Selector de Modelo de Negocio (2 Tipos) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Modelo de Negocio *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setBusinessType('NEGOCIO')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                  businessType === 'NEGOCIO'
                    ? 'border-gray-900 bg-gray-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-2 rounded-lg ${businessType === 'NEGOCIO' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Storefront size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">Negocio Común</p>
                    <p className="text-[10px] text-gray-500">Comercio tradicional</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Restaurantes, comiderías, tiendas o farmacias que despachan sus propios pedidos.
                </p>
              </div>

              <div
                onClick={() => setBusinessType('EMPRESA_RIDERS')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                  businessType === 'EMPRESA_RIDERS'
                    ? 'border-gray-900 bg-gray-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-2 rounded-lg ${businessType === 'EMPRESA_RIDERS' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Motorcycle size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">Empresa de Riders</p>
                    <p className="text-[10px] text-gray-500">Agencia / Flota Delivery</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Gestiona repartidores para múltiples comercios, liquida comisiones y despacha pedidos.
                </p>
              </div>
            </div>
          </div>

          {/* Configuración de Comisiones (Solo si es EMPRESA_RIDERS) */}
          {businessType === 'EMPRESA_RIDERS' && (
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
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
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
                    value={altCommissionRate}
                    onChange={(e) => setAltCommissionRate(e.target.value)}
                    placeholder="12"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Para {altCommissionDistanceKm || '40'} km o más</p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Umbral Distancia Larga (km)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={altCommissionDistanceKm}
                    onChange={(e) => setAltCommissionDistanceKm(e.target.value)}
                    placeholder="40"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Expiración por intento (min)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={dispatchTimeoutMin}
                    onChange={(e) => setDispatchTimeoutMin(e.target.value)}
                    placeholder="3"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Categoría descriptiva (opcional)
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder={businessType === 'EMPRESA_RIDERS' ? "Ej: Flota express, Delivery central..." : "Ej: Restaurante, comidería, farmacia, tienda..."}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

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
                  El encargado podrá cambiar esta contraseña al ingresar.
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
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Negocio'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Mostrar Credenciales Generadas */}
      {createdCredentials && (
        <BusinessCredentialsModal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          businessName={createdCredentials.businessName}
          email={createdCredentials.email}
          password={createdCredentials.password}
        />
      )}

      {/* Modal Confirmación Desactivar */}
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
