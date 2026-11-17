import React, { useEffect, useState } from 'react';
import {
  X,
  PencilSimple,
  PaperPlaneTilt,
  CheckCircle,
  Copy,
  Printer,
  Prohibit,
  CircleNotch,
  WarningCircle,
  Car,
  User,
  ShoppingCart,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  canConvertQuote,
  canPrintQuote,
  canShareQuote,
  duplicatePosQuote,
  formatQuoteApiError,
  getPosQuoteById,
  QUOTE_STATUS_META,
  updatePosQuoteStatus,
  type PosQuote,
} from 'api-client';
import { formatManaguaDateTime } from '../../../utils/dateManagua';
import { formatQuoteMoney, resolveQuoteCreatorName } from '../../../utils/quoteReceiptHtml';
import { useAuthStore } from '../../../store/auth.store';

interface QuoteDetailModalProps {
  isOpen: boolean;
  quoteId: string | null;
  businessId?: string;
  userRole?: string;
  currentUserId?: string;
  isOnline?: boolean;
  onClose: () => void;
  onEditDraft: (quote: PosQuote) => void;
  onOpenPrint: (quote: PosQuote) => void;
  onOpenShare: (quote: PosQuote) => void;
  onOpenConvert: (quote: PosQuote) => void;
  onOpenCancel: (quote: PosQuote) => void;
  onMutated: (quote: PosQuote, notice?: string) => void;
}

