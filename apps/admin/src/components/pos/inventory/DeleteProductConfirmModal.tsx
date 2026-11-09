import React, { useState } from 'react';
import { WarningCircle, Trash, X } from '@phosphor-icons/react';
import { PosProductItem, deletePosProduct } from 'api-client';

interface DeleteProductConfirmModalProps {
  isOpen: boolean;
  product: PosProductItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteProductConfirmModal: React.FC<DeleteProductConfirmModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deletePosProduct(product.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo desactivar el producto. Inténtalo nuevamente.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Desactivar producto
              </h2>
              <p className="text-xs text-gray-500">
                Confirmación de retiro de catálogo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
              <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-gray-600 leading-relaxed">
            ¿Estás seguro de que deseas desactivar{' '}
            <strong className="text-gray-900 font-semibold">{product.name}</strong>?
          </p>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs text-gray-500 space-y-1">
            <p>
              • El producto ya no aparecerá disponible para ventas en el punto de venta.
            </p>
            <p>
              • El historial de ventas y compras anteriores no se verá afectado.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="min-h-[44px] px-4 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Desactivando...</span>
              </>
            ) : (
              <>
                <Trash size={16} weight="bold" />
                <span>Sí, desactivar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

