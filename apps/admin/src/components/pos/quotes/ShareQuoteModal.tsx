import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  WhatsappLogo,
  CircleNotch,
  Copy,
  Check,
  WarningCircle,
  WifiSlash,
  ArrowClockwise,
  Link as LinkIcon,
} from '@phosphor-icons/react';
import {
  formatQuoteApiError,
  getPosQuoteById,
  uploadQuoteReceiptPdf,
  type PosQuote,
  type UploadQuoteReceiptLinkResponse,
} from 'api-client';
import {
  buildQuoteWhatsAppMessage,
  generateShareableQuotePdfBlob,
} from '../../../utils/quoteReceiptHtml';
import { buildWhatsAppUrl } from '../../../utils/receiptPdf';

interface ShareQuoteModalProps {
  isOpen: boolean;
  quote: PosQuote | null;
  businessName?: string | null;
  businessId?: string;
  onClose: () => void;
}

export const ShareQuoteModal: React.FC<ShareQuoteModalProps> = ({
  isOpen,
  quote,
  businessName,
  businessId,
  onClose,
}) => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<UploadQuoteReceiptLinkResponse | null>(null);
  const [resolvedQuote, setResolvedQuote] = useState<PosQuote | null>(null);
  const [pdfSizeKb, setPdfSizeKb] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  const prepareShareLink = async () => {
    if (!quote) return;
    if (!navigator.onLine) {
      setStatus('error');
      setErrorMessage('Necesitás conexión a internet para generar el enlace de esta proforma.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
    setCopiedUrl(false);

    try {
      const fullQuote =
        quote.items && quote.items.length > 0 && quote.issuer
          ? quote
          : await getPosQuoteById(quote.id, businessId);
      setResolvedQuote(fullQuote);

      const pdfBlob = await generateShareableQuotePdfBlob(fullQuote);
      setPdfSizeKb(Math.max(1, Math.round(pdfBlob.size / 1024)));

      const uploaded = await uploadQuoteReceiptPdf(
        fullQuote.id,
        pdfBlob,
        businessId,
        `${fullQuote.quoteNumber || 'Proforma'}.pdf`,
      );
      setLinkResult(uploaded);
      setStatus('ready');
    } catch (err: any) {
      const parsed = formatQuoteApiError(
        err,
        err?.message || 'No se pudo generar o subir el PDF de la proforma.',
      );
      setErrorMessage(parsed.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!isOpen || !quote) {
      setStatus('idle');
      setErrorMessage(null);
      setLinkResult(null);
      setResolvedQuote(null);
      setPdfSizeKb(null);
      setCopiedUrl(false);
      return;
    }
    void prepareShareLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quote?.id]);

  const activeQuote = resolvedQuote || quote;

  const whatsappMessage = useMemo(() => {
    if (!activeQuote || !linkResult?.url) return '';
    return buildQuoteWhatsAppMessage(activeQuote, linkResult.url, businessName);
  }, [activeQuote, linkResult?.url, businessName]);

  const whatsappHref = useMemo(() => {
    if (!whatsappMessage) return '';
    return buildWhatsAppUrl(activeQuote?.customerPhone, whatsappMessage);
  }, [activeQuote?.customerPhone, whatsappMessage]);

  if (!isOpen || !quote) return null;

  const handleCopyLink = async () => {
    if (!linkResult?.url) return;
    try {
      await navigator.clipboard.writeText(linkResult.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setCopiedUrl(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!whatsappHref) return;
    window.open(whatsappHref, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Compartir proforma {activeQuote?.quoteNumber}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Generá el enlace del documento PDF en Hoja Carta y envialo por WhatsApp.
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

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!isOnline ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
              <WifiSlash size={20} className="text-amber-700 shrink-0 mt-0.5" weight="bold" />
              <div className="text-xs sm:text-sm text-amber-950 space-y-1">
                <p className="font-bold">Sin conexión a internet</p>
                <p>Necesitás conexión a internet para subir y compartir el documento.</p>
              </div>
            </div>
          ) : status === 'loading' ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-slate-600">
              <CircleNotch size={30} className="animate-spin text-emerald-600" />
              <span className="text-sm font-semibold">
                Generando PDF Hoja Carta y preparando enlace...
              </span>
            </div>
          ) : status === 'error' ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-rose-900 text-xs sm:text-sm">
                <WarningCircle size={20} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
                <div>
                  <p className="font-bold">No se pudo preparar el enlace</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void prepareShareLink()}
                className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-100 text-xs font-bold text-rose-900 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowClockwise size={15} />
                Reintentar
              </button>
            </div>
          ) : status === 'ready' && linkResult ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-950 inline-flex items-center gap-1.5">
                    <LinkIcon size={15} className="text-emerald-700" weight="bold" />
                    Enlace público de la proforma
                  </span>
                  {pdfSizeKb !== null && (
                    <span className="text-emerald-800 font-semibold whitespace-nowrap">
                      PDF Carta ({pdfSizeKb} KB)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    readOnly
                    value={linkResult.url}
                    aria-label="Enlace público de la proforma"
                    className="flex-1 min-w-0 bg-transparent text-xs text-slate-800 font-mono focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                    <span>{copiedUrl ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                <p className="font-bold text-slate-800">Mensaje para WhatsApp</p>
                <p className="text-slate-700 bg-white border border-slate-200 rounded-xl p-3 leading-relaxed break-words">
                  {whatsappMessage}
                </p>
                <p className="text-slate-600">
                  {activeQuote?.customerPhone
                    ? `Destino: ${activeQuote.customerPhone}`
                    : 'Sin teléfono registrado: al abrir WhatsApp vas a poder elegir el contacto.'}
                </p>
              </div>
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
            Cerrar
          </button>
          <button
            type="button"
            disabled={!isOnline || status !== 'ready' || !whatsappHref}
            onClick={handleOpenWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <WhatsappLogo size={18} weight="fill" />
            <span>Enviar por WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};

