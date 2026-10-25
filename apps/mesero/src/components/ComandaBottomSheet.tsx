import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash,
  CookingPot,
  PaperPlaneTilt,
  User,
  NotePencil,
  WarningCircle,
  CheckCircle,
  ShieldWarning,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import type { CartItem, ActiveTableOrder, TableOrderItem, KitchenRound } from '../types/mesero';

interface ComandaBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string | number;
  tableDisplayName?: string;
  newItems: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  onRemoveItem: (productId: string) => void;
  activeOrder: ActiveTableOrder | null;
  rounds: KitchenRound[];
  onConfirmSend: () => void;
  isSubmitting: boolean;
  isRestaurante?: boolean;
  isNoPrintMode?: boolean;
  onRequestVoid: (item: TableOrderItem, qty?: number) => void;
  onRemoveSavedUnsentItem: (itemId: string) => void;
  onAddMoreOfSentItem: (item: TableOrderItem) => void;
  unprintedAlert: string | null;
  lastSentRoundConfirmation?: string | null;
  onOpenSplitModal?: () => void;
}

const NOTE_PRESETS = [
  'Sin cebolla',
  'Término medio',
  'Bien cocido',
  'Poco picante',
  'Para llevar',
  'Sin hielo',
  'Extra salsa',
  'Sin sal',
];

