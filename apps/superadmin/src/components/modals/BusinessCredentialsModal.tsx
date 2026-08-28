import React, { useState } from 'react';
import {
  Copy,
  Check,
  WhatsappLogo,
  Warning,
  EnvelopeSimple,
  Key,
  CheckCircle,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

interface BusinessCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  email: string;
  password?: string;
}

export const BusinessCredentialsModal: React.FC<BusinessCredentialsModalProps> = ({
  isOpen,
  onClose,
  businessName,
  email,
  password,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyToClipboard = (text: string, type: 'email' | 'password' | 'all') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast.success('Email copiado');
    } else if (type === 'password') {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success('Contraseña copiada');
    } else {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast.success('Mensaje copiado para WhatsApp');
    }
  };

  const getWhatsAppMessage = () => {
    return `Hola! Tus credenciales de TrackDeli para "${businessName}":

🌐 Panel: https://admin.trackdeli.app
📧 Email: ${email}
🔑 Contraseña: ${password || '••••••••'}

¡Ya podés ingresar y empezar!`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Negocio creado exitosamente"
      subtitle={`Credenciales iniciales para "${businessName}"`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs">
          <CheckCircle size={16} className="text-brand-600 shrink-0" weight="fill" />
          <span>El comercio ha sido registrado en el sistema.</span>
        </div>

        <p className="text-xs text-gray-600">
          Compartí estas credenciales de acceso al encargado del negocio:
        </p>

        {/* Email Field */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase flex items-center gap-1.5">
            <EnvelopeSimple size={13} className="text-gray-400" />
            <span>Email</span>
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-medium text-gray-900 select-all truncate">
              {email}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(email, 'email')}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
              title="Copiar email"
            >
              {copiedEmail ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Password Field */}
        {password && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="text-[11px] font-medium text-gray-500 uppercase flex items-center gap-1.5">
              <Key size={13} className="text-gray-400" />
              <span>Contraseña temporal</span>
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-medium text-gray-900 select-all">
                {password}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(password, 'password')}
                className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
                title="Copiar contraseña"
              >
                {copiedPassword ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100/80 flex items-start gap-2.5 text-xs text-amber-900">
          <Warning size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-tight">
            <span className="font-semibold">Importante:</span> Esta contraseña temporal solo se muestra una vez. Guardala o enviala antes de cerrar esta ventana.
          </p>
        </div>

        {/* Acciones */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => copyToClipboard(getWhatsAppMessage(), 'all')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors shadow-xs"
          >
            {copiedAll ? (
              <>
                <Check size={16} />
                <span>¡Copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <WhatsappLogo size={16} weight="fill" />
                <span>Copiar todo para WhatsApp</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </Modal>
  );
};
