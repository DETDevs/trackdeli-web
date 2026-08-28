import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MagnifyingGlass,
  Storefront,
  ArrowRight,
  ShieldCheck,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  useBusinesses,
  useToggleBusiness,
  useCreateBusiness,
  BusinessItem,
  CreateBusinessResult,
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
            <Storefront size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-900 leading-tight">{row.name}</p>
            <p className="text-xs text-gray-400 capitalize">{row.type || 'Comercio'}</p>
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
      header: 'Membresía',
      accessor: (row) => {
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

      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* Controles de búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs self-stretch sm:self-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todos ({businesses.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Activos ({businesses.filter((b) => b.isActive).length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'INACTIVE'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Inactivos ({businesses.filter((b) => !b.isActive).length})
            </button>
          </div>
        </div>

        {/* Tabla de Negocios */}
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de negocio
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Ej: restaurante, farmacia, tienda..."
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
