import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type Order } from 'api-client';
import { StatusBadge } from './StatusBadge';
import { formatRelativeCompact } from '../utils/formatDate';
import { Motorcycle, WhatsappLogo } from '@phosphor-icons/react';
import { useWhatsAppTracking, TRACKABLE_STATUSES } from '../hooks/useWhatsAppTracking';

interface OrderCardMobileProps {
  order: Order;
  onClick?: () => void;
  showWhatsApp?: boolean;
}

export const OrderCardMobile: React.FC<OrderCardMobileProps> = ({
  order,
  onClick,
  showWhatsApp = true,
}) => {
  const navigate = useNavigate();
  const { sendTrackingLink } = useWhatsAppTracking();
  const canSendTracking = !!order.trackingToken && TRACKABLE_STATUSES.includes(order.status);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/orders/${order.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-gray-200/80 rounded-xl p-3.5 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {order.customerName}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {order.destinationAddress}
            {order.distanceKm && order.distanceKm > 0 ? ` · ${order.distanceKm} km` : ''}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1.5 text-gray-600 truncate max-w-[55%]">
          <Motorcycle size={14} className="text-gray-400 shrink-0" />
          <span className="truncate">
            {order.deliveryUser?.name || 'Sin repartidor'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-gray-900 font-mono">
            {order.deliveryPaymentStatus === 'GRATIS'
              ? 'Gratis'
              : `C$ ${Number(order.deliveryFee).toFixed(2)}`}
          </span>

          <span className="text-gray-400 text-[11px]">
            {formatRelativeCompact(order.createdAt)}
          </span>

          {showWhatsApp && canSendTracking && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sendTrackingLink(order);
              }}
              className="p-1 text-[#25D366] hover:bg-emerald-50 rounded-md transition-colors"
              title="Enviar tracking por WhatsApp"
            >
              <WhatsappLogo size={16} weight="fill" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
