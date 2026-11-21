import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Scissors,
  Plus,
  ArrowsLeftRight,
  ArrowCounterClockwise,
  CheckCircle,
  CreditCard,
  Receipt,
  WarningCircle,
  CircleNotch,
  Link as LinkIcon,
} from '@phosphor-icons/react';
import {
  startPosTableOrderSplit,
  movePosTableSplitItem,
  addPosTableSubAccount,
  mergePosTableSubAccounts,
  undoPosTableOrderSplit,
  type PosTableOrder,
  type PosTableSubAccount,
  type PosTableSubAccountItem,
} from 'api-client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../utils/formatters';
import { extractApiErrorMessage } from '../../../utils/productCost';

interface SplitTableOrderModalProps {
  isOpen: boolean;
  order: PosTableOrder | null;
  currency?: string;
  onClose: () => void;
  onOrderUpdated: (updated: PosTableOrder) => void;
  onRefreshOrder: () => Promise<PosTableOrder | null>;
  onCheckoutSubAccount: (subAccount: PosTableSubAccount) => void;
  onOpenPreBill: (subAccount: PosTableSubAccount) => void;
}

export const SplitTableOrderModal: React.FC<SplitTableOrderModalProps> = ({
  isOpen,
  order,
  currency = 'NIO',
  onClose,
  onOrderUpdated,
  onRefreshOrder,
  onCheckoutSubAccount,
  onOpenPreBill,
}) => {
  const [selectedMode, setSelectedMode] = useState<'ITEMS' | 'EQUAL'>('ITEMS');
  const [equalParts, setEqualParts] = useState<number>(2);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Control de traslado parcial en modo ITEMS
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [partialQtyByItem, setPartialQtyByItem] = useState<Record<string, string>>({});

  // Control para juntar dos subcuentas abiertas
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeFromId, setMergeFromId] = useState<string>('');
  const [mergeToId, setMergeToId] = useState<string>('');

  const subAccounts = order?.subAccounts || [];
  const openAccounts = useMemo(
    () => subAccounts.filter((sa) => sa.status === 'OPEN'),
    [subAccounts],
  );
  const hasPaidAccounts = useMemo(
    () => subAccounts.some((sa) => sa.status === 'PAID'),
    [subAccounts],
  );

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsMergeOpen(false);
      setMoveTargets({});
      setPartialQtyByItem({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (openAccounts.length >= 2) {
      setMergeFromId((prev) =>
        openAccounts.some((sa) => sa.id === prev) ? prev : openAccounts[0].id,
      );
      setMergeToId((prev) =>
        openAccounts.some((sa) => sa.id === prev && prev !== openAccounts[0].id)
          ? prev
          : openAccounts[1].id,
      );
    } else {
      setIsMergeOpen(false);
    }
  }, [openAccounts]);

  if (!isOpen || !order) return null;

  const isSplitActive = Boolean(order.splitMode) && subAccounts.length > 0;
  const tableTitle = /^mesa\s+/i.test(String(order.table?.number || '').trim())
    ? String(order.table?.number).trim()
    : `Mesa ${String(order.table?.number || '').trim()}`;

  const handleApiError = async (err: any, fallback: string) => {
    const code = err?.response?.data?.code;
    if (code === 'SPLIT_VERSION_CONFLICT') {
      toast('La cuenta cambió, la actualizamos');
      setErrorMsg('La cuenta cambió en otro dispositivo. Ya cargamos la última versión.');
      await onRefreshOrder();
      return;
    }
    if (code === 'SPLIT_HAS_PAID_ACCOUNTS') {
      const msg = 'No podés deshacer o reiniciar la división porque ya hay subcuentas pagadas.';
      setErrorMsg(msg);
      await onRefreshOrder();
      return;
    }
    setErrorMsg(extractApiErrorMessage(err, fallback));
  };

  const handleStartSplit = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setErrorMsg(null);
    try {
      const updated = await startPosTableOrderSplit(order.tableId, {
        mode: selectedMode,
        ...(selectedMode === 'EQUAL' ? { parts: equalParts } : {}),
        splitVersion: order.splitVersion,
      });
      onOrderUpdated(updated);
      toast.success(
        selectedMode === 'ITEMS'
          ? 'División por productos lista'
          : `Cuenta dividida en ${equalParts} partes iguales`,
      );
    } catch (err) {
      await handleApiError(err, 'No se pudo iniciar la división de cuenta.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleMoveItem = async (
    item: PosTableSubAccountItem,
    currentSubAccountId: string,
    moveAll: boolean,
  ) => {
    if (isWorking || !item.id) return;
    const defaultTarget = openAccounts.find((sa) => sa.id !== currentSubAccountId)?.id || '';
    const toSubAccountId = moveTargets[item.id] || defaultTarget;
    if (!toSubAccountId || toSubAccountId === currentSubAccountId) {
      setErrorMsg('Elegí una subcuenta destino abierta distinta.');
      return;
    }

    const totalItemQty = Number(item.quantity || 0);
    let qtyToMove = totalItemQty;
    if (!moveAll) {
      const parsed = Number(partialQtyByItem[item.id] ?? 1);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > totalItemQty) {
        setErrorMsg(`Ingresá una cantidad válida entre 0.01 y ${totalItemQty}.`);
        return;
      }
      qtyToMove = parsed;
    }

    setIsWorking(true);
    setErrorMsg(null);
    try {
      const updated = await movePosTableSplitItem(order.tableId, {
        itemId: item.id,
        toSubAccountId,
        qty: qtyToMove,
        splitVersion: order.splitVersion,
      });
      onOrderUpdated(updated);
    } catch (err) {
      await handleApiError(err, 'No se pudo mover el producto.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleAddAccount = async () => {
    if (isWorking || subAccounts.length >= 12) return;
    setIsWorking(true);
    setErrorMsg(null);
    try {
      const updated = await addPosTableSubAccount(order.tableId, {
        splitVersion: order.splitVersion,
      });
      onOrderUpdated(updated);
      toast.success('Subcuenta agregada');
    } catch (err) {
      await handleApiError(err, 'No se pudo agregar otra subcuenta.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleMergeAccounts = async () => {
    if (isWorking || !mergeFromId || !mergeToId || mergeFromId === mergeToId) {
      setErrorMsg('Elegí dos subcuentas abiertas distintas para juntar.');
      return;
    }
    setIsWorking(true);
    setErrorMsg(null);
    try {
      const updated = await mergePosTableSubAccounts(order.tableId, {
        fromSubAccountId: mergeFromId,
        toSubAccountId: mergeToId,
        splitVersion: order.splitVersion,
      });
      onOrderUpdated(updated);
      setIsMergeOpen(false);
      toast.success('Subcuentas unidas');
    } catch (err) {
      await handleApiError(err, 'No se pudieron juntar las subcuentas.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleUndoSplit = async () => {
    if (isWorking || hasPaidAccounts) return;
    setIsWorking(true);
    setErrorMsg(null);
    try {
      const updated = await undoPosTableOrderSplit(order.tableId, {
        splitVersion: order.splitVersion,
      });
      onOrderUpdated(updated);
      toast.success('División deshecha');
    } catch (err) {
      await handleApiError(err, 'No se pudo deshacer la división.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        {/* Cabecera */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <Scissors size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate">
                Dividir cuenta · {tableTitle}
              </h3>
              <p className="text-xs text-gray-500">
                Total de la orden: <strong className="text-gray-900">{formatCurrency(order.total, currency)}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAFAFA]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isSplitActive ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#0F0F0F]">
                  Elegí cómo querés dividir la cuenta
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Podés separar productos por persona o partir el total en cuotas iguales (hasta 12).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMode('ITEMS')}
                  className={`min-h-[84px] p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'ITEMS'
                      ? 'border-[#0F0F0F] bg-gray-50 ring-1 ring-[#0F0F0F]'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-bold text-[#0F0F0F]">Por productos</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Creás subcuentas (A, B...) y movés cada producto completo o parcial.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('EQUAL')}
                  className={`min-h-[84px] p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'EQUAL'
                      ? 'border-[#0F0F0F] bg-gray-50 ring-1 ring-[#0F0F0F]'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-bold text-[#0F0F0F]">En partes iguales</p>
                  <p className="text-xs text-gray-600 mt-1">
                    El servidor divide la orden equitativamente entre 2 y 12 partes.
                  </p>
                </button>
              </div>

              {selectedMode === 'EQUAL' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Cantidad de partes (2 a 12)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setEqualParts(n)}
                        className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                          equalParts === n
                            ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={equalParts}
                      onChange={(e) => {
                        const v = Math.min(12, Math.max(2, parseInt(e.target.value || '2', 10) || 2));
                        setEqualParts(v);
                      }}
                      className="w-20 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-center text-sm font-bold text-gray-900"
                      aria-label="Número de partes"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartSplit}
                disabled={isWorking || order.items.length === 0}
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isWorking ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    <span>Dividiendo...</span>
                  </>
                ) : (
                  <span>Iniciar división</span>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Barra de acciones sobre la división activa */}
              <div className="bg-white rounded-2xl border border-gray-200 p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddAccount}
                    disabled={isWorking || subAccounts.length >= 12}
                    className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Plus size={15} weight="bold" />
                    <span>{order.splitMode === 'EQUAL' ? 'Agregar parte' : 'Agregar cuenta'}</span>
                  </button>

                  {openAccounts.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setIsMergeOpen((v) => !v)}
                      disabled={isWorking}
                      className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <LinkIcon size={15} weight="bold" />
                      <span>Juntar</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleUndoSplit}
                  disabled={isWorking || hasPaidAccounts}
                  title={
                    hasPaidAccounts
                      ? 'Ya hay subcuentas pagadas; no se puede deshacer'
                      : 'Volver a una sola cuenta'
                  }
                  className="min-h-[44px] px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowCounterClockwise size={15} weight="bold" />
                  <span>Deshacer división</span>
                </button>
              </div>

              {/* Panel para juntar dos subcuentas */}
              {isMergeOpen && openAccounts.length >= 2 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-900">
                    Juntar dos subcuentas abiertas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Desde (se elimina)
                      </label>
                      <select
                        value={mergeFromId}
                        onChange={(e) => setMergeFromId(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900"
                      >
                        {openAccounts.map((sa) => (
                          <option key={sa.id} value={sa.id}>
                            {sa.label} ({formatCurrency(sa.total, currency)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Hacia (recibe el monto/ítems)
                      </label>
                      <select
                        value={mergeToId}
                        onChange={(e) => setMergeToId(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900"
                      >
                        {openAccounts.map((sa) => (
                          <option key={sa.id} value={sa.id}>
                            {sa.label} ({formatCurrency(sa.total, currency)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMergeOpen(false)}
                      className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleMergeAccounts}
                      disabled={isWorking || mergeFromId === mergeToId}
                      className="min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Confirmar unión
                    </button>
                  </div>
                </div>
              )}

              {/* Tarjetas de subcuentas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {subAccounts.map((sa) => {
                  const isPaid = sa.status === 'PAID';
                  const otherOpen = openAccounts.filter((o) => o.id !== sa.id);
                  const canPay =
                    !isPaid && (order.splitMode === 'EQUAL' || (sa.items || []).length > 0);

                  return (
                    <div
                      key={sa.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                        isPaid
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[#0F0F0F] truncate">
                                {sa.label}
                              </h4>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-900 border-amber-200'
                                }`}
                              >
                                {isPaid ? 'Pagada' : 'Abierta'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                              Subtotal {formatCurrency(sa.subtotal, currency)}
                              {sa.discount > 0 ? ` · Desc. -${formatCurrency(sa.discount, currency)}` : ''}
                              {sa.tax > 0 ? ` · Imp. ${formatCurrency(sa.tax, currency)}` : ''}
                            </p>
                          </div>

                          <span className="text-base font-extrabold text-[#0F0F0F] tabular-nums shrink-0 whitespace-nowrap">
                            {formatCurrency(sa.total, currency)}
                          </span>
                        </div>

                        {/* Ítems de la subcuenta */}
                        {order.splitMode === 'ITEMS' ? (
                          <div className="space-y-2 border-t border-gray-100 pt-2.5">
                            {(sa.items || []).length === 0 ? (
                              <p className="text-xs text-gray-500 italic py-2">
                                Sin productos asignados.
                              </p>
                            ) : (
                              (sa.items || []).map((item) => {
                                const qty = Number(item.quantity || 0);
                                const rowKey = item.id || `${sa.id}-${item.productId}`;
                                const targetId =
                                  (item.id && moveTargets[item.id]) || otherOpen[0]?.id || '';

                                return (
                                  <div
                                    key={rowKey}
                                    className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-2 text-xs">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 truncate">
                                          {qty} × {item.productName}
                                        </p>
                                      </div>
                                      <span className="font-bold text-gray-900 tabular-nums shrink-0">
                                        {formatCurrency(
                                          item.subtotal ?? qty * Number(item.unitPrice || 0),
                                          currency,
                                        )}
                                      </span>
                                    </div>

                                    {!isPaid && otherOpen.length > 0 && item.id && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <select
                                          value={targetId}
                                          onChange={(e) =>
                                            setMoveTargets((prev) => ({
                                              ...prev,
                                              [item.id!]: e.target.value,
                                            }))
                                          }
                                          className="flex-1 min-w-[110px] min-h-[36px] px-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-800"
                                          aria-label="Mover a subcuenta"
                                        >
                                          {otherOpen.map((dest) => (
                                            <option key={dest.id} value={dest.id}>
                                              → {dest.label}
                                            </option>
                                          ))}
                                        </select>

                                        {qty > 1 && (
                                          <input
                                            type="number"
                                            step="any"
                                            min="0.01"
                                            max={qty}
                                            value={partialQtyByItem[item.id] ?? '1'}
                                            onChange={(e) =>
                                              setPartialQtyByItem((prev) => ({
                                                ...prev,
                                                [item.id!]: e.target.value,
                                              }))
                                            }
                                            className="w-16 min-h-[36px] px-2 rounded-lg border border-gray-200 bg-white text-center text-xs font-semibold tabular-nums"
                                            aria-label="Cantidad parcial a mover"
                                          />
                                        )}

                                        {qty > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleMoveItem(item, sa.id, false)}
                                            disabled={isWorking}
                                            className="min-h-[36px] px-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-800 cursor-pointer disabled:opacity-40"
                                          >
                                            Mover cant.
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleMoveItem(item, sa.id, true)}
                                          disabled={isWorking}
                                          className="min-h-[36px] px-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                        >
                                          <ArrowsLeftRight size={13} />
                                          <span>Todo</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 border-t border-gray-100 pt-2.5">
                            Parte equitativa calculada por el servidor ({sa.itemsCount} líneas
                            prorrateadas).
                          </p>
                        )}
                      </div>

                      {/* Acciones de subcuenta */}
                      <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPreBill(sa)}
                          disabled={order.splitMode === 'ITEMS' && (sa.items || []).length === 0}
                          className="min-h-[44px] flex-1 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                        >
                          <Receipt size={15} />
                          <span>Pre-cuenta</span>
                        </button>

                        {isPaid ? (
                          <span className="min-h-[44px] flex-1 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center justify-center gap-1.5">
                            <CheckCircle size={16} weight="fill" />
                            <span>Cobrada</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCheckoutSubAccount(sa)}
                            disabled={!canPay || isWorking}
                            className="min-h-[44px] flex-1 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <CreditCard size={15} weight="bold" />
                            <span>Cobrar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
