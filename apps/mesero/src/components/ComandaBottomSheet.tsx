import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash,
  CookingPot,
  Sparkle,
  PaperPlaneTilt,
  User,
  NotePencil,
} from '@phosphor-icons/react';
import type { CartItem, ActiveTableOrder } from '../types/mesero';

interface ComandaBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string | number;
  newItems: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  onRemoveItem: (productId: string) => void;
  activeOrder: ActiveTableOrder | null;
  onConfirmSend: () => void;
  isSubmitting: boolean;
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
  newItems,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  activeOrder,
  onConfirmSend,
  isSubmitting,
}) => {
  const [editingNotesProductId, setEditingNotesProductId] = useState<string | null>(null);

  if (!isOpen) return null;

  const newTotal = newItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );
  const activeTotal = activeOrder?.total || 0;
  const grandTotal = newTotal + activeTotal;

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
                <span>Comanda • Mesa {tableNumber}</span>
              </h2>
              <p className="text-xs text-gray-500">
                {newItems.length} {newItems.length === 1 ? 'nuevo ítem' : 'nuevos ítems'} listos para cocina
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
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* SECCIÓN A: Nuevos ítems a enviar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Sparkle size={13} weight="fill" className="text-emerald-600" />
                Nuevos para enviar a cocina
              </span>
              <span className="text-xs font-bold text-emerald-900 font-mono">
                C$ {newTotal.toFixed(2)}
              </span>
            </div>

            {newItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-400">
                No hay nuevos ítems agregados. Tocá productos del catálogo para sumarlos.
              </div>
            ) : (
              <div className="space-y-2.5">
                {newItems.map((item) => {
                  const isEditingNote = editingNotesProductId === item.productId;
                  return (
                    <div
                      key={item.productId}
                      className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2.5 transition-all shadow-2xs"
                    >
                      {/* Fila superior: Nombre, Precio y Stepper */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-gray-900 leading-snug">
                            {item.productName}
                          </h4>
                          <span className="text-xs font-semibold text-emerald-700 font-mono">
                            C$ {item.unitPrice.toFixed(2)} c/u
                          </span>
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

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar de la comanda"
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      {/* Fila de Notas por Ítem */}
                      <div className="space-y-1.5 pt-1 border-t border-emerald-100">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNotesProductId(
                                isEditingNote ? null : item.productId
                              )
                            }
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                          >
                            <NotePencil size={13} weight="bold" />
                            <span>
                              {item.notes ? `Nota: "${item.notes}"` : '+ Agregar nota (ej. sin cebolla)'}
                            </span>
                          </button>
                        </div>

                        {/* Editor de notas con chips rápidos */}
                        {isEditingNote && (
                          <div className="space-y-2 pt-1 animate-fadeIn">
                            {/* Chips de notas rápidas */}
                            <div className="flex flex-wrap gap-1.5">
                              {NOTE_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    const current = item.notes ? `${item.notes}, ${preset}` : preset;
                                    onUpdateNotes(item.productId, current);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-700 active:bg-emerald-100 cursor-pointer touch-manipulation"
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
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECCIÓN B: Ítems ya enviados / en cocina */}
          {activeOrder && activeOrder.items.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <CookingPot size={14} weight="duotone" className="text-amber-600" />
                  Ya pedidos en mesa ({activeOrder.items.length})
                </span>
                <span className="text-xs font-bold text-gray-700 font-mono">
                  C$ {activeTotal.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-gray-200 text-gray-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="font-semibold text-gray-900 truncate">
                          {item.productName}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-amber-800 italic pl-7">
                          "{item.notes}"
                        </p>
                      )}
                      {item.waiterName && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 pl-7">
                          <User size={10} />
                          <span>Tomado por {item.waiterName}</span>
                        </p>
                      )}
                    </div>

                    <span className="font-bold text-gray-700 shrink-0 font-mono">
                      C$ {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Confirmación de envío — SIN BOTÓN DE COBRO */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              Total acumulado de la mesa
            </span>
            <span className="text-lg font-black text-gray-900 font-mono">
              C$ {grandTotal.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={newItems.length === 0 || isSubmitting}
            onClick={onConfirmSend}
            className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Enviando a cocina...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PaperPlaneTilt size={18} weight="bold" />
                <span>
                  Enviar a Cocina ({newItems.reduce((acc, i) => acc + i.quantity, 0)} ítems)
                </span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
