import React from 'react';
import { X, Warning, CircleNotch, Lock, LockOpen } from '@phosphor-icons/react';
import { useUpdateSuperAdminUserStatus } from '../../../hooks/useSuperAdminUsers';
import { type AdminUser } from 'api-client';

interface DeactivateUserModalProps {
  isOpen: boolean;
  user: AdminUser | null;
  isOnlyActiveEncargado?: boolean;
  onClose: () => void;
}

export const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({
  isOpen,
  user,
  isOnlyActiveEncargado = false,
  onClose,
}) => {
  const statusMutation = useUpdateSuperAdminUserStatus();

  if (!isOpen || !user) return null;

  const willDeactivate = user.isActive;

  const handleConfirm = async () => {
    try {
      await statusMutation.mutateAsync({
        id: user.id,
        data: { isActive: !user.isActive },
      });
      onClose();
    } catch {
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                willDeactivate ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
              }`}
            >
              {willDeactivate ? (
                <Warning size={18} weight="regular" />
              ) : (
                <LockOpen size={18} weight="regular" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {willDeactivate ? '¿Desactivar Usuario?' : '¿Activar Usuario?'}
              </h3>
              <p className="text-xs text-gray-500">{user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={statusMutation.isPending}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            {willDeactivate ? (
              <>
                ¿Estás seguro de que deseas desactivar a{' '}
                <span className="font-semibold text-gray-900">{user.name}</span> (
                <span className="font-mono text-gray-700">{user.email}</span>)?
                <br />
                <span className="text-gray-500 mt-1 block">
                  El usuario no podrá iniciar sesión en la plataforma mientras permanezca inactivo.
                </span>
              </>
            ) : (
              <>
                ¿Deseas reactivar a{' '}
                <span className="font-semibold text-gray-900">{user.name}</span>?
                <br />
                Podrá volver a iniciar sesión con sus credenciales habituales.
              </>
            )}
          </p>

          {willDeactivate && isOnlyActiveEncargado && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <Warning size={16} weight="fill" className="text-red-600 shrink-0" />
                <span>Advertencia preventiva crítica</span>
              </div>
              <p className="leading-relaxed text-red-800">
                Este usuario es el <strong>único Encargado activo</strong> registrado para este negocio. Si lo desactivas, el negocio se quedará sin nadie con acceso administrativo a su panel.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={statusMutation.isPending}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={statusMutation.isPending}
            className={`px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              willDeactivate
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {statusMutation.isPending && (
              <CircleNotch size={14} className="animate-spin" />
            )}
            {willDeactivate ? (
              <>
                <Lock size={15} />
                <span>Desactivar usuario</span>
              </>
            ) : (
              <>
                <LockOpen size={15} />
                <span>Activar usuario</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
