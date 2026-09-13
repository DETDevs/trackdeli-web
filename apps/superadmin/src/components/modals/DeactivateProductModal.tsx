import React, { useState, useEffect } from 'react';
import {
  Warning,
  ShieldWarning,
  WarningOctagon,
  Package,
  Motorcycle,
  CashRegister,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useDeactivateProduct,
  BusinessProductType,
  DeactivationConflictDetails,
} from '../../hooks/useBusinessProducts';

interface DeactivateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  productType: BusinessProductType;
}

export const DeactivateProductModal: React.FC<DeactivateProductModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  productType,
}) => {
  const deactivateMutation = useDeactivateProduct();

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [conflictDetails, setConflictDetails] = useState<DeactivationConflictDetails | null>(null);

  const [reason, setReason] = useState('');
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsBlocked(false);
      setBlockedMessage('');
      setConflictDetails(null);
      setReason('');
      setTypedName('');
    }
  }, [isOpen]);

  const isDelivery = productType === 'DELIVERY';
  const label = isDelivery ? 'TrackDeli (Delivery)' : 'Sistema POS';

  const isNameMatch = typedName.trim() === businessName.trim();

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deactivateMutation.isPending) return;

    try {
      await deactivateMutation.mutateAsync({
        businessId,
        productType,
        force: false,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setIsBlocked(true);
        setBlockedMessage(
          err.response.data?.message ||
            `No se puede desactivar ${label} porque tiene operaciones activas en curso.`
        );
        setConflictDetails(err.response.data?.details || null);
      } else {
      }
    }
  };

  const handleForcedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameMatch || deactivateMutation.isPending) return;

    try {
      await deactivateMutation.mutateAsync({
        businessId,
        productType,
        force: true,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch {
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBlocked ? `Desactivación Bloqueada — ${label}` : `¿Desactivar ${label}?`}
      subtitle={
        isBlocked
          ? 'Operaciones activas en curso detectadas por el sistema'
          : `Confirma la desactivación del producto para ${businessName}`
      }
      maxWidth="max-w-md"
    >
      {!isBlocked ? (
        <form onSubmit={handleStandardSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <Warning size={17} weight="fill" className="text-amber-600 shrink-0" />
              <span>Vas a pausar el servicio de {label}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 pl-1 leading-relaxed">
              {isDelivery ? (
                <>
                  <li>El negocio no podrá emitir nuevas órdenes de despacho.</li>
                  <li>Los repartidores dejarán de recibir pedidos de este negocio.</li>
                  <li>Se verificará que no existan pedidos ni despachos activos.</li>
                </>
              ) : (
                <>
                  <li>No se permitirá iniciar sesión en terminales POS de este negocio.</li>
                  <li>Se verificará que todas las cajas registradoras estén cerradas.</li>
                  <li>El catálogo y mesas quedarán congelados para venta.</li>
                </>
              )}
            </ul>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Motivo de desactivación (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Solicitud de suspensión temporal / Cambio de plan"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={deactivateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Warning size={14} />
              <span>{deactivateMutation.isPending ? 'Verificando...' : 'Desactivar Producto'}</span>
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleForcedSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <WarningOctagon size={20} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-xs">
                  Acción bloqueada: existen operaciones en curso
                </p>
                <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                  {blockedMessage}
                </p>
              </div>
            </div>

            {conflictDetails && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {conflictDetails.activeOrders !== undefined && (
                  <div className="bg-white/80 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                    <Package size={16} className="text-red-600" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Pedidos Activos</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {conflictDetails.activeOrders}
                      </p>
                    </div>
                  </div>
                )}

                {conflictDetails.activeDispatches !== undefined && (
                  <div className="bg-white/80 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                    <Motorcycle size={16} className="text-red-600" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Despachos</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {conflictDetails.activeDispatches}
                      </p>
                    </div>
                  </div>
                )}

                {conflictDetails.openCashRegisters !== undefined && (
                  <div className="bg-white/80 p-2 rounded-lg border border-red-100 flex items-center gap-2 col-span-2">
                    <CashRegister size={16} className="text-red-600" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Cajas Abiertas</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {conflictDetails.openCashRegisters} caja(s) sin cerrar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-red-800/90 pt-1 border-t border-red-200/60 space-y-1">
              <p className="font-semibold text-red-900">Si confirmas la desactivación forzada:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                {isDelivery ? (
                  <>
                    <li>Los pedidos en curso continuarán normalmente su entrega.</li>
                    <li>No se podrán crear nuevos pedidos para este negocio.</li>
                  </>
                ) : (
                  <>
                    <li>Las cajas abiertas NO se cerrarán automáticamente y deberán cuadrarse manualmente.</li>
                    <li>Los cajeros no podrán continuar cobrando ventas.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Para confirmar forzado, escribe:{' '}
              <span className="font-semibold text-gray-900 select-all bg-gray-100 px-1.5 py-0.5 rounded">
                {businessName}
              </span>
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={`Escribe "${businessName}" exactamente`}
              autoFocus
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isNameMatch || deactivateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ShieldWarning size={15} />
              <span>
                {deactivateMutation.isPending ? 'Desactivando...' : 'Confirmar Forzado'}
              </span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
