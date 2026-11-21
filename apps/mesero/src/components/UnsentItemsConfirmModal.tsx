import React from 'react';
import { WarningCircle, PaperPlaneTilt, ArrowRight, X } from '@phosphor-icons/react';

interface UnsentItemsConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  unsentCount: number;
  onSendAndRequest: () => void;
  onContinueWithoutSending: () => void;
  isSubmitting?: boolean;
}

export const UnsentItemsConfirmModal: React.FC<UnsentItemsConfirmModalProps> = ({
  isOpen,
  onClose,
  unsentCount,
  onSendAndRequest,
  onContinueWithoutSending,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <WarningCircle size={24} weight="fill" className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">
                Productos sin enviar a cocina
              </h3>
              <p className="text-xs text-amber-800 font-semibold">
                {unsentCount} {unsentCount === 1 ? 'producto pendiente' : 'productos pendientes'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed">
          Tenés productos sin enviar a cocina. ¿Querés enviarlos antes de pedir la cuenta?
        </p>

        <div className="space-y-2 pt-1">
          {/* Opción 1: Enviar y pedir */}
          <button
            type="button"
            onClick={onSendAndRequest}
            disabled={isSubmitting}
            className="w-full py-3 px-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
          >
            <PaperPlaneTilt size={16} weight="bold" />
            <span>Enviar y pedir</span>
          </button>

          {/* Opción 2: Continuar igual */}
          <button
            type="button"
            onClick={onContinueWithoutSending}
            disabled={isSubmitting}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
          >
            <ArrowRight size={15} weight="bold" />
            <span>Continuar igual</span>
          </button>

          {/* Opción 3: Cancelar */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer touch-manipulation"
          >
            Volver a la comanda
          </button>
        </div>
      </div>
    </div>
  );
};
