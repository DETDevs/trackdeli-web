import React, { useState, useEffect } from 'react';
import { X, WarningCircle, FloppyDisk, Clock, Tag } from '@phosphor-icons/react';
import { updatePosBatch } from 'api-client';
import { extractApiErrorMessage } from '../../../utils/productCost';
import { formatQuantity } from '../../../utils/formatters';

export interface BatchToEdit {
  id: string;
  batchNumber: string;
  expiryDate: string | null;
  quantity?: number;
  productName?: string;
  unit?: string;
}

interface EditBatchModalProps {
  isOpen: boolean;
  batch: BatchToEdit | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  isOpen,
  batch,
  onClose,
  onSuccess,
}) => {
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && batch) {
      setBatchNumber(batch.batchNumber || '');
      if (batch.expiryDate) {
        const str = String(batch.expiryDate);
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          setExpiryDate(str.slice(0, 10));
        } else {
          const d = new Date(str);
          setExpiryDate(!isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '');
        }
      } else {
        setExpiryDate('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, batch]);

  if (!isOpen || !batch) return null;

  const isWithoutDate = !batch.expiryDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = batchNumber.trim();
    if (!trimmed) {
      setErrorMsg('El número de lote no puede quedar vacío.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await updatePosBatch(batch.id, {
        batchNumber: trimmed,
        expiryDate: expiryDate ? expiryDate : null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        extractApiErrorMessage(err, 'No se pudo actualizar el lote. Revisá los datos e intentá de nuevo.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-batch-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 id="edit-batch-title" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Tag size={16} className="text-purple-700 shrink-0" />
              <span className="truncate">
                {isWithoutDate ? 'Completar datos del lote' : 'Editar lote y vencimiento'}
              </span>
            </h3>
            {batch.productName && (
              <p className="text-xs text-gray-600 mt-0.5 truncate">{batch.productName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
            aria-label="Cerrar edición de lote"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
              <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isWithoutDate && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
              <Clock size={18} className="shrink-0 text-amber-700 mt-0.5" />
              <div>
                <p className="font-semibold">Lote sin fecha de vencimiento</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Si asignás la fecha, el sistema mostrará alertas y priorizará la salida FEFO al vender.
                </p>
              </div>
            </div>
          )}

          {batch.quantity !== undefined && (
            <div className="px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Existencia en este lote</span>
              <span className="font-mono font-bold text-gray-900">
                {formatQuantity(batch.quantity, batch.unit || 'UND')}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Número de lote <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Ej. LOT-2026-001"
              className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:border-purple-600 transition-colors"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Fecha de vencimiento
              </label>
              {expiryDate && (
                <button
                  type="button"
                  onClick={() => setExpiryDate('')}
                  className="text-xs font-medium text-red-700 hover:text-red-800 underline px-1 py-0.5"
                >
                  Quitar fecha
                </button>
              )}
            </div>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:border-purple-600 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Dejá vacío si este lote no tiene fecha de caducidad conocida.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !batchNumber.trim()}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <FloppyDisk size={16} weight="bold" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

