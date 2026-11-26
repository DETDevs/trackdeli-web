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
  WhatsappLogo,
} from '@phosphor-icons/react';
import { formatDueText, getMembershipPillInfo, formatDateClean } from '../../utils/membershipDates';
import { formatRelativeTime, formatDateShort, formatCurrency } from '../../utils/format';

interface BusinessCardMobileProps {
  business: BusinessItem;
  onToggle: (business: BusinessItem) => void;
  onDelete?: (business: BusinessItem) => void;
  onRegisterPayment?: (business: BusinessItem) => void;
}

function cleanWhatsappDigits(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.length === 8 ? `505${digits}` : digits;
}

export const BusinessCardMobile: React.FC<BusinessCardMobileProps> = ({
  business,
  onToggle,
  onDelete,
  onRegisterPayment,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const acct = business.accountType || 'CLIENTE';
  const isDemoOrInterno = acct === 'DEMO' || acct === 'INTERNO';

  const pill = getMembershipPillInfo(
    business.membership_status,
    business.is_trial,
    business.isActive,
  );
  const dueText = formatDueText(business.due_date, business.days_until_due);

  const lastActivityDate = business.last_sale_at || business.last_seen_at;
  const lastActivityText = lastActivityDate
    ? formatRelativeTime(lastActivityDate)
    : 'Sin actividad';

  const rawProducts =
    business.products && business.products.length > 0
      ? business.products
      : (business.productSubscriptions || []).map((s) => ({
          id: s.id || s.productType,
          type: s.productType,
          status: s.status,
          name: s.productType,
          fee: 0,
        }));

  const productsList = rawProducts.filter((p) => p.status === 'ACTIVE');

  const cName = business.contactName || business.contact?.name || null;
  const cPhone =
    business.contactPhone ||
    business.contact?.phone ||
    business.contactWhatsapp ||
    business.contact?.whatsapp ||
    null;
  const waDigits = cleanWhatsappDigits(
    business.contactWhatsapp || business.contact?.whatsapp || cPhone,
  );
  const hasContact = Boolean(cName || cPhone);

  return (
    <div
      onClick={() => navigate(`/businesses/${business.id}`)}
      className={`border border-gray-200/80 rounded-2xl p-4 hover:border-gray-300 transition-all cursor-pointer space-y-3 relative ${
        isDemoOrInterno ? 'bg-gray-50' : 'bg-white'
      }`}
    >
      {/* Cabecera: Nombre, rubro, contacto y menú 3 puntos */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200/80 flex items-center justify-center font-bold text-gray-700 text-xs shrink-0 overflow-hidden">
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
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-sm text-gray-900 truncate">{business.name}</h4>
              {isDemoOrInterno && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200/80 text-gray-700 border border-gray-300/70">
                  {acct === 'INTERNO' ? 'Interno' : 'Demo'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 capitalize">
              {business.industry?.name ||
                (business.businessType === 'EMPRESA_RIDERS'
                  ? 'Riders'
                  : business.type || 'Comercio')}
            </p>
            {hasContact ? (
              <div
                className="flex items-center gap-1.5 flex-wrap text-xs text-gray-600 pt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{[cName, cPhone].filter(Boolean).join(' · ')}</span>
                {waDigits && (
                  <a
                    href={`https://wa.me/${waDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 font-medium hover:underline"
                  >
                    <WhatsappLogo size={13} weight="fill" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 pt-0.5" onClick={(e) => e.stopPropagation()}>
                <span>Sin contacto · </span>
                <button
                  type="button"
                  onClick={() => navigate(`/businesses/${business.id}?tab=resumen&editContact=1`)}
                  className="text-gray-700 font-medium underline cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            )}
          </div>
        </div>

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
              <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white shadow-lg border border-gray-200/80 py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggle(business);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
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
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
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

      {/* Membresía y monto */}
      <div className="pt-2 border-t border-gray-200/70 space-y-1">
        {isDemoOrInterno ? (
          <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
            <span>Sin vencimiento · No se cobra ni se bloquea</span>
            <span className="font-semibold text-gray-600 shrink-0">Sin cobro</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant={pill.variant} dot size="sm">
                  {pill.label}
                </Badge>
                {business.commercial_overdue && (
                  <Badge variant="danger" dot size="sm">
                    Cuota vencida
                  </Badge>
                )}
              </div>
              <span className="font-semibold text-xs sm:text-sm text-gray-900">
                {business.coverage_source === 'MAINTENANCE_FREE' ? (
                  <span className="font-semibold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Incluido
                  </span>
                ) : business.monthly_amount_nio != null && business.monthly_amount_nio > 0 ? (
                  <>
                    {formatCurrency(business.monthly_amount_nio, 'NIO')}
                    <span className="text-xs font-normal text-gray-500"> / mes</span>
                  </>
                ) : (
                  <>
                    ${Number(business.monthly_amount ?? 0).toFixed(2)}
                    <span className="text-xs font-normal text-gray-500"> / mes</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {business.coverage_source === 'MAINTENANCE_FREE' && business.maintenance_free_ends_at
                ? `Mantenimiento incluido hasta ${formatDateShort(business.maintenance_free_ends_at)}`
                : dueText}
            </p>
          </>
        )}
      </div>

      {/* Productos contratados */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {productsList.length === 0 && !business.is_trial ? (
          <span className="text-xs text-gray-400">Sin productos</span>
        ) : (
          productsList.map((p) => {
            const displayName =
              p.type === 'CARTERA_COBRO'
                ? 'Finanzas'
                : p.type === 'DELIVERY'
                ? 'Delivery'
                : p.name || p.type;
            return (
              <span
                key={p.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80"
              >
                {displayName}
              </span>
            );
          })
        )}
        {business.is_trial && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Prueba
          </span>
        )}
      </div>

      {/* Uso & última actividad */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200/70 text-xs text-gray-500">
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
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        {!isDemoOrInterno && onRegisterPayment && (
          <button
            type="button"
            onClick={() => onRegisterPayment(business)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <CreditCard size={13} />
            <span>Cobrar</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate(`/businesses/${business.id}`)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
        >
          <span>Ver</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
