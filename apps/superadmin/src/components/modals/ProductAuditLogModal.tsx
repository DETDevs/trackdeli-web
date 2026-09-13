import React from 'react';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  useBusinessProductAuditLog,
  BusinessProductType,
  BusinessProductAction,
  BusinessProductAuditLogItem,
} from '../../hooks/useBusinessProducts';
import { formatDateTime } from '../../utils/format';

interface ProductAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  productType: BusinessProductType;
}

export const ProductAuditLogModal: React.FC<ProductAuditLogModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  productType,
}) => {
  const { data: logs = [], isLoading } = useBusinessProductAuditLog(
    businessId,
    productType,
    isOpen
  );

  const isDelivery = productType === 'DELIVERY';
  const label = isDelivery ? 'TrackDeli (Delivery)' : 'Sistema POS';

  const getActionBadge = (action: BusinessProductAction) => {
    switch (action) {
      case 'ACTIVATED':
        return (
          <Badge variant="success" size="sm" dot>
            Activado
          </Badge>
        );
      case 'DEACTIVATED':
        return (
          <Badge variant="neutral" size="sm" dot>
            Desactivado
          </Badge>
        );
      case 'DEACTIVATION_BLOCKED':
        return (
          <Badge variant="warning" size="sm" dot>
            Bloqueado (409)
          </Badge>
        );
      case 'DEACTIVATION_FORCED':
        return (
          <Badge variant="danger" size="sm" dot>
            Desactivación Forzada
          </Badge>
        );
      case 'CONFIG_UPDATED':
        return (
          <Badge variant="info" size="sm" dot>
            Config. Actualizada
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {action}
          </Badge>
        );
    }
  };

  const renderMetadata = (item: BusinessProductAuditLogItem) => {
    if (!item.metadata) return null;

    const m = item.metadata;
    const details: string[] = [];

    if (m.activeOrders !== undefined) {
      details.push(`${m.activeOrders} pedidos activos`);
    }
    if (m.activeDispatches !== undefined) {
      details.push(`${m.activeDispatches} despachos`);
    }
    if (m.openCashRegisters !== undefined) {
      details.push(`${m.openCashRegisters} cajas abiertas`);
    }
    if (m.posVertical) {
      details.push(`Vertical: ${m.posVertical}`);
    }
    if (m.commissionRate !== undefined) {
      details.push(`Comisión: ${(m.commissionRate * 100).toFixed(0)}%`);
    }

    if (details.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {details.map((d, i) => (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-700"
          >
            {d}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Auditoría — ${label}`}
      subtitle={`Registros de cambios de estado para ${businessName}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-gray-400 gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
            <span>Cargando registros de auditoría...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            <ClockCounterClockwise size={28} className="mx-auto mb-2 text-gray-300" />
            No hay eventos de auditoría registrados para este producto.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-medium bg-gray-50/60">
                  <th className="py-2.5 px-3">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3">Motivo / Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {item.performedBy === 'system-migration'
                        ? 'Migración Sistema'
                        : item.performedBy}
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-gray-900 font-medium">
                        {item.reason || 'Sin motivo especificado'}
                      </p>
                      {renderMetadata(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
