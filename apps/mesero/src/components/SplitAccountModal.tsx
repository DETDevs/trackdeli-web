import React, { useState } from 'react';
import {
  X,
  Receipt,
  Users,
  ArrowsLeftRight,
  Plus,
  ArrowCounterClockwise,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import type {
  ActiveTableOrder,
  OrderSubAccount,
  TableOrderItem,
} from '../types/mesero';
import {
  useStartSplitOrder,
  useMoveSplitItem,
  useAddSubAccount,
  useMergeSubAccounts,
  useUndoSplitOrder,
} from '../hooks/useMesero';
import toast from 'react-hot-toast';

interface SplitAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: string | number;
  tableDisplayName?: string;
  activeOrder: ActiveTableOrder | null;
}

export const SplitAccountModal: React.FC<SplitAccountModalProps> = ({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  tableDisplayName,
  activeOrder,
}) => {
  // Estado local para configuración inicial cuando no está dividida
  const [selectedInitialMode, setSelectedInitialMode] = useState<'ITEMS' | 'EQUAL'>('ITEMS');
  const [equalPartsCount, setEqualPartsCount] = useState<number>(2);

  // Estado para mover cantidad parcial
  const [quantityMoveState, setQuantityMoveState] = useState<{
    isOpen: boolean;
    item: TableOrderItem | null;
    targetAccount: OrderSubAccount | null;
    selectedQty: number;
  }>({
    isOpen: false,
    item: null,
    targetAccount: null,
    selectedQty: 1,
  });

  // Estado para confirmación de deshacer
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [paidBlockedError, setPaidBlockedError] = useState<string | null>(null);

  // Hooks de mutación
  const startSplitMutation = useStartSplitOrder(tableId);
  const moveItemMutation = useMoveSplitItem(tableId);
  const addAccountMutation = useAddSubAccount(tableId);
  const mergeAccountsMutation = useMergeSubAccounts(tableId);
  const undoSplitMutation = useUndoSplitOrder(tableId);

  const isSubmitting =
    startSplitMutation.isPending ||
    moveItemMutation.isPending ||
    addAccountMutation.isPending ||
    mergeAccountsMutation.isPending ||
    undoSplitMutation.isPending;

  if (!isOpen || !activeOrder) return null;

  const isDivided = Boolean(activeOrder.splitMode && activeOrder.subAccounts && activeOrder.subAccounts.length > 0);
  const subAccounts = activeOrder.subAccounts || [];
  const openAccounts = subAccounts.filter((sa) => sa.status === 'OPEN');
  const paidAccounts = subAccounts.filter((sa) => sa.status === 'PAID');
  const hasPaidAccounts = paidAccounts.length > 0;

  // Total mesa y suma de subcuentas
  const tableTotal = Number(activeOrder.total || 0);
  const accountsTotalSum = subAccounts.reduce((acc, sa) => {
    return acc + Number(sa.fixedAmount ?? sa.total ?? 0);
  }, 0);
  const isSumMatching = Math.abs(accountsTotalSum - tableTotal) < 0.05;

  // Iniciar división por productos (ITEMS)
  const handleStartItemsSplit = async () => {
    try {
      await startSplitMutation.mutateAsync({
        mode: 'ITEMS',
        splitVersion: activeOrder.splitVersion,
      });
      toast.success('Cuenta dividida por productos (Cuenta A y B creadas)');
    } catch {
      // Manejado en el hook
    }
  };

  // Iniciar división en partes iguales (EQUAL)
  const handleStartEqualSplit = async () => {
    try {
      await startSplitMutation.mutateAsync({
        mode: 'EQUAL',
        parts: equalPartsCount,
        splitVersion: activeOrder.splitVersion,
      });
      toast.success(`Cuenta dividida en ${equalPartsCount} partes iguales`);
    } catch {
      // Manejado en el hook
    }
  };

  // Agregar cuenta (hasta 12)
  const handleAddAccount = async () => {
    if (subAccounts.length >= 12) {
      toast.error('Máximo 12 cuentas permitidas');
      return;
    }
    try {
      await addAccountMutation.mutateAsync({
        splitVersion: activeOrder.splitVersion,
      });
      toast.success('Nueva cuenta agregada');
    } catch {
      // Manejado en el hook
    }
  };

  // Tocar un chip de cuenta en un renglón
  const handleSelectAccountForItem = async (item: TableOrderItem, targetAccount: OrderSubAccount) => {
    if (item.subAccountId === targetAccount.id) return;

    if (targetAccount.status === 'PAID') {
      toast.error(`La ${targetAccount.label} ya fue cobrada y no puede recibir productos`);
      return;
    }

    const currentAcc = subAccounts.find((sa) => sa.id === item.subAccountId);
    if (currentAcc && currentAcc.status === 'PAID') {
      toast.error(`La ${currentAcc.label} ya fue cobrada. No podés mover sus productos`);
      return;
    }

    // Si la cantidad es 1, se mueve directo
    if (item.quantity <= 1) {
      try {
        await moveItemMutation.mutateAsync({
          itemId: item.id,
          toSubAccountId: targetAccount.id,
          qty: 1,
          splitVersion: activeOrder.splitVersion,
        });
      } catch {
        // Manejado en el hook
      }
      return;
    }

    // Si la cantidad es > 1, abre selector de cantidad
    setQuantityMoveState({
      isOpen: true,
      item,
      targetAccount,
      selectedQty: 1,
    });
  };

  // Confirmar movimiento de cantidad parcial
  const handleConfirmQuantityMove = async () => {
    if (!quantityMoveState.item || !quantityMoveState.targetAccount) return;
    try {
      await moveItemMutation.mutateAsync({
        itemId: quantityMoveState.item.id,
        toSubAccountId: quantityMoveState.targetAccount.id,
        qty: quantityMoveState.selectedQty,
        splitVersion: activeOrder.splitVersion,
      });
      setQuantityMoveState({
        isOpen: false,
        item: null,
        targetAccount: null,
        selectedQty: 1,
      });
    } catch {
      // Manejado en el hook
    }
  };

  // Deshacer división completa
  const handleConfirmUndoSplit = async () => {
    if (hasPaidAccounts) {
      const firstPaid = paidAccounts[0];
      setPaidBlockedError(`Ya se cobró la ${firstPaid.label}. No se puede deshacer la división completa.`);
      return;
    }

    try {
      await undoSplitMutation.mutateAsync({
        splitVersion: activeOrder.splitVersion,
      });
      setShowUndoConfirm(false);
      setPaidBlockedError(null);
      toast.success('División deshecha. Se juntaron todas las cuentas en una sola.');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'SPLIT_HAS_PAID_ACCOUNTS') {
        const paidNames = err?.response?.data?.paidAccounts?.map((p: any) => p.label).join(', ') || 'alguna cuenta';
        setPaidBlockedError(`Ya se cobró la cuenta (${paidNames}). No se puede deshacer la división completa.`);
      }
    }
  };

  // Juntar cuentas abiertas restantes cuando hay cuentas pagadas
  const handleMergeOpenAccounts = async () => {
    if (openAccounts.length <= 1) {
      toast('Las cuentas abiertas ya están agrupadas en una sola.', { icon: 'ℹ️' });
      setShowUndoConfirm(false);
      setPaidBlockedError(null);
      return;
    }

    const primaryOpen = openAccounts[0];
    const secondaryOpenList = openAccounts.slice(1);

    try {
      // Unir secuencialmente las demás cuentas abiertas a la primera
      for (const sec of secondaryOpenList) {
        await mergeAccountsMutation.mutateAsync({
          fromSubAccountId: sec.id,
          toSubAccountId: primaryOpen.id,
          splitVersion: activeOrder.splitVersion,
        });
      }
      setShowUndoConfirm(false);
      setPaidBlockedError(null);
      toast.success(`Cuentas abiertas unificadas en "${primaryOpen.label}".`);
    } catch {
      // Manejado en el hook
    }
  };

  // Cálculo previo de partes iguales para la vista previa
  const previewEqualParts = Array.from({ length: equalPartsCount }).map((_, idx) => {
    const totalCents = Math.round(tableTotal * 100);
    const baseCents = Math.floor(totalCents / equalPartsCount);
    const remainderCents = totalCents - baseCents * equalPartsCount;
    const partCents = idx === equalPartsCount - 1 ? baseCents + remainderCents : baseCents;
    return partCents / 100;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">
        
        {/* Cabecera del modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <ArrowsLeftRight size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-gray-900 truncate">
                  {isDivided ? 'Cuentas divididas' : 'Dividir cuenta'}
                </h2>
                {isDivided && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider shrink-0">
                    {activeOrder.splitMode === 'ITEMS' ? 'Por productos' : 'Partes iguales'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                {tableDisplayName || `Mesa ${tableNumber}`} • Total mesa: C$ {tableTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer touch-manipulation"
            title="Cerrar"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* CUERPO: CASO 1 — LA CUENTA NO ESTÁ DIVIDIDA AÚN */}
        {!isDivided ? (
          <div className="p-5 overflow-y-auto space-y-4">
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-indigo-900 block">Total a dividir en esta mesa</span>
              <span className="text-2xl font-black text-indigo-950 font-mono mt-1 block">
                C$ {tableTotal.toFixed(2)}
              </span>
              <span className="text-[11px] text-indigo-700 font-medium mt-1 block">
                {activeOrder.items.length} producto(s) en la comanda
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Elegí la modalidad de división:
              </label>

              {/* Opción 1: Por productos */}
              <div
                onClick={() => setSelectedInitialMode('ITEMS')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer touch-manipulation flex items-start gap-3.5 ${
                  selectedInitialMode === 'ITEMS'
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedInitialMode === 'ITEMS'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Receipt size={22} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-gray-900">Por productos</h3>
                    {selectedInitialMode === 'ITEMS' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    Asigná con un toque cada plato o bebida a Cuentas A, B, C... y agregá más cuentas según necesiten los clientes.
                  </p>
                </div>
              </div>

              {/* Opción 2: En partes iguales */}
              <div
                onClick={() => setSelectedInitialMode('EQUAL')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer touch-manipulation flex items-start gap-3.5 ${
                  selectedInitialMode === 'EQUAL'
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedInitialMode === 'EQUAL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Users size={22} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-gray-900">En partes iguales</h3>
                    {selectedInitialMode === 'EQUAL' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    Dividí el monto total en partes exactas (2 a 12). No requiere asignar renglones.
                  </p>
                </div>
              </div>
            </div>

            {/* Configuración de partes iguales si está seleccionada */}
            {selectedInitialMode === 'EQUAL' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Cantidad de partes:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={equalPartsCount <= 2 || isSubmitting}
                      onClick={() => setEqualPartsCount((prev) => Math.max(2, prev - 1))}
                      className="w-8 h-8 rounded-xl bg-white border border-gray-300 text-gray-800 font-bold disabled:opacity-40 flex items-center justify-center shadow-2xs cursor-pointer touch-manipulation"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-black font-mono text-gray-900">
                      {equalPartsCount}
                    </span>
                    <button
                      type="button"
                      disabled={equalPartsCount >= 12 || isSubmitting}
                      onClick={() => setEqualPartsCount((prev) => Math.min(12, prev + 1))}
                      className="w-8 h-8 rounded-xl bg-white border border-gray-300 text-gray-800 font-bold disabled:opacity-40 flex items-center justify-center shadow-2xs cursor-pointer touch-manipulation"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Chips rápidos de partes comunes */}
                <div className="flex items-center gap-1.5 justify-center flex-wrap">
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEqualPartsCount(num)}
                      className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-colors cursor-pointer touch-manipulation ${
                        equalPartsCount === num
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Vista previa de cada parte calculada */}
                <div className="space-y-1.5 pt-2 border-t border-gray-200">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Distribución calculada:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {previewEqualParts.map((amount, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-gray-600">Parte {idx + 1}</span>
                        <span className="font-mono font-bold text-gray-900">C$ {amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Botón de acción principal para iniciar */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || activeOrder.items.length === 0}
                onClick={selectedInitialMode === 'ITEMS' ? handleStartItemsSplit : handleStartEqualSplit}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Iniciando división...</span>
                  </span>
                ) : (
                  <span>
                    {selectedInitialMode === 'ITEMS'
                      ? 'Dividir cuenta por productos'
                      : `Dividir en ${equalPartsCount} partes iguales`}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* CUERPO: CASO 2 — LA CUENTA YA ESTÁ DIVIDIDA */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Barra superior de cuentas divididas y acción de deshacer */}
            <div className="p-3.5 bg-slate-50 border-b border-gray-200 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-gray-800">
                    {subAccounts.length} {activeOrder.splitMode === 'ITEMS' ? 'cuentas' : 'partes'}:
                  </span>
                  {hasPaidAccounts && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle size={10} weight="fill" />
                      {paidAccounts.length} pagada(s)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {activeOrder.splitMode === 'ITEMS' && subAccounts.length < 12 && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleAddAccount}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer touch-manipulation"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Agregar cuenta</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setPaidBlockedError(null);
                      setShowUndoConfirm(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 active:bg-rose-100 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer touch-manipulation"
                    title="Deshacer la división y volver a cuenta única"
                  >
                    <ArrowCounterClockwise size={14} weight="bold" />
                    <span>Deshacer división</span>
                  </button>
                </div>
              </div>

              {/* Carrusel horizontal de resumen de cada subcuenta con su total */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {subAccounts.map((sa) => {
                  const isPaid = sa.status === 'PAID';
                  const saTotal = Number(sa.fixedAmount ?? sa.total ?? 0);
                  return (
                    <div
                      key={sa.id}
                      className={`px-3 py-1.5 rounded-xl border shrink-0 text-xs flex items-center gap-2 transition-all ${
                        isPaid
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-gray-200 text-gray-800 font-semibold shadow-2xs'
                      }`}
                    >
                      <span className="font-extrabold">{sa.label}</span>
                      <span className="font-mono font-bold">C$ {saTotal.toFixed(2)}</span>
                      {isPaid && (
                        <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal de confirmación para Deshacer División / Juntar Cuentas */}
            {showUndoConfirm && (
              <div className="p-4 bg-amber-50 border-b border-amber-200 space-y-2.5 animate-fadeIn shrink-0">
                <div className="flex items-start gap-2.5">
                  <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-bold text-amber-950">
                      {paidBlockedError
                        ? 'No se puede deshacer la división completa'
                        : '¿Deshacer la división de la mesa?'}
                    </p>
                    <p className="text-[11px] text-amber-900 leading-normal">
                      {paidBlockedError || 'Se juntan todas las cuentas en una sola cuenta única.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUndoConfirm(false);
                      setPaidBlockedError(null);
                    }}
                    className="p-1 text-amber-700 hover:text-amber-950"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUndoConfirm(false);
                      setPaidBlockedError(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-manipulation"
                  >
                    Cancelar
                  </button>

                  {paidBlockedError ? (
                    openAccounts.length > 1 && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleMergeOpenAccounts}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer touch-manipulation shadow-xs"
                      >
                        {isSubmitting ? 'Juntando...' : 'Juntar cuentas abiertas'}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmUndoSplit}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-700 active:bg-rose-800 cursor-pointer touch-manipulation shadow-xs"
                    >
                      {isSubmitting ? 'Deshaciendo...' : 'Sí, deshacer división'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CONTENIDO SEGÚN MODO DE DIVISIÓN */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeOrder.splitMode === 'ITEMS' ? (
                /* MODO POR PRODUCTOS: LISTA DE RENGLONES CON CHIPS A, B, C... */
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Tocá el chip de la cuenta (A, B, C...) para asignar cada renglón:
                  </p>

                  {activeOrder.items.map((item) => {
                    const currentAccount = subAccounts.find((sa) => sa.id === item.subAccountId);
                    const isItemInPaidAccount = currentAccount?.status === 'PAID';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isItemInPaidAccount
                            ? 'bg-slate-50 border-gray-200 opacity-80'
                            : 'bg-white border-gray-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-gray-900 truncate">
                                {item.productName}
                              </span>
                              {item.kitchenRoundId && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  Enviado
                                </span>
                              )}
                              {isItemInPaidAccount && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5 shrink-0">
                                  <CheckCircle size={10} weight="fill" />
                                  Cobrado
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                              {item.quantity} × C$ {item.unitPrice.toFixed(2)} = C$ {(item.subtotal ?? (item.quantity * item.unitPrice)).toFixed(2)}
                            </p>
                            {item.notes && (
                              <p className="text-[10px] text-gray-400 italic truncate mt-0.5">
                                Nota: {item.notes}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono text-gray-900">
                              C$ {(item.subtotal ?? (item.quantity * item.unitPrice)).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Fila de chips de cuentas para asignar este producto */}
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                            Cuenta:
                          </span>
                          {subAccounts.map((sa) => {
                            const isSelected = item.subAccountId === sa.id;
                            const isPaid = sa.status === 'PAID';
                            const letter = sa.label.replace('Cuenta ', '').trim() || sa.label;

                            return (
                              <button
                                key={sa.id}
                                type="button"
                                disabled={isSubmitting || isPaid || isItemInPaidAccount}
                                onClick={() => handleSelectAccountForItem(item, sa)}
                                className={`h-7 min-w-7 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation ${
                                  isSelected
                                    ? isPaid
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-indigo-600 text-white shadow-xs scale-105'
                                    : isPaid
                                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
                                    : 'bg-slate-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 border border-transparent hover:border-indigo-200'
                                }`}
                                title={`${sa.label}${isPaid ? ' (Pagada)' : ''}`}
                              >
                                <span>{letter}</span>
                                {isPaid && <CheckCircle size={10} weight="fill" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* MODO EN PARTES IGUALES: LISTA DE PARTES */
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Montos calculados en partes iguales para cobro individual:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {subAccounts.map((sa, idx) => {
                      const isPaid = sa.status === 'PAID';
                      const saAmount = Number(sa.fixedAmount ?? sa.total ?? 0);

                      return (
                        <div
                          key={sa.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isPaid
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-white border-gray-200 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-gray-900">
                              {sa.label || `Parte ${idx + 1}`}
                            </span>
                            {isPaid ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center gap-1">
                                <CheckCircle size={12} weight="fill" />
                                Pagada ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                Abierta
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-black font-mono text-gray-950 mt-1">
                            C$ {saAmount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {isPaid
                              ? 'Cobrada por el cajero'
                              : 'Pendiente de cobro en caja'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PIE DEL MODAL: COMPARACIÓN DE SUMAS Y VALIDACIÓN */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Total mesa:</span>
                <span className="text-gray-900 font-mono font-black">C$ {tableTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold mt-1">
                <span className="text-gray-500">Suma de las cuentas:</span>
                <span className="text-indigo-900 font-mono font-black">C$ {accountsTotalSum.toFixed(2)}</span>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {isSumMatching ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" />
                      La suma cuadra exactamente con el total
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <WarningCircle size={14} weight="fill" />
                      Diferencia de C$ {(tableTotal - accountsTotalSum).toFixed(2)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 active:bg-black text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer touch-manipulation"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL SECUNDARIO: CANTIDAD A MOVER CUANDO QUANTITY > 1 */}
      {quantityMoveState.isOpen && quantityMoveState.item && quantityMoveState.targetAccount && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">¿Cuántas unidades mover?</h3>
              <button
                type="button"
                onClick={() => setQuantityMoveState({ isOpen: false, item: null, targetAccount: null, selectedQty: 1 })}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Mover renglón de <span className="font-bold text-gray-900">{quantityMoveState.item.productName}</span> a la{' '}
              <span className="font-extrabold text-indigo-700">{quantityMoveState.targetAccount.label}</span>.
            </p>

            {/* Stepper numérico */}
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                type="button"
                disabled={quantityMoveState.selectedQty <= 1 || isSubmitting}
                onClick={() =>
                  setQuantityMoveState((prev) => ({
                    ...prev,
                    selectedQty: Math.max(1, prev.selectedQty - 1),
                  }))
                }
                className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer touch-manipulation"
              >
                -
              </button>

              <span className="text-2xl font-black font-mono text-gray-900 w-12 text-center">
                {quantityMoveState.selectedQty}
              </span>

              <button
                type="button"
                disabled={quantityMoveState.selectedQty >= quantityMoveState.item.quantity || isSubmitting}
                onClick={() =>
                  setQuantityMoveState((prev) => ({
                    ...prev,
                    selectedQty: Math.min(prev.item!.quantity, prev.selectedQty + 1),
                  }))
                }
                className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer touch-manipulation"
              >
                +
              </button>
            </div>

            {/* Botón rápido "Todas las unidades" */}
            {quantityMoveState.item.quantity > 2 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setQuantityMoveState((prev) => ({
                      ...prev,
                      selectedQty: prev.item!.quantity,
                    }))
                  }
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer touch-manipulation"
                >
                  Mover todas ({quantityMoveState.item.quantity} unidades)
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuantityMoveState({ isOpen: false, item: null, targetAccount: null, selectedQty: 1 })}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-manipulation"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmQuantityMove}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold cursor-pointer touch-manipulation shadow-xs"
              >
                {isSubmitting ? 'Moviendo...' : 'Mover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