export const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  isOpen,
  quoteId,
  businessId,
  userRole,
  currentUserId,
  isOnline = true,
  onClose,
  onEditDraft,
  onOpenPrint,
  onOpenShare,
  onOpenConvert,
  onOpenCancel,
  onMutated,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [quote, setQuote] = useState<PosQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !quoteId) {
      setQuote(null);
      setLoadError(null);
      setActionError(null);
      setBusyAction(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);

    getPosQuoteById(quoteId, businessId)
      .then((res) => {
        if (!cancelled) setQuote(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            formatQuoteApiError(err, 'No se pudo cargar el detalle de la proforma.').message,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, quoteId, businessId]);

  if (!isOpen || !quoteId) return null;

  const isPrivileged = userRole === 'ENCARGADO' || userRole === 'SUPERADMIN';
  const isOwner = !quote || !currentUserId || quote.createdById === currentUserId;
  const canMutateOwnOrPrivileged = isPrivileged || isOwner;

  const handleEmit = async () => {
    if (!quote || busyAction) return;
    setBusyAction('emit');
    setActionError(null);
    try {
      const updated = await updatePosQuoteStatus(quote.id, { status: 'SENT' }, businessId);
      setQuote(updated);
      onMutated(updated, `Proforma ${updated.quoteNumber} emitida correctamente.`);
    } catch (err) {
      setActionError(formatQuoteApiError(err, 'No se pudo emitir la proforma.').message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleAccept = async () => {
    if (!quote || busyAction) return;
    setBusyAction('accept');
    setActionError(null);
    try {
      const updated = await updatePosQuoteStatus(quote.id, { status: 'ACCEPTED' }, businessId);
      setQuote(updated);
      onMutated(updated, `Proforma ${updated.quoteNumber} marcada como aceptada.`);
    } catch (err) {
      setActionError(
        formatQuoteApiError(err, 'No se pudo marcar como aceptada.').message,
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicate = async () => {
    if (!quote || busyAction) return;
    setBusyAction('duplicate');
    setActionError(null);
    try {
      const created = await duplicatePosQuote(quote.id, {}, businessId);
      onMutated(
        created,
        `Se creó el borrador ${created.quoteNumber} a partir de ${quote.quoteNumber}.`,
      );
      onClose();
    } catch (err) {
      setActionError(formatQuoteApiError(err, 'No se pudo duplicar la proforma.').message);
    } finally {
      setBusyAction(null);
    }
  };

  const statusMeta = quote ? QUOTE_STATUS_META[quote.status] : null;
  const currency = quote?.currency || 'NIO';
  const rawTaxRate = Number(quote?.taxRate || 0);
  const normalizedTaxPct = rawTaxRate <= 0 ? 15 : rawTaxRate <= 1 ? rawTaxRate * 100 : rawTaxRate;
  const taxPct = `${Number(normalizedTaxPct.toFixed(2))}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70">
          <div className="min-w-0 flex flex-wrap items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {quote ? `Proforma ${quote.quoteNumber}` : 'Detalle de proforma'}
            </h3>
            {statusMeta && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                {statusMeta.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar detalle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-600">
              <CircleNotch size={28} className="animate-spin text-emerald-600" />
              <span className="text-sm font-medium">Cargando proforma...</span>
            </div>
          ) : loadError ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 flex items-start gap-2">
              <WarningCircle size={18} className="shrink-0 mt-0.5" weight="fill" />
              <span>{loadError}</span>
            </div>
          ) : quote ? (
            <>
              {actionError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 flex items-start gap-2">
                  <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
                  <span>{actionError}</span>
                </div>
              )}

              {quote.status === 'EXPIRED' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900">
                  <strong>Vigencia vencida el {quote.validUntilLabel}.</strong> Podés duplicar esta
                  proforma para actualizar los precios en un nuevo borrador.
                </div>
              )}

              {quote.status === 'CANCELLED' && quote.cancelReason && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-800">
                  <strong>Motivo de cancelación:</strong> {quote.cancelReason}
                </div>
              )}

              {/* Metadata + Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    <User size={15} />
                    Datos del cliente
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {quote.customerName || 'Cliente general / Sin cliente'}
                  </p>
                  {quote.customerPhone && (
                    <p className="text-xs text-slate-600">Teléfono: {quote.customerPhone}</p>
                  )}
                  {quote.customerRuc && (
                    <p className="text-xs text-slate-600">RUC / Cédula: {quote.customerRuc}</p>
                  )}
                  {quote.customerAddress && (
                    <p className="text-xs text-slate-600">Dirección: {quote.customerAddress}</p>
                  )}
                  {quote.vehicleInfo && (
                    <p className="text-xs text-slate-700 font-medium flex items-center gap-1 pt-0.5">
                      <Car size={14} className="shrink-0 text-slate-500" />
                      Vehículo: {quote.vehicleInfo}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 space-y-1.5 text-xs text-slate-600">
                  <p className="font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Vigencia y registro
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Creada por:</span>{' '}
                    {resolveQuoteCreatorName(quote, currentUser)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Fecha de creación:</span>{' '}
                    {formatManaguaDateTime(quote.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Válida hasta:</span>{' '}
                    <span className="font-semibold text-slate-900">{quote.validUntilLabel}</span> (
                    {quote.validityDays} {quote.validityDays === 1 ? 'día' : 'días'})
                  </p>
                  {quote.sentAt && (
                    <p>
                      <span className="font-semibold text-slate-800">Emitida:</span>{' '}
                      {formatManaguaDateTime(quote.sentAt)}
                    </p>
                  )}
                  {quote.acceptedAt && (
                    <p>
                      <span className="font-semibold text-slate-800">Aceptada:</span>{' '}
                      {formatManaguaDateTime(quote.acceptedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Lines */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700">
                  Líneas cotizadas ({quote.items.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {quote.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900">
                            {item.productName}
                          </span>
                          {item.itemType === 'CUSTOM' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-xs font-medium text-slate-700">
                              Libre
                            </span>
                          )}
                          {item.priceTier === 'WHOLESALE' && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                              Mayoreo
                            </span>
                          )}
                          {quote.taxEnabled && item.taxable && (
                            <span className="text-xs font-medium text-slate-500">(G)</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {Number(item.quantity)} {item.unit} ×{' '}
                          <span className="whitespace-nowrap">
                            {formatQuoteMoney(item.unitPrice, currency)}
                          </span>
                          {item.discount > 0 && (
                            <span className="ml-2 text-amber-700 whitespace-nowrap">
                              Desc.: -{formatQuoteMoney(item.discount, currency)}
                            </span>
                          )}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-slate-600 mt-0.5 italic">{item.notes}</p>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900 whitespace-nowrap sm:text-right">
                        {formatQuoteMoney(item.total, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                <div className="space-y-2.5">
                  {quote.notes && (
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 text-xs text-slate-700">
                      <p className="font-bold text-slate-800 mb-1">Notas</p>
                      <p className="whitespace-pre-line">{quote.notes}</p>
                    </div>
                  )}
                  {quote.conditions && (
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 text-xs text-slate-700">
                      <p className="font-bold text-slate-800 mb-1">Condiciones comerciales</p>
                      <p className="whitespace-pre-line">{quote.conditions}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900 whitespace-nowrap">
                      {formatQuoteMoney(quote.subtotal, currency)}
                    </span>
                  </div>
                  {Number(quote.listDiscountTotal || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Ahorro por tarifa / lista</span>
                      <span className="font-medium whitespace-nowrap">
                        -{formatQuoteMoney(quote.listDiscountTotal, currency)}
                      </span>
                    </div>
                  )}
                  {Number(quote.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Descuento global</span>
                      <span className="font-medium whitespace-nowrap">
                        -{formatQuoteMoney(quote.discountAmount, currency)}
                      </span>
                    </div>
                  )}
                  {quote.taxEnabled && (
                    <div className="flex justify-between text-slate-600">
                      <span>
                        IVA ({taxPct}){quote.taxIncluded ? ' (incluido)' : ''}
                      </span>
                      <span className="font-medium text-slate-900 whitespace-nowrap">
                        {formatQuoteMoney(quote.taxAmount, currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Total proforma</span>
                    <span className="text-base whitespace-nowrap">
                      {formatQuoteMoney(quote.total, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {quote && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2 shrink-0">
            {quote.status === 'DRAFT' && canMutateOwnOrPrivileged && (
              <>
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => {
                    onClose();
                    onEditDraft(quote);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <PencilSimple size={15} />
                  Editar
                </button>
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={handleEmit}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {busyAction === 'emit' ? (
                    <CircleNotch size={15} className="animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={15} />
                  )}
                  Emitir
                </button>
              </>
            )}

            {quote.status === 'SENT' && (isPrivileged || isOwner) && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={handleAccept}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {busyAction === 'accept' ? (
                  <CircleNotch size={15} className="animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                Marcar aceptada
              </button>
            )}

            {canConvertQuote(quote.status, userRole) && (
              <button
                type="button"
                disabled={Boolean(busyAction) || !isOnline}
                title={
                  !isOnline
                    ? 'Esta proforma solo se puede convertir en venta con conexión a internet'
                    : 'Convertir en venta'
                }
                onClick={() => {
                  onClose();
                  onOpenConvert(quote);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShoppingCart size={15} weight="bold" />
                Convertir en venta
              </button>
            )}

            {canShareQuote(quote, userRole, currentUserId) && (
              <button
                type="button"
                disabled={Boolean(busyAction) || !isOnline}
                title={!isOnline ? 'Requiere conexión a internet para compartir' : 'Compartir por WhatsApp'}
                onClick={() => onOpenShare(quote)}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <WhatsappLogo size={15} weight="fill" />
                Compartir por WhatsApp
              </button>
            )}

            {canPrintQuote(quote.status) && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => onOpenPrint(quote)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer size={15} />
                Imprimir
              </button>
            )}

            {canMutateOwnOrPrivileged && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={handleDuplicate}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'duplicate' ? (
                  <CircleNotch size={15} className="animate-spin" />
                ) : (
                  <Copy size={15} />
                )}
                Duplicar
              </button>
            )}

            {['DRAFT', 'SENT', 'ACCEPTED'].includes(quote.status) && canMutateOwnOrPrivileged && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => onOpenCancel(quote)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Prohibit size={15} />
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

