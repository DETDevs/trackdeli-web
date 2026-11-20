import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Truck,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  WarningCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type PosSupplier,
  getPosSuppliers,
  deletePosSupplier,
} from 'api-client';
import { extractApiErrorMessage } from '../../../utils/productCost';
import { SupplierModal } from './SupplierModal';

export interface SuppliersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuppliersChanged?: () => void;
}

const formatCountLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export const SuppliersListModal: React.FC<SuppliersListModalProps> = ({
  isOpen,
  onClose,
  onSuppliersChanged,
}) => {
  const queryClient = useQueryClient();

  const [suppliers, setSuppliers] = useState<PosSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<PosSupplier | null>(null);

  const [supplierToDeactivate, setSupplierToDeactivate] = useState<PosSupplier | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getPosSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(extractApiErrorMessage(err, 'No se pudieron cargar los proveedores.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSupplierToDeactivate(null);
      loadSuppliers();
    }
  }, [isOpen, loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.taxId && s.taxId.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)),
    );
  }, [suppliers, searchQuery]);

  const handleOpenCreate = () => {
    setSupplierToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sup: PosSupplier) => {
    setSupplierToEdit(sup);
    setIsFormOpen(true);
  };

  const handleSupplierSaved = async () => {
    setIsFormOpen(false);
    setSupplierToEdit(null);
    queryClient.invalidateQueries({ queryKey: ['pos', 'suppliers'] });
    await loadSuppliers();
    onSuppliersChanged?.();
  };

  const handleConfirmDeactivate = async () => {
    if (!supplierToDeactivate) return;
    setIsDeactivating(true);
    setErrorMsg(null);
    try {
      await deletePosSupplier(supplierToDeactivate.id);
      setSupplierToDeactivate(null);
      queryClient.invalidateQueries({ queryKey: ['pos', 'suppliers'] });
      await loadSuppliers();
      onSuppliersChanged?.();
    } catch (err: any) {
      setErrorMsg(extractApiErrorMessage(err, 'No se pudo desactivar el proveedor.'));
      setSupplierToDeactivate(null);
    } finally {
      setIsDeactivating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Truck size={22} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  Directorio de proveedores
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  Administrá los proveedores activos disponibles en el catálogo
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar directorio"
              className="w-11 h-11 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Barra de búsqueda y acción */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, RUC, teléfono o correo..."
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadSuppliers}
                disabled={isLoading}
                className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Actualizar listado"
              >
                <ArrowsClockwise size={16} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={16} weight="bold" />
                <span>Nuevo proveedor</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-2 text-xs text-red-800">
                <div className="flex items-start gap-2 min-w-0">
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                  <span className="break-words">{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={loadSuppliers}
                  className="font-semibold underline shrink-0 cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="py-12 text-center text-xs text-gray-500">
                Cargando proveedores...
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="py-12 px-4 text-center bg-gray-50/60 border border-gray-100 rounded-2xl space-y-2">
                <Truck size={34} className="mx-auto text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">
                  {searchQuery.trim()
                    ? 'No hay proveedores con ese criterio'
                    : 'Todavía no tenés proveedores'}
                </p>
                <p className="text-xs text-gray-500">
                  {searchQuery.trim()
                    ? 'Probá con otro nombre, RUC, teléfono o correo.'
                    : 'Creá tu primer proveedor para asignarlo a tus productos y compras.'}
                </p>
              </div>
            ) : (
              <>
                {/* Vista móvil: tarjetas (sin desborde a 375 px) */}
                <div className="sm:hidden space-y-3">
                  {filteredSuppliers.map((sup) => {
                    const productsCount = sup._count?.products ?? 0;
                    const purchasesCount = sup._count?.purchases ?? 0;
                    return (
                      <div
                        key={sup.id}
                        className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2.5 shadow-2xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-sm font-bold text-gray-900 break-words">
                            {sup.name}
                          </h3>
                          {sup.taxId && (
                            <p className="text-xs font-mono text-gray-600 break-all">
                              RUC: {sup.taxId}
                            </p>
                          )}
                          {(sup.phone || sup.email) && (
                            <div className="text-xs text-gray-600 space-y-0.5 break-all">
                              {sup.phone && <p>Tel.: {sup.phone}</p>}
                              {sup.email && <p>{sup.email}</p>}
                            </div>
                          )}
                          {sup.address && (
                            <p className="text-xs text-gray-500 break-words">{sup.address}</p>
                          )}
                          <p className="text-xs text-gray-500 pt-0.5">
                            {formatCountLabel(productsCount, 'producto', 'productos')} ·{' '}
                            {formatCountLabel(purchasesCount, 'compra', 'compras')}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sup)}
                            className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-800 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <PencilSimple size={15} weight="bold" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSupplierToDeactivate(sup)}
                            className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-800 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Trash size={15} weight="bold" />
                            <span>Desactivar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista desktop: tabla */}
                <div className="hidden sm:block rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Proveedor</th>
                        <th className="py-3 px-4">RUC</th>
                        <th className="py-3 px-4">Contacto</th>
                        <th className="py-3 px-4">Asociados</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredSuppliers.map((sup) => {
                        const productsCount = sup._count?.products ?? 0;
                        const purchasesCount = sup._count?.purchases ?? 0;
                        return (
                          <tr key={sup.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3 px-4 align-top">
                              <div className="font-semibold text-gray-900">{sup.name}</div>
                              {sup.address && (
                                <div className="text-xs text-gray-500 mt-0.5 max-w-xs break-words">
                                  {sup.address}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 align-top font-mono text-gray-700 whitespace-nowrap">
                              {sup.taxId || <span className="text-gray-400">Sin RUC</span>}
                            </td>
                            <td className="py-3 px-4 align-top">
                              {sup.phone && <div className="text-gray-800">{sup.phone}</div>}
                              {sup.email && (
                                <div className="text-gray-500 break-all">{sup.email}</div>
                              )}
                              {!sup.phone && !sup.email && (
                                <span className="text-gray-400">Sin contacto</span>
                              )}
                            </td>
                            <td className="py-3 px-4 align-top whitespace-nowrap text-gray-600">
                              <div>{formatCountLabel(productsCount, 'producto', 'productos')}</div>
                              <div>{formatCountLabel(purchasesCount, 'compra', 'compras')}</div>
                            </td>
                            <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(sup)}
                                  className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <PencilSimple size={15} weight="bold" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSupplierToDeactivate(sup)}
                                  className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-800 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash size={15} weight="bold" />
                                  <span>Desactivar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmación de desactivación */}
      {supplierToDeactivate && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                  <WarningCircle size={22} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Desactivar proveedor
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 break-words">
                    ¿Querés desactivar a <strong>{supplierToDeactivate.name}</strong>?
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-1">
                <p>
                  Asociados actuales:{' '}
                  <strong>
                    {formatCountLabel(
                      supplierToDeactivate._count?.products ?? 0,
                      'producto',
                      'productos',
                    )}
                  </strong>{' '}
                  y{' '}
                  <strong>
                    {formatCountLabel(
                      supplierToDeactivate._count?.purchases ?? 0,
                      'compra registrada',
                      'compras registradas',
                    )}
                  </strong>
                  .
                </p>
                <p className="text-gray-600">
                  Dejará de aparecer en el selector de productos, pero se conservará el historial.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSupplierToDeactivate(null)}
                disabled={isDeactivating}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash size={15} weight="bold" />
                <span>{isDeactivating ? 'Desactivando...' : 'Desactivar proveedor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear / editar proveedor */}
      <SupplierModal
        isOpen={isFormOpen}
        supplier={supplierToEdit}
        existingSuppliers={suppliers}
        onClose={() => {
          setIsFormOpen(false);
          setSupplierToEdit(null);
        }}
        onSaved={handleSupplierSaved}
      />
    </>
  );
};
