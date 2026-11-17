import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Printer,
  FilePdf,
  CircleNotch,
  WarningCircle,
  CheckCircle,
  FileText,
  Receipt,
} from '@phosphor-icons/react';
import {
  canPrintQuote,
  formatQuoteApiError,
  getPosQuoteById,
  type PosQuote,
} from 'api-client';
import {
  downloadQuotePdfFile,
  generateReceiptHtml,
  printReceiptViaIframe,
} from '../../../utils/receiptHtml';
import { useAuthStore } from '../../../store/auth.store';

interface QuotePrintModalProps {
  isOpen: boolean;
  quoteId: string | null;
  initialQuote?: PosQuote | null;
  businessId?: string;
  onClose: () => void;
}

export const QuotePrintModal: React.FC<QuotePrintModalProps> = ({
  isOpen,
  quoteId,
  initialQuote,
  businessId,
  onClose,
}) => {
  const user = useAuthStore((s) => s.user);
  const [quote, setQuote] = useState<PosQuote | null>(initialQuote || null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [format, setFormat] = useState<'carta' | 'ticket'>('carta');
  const [paperWidthMm, setPaperWidthMm] = useState<58 | 80>(80);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !quoteId) {
      setQuote(null);
      setLoadError(null);
      setFeedback(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setFeedback(null);
    if (initialQuote && initialQuote.id === quoteId) {
      setQuote(initialQuote);
    }

    getPosQuoteById(quoteId, businessId)
      .then((fresh) => {
        if (!cancelled) {
          setQuote(fresh);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            formatQuoteApiError(err, 'No se pudo cargar la proforma para impresión.').message,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, quoteId, businessId, initialQuote]);

  const printable = quote ? canPrintQuote(quote.status) : false;

  const htmlContent = useMemo(() => {
    if (!quote || !printable) return '';
    return generateReceiptHtml(quote, null, undefined, null, {
      mode: 'proforma',
      quote,
      format,
      paperWidthMm,
      currentUser: user,
    });
  }, [quote, printable, format, paperWidthMm, user]);

  if (!isOpen || !quoteId) return null;

  const handlePrint = async () => {
    if (!quote || !htmlContent || isPrinting) return;
    setIsPrinting(true);
    setFeedback(null);
    try {
      await printReceiptViaIframe(htmlContent, `Proforma-${quote.quoteNumber}`);
      setFeedback({
        type: 'success',
        message: 'Se abrió el diálogo de impresión del navegador.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'No se pudo abrir la ventana de impresión.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote || !htmlContent || isSavingPdf) return;
    setIsSavingPdf(true);
    setFeedback(null);
    try {
      await downloadQuotePdfFile(quote, htmlContent, {
        format,
        paperWidthMm,
      });
      setFeedback({
        type: 'success',
        message: `PDF guardado como proforma-${quote.quoteNumber}.pdf.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'No se pudo generar el PDF de la proforma.',
      });
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">
              Imprimir proforma {quote?.quoteNumber || ''}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Vista previa del documento comercial en formato Carta o Ticket térmico
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar vista previa"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de opciones de formato */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setFormat('carta')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  format === 'carta'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={15} />
                Hoja Carta
              </button>
              <button
                type="button"
                onClick={() => setFormat('ticket')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  format === 'ticket'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt size={15} />
                Ticket
              </button>
            </div>

            {format === 'ticket' && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaperWidthMm(80)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    paperWidthMm === 80
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80 mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidthMm(58)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    paperWidthMm === 58
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  58 mm
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!printable || isLoading || isPrinting || !htmlContent}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed min-h-[38px]"
            >
              {isPrinting ? <CircleNotch size={16} className="animate-spin" /> : <Printer size={16} />}
              Imprimir
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!printable || isLoading || isSavingPdf || !htmlContent}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed min-h-[38px]"
            >
              {isSavingPdf ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : (
                <FilePdf size={16} />
              )}
              Guardar PDF
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-xl border text-xs flex items-center gap-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={16} className="shrink-0" weight="fill" />
            ) : (
              <WarningCircle size={16} className="shrink-0" weight="fill" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Área de vista previa */}
        <div className="flex-1 overflow-auto bg-slate-200/70 p-3 sm:p-6 flex justify-center">
          {isLoading && !quote ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
              <CircleNotch size={28} className="animate-spin text-emerald-600" />
              <span className="text-sm font-medium">Cargando documento de proforma...</span>
            </div>
          ) : loadError ? (
            <div className="max-w-md my-auto bg-white border border-rose-200 rounded-2xl p-5 text-center shadow-xs">
              <WarningCircle size={28} className="text-rose-600 mx-auto mb-2" weight="fill" />
              <p className="text-sm font-semibold text-slate-900">No se pudo cargar</p>
              <p className="text-xs text-slate-600 mt-1">{loadError}</p>
            </div>
          ) : quote && !printable ? (
            <div className="max-w-md my-auto bg-white border border-amber-200 rounded-2xl p-5 text-center shadow-xs">
              <WarningCircle size={28} className="text-amber-600 mx-auto mb-2" weight="fill" />
              <p className="text-sm font-semibold text-slate-900">Proforma no imprimible</p>
              <p className="text-xs text-slate-600 mt-1">
                Solo podés imprimir proformas emitidas, aceptadas, vencidas o convertidas. Emití la
                proforma primero si está en borrador.
              </p>
            </div>
          ) : (
            <div
              className={`bg-white shadow-lg border border-slate-300 rounded-lg overflow-hidden shrink-0 ${
                format === 'carta'
                  ? 'w-full max-w-[794px]'
                  : paperWidthMm === 58
                    ? 'w-[240px]'
                    : 'w-[320px]'
              }`}
            >
              <iframe
                title={`Vista previa Proforma ${quote?.quoteNumber || ''}`}
                srcDoc={htmlContent}
                className="w-full min-h-[600px] border-0 bg-white"
                style={{ height: format === 'carta' ? '760px' : '640px' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

