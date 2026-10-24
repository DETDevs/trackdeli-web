import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FilePdf,
  Clock,
  WarningCircle,
  CircleNotch,
  Storefront,
} from '@phosphor-icons/react';

interface PublicReceiptData {
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  businessName: string;
  folio: string;
  saleDate: string;
  total: number;
  currency: string;
  expiresAt: string;
  pdfUrl?: string;
}

const rawBase = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE = rawBase.endsWith('/api/v1')
  ? rawBase
  : `${rawBase.replace(/\/+$/, '')}/api/v1`;

const formatCurrency = (amount: number, currency?: string) => {
  const curr = (currency || 'NIO').toUpperCase();
  const symbol = curr === 'USD' || curr === '$' ? '$' : 'C$';
  const formatted = Number(amount || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

const formatExpiresDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-NI', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const PublicReceiptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    // 1. Título de pestaña
    document.title = 'Comprobante de venta';

    // 2. Meta robots noindex, nofollow
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let createdMeta = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
      createdMeta = true;
    }
    const prevContent = metaRobots.content;
    metaRobots.content = 'noindex, nofollow';

    return () => {
      if (createdMeta && metaRobots && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      } else if (metaRobots) {
        metaRobots.content = prevContent;
      }
    };
  }, []);

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
      .get<PublicReceiptData>(`${API_BASE}/public/receipts/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!isMounted) return;
        setData(res.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setHasError(true);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center">
        {isLoading ? (
          /* Estado de carga */
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-3">
            <CircleNotch size={32} className="animate-spin text-gray-400 mx-auto" />
            <p className="text-sm font-medium text-gray-500">Cargando comprobante...</p>
          </div>
        ) : hasError || !data ? (
          /* Estado no encontrado / error */
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
        ) : data.status === 'EXPIRED' || data.status === 'REVOKED' ? (
          /* Estado vencido o revocado */
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <Clock size={28} weight="fill" />
            </div>
            <div className="space-y-2">
              <h1 className="text-base font-bold text-gray-900 leading-snug">
                Este comprobante ya no está disponible
              </h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                Este comprobante ya no está disponible. Pídele al negocio que te lo envíe de nuevo.
              </p>
            </div>
            {data.businessName && (
              <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">
                {data.businessName}
              </div>
            )}
          </div>
        ) : (
          /* Estado activo */
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            {/* Cabecera con negocio y folio */}
            <div className="p-6 pb-4 border-b border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 truncate">
                <Storefront size={16} weight="duotone" className="shrink-0 text-gray-700" />
                <span className="truncate">{data.businessName}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Comprobante de venta</h1>
              <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>Folio: #{data.folio}</span>
                <span>{formatDateTime(data.saleDate)}</span>
              </div>
            </div>

            {/* Total destacado */}
            <div className="p-6 bg-gray-50/60 border-b border-gray-100 text-center space-y-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                Total de la compra
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 font-mono tracking-tight">
                {formatCurrency(data.total, data.currency)}
              </div>
            </div>

            {/* Acción de descarga */}
            <div className="p-6 space-y-3">
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
                <p className="text-xs text-center text-gray-400">
                  El archivo PDF no está disponible.
                </p>
              )}

              {data.expiresAt && (
                <p className="text-[11px] text-gray-400 text-center">
                  Disponible hasta el {formatExpiresDate(data.expiresAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pie discreto */}
      <footer className="w-full max-w-[420px] mx-auto mt-6 text-center text-[11px] text-gray-400">
        Comprobante de venta. No sustituye una factura fiscal.
      </footer>
    </div>
  );
};
