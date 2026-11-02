import React, { useState } from 'react';
import {
  Buildings,
  Storefront,
  Plus,
  Trash,
  UserCheck,
  WarningCircle,
  X,
  CircleNotch,
} from '@phosphor-icons/react';
import {
  useOrganizations,
  useBusinessOrganization,
  useCreateOrganization,
  useSetBusinessOrganization,
  useGrantOrganizationAccess,
  useRevokeOrganizationAccess,
} from '../../hooks/useOrganizations';
import { useSuperAdminUsers } from '../../hooks/useSuperAdminUsers';

interface BusinessOrganizationSectionProps {
  business: {
    id: string;
    name: string;
    organizationId?: string | null;
    organization?: {
      id: string;
      name: string;
    } | null;
  };
}

export const BusinessOrganizationSection: React.FC<BusinessOrganizationSectionProps> = ({ business }) => {
  const [assignedOrgId, setAssignedOrgId] = useState<string | null>(null);

  // Resuelve la empresa asignada (por ID directo o buscando entre las empresas registradas)
  const directOrgId = assignedOrgId || business.organizationId || business.organization?.id || null;
  const { data: resolvedOrg, isLoading: isLoadingResolvedOrg } = useBusinessOrganization(business.id, directOrgId);
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
  const { data: allUsers = [] } = useSuperAdminUsers();

  const currentOrg = resolvedOrg;
  const currentOrgId = currentOrg?.id || null;

  const createOrgMutation = useCreateOrganization();
  const setBusinessOrgMutation = useSetBusinessOrganization();
  const grantAccessMutation = useGrantOrganizationAccess();
  const revokeAccessMutation = useRevokeOrganizationAccess();

  // Modales
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateOrgMode, setIsCreateOrgMode] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState<string>('');
  const [grantBusinessId, setGrantBusinessId] = useState<string>('');

  const [accessToRevoke, setAccessToRevoke] = useState<{ id: string; userName: string; branchName: string } | null>(null);

  // Filtrar encargados que pertenecen a negocios de esta empresa
  const orgBusinessIds = new Set((currentOrg?.businesses || []).map((b) => b.id));
  orgBusinessIds.add(business.id);

  const orgEncargados = allUsers.filter(
    (u) =>
      u.role === 'ENCARGADO' &&
      u.isActive &&
      Boolean(u.businessId && orgBusinessIds.has(u.businessId))
  );

  // Filtrar sucursales disponibles para el encargado seleccionado (excluir sucursal principal y las que ya tenga)
  const selectedEncargado = orgEncargados.find((u) => u.id === grantUserId);
  const existingUserAccessBizIds = new Set(
    (currentOrg?.accesses || [])
      .filter((a) => a.userId === grantUserId)
      .map((a) => a.businessId)
  );

  const availableBranchesForSelectedUser = (currentOrg?.businesses || []).filter((b) => {
    if (!selectedEncargado) return true;
    if (b.id === selectedEncargado.businessId) return false;
    if (existingUserAccessBizIds.has(b.id)) return false;
    return true;
  });

  const handleOpenAssignModal = () => {
    setSelectedOrgId(currentOrgId || '');
    setIsCreateOrgMode(false);
    setNewOrgName('');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateOrgMode) {
      if (!newOrgName.trim()) return;
      try {
        const created = await createOrgMutation.mutateAsync(newOrgName.trim());
        await setBusinessOrgMutation.mutateAsync({
          businessId: business.id,
          organizationId: created.id,
        });
        setAssignedOrgId(created.id);
        setIsAssignModalOpen(false);
        setIsCreateOrgMode(false);
        setNewOrgName('');
      } catch {}
    } else {
      if (!selectedOrgId) return;
      try {
        await setBusinessOrgMutation.mutateAsync({
          businessId: business.id,
          organizationId: selectedOrgId,
        });
        setAssignedOrgId(selectedOrgId);
        setIsAssignModalOpen(false);
      } catch {}
    }
  };

  const handleUnlink = async () => {
    if (!currentOrg) return;

    // Calcular accesos multi-sucursal que se perderían
    const affectedAccesses = (currentOrg.accesses || []).filter(
      (a) => a.businessId === business.id || a.user?.businessId === business.id
    );

    let confirmMessage = `¿Estás seguro de quitar "${business.name}" de la empresa "${currentOrg.name}"?`;
    if (affectedAccesses.length > 0) {
      confirmMessage += `\n\nAtención: Se perderán ${affectedAccesses.length} acceso(s) multi-sucursal asociados a este negocio.`;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      await setBusinessOrgMutation.mutateAsync({
        businessId: business.id,
        organizationId: null,
      });
      setAssignedOrgId(null);
    } catch {}
  };

  const handleOpenGrantModal = () => {
    setGrantUserId('');
    setGrantBusinessId('');
    setIsGrantModalOpen(true);
  };

  const handleGrantUserChange = (userId: string) => {
    setGrantUserId(userId);
    setGrantBusinessId('');
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrgId || !grantUserId || !grantBusinessId) return;
    try {
      await grantAccessMutation.mutateAsync({
        organizationId: currentOrgId,
        userId: grantUserId,
        businessId: grantBusinessId,
      });
      setIsGrantModalOpen(false);
      setGrantUserId('');
      setGrantBusinessId('');
    } catch {}
  };

  const handleConfirmRevoke = async () => {
    if (!currentOrgId || !accessToRevoke) return;
    try {
      await revokeAccessMutation.mutateAsync({
        organizationId: currentOrgId,
        accessId: accessToRevoke.id,
      });
      setAccessToRevoke(null);
    } catch {}
  };

  const branchCount = currentOrg?.businesses?.length || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs space-y-5">
      {/* Encabezado de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
            <Buildings size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                Empresa y red de sucursales
              </h3>
              {isLoadingResolvedOrg ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                  <CircleNotch size={12} className="animate-spin" />
                  <span>Cargando...</span>
                </span>
              ) : currentOrg ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <span>{currentOrg.name}</span>
                  <span className="text-blue-600 font-normal">
                    ({branchCount} {branchCount === 1 ? 'sucursal' : 'sucursales'})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  Independiente
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-xl">
              Agrupa negocios bajo una misma empresa para permitir que un encargado administre varias sucursales con una sola cuenta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {currentOrg ? (
            <>
              <button
                type="button"
                onClick={handleOpenAssignModal}
                className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
              >
                Cambiar empresa
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={setBusinessOrgMutation.isPending}
                className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Quitar de la empresa
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Asignar a empresa</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenido cuando tiene empresa asignada */}
      {currentOrg && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {/* Sucursales vinculadas a esta empresa */}
          <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100 space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Storefront size={15} />
              <span>Sucursales de la empresa ({branchCount})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {(currentOrg.businesses || []).map((b) => {
                const isCurrent = b.id === business.id;
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      isCurrent
                        ? 'bg-white border-blue-200 text-gray-900 font-semibold shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Storefront size={16} className={isCurrent ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
                      <span className="truncate">{b.name}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium shrink-0 border border-blue-100">
                        Esta sucursal
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accesos de encargados multi-sucursal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <UserCheck size={16} className="text-gray-700" />
                  <span>Accesos de encargados</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permite a encargados de la empresa alternar entre sucursales autorizadas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenGrantModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-800 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus size={13} weight="bold" />
                <span>Dar acceso</span>
              </button>
            </div>

            {/* Listado de accesos */}
            {isLoadingResolvedOrg ? (
              <div className="py-6 text-center text-xs text-gray-400">Cargando accesos...</div>
            ) : !currentOrg.accesses || currentOrg.accesses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                No hay accesos adicionales otorgados todavía. Cada encargado solo puede acceder a su sucursal principal.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs text-gray-700 min-w-[500px]">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Encargado</th>
                      <th className="px-3.5 py-2.5">Correo</th>
                      <th className="px-3.5 py-2.5">Sucursal con acceso</th>
                      <th className="px-3.5 py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentOrg.accesses.map((acc) => (
                      <tr key={acc.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                          {acc.user?.name || acc.userId}
                        </td>
                        <td className="px-3.5 py-2.5 text-gray-500">{acc.user?.email || '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                            <Storefront size={14} className="text-gray-400" />
                            {acc.business?.name || acc.businessId}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setAccessToRevoke({
                                id: acc.id,
                                userName: acc.user?.name || 'Encargado',
                                branchName: acc.business?.name || 'esta sucursal',
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                            title="Retirar acceso"
                          >
                            <Trash size={14} />
                            <span>Retirar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Asignar a empresa */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Buildings size={18} className="text-blue-600" />
                <span>Asignar empresa</span>
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsCreateOrgMode(false)}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    !isCreateOrgMode ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Elegir existente
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOrgMode(true)}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    isCreateOrgMode ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Crear nueva empresa
                </button>
              </div>

              {isCreateOrgMode ? (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Nombre de la nueva empresa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Grupo Farmacéutico Managua"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-gray-900"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Seleccionar empresa</label>
                  {isLoadingOrgs ? (
                    <div className="py-2 text-gray-400">Cargando empresas...</div>
                  ) : organizations.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-500">
                      No hay empresas registradas todavía. Selecciona "Crear nueva empresa".
                    </div>
                  ) : (
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900 cursor-pointer"
                    >
                      <option value="">Selecciona una empresa...</option>
                      {organizations.map((org) => {
                        const count = org.businessCount !== undefined ? org.businessCount : org.businesses?.length || 0;
                        return (
                          <option key={org.id} value={org.id}>
                            {org.name} ({count} {count === 1 ? 'sucursal' : 'sucursales'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={setBusinessOrgMutation.isPending || createOrgMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
                >
                  {(setBusinessOrgMutation.isPending || createOrgMutation.isPending) && (
                    <CircleNotch size={13} className="animate-spin" />
                  )}
                  <span>Guardar asignación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dar acceso a encargado */}
      {isGrantModalOpen && currentOrg && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-600" />
                <span>Dar acceso multi-sucursal</span>
              </h3>
              <button
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Encargado de la empresa</label>
                {orgEncargados.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs">
                    No se encontraron usuarios con rol ENCARGADO asociados a los negocios de esta empresa.
                  </div>
                ) : (
                  <select
                    value={grantUserId}
                    onChange={(e) => handleGrantUserChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900 cursor-pointer"
                  >
                    <option value="">Selecciona un encargado...</option>
                    {orgEncargados.map((u) => {
                      const userPrimaryBiz = (currentOrg.businesses || []).find((b) => b.id === u.businessId);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}){userPrimaryBiz ? ` — Principal: ${userPrimaryBiz.name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {selectedEncargado && (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Sucursal adicional a autorizar</label>
                  {availableBranchesForSelectedUser.length === 0 ? (
                    <div className="p-3 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 text-xs">
                      Este encargado ya tiene acceso a todas las sucursales disponibles de la empresa.
                    </div>
                  ) : (
                    <select
                      value={grantBusinessId}
                      onChange={(e) => setGrantBusinessId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900 cursor-pointer"
                    >
                      <option value="">Selecciona una sucursal adicional...</option>
                      {availableBranchesForSelectedUser.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.id === business.id ? '(Esta sucursal)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    grantAccessMutation.isPending ||
                    !grantUserId ||
                    !grantBusinessId ||
                    availableBranchesForSelectedUser.length === 0
                  }
                  className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
                >
                  {grantAccessMutation.isPending && <CircleNotch size={13} className="animate-spin" />}
                  <span>Dar acceso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar revocación de acceso */}
      {accessToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <WarningCircle size={22} weight="fill" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">¿Retirar acceso a sucursal?</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Se revocará el acceso de <strong className="text-gray-800">{accessToRevoke.userName}</strong> a{' '}
                  <strong className="text-gray-800">{accessToRevoke.branchName}</strong>. El usuario ya no podrá
                  cambiar a esta sucursal.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAccessToRevoke(null)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revokeAccessMutation.isPending}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {revokeAccessMutation.isPending && <CircleNotch size={13} className="animate-spin" />}
                <span>Retirar acceso</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
