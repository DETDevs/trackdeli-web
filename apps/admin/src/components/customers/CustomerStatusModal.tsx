import React, { useState, useEffect } from 'react';
import {
  UserMinus,
  X,
  WarningCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import { updateCustomerStatus, type Customer } from 'api-client';
import { formatCurrency } from '../../utils/formatters';

export interface CustomerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: (updated: Customer) => void;
}

export const CustomerStatusModal: React.FC<CustomerStatusModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setErrorMsg(null);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const pendingBalance = Number(customer.currentBalance ?? customer.balance ?? 0);
  const hasDebt = pendingBalance > 0.005;

  const handleConfirmDeactivate = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await updateCustomerStatus(customer.id, false);
      toast.success('Cliente desactivado correctamente');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const rawMessage =
        err?.response?.data?.message || err?.message || 'Error al desactivar el cliente';
      setErrorMsg(Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <UserMinus size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                Desactivar cliente
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{customer.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs text-gray-600">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
              <WarningCircle size={16} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="leading-relaxed text-gray-700">
            ¿Querés desactivar a <strong className="text-gray-900">{customer.name}</strong>?
          </p>

          {hasDebt && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                Tiene un saldo pendiente de{' '}
                <strong className="font-bold">{formatCurrency(pendingBalance)}</strong>. La deuda se
                conserva en Cartera de Cobro, pero no aparecerá en el buscador de caja.
              </p>
            </div>
          )}

          <p className="text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
            El cliente <strong>conservará todo su historial</strong> de ventas, créditos y citas,
            pero <strong>no aparecerá en las búsquedas al cobrar</strong> en el punto de venta.
          </p>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <UserMinus size={14} weight="bold" />
              )}
              <span>Desactivar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
