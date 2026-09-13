import React, { useState } from 'react';
import { X, CircleNotch, Eye, EyeSlash, Key, Copy, Check, Sparkle } from '@phosphor-icons/react';
import { useResetSuperAdminUserPassword } from '../../../hooks/useSuperAdminUsers';
import { type AdminUser } from 'api-client';
import { toast } from 'react-hot-toast';

interface ChangeUserPasswordModalProps {
  isOpen: boolean;
  user: AdminUser | null;
  onClose: () => void;
}

export const ChangeUserPasswordModal: React.FC<ChangeUserPasswordModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetMutation = useResetSuperAdminUserPassword();

  if (!isOpen || !user) return null;

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = 'Pass-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(result);
    setConfirmPassword(result);
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessPassword(null);
    setCopied(false);
    onClose();
  };

  const isMatching = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    try {
      await resetMutation.mutateAsync({
        id: user.id,
        data: { newPassword },
      });
      setSuccessPassword(newPassword);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al cambiar la contraseña';
      setErrorMessage(msg);
    }
  };

  const handleCopy = () => {
    if (!successPassword) return;
    navigator.clipboard.writeText(successPassword);
    setCopied(true);
    toast.success('Contraseña copiada');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center">
              <Key size={18} weight="regular" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Cambiar Contraseña</h3>
              <p className="text-xs text-gray-500">Para {user.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={resetMutation.isPending}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {successPassword ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-3">
              ¡Contraseña actualizada exitosamente! Compártela con el usuario para su inicio de sesión.
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                Nueva contraseña
              </span>
              <span className="font-mono text-xl font-bold tracking-wider text-gray-900 select-all px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-xs">
                {successPassword}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} weight="bold" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} weight="regular" />
                    <span>Copiar Contraseña</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600">
              Usuario: <span className="font-semibold text-gray-900">{user.name}</span> (
              <span className="font-mono text-gray-700">{user.email}</span>)
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                {errorMessage}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Nueva contraseña <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkle size={12} />
                  Generar
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Confirmar nueva contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-gray-900'
                }`}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px] text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={resetMutation.isPending}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isMatching || resetMutation.isPending}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {resetMutation.isPending && (
                  <CircleNotch size={14} className="animate-spin" />
                )}
                <span>Guardar contraseña</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
