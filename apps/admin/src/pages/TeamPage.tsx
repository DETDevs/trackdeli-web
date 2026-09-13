import { useState, useMemo } from 'react';
import {
  Plus,
  Users,
  MagnifyingGlass,
  Key,
  Lock,
  LockOpen,
  ArrowClockwise,
  UserCheck,
  Phone,
  EnvelopeSimple,
  Circle,
} from '@phosphor-icons/react';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { type AdminUser } from 'api-client';
import { formatDateTime } from '../utils/formatDate';
import { CreateCajeroModal } from '../components/team/CreateCajeroModal';
import { CreatedPasswordModal } from '../components/team/CreatedPasswordModal';
import { ChangePasswordModal } from '../components/team/ChangePasswordModal';
import { DeactivateCajeroModal } from '../components/team/DeactivateCajeroModal';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U';

export const TeamPage = () => {
  const { data: users = [], isLoading, isError, refetch } = useAdminUsers();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<AdminUser | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState<AdminUser | null>(null);
  const [statusTargetUser, setStatusTargetUser] = useState<AdminUser | null>(null);

  const cajeros = useMemo(() => {
    return users.filter((u) => u.role === 'CAJERO');
  }, [users]);

  const filteredCajeros = useMemo(() => {
    return cajeros.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.phone && user.phone.includes(search));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [cajeros, search, statusFilter]);

  const handleCreateSuccess = (user: AdminUser, initialPassword: string) => {
    setIsCreateOpen(false);
    setCreatedUser(user);
    setCreatedPassword(initialPassword);
  };

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mi Equipo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personal y cajeros autorizados para operar el punto de venta (POS)
          </p>
        </div>
        <button
          id="btn-add-cajero"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} weight="bold" />
          <span>Agregar Cajero</span>
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
          <span>No se pudo cargar la lista de cajeros.</span>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowClockwise size={14} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {!isLoading && !isError && cajeros.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-100 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                statusFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Todos ({cajeros.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-green-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Activos ({cajeros.filter((c) => c.isActive).length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Inactivos ({cajeros.filter((c) => !c.isActive).length})
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex gap-4">
            <div className="h-5 bg-gray-100 rounded w-1/4 animate-pulse" />
            <div className="h-5 bg-gray-100 rounded w-1/4 animate-pulse" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 bg-gray-100 rounded w-36 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-48 animate-pulse" />
                  </div>
                </div>
                <div className="h-8 bg-gray-100 rounded w-28 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !isError && cajeros.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-100 rounded-xl shadow-xs p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
            <Users size={24} weight="regular" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-semibold text-gray-900">
              Aún no tienes cajeros registrados
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Da de alta a tus cajeros o meseros para que puedan iniciar sesión con su propia cuenta
              en el punto de venta (POS) y registrar ventas.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={16} weight="bold" />
            <span>Agregar primer cajero</span>
          </button>
        </div>
      )}

      {!isLoading && !isError && cajeros.length > 0 && filteredCajeros.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-900">
            No se encontraron cajeros con los filtros actuales
          </p>
          <p className="text-xs text-gray-400 mt-1">Prueba con otro término de búsqueda.</p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {!isLoading && !isError && filteredCajeros.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Cajero</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Registro</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredCajeros.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200/80 flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0">
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{user.name}</p>
                          {user.phone ? (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Phone size={11} />
                              <span>{user.phone}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400">Sin teléfono</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <EnvelopeSimple size={14} className="text-gray-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/70">
                        <UserCheck size={13} className="text-gray-600" />
                        Cajero
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-50 text-green-700 border border-green-200/60'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        <Circle
                          size={6}
                          weight="fill"
                          className={user.isActive ? 'text-green-500' : 'text-gray-400'}
                        />
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(user.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setPasswordTargetUser(user)}
                          title="Cambiar contraseña"
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Key size={16} weight="regular" />
                        </button>

                        <button
                          onClick={() => setStatusTargetUser(user)}
                          title={user.isActive ? 'Desactivar cajero' : 'Activar cajero'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            user.isActive
                              ? 'text-gray-500 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-gray-500 hover:text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {user.isActive ? (
                            <Lock size={16} weight="regular" />
                          ) : (
                            <LockOpen size={16} weight="regular" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateCajeroModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <CreatedPasswordModal
        isOpen={Boolean(createdUser && createdPassword)}
        user={createdUser}
        password={createdPassword}
        onClose={() => {
          setCreatedUser(null);
          setCreatedPassword(null);
        }}
      />

      <ChangePasswordModal
        isOpen={Boolean(passwordTargetUser)}
        user={passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
      />

      <DeactivateCajeroModal
        isOpen={Boolean(statusTargetUser)}
        user={statusTargetUser}
        onClose={() => setStatusTargetUser(null)}
      />
    </div>
  );
};
