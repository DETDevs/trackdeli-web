import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowUUpLeft,
  WarningCircle,
  Plus,
  Minus,
} from '@phosphor-icons/react';
import { returnPosSale } from 'api-client';
import { useAuthStore } from '../../../store/auth.store';
import { usePosWebDevice } from '../../../hooks/usePosWebDevice';
import { usePosPolicies } from '../../../hooks/usePosPolicies';
import { ManagerApprovalModal } from '../cobrar/ManagerApprovalModal';
import { formatCurrency, formatQuantity } from '../../../utils/formatters';

export interface ReturnableSaleItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  returnedQty?: number;
  unitPrice: number;
  total?: number;
}

interface ReturnSaleModalProps {
  isOpen: boolean;
  sale: {
    id: string;
    invoiceNumber: string;
    createdAt?: string;
    paymentMethod?: string | null;
    payments?: Array<{ method?: string; amount?: number }>;
    customer?: { name?: string; phone?: string | null } | null;
    customerName?: string;
    customerPhone?: string | null;
    items?: ReturnableSaleItem[];
  } | null;
  onClose: () => void;
  onSuccess: (returnResult: any) => void;
  currency?: string;
}


export const ReturnSaleModal: React.FC<ReturnSaleModalProps> = ({
  isOpen,
  sale,
  onClose,
  onSuccess,
  currency = 'NIO',
}) => {
  const user = useAuthStore((state) => state.user);
  const { deviceId, deviceSecret } = usePosWebDevice();
  const { data: policies } = usePosPolicies();

  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Producto defectuoso / Dañado');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<string>('EFECTIVO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal de autorización
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Clave de idempotencia única por intento de devolución (se preserva en reintentos y autorizaciones)
  const idempotencyKeyRef = useRef<string>('');

  // Inicializar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen && sale) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `ret-${Date.now()}`;
      }
      setReturnQtys({});
      setReason('Producto defectuoso / Dañado');
      setCustomReason('');
      setErrorMsg(null);

      // Métodos de reembolso permitidos (solo con los que se pagó la venta)
      const methods: string[] = [];
      if (sale.payments && sale.payments.length > 0) {
        sale.payments.forEach((p) => {
          if (p.method && p.method !== 'MIXTO' && !methods.includes(p.method)) {
            methods.push(p.method);
          }
        });
      } else if (sale.paymentMethod && sale.paymentMethod !== 'MIXTO') {
        methods.push(sale.paymentMethod);
      }
      if (methods.length === 0) methods.push('EFECTIVO');
      setRefundMethod(methods[0]);
    } else {
      idempotencyKeyRef.current = '';
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const returnsEnabled = policies?.returnsEnabled ?? true;
  const returnsRequireApproval = policies?.returnsRequireApproval ?? true;
  const returnsMaxDays = policies?.returnsMaxDays ?? 30;

  const isCashier = user?.role === 'CAJERO';
  const needsManagerApproval = isCashier && returnsRequireApproval;

  const saleDate = new Date(sale.createdAt || Date.now()).getTime();
  const daysSinceSale = Math.max(0, Math.floor((Date.now() - saleDate) / (1000 * 60 * 60 * 24)));
  const isExpiredWindow = daysSinceSale > returnsMaxDays;

  // Lista de items con cantidades retornables
  const itemsWithReturnable = (sale.items || []).map((it) => {
    const returned = Number(it.returnedQty || 0);
    const returnable = Math.max(0, Number(it.quantity) - returned);
    const itemId = it.id || it.productId || it.productName;
    const currentQty = returnQtys[itemId] || 0;
    const refundAmount = Number((currentQty * Number(it.unitPrice)).toFixed(2));

    return {
      ...it,
      itemId,
      returned,
      returnable,
      currentQty,
      refundAmount,
    };
  });

  const totalItemsToReturn = itemsWithReturnable.reduce((acc, it) => acc + it.currentQty, 0);
  const totalEstimatedRefund = itemsWithReturnable.reduce((acc, it) => acc + it.refundAmount, 0);

  const handleQtyChange = (itemId: string, maxQty: number, nextVal: number) => {
    const val = Math.max(0, Math.min(maxQty, Number(nextVal.toFixed(3))));
    setReturnQtys((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleReturnAll = () => {
    const all: Record<string, number> = {};
    itemsWithReturnable.forEach((it) => {
      if (it.returnable > 0) {
        all[it.itemId] = it.returnable;
      }
    });
    setReturnQtys(all);
  };

  const handleClearSelection = () => {
    setReturnQtys({});
  };

  const getFullReason = () => {
    if (reason === 'OTRO') {
      return customReason.trim() ? `Otro: ${customReason.trim()}` : 'Otro motivo';
    }
    return customReason.trim() ? `${reason}: ${customReason.trim()}` : reason;
  };

  const executeReturn = async (approvalToken?: string) => {
    if (totalItemsToReturn <= 0) {
      setErrorMsg('Debés seleccionar al menos un producto y cantidad para devolver.');
      return;
    }

    const payloadItems = itemsWithReturnable
      .filter((it) => it.currentQty > 0)
      .map((it) => ({
        saleItemId: it.itemId,
        qty: it.currentQty,
      }));

    if (payloadItems.length === 0) {
      setErrorMsg('No hay artículos seleccionados para la devolución.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const fullReason = getFullReason();
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `ret-${Date.now()}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      const response = await returnPosSale(
        sale.id,
        {
          items: payloadItems,
          reason: fullReason,
          refundMethod,
          approvalToken: approvalToken || undefined,
        },
        {
          'X-Device-Id': deviceId || undefined,
          'X-Device-Secret': deviceSecret || undefined,
          'Idempotency-Key': idempotencyKey,
        }
      );

      setIsSubmitting(false);
      idempotencyKeyRef.current = '';
      onSuccess(response);
    } catch (err: any) {
      setIsSubmitting(false);
      const code = err?.response?.data?.code || err?.response?.data?.message?.code;
      const msg = err?.response?.data?.message?.message || err?.response?.data?.message || 'Error al procesar la devolución';

      if (code === 'APPROVAL_TOKEN_REQUIRED' || code === 'INVALID_APPROVAL_TOKEN' || code === 'RETURN_WINDOW_EXPIRED') {
        setIsApprovalModalOpen(true);
      } else {
        setErrorMsg(typeof msg === 'string' ? msg : 'Error al procesar la devolución');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnsEnabled) {
      setErrorMsg('Las devoluciones están deshabilitadas en la configuración del negocio.');
      return;
    }

    if (needsManagerApproval || isExpiredWindow) {
      setIsApprovalModalOpen(true);
    } else {
      executeReturn();
    }
  };

  const handleApprovalSuccess = (token: string) => {
    setIsApprovalModalOpen(false);
    executeReturn(token);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-2xs">
                <ArrowUUpLeft size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Devolución de Venta #{sale.invoiceNumber}
                </h3>
                <p className="text-xs text-amber-800">Seleccioná los artículos a reembolsar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-xl hover:bg-amber-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isExpiredWindow && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                ⚠️ El plazo estándar de devoluciones ({returnsMaxDays} días) ha sido superado. Se requerirá autorización del encargado para proceder.
              </div>
            )}

            {/* Acciones rápidas de selección */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-800">Productos vendidos</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReturnAll}
                  className="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-pointer transition-colors"
                >
                  Devolver todo
                </button>
                {totalItemsToReturn > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de productos con selector de cantidad */}
            <div className="space-y-2">
              {itemsWithReturnable.map((it) => {
                const isSelected = it.currentQty > 0;
                return (
                  <div
                    key={it.itemId}
                    className={`p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/30 shadow-2xs'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-gray-900 truncate">{it.productName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatCurrency(it.unitPrice, currency)} c/u • Comprados: {formatQuantity(it.quantity)}
                          {it.returned > 0 && ` (Ya devueltos: ${formatQuantity(it.returned)})`}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-xs text-gray-900 shrink-0">
                        {it.returnable > 0 ? `Max: ${formatQuantity(it.returnable)}` : 'Sin saldo'}
                      </span>
                    </div>

                    {it.returnable > 0 ? (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-medium">Cantidad a devolver:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(it.itemId, it.returnable, it.currentQty - 1)}
                            disabled={it.currentQty <= 0}
                            className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={it.returnable}
                            value={it.currentQty || ''}
                            onChange={(e) => handleQtyChange(it.itemId, it.returnable, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-16 h-9 text-center font-bold text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(it.itemId, it.returnable, it.currentQty + 1)}
                            disabled={it.currentQty >= it.returnable}
                            className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 cursor-pointer"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mt-1">
                        Todos los artículos de esta línea ya fueron reembolsados.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Resumen del reembolso */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-500 block">Artículos a devolver</span>
                <span className="font-bold text-xs text-gray-900">
                  {totalItemsToReturn} {totalItemsToReturn === 1 ? 'unidad' : 'unidades'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-500 block">Monto a reembolsar</span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {formatCurrency(totalEstimatedRefund, currency)}
                </span>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Motivo de la devolución <span className="text-rose-600">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900"
              >
                <option value="Producto defectuoso / Dañado">Producto defectuoso / Dañado</option>
                <option value="Inconformidad con el producto">Inconformidad con el producto</option>
                <option value="Error en cobro o cantidad despachada">Error en cobro o cantidad despachada</option>
                <option value="OTRO">Otro motivo (especificar)</option>
              </select>
            </div>

            {/* Detalle adicional si es otro motivo */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Observaciones adicionales (opcional)
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Escribí notas de la devolución..."
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-gray-900"
              />
            </div>

            {/* Método de Reembolso */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Método de reembolso
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>

            {needsManagerApproval && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                🔒 Tu rol de <strong>Cajero</strong> requiere autorización del encargado para completar esta devolución.
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalItemsToReturn <= 0 || !returnsEnabled}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowUUpLeft size={16} weight="bold" />
                    <span>Confirmar devolución</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de autorización del encargado */}
      <ManagerApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApproved={handleApprovalSuccess}
        actionTitle="Devolución de productos"
        actionCode="DEVOLUCION"
        actionDescription={`Se requiere la autorización de un encargado para procesar la devolución de la venta #${sale.invoiceNumber}.`}
      />
    </>
  );
};
