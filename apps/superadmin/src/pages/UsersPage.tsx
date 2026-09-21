import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  MagnifyingGlass,
  Key,
  Lock,
  LockOpen,
  ArrowClockwise,
  ShieldCheck,
  Storefront,
  UserCheck,
  Motorcycle,
  Circle,
  Phone,
  EnvelopeSimple,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { TopBar } from '../components/layout/TopBar';
import { useSuperAdminUsers } from '../hooks/useSuperAdminUsers';
import { useBusinesses } from '../hooks/useBusinesses';
import { type AdminUser } from 'api-client';
import { formatDateTime } from '../utils/format';
import { CreateSuperAdminUserModal } from '../components/modals/users/CreateSuperAdminUserModal';
import { UserPasswordModal } from '../components/modals/users/UserPasswordModal';
import { ChangeUserPasswordModal } from '../components/modals/users/ChangeUserPasswordModal';
import { DeactivateUserModal } from '../components/modals/users/DeactivateUserModal';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U';

const getPageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export const UsersPage = () => {
  const { data: users = [], isLoading, isError, refetch } = useSuperAdminUsers();
  const { data: businesses = [] } = useBusinesses();

  const businessMap = useMemo(() => {
    const map = new Map<string, string>();
    businesses.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [businesses]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [businessFilter, setBusinessFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<AdminUser | null>(null);
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState<AdminUser | null>(null);
  const [deactivateTargetUser, setDeactivateTargetUser] = useState<AdminUser | null>(null);

  const isTargetOnlyActiveEncargado = useMemo(() => {
    if (!deactivateTargetUser || deactivateTargetUser.role !== 'ENCARGADO' || !deactivateTargetUser.isActive) {
      return false;
    }
    if (!deactivateTargetUser.businessId) return false;

    const activeEncargadosOfBiz = users.filter(
      (u) =>
        u.businessId === deactivateTargetUser.businessId &&
        u.role === 'ENCARGADO' &&
        u.isActive
    );
    return activeEncargadosOfBiz.length === 1 && activeEncargadosOfBiz[0].id === deactivateTargetUser.id;
  }, [deactivateTargetUser, users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesBusiness =
        businessFilter === 'ALL' ||
        (businessFilter === 'NONE' && !u.businessId) ||
        u.businessId === businessFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'INACTIVE' && !u.isActive);

      return matchesSearch && matchesRole && matchesBusiness && matchesStatus;
    });
  }, [users, search, roleFilter, businessFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, startIndex, pageSize]);

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200/70">
            <ShieldCheck size={13} weight="fill" className="text-purple-600" />
            SuperAdmin
          </span>
        );
      case 'ENCARGADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200/60">
            <Storefront size={13} className="text-green-600" />
            Encargado
          </span>
        );
      case 'CAJERO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            <UserCheck size={13} className="text-blue-600" />
            Cajero
          </span>
        );
      case 'REPARTIDOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
            <Motorcycle size={13} className="text-amber-600" />
            Repartidor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div>
      <TopBar
        title="Usuarios"
        subtitle="Gestión global de usuarios de la plataforma"
        actions={
          <button
            id="btn-new-user"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 rounded-xl text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} weight="bold" />
            <span>Nuevo Usuario</span>
          </button>
        }
      />

      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
            <span>No se pudo cargar la lista de usuarios.</span>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowClockwise size={13} />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar por nombre, correo electrónico o teléfono..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            <div className="shrink-0 w-full md:w-64">
              <select
                value={businessFilter}
                onChange={(e) => {
                  setBusinessFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-900 transition-colors bg-white cursor-pointer"
              >
                <option value="ALL">Todos los negocios</option>
                <option value="NONE">Plataforma (Sin negocio)</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-50 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[
                { id: 'ALL', label: 'Todos los roles' },
                { id: 'SUPERADMIN', label: 'SuperAdmin' },
                { id: 'ENCARGADO', label: 'Encargados' },
                { id: 'CAJERO', label: 'Cajeros' },
                { id: 'REPARTIDOR', label: 'Repartidores' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRoleFilter(r.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap font-medium ${
                    roleFilter === r.id
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-100">
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-green-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Activos ({users.filter((u) => u.isActive).length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('INACTIVE');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Inactivos ({users.filter((u) => !u.isActive).length})
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="space-y-1.5">
                    <div className="h-4 bg-gray-100 rounded w-32" />
                    <div className="h-3 bg-gray-100 rounded w-48" />
                  </div>
                </div>
                <div className="h-7 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && filteredUsers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-500 mx-auto flex items-center justify-center border border-gray-100">
              <Users size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              No se encontraron usuarios
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Intenta cambiar los términos de búsqueda o los filtros aplicados.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('ALL');
                setBusinessFilter('ALL');
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredUsers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo Electrónico</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Negocio Asignado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Registro</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {paginatedUsers.map((u) => {
                    const bizName = u.businessId ? businessMap.get(u.businessId) : null;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200/80 flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0">
                              {initials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{u.name}</p>
                              {u.phone ? (
                                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Phone size={10} />
                                  <span>{u.phone}</span>
                                </p>
                              ) : (
                                <p className="text-[11px] text-gray-400">Sin teléfono</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <EnvelopeSimple size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">{renderRoleBadge(u.role)}</td>

                        <td className="py-3.5 px-4 text-gray-600">
                          {u.businessId ? (
                            <Link
                              to={`/businesses/${u.businessId}`}
                              className="text-gray-900 hover:text-brand-600 font-medium inline-flex items-center gap-1 hover:underline"
                            >
                              <Storefront size={13} className="text-gray-400 shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {bizName || 'Ver negocio'}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-gray-400 italic">Plataforma global</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.isActive
                                ? 'bg-green-50 text-green-700 border border-green-200/60'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            <Circle
                              size={6}
                              weight="fill"
                              className={u.isActive ? 'text-green-500' : 'text-gray-400'}
                            />
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                          {formatDateTime(u.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                <span>
                  Mostrando{' '}
                  <strong className="font-semibold text-gray-900">
                    {filteredUsers.length > 0 ? startIndex + 1 : 0}
                  </strong>{' '}
                  a{' '}
                  <strong className="font-semibold text-gray-900">
                    {endIndex}
                  </strong>{' '}
                  de{' '}
                  <strong className="font-semibold text-gray-900">
                    {filteredUsers.length}
                  </strong>{' '}
                  usuarios
                </span>

                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="hidden sm:inline">Mostrar:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-gray-900 cursor-pointer shadow-2xs"
                  >
                    <option value={10}>10 / pág</option>
                    <option value={20}>20 / pág</option>
                    <option value={50}>50 / pág</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
                    title="Página anterior"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {getPageNumbers(validCurrentPage, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 select-none">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          onClick={() => setCurrentPage(Number(p))}
                          className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            validCurrentPage === p
                              ? 'bg-gray-900 text-white shadow-2xs font-semibold'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
                    title="Página siguiente"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateSuperAdminUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newUser, initialPass) => {
          setIsCreateModalOpen(false);
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
    </div>
  );
};
