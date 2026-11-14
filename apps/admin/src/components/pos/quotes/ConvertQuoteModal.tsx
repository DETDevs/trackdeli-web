import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  ArrowRight,
  WarningCircle,
  Warning,
  CircleNotch,
  Package,
  Tag,
  WifiSlash,
  CheckCircle,
  Car,
} from '@phosphor-icons/react';
import {
  formatQuoteApiError,
  prepareQuoteConversion,
  type PosQuote,
  type PrepareQuoteConversionResponse,
} from 'api-client';
import { formatQuoteMoney } from '../../../utils/quoteReceiptHtml';

interface ConvertQuoteModalProps {
  isOpen: boolean;
  quote: Pick<PosQuote, 'id' | 'quoteNumber' | 'status' | 'currency'> | null;
  businessId?: string;
  onClose: () => void;
  onConfirmConversion: (conversion: PrepareQuoteConversionResponse) => void;
}

export const ConvertQuoteModal: React.FC<ConvertQuoteModalProps> = ({
  isOpen,
  quote,
  businessId,
  onClose,
  onConfirmConversion,
}) => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const conversionQuery = useQuery({
    queryKey: ['pos', 'quote', quote?.id, 'prepare-conversion', businessId || 'own'],
    queryFn: () => prepareQuoteConversion(quote!.id, businessId),
    enabled: Boolean(isOpen && quote?.id && isOnline),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (!isOpen || !quote) return null;

  const data = conversionQuery.data;
  const currency = data?.currency || quote.currency || 'NIO';
  const errorMsg = conversionQuery.isError
    ? formatQuoteApiError(
        conversionQuery.error,
        'No se pudo preparar la conversión de esta proforma.',
      ).message
    : null;

  const priceChangedItems = data?.items.filter((item) => item.priceChanged) ?? [];
  const insufficientStockItems =
    data?.items.filter(
      (item) => item.productExists && item.productActive && !item.hasSufficientStock,
    ) ?? [];
  const missingProductItems =
    data?.items.filter((item) => !item.productExists || !item.productActive) ?? [];
  const batchItems =
    data?.items.filter(
      (item) => item.productExists && item.productActive && item.requiresBatches,
    ) ?? [];
  const sellableItems =
    data?.items.filter((item) => item.productExists && item.productActive) ?? [];

  const canContinue = Boolean(isOnline && data && sellableItems.length > 0 && !conversionQuery.isLoading);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Convertir proforma {data?.quoteNumber || quote.quoteNumber} en venta
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Revisá precios, disponibilidad y condiciones antes de pasar al cobro en mostrador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!isOnline ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
              <WifiSlash size={20} className="text-amber-700 shrink-0 mt-0.5" weight="bold" />
              <div className="text-xs sm:text-sm text-amber-950 space-y-1">
                <p className="font-bold">Sin conexión a internet</p>
                <p>
                  Esta proforma solo se puede convertir en venta con conexión a internet.
                </p>
              </div>
            </div>
          ) : conversionQuery.isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-600">
              <CircleNotch size={30} className="animate-spin text-emerald-600" />
              <span className="text-sm font-semibold">
                Verificando catálogo, precios y existencias...
              </span>
            </div>
          ) : errorMsg ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
              <WarningCircle size={20} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
              <div className="text-xs sm:text-sm text-rose-900 space-y-1">
                <p className="font-bold">No se pudo preparar la conversión</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Política de precio */}
              <div
                className={`rounded-2xl border p-3.5 flex items-start gap-3 ${
                  data.isExpired
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                }`}
              >
                {data.isExpired ? (
                  <Warning size={19} className="text-amber-700 shrink-0 mt-0.5" weight="fill" />
                ) : (
                  <CheckCircle size={19} className="text-emerald-700 shrink-0 mt-0.5" weight="fill" />
                )}
                <div className="text-xs sm:text-sm space-y-0.5">
                  <p className="font-bold">
                    {data.isExpired
                      ? 'Proforma vencida: se aplicarán precios actuales'
                      : `Proforma vigente hasta ${data.validUntilLabel}`}
                  </p>
                  <p>
                    {data.isExpired
                      ? 'Como encargado podés convertirla, pero los productos del catálogo se cargarán con su precio vigente actual.'
                      : 'Se respetarán los precios cotizados en esta proforma durante su vigencia.'}
                  </p>
                </div>
              </div>

              {/* Resumen cliente y vehículo */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">
                    Cliente: {data.customerName || 'Cliente general'}
                  </span>
                  {data.discountAmount > 0 && (
                    <span className="font-semibold text-emerald-800 whitespace-nowrap">
                      Descuento proforma: {formatQuoteMoney(data.discountAmount, currency)}
                    </span>
                  )}
                </div>
                {(data.customerPhone || data.customerRuc) && (
                  <p className="text-slate-600">
                    {[data.customerPhone, data.customerRuc ? `RUC ${data.customerRuc}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {data.vehicleInfo && (
                  <p className="text-slate-700 flex items-center gap-1.5 pt-0.5">
                    <Car size={14} className="text-slate-500 shrink-0" />
                    <span>{data.vehicleInfo}</span>
                  </p>
                )}
              </div>

              {/* Alertas de cambios o restricciones */}
              {priceChangedItems.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 space-y-1.5 text-xs text-blue-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Tag size={16} className="text-blue-700 shrink-0" weight="fill" />
                    <span>
                      {priceChangedItems.length}{' '}
                      {priceChangedItems.length === 1
                        ? 'artículo cambió de precio en catálogo'
                        : 'artículos cambiaron de precio en catálogo'}
                    </span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc">
                    {priceChangedItems.map((item) => (
                      <li key={item.quoteItemId}>
                        <span className="font-semibold">{item.productName}:</span> cotizado{' '}
                        <span className="whitespace-nowrap font-semibold">
                          {formatQuoteMoney(item.quotedUnitPrice, currency)}
                        </span>{' '}
                        vs. actual{' '}
                        <span className="whitespace-nowrap font-semibold">
                          {formatQuoteMoney(item.currentUnitPrice ?? 0, currency)}
                        </span>{' '}
                        ({data.priceProtectionApplied ? 'se mantiene precio cotizado' : 'aplica precio actual'}).
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insufficientStockItems.length > 0 && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 space-y-1.5 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Package size={16} className="text-amber-700 shrink-0" weight="fill" />
                    <span>Existencias insuficientes para {insufficientStockItems.length} artículos</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc">
                    {insufficientStockItems.map((item) => (
                      <li key={item.quoteItemId}>
                        <span className="font-semibold">{item.productName}:</span> proforma pide{' '}
                        {item.quantity} {item.unit}, disponible {item.availableStock ?? 0}. Podés ajustar la cantidad en el carrito.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {batchItems.length > 0 && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3.5 space-y-1 text-xs text-slate-800">
                  <p className="font-bold">Control por lotes activo</p>
                  <p>
                    Al cobrar se aplicará asignación automática FEFO en:{' '}
                    <span className="font-semibold">
                      {batchItems.map((i) => i.productName).join(', ')}
                    </span>
                    .
                  </p>
                </div>
              )}

              {missingProductItems.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 space-y-1.5 text-xs text-rose-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <WarningCircle size={16} className="text-rose-600 shrink-0" weight="fill" />
                    <span>Productos no disponibles en catálogo</span>
                  </div>
                  <p>
                    Los siguientes productos están inactivos o fueron eliminados y no se cargarán al carrito:
                  </p>
                  <ul className="space-y-0.5 pl-5 list-disc font-semibold">
                    {missingProductItems.map((item) => (
                      <li key={item.quoteItemId}>{item.productName}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sellableItems.length === 0 && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-semibold text-rose-900">
                  Ninguno de los artículos de esta proforma está disponible actualmente para cobrar.
                </div>
              )}

              {/* Vista previa de líneas a cargar */}
              {sellableItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Líneas que se cargarán al carrito ({sellableItems.length})
                  </h3>
                  <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {sellableItems.map((item) => {
                      const effectivePrice =
                        data.priceProtectionApplied || item.currentUnitPrice === null
                          ? item.quotedUnitPrice
                          : item.recommendedUnitPrice ?? item.currentUnitPrice;
                      return (
                        <div
                          key={item.quoteItemId}
                          className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {item.quantity} × {item.productName}
                            </p>
                            <p className="text-slate-500">
                              {item.itemType === 'CUSTOM' ? 'Línea libre' : item.unit} · Precio:{' '}
                              <span className="whitespace-nowrap font-semibold text-slate-700">
                                {formatQuoteMoney(effectivePrice, currency)}
                              </span>
                            </p>
                          </div>
                          <span className="font-bold text-slate-900 whitespace-nowrap shrink-0">
                            {formatQuoteMoney(effectivePrice * item.quantity, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Pie */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              if (data) onConfirmConversion(data);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ir a cobrar</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};

