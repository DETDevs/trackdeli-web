import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FilePdf,
  Clock,
  WarningCircle,
  CircleNotch,
  Storefront,
  FileText,
  Info,
  Prohibit,
} from '@phosphor-icons/react';
import {
  PublicReceiptData,
  QuotePublicDisplayStatus,
  buildPublicReceiptEndpoint,
  formatPublicCurrency,
  formatPublicDateTime,
  formatPublicExpiresDate,
  useNoIndexRobotsMeta,
} from '../utils/publicDocument';

interface StatusBadgeStyle {
  label: string;
  className: string;
}

const QUOTE_STATUS_STYLES: Record<QuotePublicDisplayStatus, StatusBadgeStyle> = {
  VALID: {
    label: 'Vigente',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  EXPIRED: {
    label: 'Vencida',
    className: 'bg-amber-50 text-amber-800 border border-amber-200',
  },
  CONVERTED: {
    label: 'Convertida en venta',
    className: 'bg-sky-50 text-sky-800 border border-sky-200',
  },
  UNAVAILABLE: {
    label: 'No disponible',
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
  },
};

function resolveStatusBadge(data: PublicReceiptData): StatusBadgeStyle {
  const key: QuotePublicDisplayStatus =
    data.displayStatus && data.displayStatus in QUOTE_STATUS_STYLES
      ? data.displayStatus
      : 'VALID';
  const preset = QUOTE_STATUS_STYLES[key];
  return {
    label: data.displayStatusLabel || preset.label,
    className: preset.className,
  };
}

export const PublicQuotePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const quoteNumber = data?.quoteNumber || data?.folio || '';
  const tabTitle =
    quoteNumber && data?.businessName
      ? `Proforma ${quoteNumber} · ${data.businessName}`
      : 'Proforma';

  useNoIndexRobotsMeta(tabTitle);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    axios
      .get<PublicReceiptData>(buildPublicReceiptEndpoint(token))
      .then((res) => {
        if (!isMounted) return;
        if (res.data.documentKind === 'SALE') {
          navigate(`/comprobante/${encodeURIComponent(token)}`, { replace: true });
          return;
        }
        setData(res.data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setHasError(true);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  const isQuoteUnavailable =
    !!data &&
    (data.status === 'UNAVAILABLE' ||
      data.code === 'QUOTE_CANCELLED' ||
      data.displayStatus === 'UNAVAILABLE');

  const isLinkUnavailable =
    !!data &&
    !isQuoteUnavailable &&
    (data.status === 'EXPIRED' ||
      data.status === 'REVOKED' ||
      data.code === 'LINK_EXPIRED' ||
      data.code === 'LINK_REVOKED');

  const isLinkRevoked =
    !!data && (data.status === 'REVOKED' || data.code === 'LINK_REVOKED');

  const badge = data ? resolveStatusBadge(data) : null;
  const issuedDate = data?.issuedAt || data?.saleDate;
  const businessLabel = data?.businessName || 'el negocio';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="w-full max-w-[440px] mx-auto flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-3">
            <CircleNotch size={32} className="animate-spin text-gray-400 mx-auto" />
            <p className="text-sm font-medium text-gray-500">Cargando proforma...</p>
          </div>
        ) : hasError || !data ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <WarningCircle size={28} weight="fill" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-gray-900">Comprobante no encontrado</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                El enlace no es válido o el comprobante ya no existe.
              </p>
            </div>
          </div>
        ) : isQuoteUnavailable ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-500">
              <Prohibit size={28} weight="bold" />
            </div>
            <div className="space-y-2">
              <h1 className="text-base font-bold text-gray-900 leading-snug">
                Proforma no disponible
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Esta proforma ya no está disponible. Para más información, comuníquese con{' '}
                {businessLabel}.
              </p>
            </div>
          </div>
        ) : isLinkUnavailable ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <Clock size={28} weight="fill" />
            </div>
            <div className="space-y-2">
              <h1 className="text-base font-bold text-gray-900 leading-snug">
                {isLinkRevoked ? 'Enlace no disponible' : 'Este enlace ya venció'}
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                {isLinkRevoked
                  ? 'Este enlace ya no está disponible. Solicite al negocio una nueva proforma.'
                  : 'Este enlace ya venció. Solicite al negocio una nueva proforma.'}
              </p>
            </div>
            {data.businessName && (
              <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
                {data.businessName}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            {/* Banda superior fija */}
            <div className="px-5 py-2.5 bg-gray-900 text-white flex items-center gap-2 text-xs font-medium">
              <FileText size={16} weight="bold" className="shrink-0 text-gray-300" />
              <span>Proforma. No es un comprobante de venta.</span>
            </div>

            {/* Cabecera con negocio, número, estado y vigencia */}
            <div className="p-6 pb-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 truncate">
                <Storefront size={16} weight="duotone" className="shrink-0 text-gray-700" />
                <span className="truncate">{data.businessName}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  Proforma{quoteNumber ? ` ${quoteNumber}` : ''}
                </h1>
                {badge && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                {issuedDate && (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-gray-500">Fecha de emisión</span>
                    <span className="font-mono text-gray-700">
                      {formatPublicDateTime(issuedDate)}
                    </span>
                  </div>
                )}
                {data.validUntilLabel && (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-gray-500">Vigencia</span>
                    <span className="font-semibold text-gray-800 whitespace-nowrap">
                      Válida hasta {data.validUntilLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total destacado */}
            <div className="p-6 bg-gray-50/60 border-b border-gray-100 text-center space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 block">
                Total de la proforma
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 font-mono tracking-tight whitespace-nowrap">
                {formatPublicCurrency(data.total, data.currency)}
              </div>
            </div>

            {/* Acción de descarga + aviso comercial */}
            <div className="p-6 space-y-4">
              {data.pdfUrl ? (
                <a
                  href={data.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl text-center flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  <FilePdf size={20} weight="bold" />
                  <span>Ver / descargar PDF</span>
                </a>
              ) : (
                <p className="text-xs text-center text-gray-500">
                  El archivo PDF no está disponible.
                </p>
              )}

              <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3.5 flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                <Info size={16} weight="bold" className="shrink-0 text-gray-500 mt-0.5" />
                <p>
                  Precios sujetos a disponibilidad y cambio sin previo aviso hasta su confirmación de
                  venta.
                </p>
              </div>

              {data.expiresAt && (
                <p className="text-xs text-gray-500 text-center">
                  Enlace disponible hasta el {formatPublicExpiresDate(data.expiresAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pie discreto */}
      <footer className="w-full max-w-[440px] mx-auto mt-6 text-center text-xs text-gray-500">
        Proforma. No es un comprobante de venta.
      </footer>
    </div>
  );
};

