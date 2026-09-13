import React, { useState } from 'react';
import { X, CircleNotch, Eye, EyeSlash, Sparkle, UserCheck } from '@phosphor-icons/react';
import { useCreateAdminUser } from '../../hooks/useAdminUsers';
import { type AdminUser } from 'api-client';

interface CreateCajeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser, initialPassword: string) => void;
}

export const CreateCajeroModal: React.FC<CreateCajeroModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateAdminUser();

  if (!isOpen) return null;

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = 'Caj-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      setErrorMessage('Por favor ingresa el nombre del cajero');
      return;
    }

    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setErrorMessage('Por favor ingresa un correo electrónico válido');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const createdUser = await createMutation.mutateAsync({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: trimmedPassword,
        role: 'CAJERO',
      });

      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setErrorMessage(null);

      onSuccess(createdUser, trimmedPassword);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || 'Ocurrió un error al registrar el cajero';
      setErrorMessage(serverMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Agregar Cajero</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Crea una cuenta para que un cajero opere el sistema POS
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Rol asignado:</span>
            <span className="inline-flex items-center gap-1 font-medium text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded">
              <UserCheck size={14} className="text-brand-600" />
              Cajero (POS)
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="cajero@tunegocio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              placeholder="+505 8888-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Contraseña inicial <span className="text-red-500">*</span>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-gray-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Podrás ver y copiar la contraseña una vez creado el usuario.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {createMutation.isPending && (
                <CircleNotch size={14} className="animate-spin" />
              )}
              <span>Crear Cajero</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
