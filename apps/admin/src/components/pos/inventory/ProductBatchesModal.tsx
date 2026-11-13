import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Package,
  PencilSimple,
  ArrowsClockwise,
  WarningCircle,
  Clock,
  Info,
  Trash,
} from '@phosphor-icons/react';
import {
  getPosProductBatches,
  type PosProductItem,
  type PosProductBatchItem,
} from 'api-client';
import { formatManaguaDate } from '../../../utils/dateManagua';
import { formatCurrency, formatQuantity } from '../../../utils/formatters';
import { getBatchStatusMeta } from '../../../utils/batchStatus';
import { extractApiErrorMessage } from '../../../utils/productCost';
import { EditBatchModal, type BatchToEdit } from './EditBatchModal';

interface ProductBatchesModalProps {
  isOpen: boolean;
  product: PosProductItem | null;
  currency?: string;
  canManageCatalog: boolean;
  onClose: () => void;
  onBatchesUpdated: () => void;
  onWriteOffBatch?: (product: PosProductItem, batch: PosProductBatchItem) => void;
}

export const ProductBatchesModal: React.FC<ProductBatchesModalProps> = ({
  isOpen,
  product,
  currency = 'NIO',
  canManageCatalog,
  onClose,
  onBatchesUpdated,
  onWriteOffBatch,
}) => {
  const [batches, setBatches] = useState<PosProductBatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchToEdit, setBatchToEdit] = useState<BatchToEdit | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadBatches = useCallback(async () => {
    if (!product?.id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getPosProductBatches(product.id);
      setBatches(Array.isArray(res?.batches) ? res.batches : []);
    } catch (err: any) {
      setErrorMsg(extractApiErrorMessage(err, 'No se pudieron cargar los lotes del producto.'));
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadBatches();
    } else {
      setBatches([]);
      setErrorMsg(null);
    }
  }, [isOpen, product?.id, loadBatches]);

  if (!isOpen || !product) return null;

  const unit = (product.unit || 'UND').toUpperCase();
  const batchesWithoutDateCount = batches.filter((b) => !b.expiryDate && b.quantity > 0).length;
  const activeBatches = batches.filter((b) => b.quantity > 0);
  const emptyBatches = batches.filter((b) => b.quantity <= 0);
  const orderedBatches = [...activeBatches, ...emptyBatches];

  const handleOpenEdit = (b: PosProductBatchItem) => {
    setBatchToEdit({
      id: b.id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      quantity: b.quantity,
      productName: product.name,
      unit,
    });
    setIsEditOpen(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-batches-title"
      >
        <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92dvh]">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Package size={20} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h2 id="product-batches-title" className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  Lotes y vencimientos
                </h2>
                <p className="text-xs text-gray-600 truncate">
                  {product.name} · Existencia total:{' '}
                  <span className="font-semibold text-gray-900">
                    {formatQuantity(product.stock ?? 0, unit)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={loadBatches}
                disabled={isLoading}
                className="w-11 h-11 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                title="Recargar lotes"
                aria-label="Recargar lotes"
              >
                <ArrowsClockwise size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Cerrar lotes"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-2 text-xs text-red-800">
                <div className="flex items-start gap-2">
                  <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={loadBatches}
                  className="font-semibold underline shrink-0"
                >
                  Reintentar
                </button>
              </div>
            )}

            {batchesWithoutDateCount > 0 && canManageCatalog && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <Clock size={18} className="shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {batchesWithoutDateCount === 1
                      ? 'Hay 1 lote sin fecha de vencimiento'
                      : `Hay ${batchesWithoutDateCount} lotes sin fecha de vencimiento`}
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Completá la fecha en cada lote para recibir alertas y priorizar la rotación FEFO al vender.
                  </p>
                </div>
              </div>
            )}

            {canManageCatalog && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2 text-xs text-blue-900">
                <Info size={16} className="shrink-0 text-blue-700 mt-0.5" />
                <span>
                  Desde acá podés editar código o vencimiento de cada lote y dar de baja lotes vencidos. Para ingresar un lote nuevo por compra, usá Compras en NEXOL POS de escritorio o registrá una entrada por Ajuste de existencia.
                </span>
              </div>
            )}

            {isLoading ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-600">Cargando lotes...</p>
              </div>
            ) : orderedBatches.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-gray-200 rounded-xl">
                <Package size={32} className="text-gray-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-800">Sin lotes registrados</p>
                <p className="text-xs text-gray-600 max-w-sm mx-auto">
                  Los lotes se generan al crear el producto con existencia inicial, al activar control de lotes con inventario existente o al ingresar mercadería.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards (< sm) */}
                <div className="sm:hidden space-y-2.5">
                  {orderedBatches.map((b) => {
                    const meta = getBatchStatusMeta(b.status, b.expiryDate);
                    const isExpiredWithStock = b.status === 'VENCIDO' && b.quantity > 0;
                    return (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          b.quantity <= 0
                            ? 'bg-gray-50/70 border-gray-200 opacity-75'
                            : 'bg-white border-gray-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                {b.batchNumber}
                              </span>
                              {b.batchNumber === 'INICIAL' && (
                                <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  Inicial
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Vence:{' '}
                              <span className="font-medium text-gray-900">
                                {b.expiryDate ? formatManaguaDate(b.expiryDate) : 'Sin fecha'}
                              </span>
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${meta.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                          <div>
                            <span className="text-gray-600">Existencia: </span>
                            <span className="font-bold text-gray-900 tabular-nums">
                              {formatQuantity(b.quantity, unit)}
                            </span>
                          </div>
                          {canManageCatalog && b.cost != null && (
                            <span className="text-gray-600 tabular-nums">
                              Costo: {formatCurrency(b.cost, currency)}
                            </span>
                          )}
                        </div>

                        {canManageCatalog && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(b)}
                              className={`flex-1 min-h-[44px] px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                                !b.expiryDate
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                              }`}
                            >
                              <PencilSimple size={15} weight="bold" />
                              <span>{!b.expiryDate ? 'Completar fecha' : 'Editar'}</span>
                            </button>
                            {onWriteOffBatch && isExpiredWithStock && (
                              <button
                                type="button"
                                onClick={() => onWriteOffBatch(product, b)}
                                className="min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 inline-flex items-center justify-center gap-1.5"
                              >
                                <Trash size={15} weight="bold" />
                                <span>Dar de baja</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (>= sm) */}
                <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
                      <tr>
                        <th className="py-3 px-3.5">Lote</th>
                        <th className="py-3 px-3.5">Vencimiento</th>
                        <th className="py-3 px-3.5 text-center">Estado</th>
                        <th className="py-3 px-3.5 text-right">Existencia</th>
                        {canManageCatalog && <th className="py-3 px-3.5 text-right">Costo</th>}
                        {canManageCatalog && <th className="py-3 px-3.5 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orderedBatches.map((b) => {
                        const meta = getBatchStatusMeta(b.status, b.expiryDate);
                        const isExpiredWithStock = b.status === 'VENCIDO' && b.quantity > 0;
                        return (
                          <tr
                            key={b.id}
                            className={`hover:bg-gray-50/70 transition-colors ${
                              b.quantity <= 0 ? 'opacity-65' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                  {b.batchNumber}
                                </span>
                                {b.batchNumber === 'INICIAL' && (
                                  <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    Inicial
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              {b.expiryDate ? (
                                <span className="tabular-nums text-gray-900">
                                  {formatManaguaDate(b.expiryDate)}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Sin fecha
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${meta.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                              {formatQuantity(b.quantity, unit)}
                            </td>
                            {canManageCatalog && (
                              <td className="py-2.5 px-3.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                                {b.cost != null ? formatCurrency(b.cost, currency) : '—'}
                              </td>
                            )}
                            {canManageCatalog && (
                              <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(b)}
                                    className={`min-h-[36px] px-2.5 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors ${
                                      !b.expiryDate
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                    }`}
                                    title={!b.expiryDate ? 'Completar fecha de vencimiento' : 'Editar lote'}
                                  >
                                    <PencilSimple size={14} weight="bold" />
                                    <span>{!b.expiryDate ? 'Completar' : 'Editar'}</span>
                                  </button>
                                  {onWriteOffBatch && isExpiredWithStock && (
                                    <button
                                      type="button"
                                      onClick={() => onWriteOffBatch(product, b)}
                                      className="min-h-[36px] px-2.5 rounded-lg font-semibold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1 transition-colors"
                                      title="Dar de baja lote vencido"
                                    >
                                      <Trash size={14} weight="bold" />
                                      <span>Dar de baja</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <EditBatchModal
        isOpen={isEditOpen}
        batch={batchToEdit}
        onClose={() => {
          setIsEditOpen(false);
          setBatchToEdit(null);
        }}
        onSuccess={() => {
          loadBatches();
          onBatchesUpdated();
        }}
      />
    </>
  );
};

