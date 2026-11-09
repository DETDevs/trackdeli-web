import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Plus,
  Minus,
  WarningCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { adjustPosProductStock, type PosProductItem } from 'api-client';
import { formatQuantity } from '../../../utils/formatters';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  product: PosProductItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ADJUSTMENT_CONCEPTS = [
  'Corrección manual de conteo',
  'Ingreso de mercadería / Compra',
  'Avería / Producto dañado',
  'Vencimiento / Caducidad',
  'Merma operativa',
  'Pérdida desconocida / Hurto',
  'Devolución de cliente',
  'Uso interno / Muestra',
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
}) => {
  const [operationType, setOperationType] = useState<'ENTRY' | 'OUT'>('ENTRY');
  const [quantityStr, setQuantityStr] = useState<string>('1');
  const [concept, setConcept] = useState<string>('Corrección manual de conteo');
  const [reference, setReference] = useState<string>('');
  const [costStr, setCostStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const currentStock = Number(product.stock || 0);
  const isUnd = !product.unit || product.unit === 'UND';
  const qtyNum = parseFloat(quantityStr) || 0;
  const delta = operationType === 'ENTRY' ? qtyNum : -qtyNum;
  const resultingStock = Math.round((currentStock + delta) * 1000) / 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (qtyNum <= 0) {
      setErrorMsg('La cantidad debe ser mayor a cero.');
      return;
    }

    if (isUnd && !Number.isInteger(qtyNum)) {
      setErrorMsg('Para productos en unidades (UND), la cantidad debe ser un número entero.');
      return;
    }

    if (!concept.trim()) {
      setErrorMsg('El motivo o concepto del ajuste es obligatorio.');
      return;
    }

    setIsSubmitting(true);

    try {
      await adjustPosProductStock(product.id, {
        quantity: operationType === 'ENTRY' ? qtyNum : -qtyNum,
        type: 'AJUSTE',
        concept: concept.trim(),
        cost: costStr ? parseFloat(costStr) : undefined,
        reference: reference.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || err?.message || 'Ocurrió un error al registrar el ajuste de stock.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center">
              <SlidersHorizontal size={18} weight="bold" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 leading-tight">Ajustar stock</h3>
              <p className="text-xs text-gray-500 truncate max-w-[220px]">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de Operación: Entrada (+) vs Salida (-) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperationType('ENTRY')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer ${
                  operationType === 'ENTRY'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Plus size={16} weight="bold" />
                <span>Entrada / Aumento</span>
              </button>

              <button
                type="button"
                onClick={() => setOperationType('OUT')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer ${
                  operationType === 'OUT'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Minus size={16} weight="bold" />
                <span>Salida / Disminución</span>
              </button>
            </div>
          </div>

          {/* Cantidad y Unidad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">
                Cantidad a {operationType === 'ENTRY' ? 'ingresar' : 'retirar'} *
              </label>
              <span className="text-xs text-gray-500 font-medium">
                Unidad: {product.unit || 'UND'}
              </span>
            </div>
            <input
              type="number"
              step={isUnd ? '1' : '0.001'}
              min="0.001"
              required
              value={quantityStr}
              onChange={(e) => setQuantityStr(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
            />
          </div>

          {/* Vista previa de Stock Resultante */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500 block">Stock actual</span>
              <span className="font-bold text-gray-900">
                {formatQuantity(currentStock)} {product.unit || 'UND'}
              </span>
            </div>

            <div className="text-center font-bold text-gray-400">
              {operationType === 'ENTRY' ? '+ ' : '- '} {qtyNum || 0}
            </div>

            <div className="text-right">
              <span className="text-gray-500 block">Stock resultante</span>
              <span
                className={`font-black ${
                  resultingStock < 0
                    ? 'text-red-700'
                    : resultingStock <= Number(product.minStock || 0)
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {formatQuantity(resultingStock)} {product.unit || 'UND'}
              </span>
            </div>
          </div>

          {/* Motivo o Concepto */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motivo o concepto *
            </label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
            >
              {ADJUSTMENT_CONCEPTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Referencia o Nota */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nota o referencia adicional (opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: Factura #1234, conteo físico estante A"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
            />
          </div>

          {/* Costo unitario si es entrada */}
          {operationType === 'ENTRY' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Costo unitario de compra (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costStr}
                onChange={(e) => setCostStr(e.target.value)}
                placeholder={product.cost ? product.cost.toString() : 'Costo unitario C$'}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
              />
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 min-h-[44px] cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Aplicando ajuste...</span>
                </>
              ) : (
                <span>Confirmar ajuste</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
