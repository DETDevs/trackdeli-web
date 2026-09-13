import React, { useState, useEffect } from 'react';
import { X, CircleNotch, Eye, EyeSlash, Sparkle, Storefront, ShieldCheck, UserCheck, Motorcycle } from '@phosphor-icons/react';
import { useCreateSuperAdminUser } from '../../../hooks/useSuperAdminUsers';
import { useBusinesses } from '../../../hooks/useBusinesses';
import { type AdminUser } from 'api-client';

interface CreateSuperAdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser, initialPassword: string) => void;
  presetBusinessId?: string;
  presetBusinessName?: string;
}

export const CreateSuperAdminUserModal: React.FC<CreateSuperAdminUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  presetBusinessId,
  presetBusinessName,
}) => {
  const [role, setRole] = useState<'ENCARGADO' | 'CAJERO' | 'SUPERADMIN' | 'REPARTIDOR'>(
    presetBusinessId ? 'CAJERO' : 'ENCARGADO'
  );
  const [businessId, setBusinessId] = useState<string>(presetBusinessId || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: businesses = [] } = useBusinesses();
  const createMutation = useCreateSuperAdminUser();

  useEffect(() => {
    if (presetBusinessId) {
      setBusinessId(presetBusinessId);
      setRole('CAJERO');
    }
  }, [presetBusinessId]);

  if (!isOpen) return null;

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let prefix = 'Pass-';
    if (role === 'CAJERO') prefix = 'Caj-';
    if (role === 'ENCARGADO') prefix = 'Enc-';
    if (role === 'SUPERADMIN') prefix = 'Adm-';
    if (role === 'REPARTIDOR') prefix = 'Rid-';

    let result = prefix;
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
      setErrorMessage('Ingresa el nombre del usuario');
      return;
    }

    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setErrorMessage('Ingresa un correo electrónico válido');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const needsBusiness = role !== 'SUPERADMIN';
    const targetBusinessId = presetBusinessId || businessId;

    if (needsBusiness && !targetBusinessId) {
      setErrorMessage('Debes seleccionar el negocio al que pertenecerá este usuario');
      return;
    }

    try {
      const createdUser = await createMutation.mutateAsync({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: trimmedPassword,
        role,
        businessId: needsBusiness ? targetBusinessId : undefined,
      });

      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setErrorMessage(null);

      onSuccess(createdUser, trimmedPassword);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || 'Error al crear el usuario';
      setErrorMessage(serverMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {presetBusinessId ? 'Agregar Usuario al Negocio' : 'Nuevo Usuario'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {presetBusinessName
                ? `Para ${presetBusinessName}`
                : 'Registra un usuario en la plataforma con sus credenciales'}
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
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Rol de Usuario <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {!presetBusinessId && (
                <button
                  id="role-btn-superadmin"
                  type="button"
                  onClick={() => setRole('SUPERADMIN')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                    role === 'SUPERADMIN'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <ShieldCheck size={16} />
                  <div>
                    <p className="font-semibold">SuperAdmin</p>
                    <p className={role === 'SUPERADMIN' ? 'text-gray-300 text-[10px]' : 'text-gray-400 text-[10px]'}>
                      Control global
                    </p>
                  </div>
                </button>
              )}

              <button
                id="role-btn-encargado"
                type="button"
                onClick={() => setRole('ENCARGADO')}
                className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                  role === 'ENCARGADO'
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Storefront size={16} />
                <div>
                  <p className="font-semibold">Encargado</p>
                  <p className={role === 'ENCARGADO' ? 'text-gray-300 text-[10px]' : 'text-gray-400 text-[10px]'}>
                    Dueño de negocio
                  </p>
                </div>
              </button>

              <button
                id="role-btn-cajero"
                type="button"
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
                    Operador POS
                  </p>
                </div>
              </button>

              {!presetBusinessId && (
                <button
                  id="role-btn-repartidor"
                  type="button"
                  onClick={() => setRole('REPARTIDOR')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                    role === 'REPARTIDOR'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Motorcycle size={16} />
                  <div>
                    <p className="font-semibold">Repartidor</p>
                    <p className={role === 'REPARTIDOR' ? 'text-gray-300 text-[10px]' : 'text-gray-400 text-[10px]'}>
                      Rider de entregas
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {role !== 'SUPERADMIN' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Negocio Asignado <span className="text-red-500">*</span>
              </label>
              {presetBusinessId ? (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800">
                  <Storefront size={15} className="text-gray-500" />
                  <span>{presetBusinessName || presetBusinessId}</span>
                </div>
              ) : (
                <select
                  required
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900 transition-colors bg-white cursor-pointer"
                >
                  <option value="">Selecciona un negocio...</option>
                  {businesses.map((biz) => (
                    <option key={biz.id} value={biz.id}>
                      {biz.name} ({biz.businessType === 'EMPRESA_RIDERS' ? 'Empresa Riders' : 'Negocio'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {role === 'SUPERADMIN' && (
            <div className="p-2.5 bg-purple-50/60 border border-purple-200/70 rounded-lg text-xs text-purple-800 flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-600 shrink-0" />
              <span>Los usuarios SuperAdmin tienen acceso global sin estar asociados a un negocio específico.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. María López"
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
              placeholder="usuario@ejemplo.com"
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
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              La contraseña se mostrará en pantalla tras crear el usuario para que puedas copiarla.
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
              <span>Crear Usuario</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
