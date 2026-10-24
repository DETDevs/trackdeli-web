import React, { useState } from 'react';
import { X, WarningCircle } from '@phosphor-icons/react';
import { ExpenseItem } from '../../types/finances';
import { useVoidExpense } from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';

interface VoidExpenseModalProps {
  expense: ExpenseItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
}

export const VoidExpenseModal: React.FC<VoidExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  currency = 'NIO',
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const voidExpenseMutation = useVoidExpense();

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Debes especificar un motivo de anulación');
      return;
    }

    setError(null);
    await voidExpenseMutation.mutateAsync({
      id: expense.id,
      dto: { reason: reason.trim() },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <WarningCircle size={18} weight="bold" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Anular Gasto</h3>
              <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Gasto:</span>
              <span className="font-bold text-gray-900">{expense.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Categoría:</span>
              <span className="font-medium text-gray-700">{expense.category.name}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200/60 font-mono">
              <span className="text-gray-500">Monto:</span>
              <span className="font-bold text-rose-700 text-sm">
                {formatCurrency(expense.amount, currency)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Motivo de anulación *
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder="Indica el motivo por el cual se anula este registro..."
              rows={3}
              required
              autoFocus
              className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-rose-600 resize-none"
            />
            {error && <p className="text-[11px] text-rose-600 font-medium mt-1">{error}</p>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={voidExpenseMutation.isPending}
              className="px-4.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {voidExpenseMutation.isPending ? 'Anulando...' : 'Confirmar anulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
