import React, { useState, useEffect } from 'react';
import { X, Receipt, Check, Plus, Tag } from '@phosphor-icons/react';
import { ExpenseCategory } from '../../types/finances';
import { useCreateExpense } from '../../hooks/useFinances';
import { getManaguaTodayYMD } from '../../utils/dateManagua';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onOpenManageCategories: () => void;
  currency?: string;
}

const PAYMENT_METHODS = [
  { id: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { id: 'EFECTIVO', label: 'Efectivo (sin caja)' },
  { id: 'TARJETA', label: 'Tarjeta' },
  { id: 'CHEQUE', label: 'Cheque' },
  { id: 'OTRO', label: 'Otro' },
];

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  onOpenManageCategories,
  currency = 'NIO',
}) => {
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(getManaguaTodayYMD());
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const createExpenseMutation = useCreateExpense();

  useEffect(() => {
    if (isOpen) {
      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }
      setAmount('');
      setDescription('');
      setExpenseDate(getManaguaTodayYMD());
      setPaymentMethod('TRANSFERENCIA');
      setReceiptNumber('');
      setError(null);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!categoryId) {
      setError('Selecciona una categoría de gasto');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!description.trim()) {
      setError('Ingresa una descripción del gasto');
      return;
    }

    setError(null);

    await createExpenseMutation.mutateAsync({
      categoryId,
      amount: Math.round(numAmount * 100) / 100,
      description: description.trim(),
      expenseDate: expenseDate || undefined,
      paymentMethod,
      receiptNumber: receiptNumber.trim() || undefined,
      deductFromCurrentShift: false,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Receipt size={18} weight="bold" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Registrar Nuevo Gasto</h3>
              <p className="text-xs text-gray-500">Gastos operativos y administrativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Categoría */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">Categoría *</label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManageCategories();
                }}
                className="text-[11px] font-bold text-gray-700 hover:text-black flex items-center gap-1 cursor-pointer"
              >
                <Tag size={12} />
                <span>Gestionar</span>
              </button>
            </div>
            {categories.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1.5">
                <p>No tienes categorías de gastos creadas aún.</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManageCategories();
                  }}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                >
                  <Plus size={12} weight="bold" />
                  <span>Crear primera categoría</span>
                </button>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Monto y Fecha en 2 columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                  {currency === 'USD' ? '$' : 'C$'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  required
                  className="w-full h-10 pl-8 pr-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Fecha *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Descripción del gasto *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Pago de alquiler del local, luz eléctrica..."
              required
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
            />
          </div>

          {/* Método de pago y Comprobante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Método de pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                No. Comprobante / Ref
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Ej: REC-00912"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Advertencia / Guía contra doble conteo */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 leading-relaxed">
            💡 <strong>Regla operativa:</strong> Las compras de mercadería no son gastos (se computan como costo de venta) y los abonos a proveedores tampoco son gastos. Registra aquí solo gastos operativos como alquiler, energía, planilla, etc.
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          {/* Footer actions */}
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
              disabled={createExpenseMutation.isPending || categories.length === 0}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors disabled:opacity-50"
            >
              {createExpenseMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={14} weight="bold" />
              )}
              <span>Guardar gasto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
