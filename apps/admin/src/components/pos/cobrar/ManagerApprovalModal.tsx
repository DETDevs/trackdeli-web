import React, { useState } from 'react';
import { X, ShieldCheck, CircleNotch, WarningCircle, LockKey } from '@phosphor-icons/react';
import { createPosApprovalToken } from 'api-client';

interface ManagerApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  actionDescription?: string;
  actionCode?: string;
  entityType?: string;
  entityId?: string;
  onApproved: (token: string) => void;
}

export const ManagerApprovalModal: React.FC<ManagerApprovalModalProps> = ({
  isOpen,
  onClose,
  actionTitle = 'Autorización requerida',
  actionDescription = 'Esta acción sobrepasa las políticas estándar y requiere la aprobación de un encargado o supervisor.',
  actionCode = 'CREDIT_LIMIT_OVERRIDE',
  entityType = 'Customer',
  entityId,
  onApproved,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresá el correo y la contraseña del encargado.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createPosApprovalToken({
        approverEmail: email.trim(),
        approverPassword: password.trim(),
        action: actionCode,
        entityType,
        entityId,
      });

      if (res && res.token) {
        onApproved(res.token);
        onClose();
      } else {
        setError('No se pudo obtener el token de autorización.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Credenciales incorrectas o usuario sin permisos de encargado.';
      setError(typeof msg === 'string' ? msg : 'Error de autorización.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldCheck size={20} weight="fill" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 leading-tight">{actionTitle}</h3>
              <p className="text-xs text-gray-500">Aprobación de encargado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            {actionDescription}
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Correo del encargado
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="encargado@empresa.com"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contraseña del encargado
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <LockKey size={15} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900"
              />
            </div>
          </div>

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
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} weight="bold" />
                  <span>Autorizar acción</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