export const ComandaBottomSheet: React.FC<ComandaBottomSheetProps> = ({
  isOpen,
  onClose,
  tableNumber,
  tableDisplayName,
  newItems,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  activeOrder,
  rounds,
  onConfirmSend,
  isSubmitting,
  isRestaurante = true,
  isNoPrintMode = false,
  onRequestVoid,
  onRemoveSavedUnsentItem,
  onAddMoreOfSentItem,
  unprintedAlert,
  lastSentRoundConfirmation,
  onOpenSplitModal,
}) => {
  const [editingNotesProductId, setEditingNotesProductId] = useState<string | null>(null);

  const cleanRaw = String(tableNumber || '').replace(/^(mesa\s*)+/i, '').trim();
  const fallbackTitle = cleanRaw ? `Mesa ${cleanRaw}` : 'Mesa';
  const displayTitle = tableDisplayName || fallbackTitle;

  // Separar ítems guardados en backend: sin enviar vs ya enviados
  const savedItems = activeOrder?.items || [];
  const savedUnsentItems = savedItems.filter((i) => !i.isSent);
  const sentItems = savedItems.filter((i) => i.isSent);

  // Totales
  const newCartTotal = newItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );
  const savedUnsentTotal = savedUnsentItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );
  const unsentTotal = newCartTotal + savedUnsentTotal;
  const sentTotal = sentItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );
  const grandTotal = unsentTotal + sentTotal;

  const unsentCount =
    newItems.reduce((acc, i) => acc + i.quantity, 0) +
    savedUnsentItems.reduce((acc, i) => acc + i.quantity, 0);

  const isNoPrint = Boolean(
    isNoPrintMode ||
    (rounds.length > 0 && rounds.every((r) => r.printStatus === 'NOT_REQUIRED'))
  );

  // Agrupar ítems enviados por ronda de cocina
  const roundGroups = useMemo(() => {
    if (!isOpen) return [];

    // Rondas de tipo SEND ordenadas por número ascendente
    const sendRounds = rounds
      .filter((r) => r.type === 'SEND')
      .sort((a, b) => (a.number || 0) - (b.number || 0));

    const groups: Array<{
      roundId: string | null;
      roundNumber: number;
      round?: KitchenRound;
      items: TableOrderItem[];
      hasUnprintedAlert: boolean;
      unprintedMessage?: string;
    }> = [];

    const assignedItemIds = new Set<string>();

    sendRounds.forEach((round) => {
      const roundItems = sentItems.filter((item) => item.kitchenRoundId === round.id);
      if (roundItems.length > 0) {
        roundItems.forEach((i) => assignedItemIds.add(i.id));

        // Solo si la ronda tiene impresión pendiente o fallida y no estamos en modo no imprimir
        let hasUnprintedAlert = false;
        let unprintedMessage = '';

        if (!isNoPrint && round.printStatus !== 'NOT_REQUIRED') {
          if (round.printStatus === 'FAILED') {
            hasUnprintedAlert = true;
            unprintedMessage = 'Error de impresión ⚠';
          } else if (round.printStatus === 'PENDING') {
            hasUnprintedAlert = true;
            unprintedMessage = 'Pendiente de imprimir';
          }
        }

        groups.push({
          roundId: round.id,
          roundNumber: round.number,
          round,
          items: roundItems,
          hasUnprintedAlert,
          unprintedMessage,
        });
      }
    });

    // Ítems enviados que no tengan kitchenRoundId asignado o cuya ronda no esté en la lista
    const unassignedItems = sentItems.filter((i) => !assignedItemIds.has(i.id));
    if (unassignedItems.length > 0) {
      groups.push({
        roundId: null,
        roundNumber: groups.length > 0 ? groups[groups.length - 1].roundNumber + 1 : 1,
        items: unassignedItems,
        hasUnprintedAlert: false,
      });
    }

    return groups;
  }, [isOpen, rounds, sentItems, isNoPrint]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content */}
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-sheet max-h-[88vh] flex flex-col animate-slideUp overflow-hidden">
        {/* Drag handle & Header */}
        <div className="p-4 pb-3 border-b border-gray-100 flex flex-col items-center">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-3" />
          <div className="w-full flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Comanda • {displayTitle}</span>
              </h2>
              <p className="text-xs text-gray-500">
                {unsentCount > 0
                  ? `${unsentCount} ${unsentCount === 1 ? 'producto sin enviar' : 'productos sin enviar'}`
                  : 'Todos los productos ya fueron enviados a cocina'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Banner de alerta: comanda sin imprimir tras 60s */}
          {unprintedAlert && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 text-xs font-semibold shadow-xs animate-fadeIn">
              <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-amber-900">Atención en cocina</p>
                <p>{unprintedAlert}</p>
              </div>
            </div>
          )}

          {/* Banner de confirmación de última ronda enviada */}
          {lastSentRoundConfirmation && (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2 text-xs font-semibold animate-fadeIn">
              <CheckCircle size={18} weight="fill" className="text-blue-600 shrink-0" />
              <span>{lastSentRoundConfirmation}</span>
            </div>
          )}

          {/* SECCIÓN A: Ítems SIN ENVIAR (Diferenciados visualmente con punto de color) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs ring-2 ring-amber-200 animate-pulse" />
                <span>Sin enviar a cocina ({unsentCount})</span>
              </span>
              <span className="text-xs font-bold text-amber-950 font-mono">
                C$ {unsentTotal.toFixed(2)}
              </span>
            </div>

            {unsentCount === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-400">
                No hay renglones sin enviar. Tocá productos del catálogo para agregarlos.
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* 1. Ítems nuevos en carrito local */}
                {newItems.map((item) => {
                  const isEditingNote = editingNotesProductId === item.productId;
                  return (
                    <div
                      key={`new-${item.productId}`}
                      className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2.5 transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <h4 className="text-xs font-bold text-gray-900 leading-snug">
                              {item.productName}
                            </h4>
                          </div>
                          <div className="pl-4 flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-semibold text-amber-800 font-mono">
                              C$ {item.unitPrice.toFixed(2)} c/u
                            </span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                              Sin enviar
                            </span>
                          </div>
                        </div>

                        {/* Stepper + / - */}
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.productId, -1)}
                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center font-bold cursor-pointer touch-manipulation transition-colors"
                          >
                            <Minus size={13} weight="bold" />
                          </button>

                          <span className="w-6 text-center text-xs font-extrabold text-gray-900 font-mono">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.productId, 1)}
                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center font-bold cursor-pointer touch-manipulation transition-colors"
                          >
                            <Plus size={13} weight="bold" />
                          </button>
                        </div>

                        {/* Botón quitar sin enviar (1 toque con deshacer breve) */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Quitar ítem sin enviar"
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      {/* Notas de ítem */}
                      <div className="space-y-1.5 pt-1 border-t border-amber-100">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNotesProductId(
                                isEditingNote ? null : item.productId
                              )
                            }
                            className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                          >
                            <NotePencil size={13} weight="bold" />
                            <span>
                              {item.notes ? `Nota: "${item.notes}"` : '+ Agregar nota (ej. sin cebolla)'}
                            </span>
                          </button>
                        </div>

                        {isEditingNote && (
                          <div className="space-y-2 pt-1 animate-fadeIn">
                            <div className="flex flex-wrap gap-1.5">
                              {NOTE_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    const current = item.notes ? `${item.notes}, ${preset}` : preset;
                                    onUpdateNotes(item.productId, current);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-700 active:bg-amber-100 cursor-pointer touch-manipulation"
                                >
                                  +{preset}
                                </button>
                              ))}
                            </div>

                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => onUpdateNotes(item.productId, e.target.value)}
                              placeholder="Escribir indicación especial..."
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Ítems guardados en backend pero aún sin ronda de cocina */}
                {savedUnsentItems.map((item) => (
                  <div
                    key={`saved-unsent-${item.id}`}
                    className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-1.5 transition-all shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <h4 className="text-xs font-bold text-gray-900 leading-snug">
                            {item.productName}
                          </h4>
                        </div>
                        <div className="pl-4 flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-amber-800 font-mono">
                            {item.quantity}x • C$ {item.unitPrice.toFixed(2)} c/u
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                            Sin enviar
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-amber-800 italic pl-4">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      {/* Quitar renglón sin enviar (con deshacer breve) */}
                      <button
                        type="button"
                        onClick={() => onRemoveSavedUnsentItem(item.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Quitar ítem sin enviar"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN B: Ítems YA ENVIADOS a cocina agrupados por ronda */}
          {sentItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <CookingPot size={14} weight="duotone" className="text-indigo-600" />
                  Enviados a cocina ({sentItems.length})
                </span>
                <span className="text-xs font-bold text-gray-700 font-mono">
                  C$ {sentTotal.toFixed(2)}
                </span>
              </div>

              {/* Rondas de cocina */}
              <div className="space-y-3.5">
                {roundGroups.map((group) => (
                  <div
                    key={group.roundId || `round-${group.roundNumber}`}
                    className="space-y-2 rounded-2xl bg-slate-50/70 border border-slate-200/90 p-2.5"
                  >
                    {/* Encabezado de la Ronda con alerta única */}
                    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        <span className="text-xs font-bold text-gray-800 truncate">
                          Ronda {group.roundNumber} · Enviada a cocina
                        </span>
                      </div>

                      {/* Alerta única por ronda: solo si está pendiente o fallida */}
                      {group.hasUnprintedAlert && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0 animate-fadeIn">
                          <WarningCircle size={12} weight="fill" className="text-amber-600 shrink-0" />
                          <span>{group.unprintedMessage || 'Pendiente de imprimir'}</span>
                        </span>
                      )}
                    </div>

                    {/* Tarjetas de línea compactas */}
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <div
                          key={`sent-${item.id}`}
                          className="p-2.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs space-y-1.5 transition-all"
                        >
                          {/* Fila principal: Nombre, cantidad x precio, total y Stepper */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-gray-900 truncate">
                                {item.productName}
                              </h4>
                              <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{item.quantity}x a C$ {item.unitPrice.toFixed(2)}</span>
                                <span className="text-gray-300">·</span>
                                <span className="font-bold text-gray-800">
                                  C$ {(item.quantity * item.unitPrice).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Stepper compacto */}
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onRequestVoid(item, 1)}
                                className="w-6 h-6 rounded-md bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 flex items-center justify-center font-bold cursor-pointer touch-manipulation transition-colors border border-gray-200/60 shadow-2xs"
                                title="Anulación parcial (bajar 1 cantidad con PIN)"
                              >
                                <Minus size={11} weight="bold" />
                              </button>

                              <span className="w-5 text-center text-xs font-extrabold text-gray-900 font-mono">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() => onAddMoreOfSentItem(item)}
                                className="w-6 h-6 rounded-md bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold cursor-pointer touch-manipulation transition-colors border border-gray-200/60 shadow-2xs"
                                title="Agregar 1 unidad más para la siguiente ronda"
                              >
                                <Plus size={11} weight="bold" />
                              </button>
                            </div>
                          </div>

                          {/* Notas si existen */}
                          {item.notes && (
                            <p className="text-[11px] text-amber-800 italic bg-amber-50/60 px-2 py-0.5 rounded-md border border-amber-100/80">
                              "{item.notes}"
                            </p>
                          )}

                          {/* Fila inferior compacta: Tomado por (izq) y Solicitar anulación (der) en una sola fila */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100/80">
                            <span className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                              <User size={10} className="shrink-0 text-gray-400" />
                              <span>{item.waiterName ? `Por ${item.waiterName}` : 'Enviado'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => onRequestVoid(item)}
                              className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 text-[10px] font-bold transition-colors cursor-pointer touch-manipulation border border-rose-200/60 whitespace-nowrap flex items-center gap-1"
                            >
                              <ShieldWarning size={11} weight="bold" />
                              <span>Solicitar anulación</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Confirmación de envío — SIN BOTÓN DE COBRO */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
          {/* Opción de dividir cuenta para Restaurante si hay productos guardados */}
          {isRestaurante && onOpenSplitModal && ((activeOrder?.items?.length || 0) > 0 || (activeOrder?.subAccounts?.length || 0) > 0) && (
            <button
              type="button"
              onClick={onOpenSplitModal}
              className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 border border-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
            >
              <ArrowsLeftRight size={16} weight="bold" />
              <span>
                {activeOrder?.splitMode
                  ? `Gestionar cuentas divididas (${activeOrder.subAccounts?.length || 0})`
                  : 'Dividir cuenta'}
              </span>
            </button>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              Total acumulado de la mesa
            </span>
            <span className="text-lg font-black text-gray-900 font-mono">
              C$ {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Botón Fijo "Enviar a cocina (N)" — Visible solo si hay renglones sin enviar y perfil Restaurante */}
          {isRestaurante ? (
            <button
              type="button"
              disabled={unsentCount === 0 || isSubmitting}
              onClick={onConfirmSend}
              className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Enviando a cocina...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PaperPlaneTilt size={18} weight="bold" />
                  <span>
                    {unsentCount > 0
                      ? `Enviar a cocina (${unsentCount})`
                      : 'Todo enviado a cocina'}
                  </span>
                </span>
              )}
            </button>
          ) : (
            /* Perfil Taller o Cocina apagada: botón normal sin rondas */
            <button
              type="button"
              disabled={unsentCount === 0 || isSubmitting}
              onClick={onConfirmSend}
              className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-black text-white font-extrabold text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              {isSubmitting ? (
                <span>Guardando pedido...</span>
              ) : (
                <span>Guardar comanda ({unsentCount})</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
