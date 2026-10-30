import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessItem } from '../../hooks/useBusinesses';
import { Badge } from './Badge';
import {
  ArrowRight,
  CreditCard,
  DotsThreeVertical,
  Trash,
  Desktop,
  Users,
  Clock,
} from '@phosphor-icons/react';
import { formatDueText, getMembershipPillInfo, formatDateClean } from '../../utils/membershipDates';
import { formatRelativeTime } from '../../utils/format';

interface BusinessCardMobileProps {
  business: BusinessItem;
  onToggle: (business: BusinessItem) => void;
  onDelete?: (business: BusinessItem) => void;
  onRegisterPayment?: (business: BusinessItem) => void;
}

export const BusinessCardMobile: React.FC<BusinessCardMobileProps> = ({
  business,
  onToggle,
  onDelete,
  onRegisterPayment,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const pill = getMembershipPillInfo(
    business.membership_status,
    business.is_trial,
    business.isActive,
  );
  const dueText = formatDueText(business.due_date, business.days_until_due);

  // Última señal de actividad
  const lastActivityDate = business.last_sale_at || business.last_seen_at;
  const lastActivityText = lastActivityDate
    ? formatRelativeTime(lastActivityDate)
    : 'Sin actividad';

  // Productos contratados (solo activos)
  const rawProducts = business.products && business.products.length > 0
    ? business.products
    : (business.productSubscriptions || []).map((s) => ({
        id: s.id || s.productType,
        type: s.productType,
        status: s.status,
        name: s.productType,
        fee: 0,
      }));

  const productsList = rawProducts.filter((p) => p.status === 'ACTIVE');

  return (
    <div
      onClick={() => navigate(`/businesses/${business.id}`)}
      className="bg-white border border-gray-200/80 rounded-2xl p-4 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:bg-gray-50/80 space-y-3 relative"
    >
      {/* Cabecera: Nombre, tipo y menú 3 puntos */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200/60 flex items-center justify-center font-bold text-gray-700 text-xs shrink-0 overflow-hidden">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              business.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{business.name}</h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200/60">
                {business.businessType === 'EMPRESA_RIDERS'
                  ? 'Riders'
                  : business.posVertical
                  ? business.posVertical.toLowerCase()
                  : business.type || 'Comercio'}
              </span>
            </div>
          </div>
        </div>

        {/* Menú de tres puntos */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Más opciones"
          >
            <DotsThreeVertical size={16} weight="bold" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggle(business);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  {business.isActive ? 'Desactivar negocio' : 'Activar negocio'}
                </button>
                {onDelete && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(business);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash size={14} />
                      <span>Eliminar definitivamente</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Membresía y Monto */}
      <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant={pill.variant} dot size="sm">
            {pill.label}
          </Badge>
          <span className="font-bold text-xs sm:text-sm text-gray-900">
            ${Number(business.monthly_amount ?? 0).toFixed(2)}
            <span className="text-[10px] font-normal text-gray-500"> / mes</span>
          </span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium">
          {dueText}
        </p>
      </div>

      {/* Productos contratados */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {productsList.length === 0 && !business.is_trial ? (
          <span className="text-[11px] text-gray-400 italic">Sin productos</span>
        ) : (
          productsList.map((p) => {
            const isPos = p.type === 'POS';
            const isDel = p.type === 'DELIVERY';
            const isCar = p.type === 'CARTERA_COBRO';
            const isCit = p.type === 'CITAS';

            const displayName =
              p.type === 'CARTERA_COBRO'
                ? 'Finanzas'
                : p.type === 'DELIVERY'
                ? 'Delivery'
                : p.name || p.type;

            return (
              <span
                key={p.id}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                  isPos
                    ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                    : isDel
                    ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                    : isCar
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    : isCit
                    ? 'bg-sky-50 text-sky-700 border-sky-200/60'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {displayName}
              </span>
            );
          })
        )}

        {business.is_trial && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-200">
            Prueba
          </span>
        )}

        {business.tracksBatches && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap shrink-0"
            title="Control de lotes y vencimientos activo"
          >
            Lotes
          </span>
        )}

        {business.useListPrice && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap shrink-0"
            title="Precio de etiqueta activo"
          >
            Etiqueta
          </span>
        )}

        {business.twoStepSaleEnabled && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 whitespace-nowrap shrink-0"
            title="Venta en dos pasos activa"
          >
            Dos pasos
          </span>
        )}

        {business.deliveryChannelEnabled && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 whitespace-nowrap shrink-0"
            title="Venta a domicilio activa"
          >
            Domicilio
          </span>
        )}

        {business.pedidosYaChannelEnabled && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 whitespace-nowrap shrink-0"
            title="Canal PedidosYa activo"
          >
            PedidosYa
          </span>
        )}
      </div>

      {/* Uso & Última actividad */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 font-medium" title="Equipos activos / permitidos">
            <Desktop size={13} className="text-gray-400" />
            <span>
              {business.devices?.active ?? 0}/{business.devices?.allowed ?? '∞'}
            </span>
          </span>
          <span className="flex items-center gap-1 font-medium" title="Usuarios activos / límite">
            <Users size={13} className="text-gray-400" />
            <span>
              {business.users?.active ?? 0}/{business.users?.limit ?? 6}
            </span>
          </span>
        </div>

        <div
          className="flex items-center gap-1"
          title={lastActivityDate ? formatDateClean(lastActivityDate) : 'Sin actividad registrada'}
        >
          <Clock size={13} className="text-gray-400" />
          <span>{lastActivityText}</span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        {onRegisterPayment && (
          <button
            type="button"
            onClick={() => onRegisterPayment(business)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <CreditCard size={13} />
            <span>Registrar pago</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate(`/businesses/${business.id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
        >
          <span>Ver</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
