import React, { useState } from 'react';
import { Copy, Check, X, ShieldCheck } from '@phosphor-icons/react';
import { type AdminUser } from 'api-client';
import { toast } from 'react-hot-toast';

interface CreatedPasswordModalProps {
  isOpen: boolean;
  user: AdminUser | null;
  password: string | null;
  onClose: () => void;
}

export const CreatedPasswordModal: React.FC<CreatedPasswordModalProps> = ({
  isOpen,
  user,
  password,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user || !password) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Contraseña copiada al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
              <ShieldCheck size={20} weight="regular" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Cajero Creado</h3>
              <p className="text-xs text-gray-500">Credenciales de acceso al POS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            El cajero <span className="font-semibold text-gray-900">{user.name}</span> (
            <span className="font-mono text-gray-700">{user.email}</span>) ha sido registrado
            correctamente. Proporciónale esta contraseña para que inicie sesión en el POS:
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
              Contraseña inicial
            </span>
            <span className="font-mono text-xl font-bold tracking-wider text-gray-900 select-all px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-xs">
              {password}
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

          <p className="text-[11px] text-gray-400 text-center">
            Guarda o comunica esta contraseña al cajero. Siempre podrás restablecerla si la olvida.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
