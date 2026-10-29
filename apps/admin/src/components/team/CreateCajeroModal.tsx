import React, { useState } from 'react';
import { X, CircleNotch, Eye, EyeSlash, Sparkle, UserCheck, Tag, Info } from '@phosphor-icons/react';
import { useCreateAdminUser } from '../../hooks/useAdminUsers';
import { type AdminUser } from 'api-client';

interface CreateCajeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser, initialPassword: string) => void;
  twoStepSaleEnabled?: boolean;
}

export const CreateCajeroModal: React.FC<CreateCajeroModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  twoStepSaleEnabled = false,
}) => {
  const [role, setRole] = useState<'CAJERO' | 'VENDEDOR'>('CAJERO');
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
    let result = role === 'VENDEDOR' ? 'Ven-' : 'Caj-';
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
      setErrorMessage(
        twoStepSaleEnabled
          ? 'Por favor ingresa el nombre del usuario'
          : 'Por favor ingresa el nombre del cajero'
      );
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

    const assignedRole = twoStepSaleEnabled ? role : 'CAJERO';

    try {
      const createdUser = await createMutation.mutateAsync({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: trimmedPassword,
        role: assignedRole,
      });

      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('CAJERO');
      setErrorMessage(null);

      onSuccess(createdUser, trimmedPassword);
    } catch (err: any) {
      const msgObj = err?.response?.data?.message;
      const serverMsg =
        typeof msgObj === 'string'
          ? msgObj
          : msgObj?.message || 'Ocurrió un error al registrar el usuario';
      setErrorMessage(serverMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {twoStepSaleEnabled ? 'Agregar Usuario' : 'Agregar Cajero'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {twoStepSaleEnabled
                ? 'Crea una cuenta para que un cajero o vendedor opere en el punto de venta'
                : 'Crea una cuenta para que un cajero opere el sistema POS'}
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
          {twoStepSaleEnabled ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Rol del usuario <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="role-cajero"
                  onClick={() => setRole('CAJERO')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                    role === 'CAJERO'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <UserCheck size={16} />
                  <div>
                    <p className="font-semibold">Cajero</p>
                    <p className={role === 'CAJERO' ? 'text-gray-300 text-[10px]' : 'text-gray-400 text-[10px]'}>
                      Cobra en POS
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  id="role-vendedor"
                  onClick={() => setRole('VENDEDOR')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                    role === 'VENDEDOR'
                      ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Tag size={16} />
                  <div>
                    <p className="font-semibold">Vendedor</p>
                    <p className={role === 'VENDEDOR' ? 'text-amber-100 text-[10px]' : 'text-gray-400 text-[10px]'}>
                      Preventa POS
                    </p>
                  </div>
                </button>
              </div>

              {/* Texto explicativo bajo el rol Vendedor */}
              {role === 'VENDEDOR' && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2">
                  <Info size={15} className="shrink-0 text-amber-700 mt-0.5" weight="fill" />
                  <p className="text-[11px] leading-relaxed">
                    Arma la orden y la envía a caja. No cobra ni ve costos.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">Rol asignado:</span>
              <span className="inline-flex items-center gap-1 font-medium text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded">
                <UserCheck size={14} className="text-brand-600" />
                Cajero (POS)
              </span>
            </div>
          )}

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
              placeholder="usuario@tunegocio.com"
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
              <span>
                {twoStepSaleEnabled
                  ? role === 'VENDEDOR'
                    ? 'Crear Vendedor'
                    : 'Crear Cajero'
                  : 'Crear Cajero'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
