import React, { useMemo, useState } from 'react';
import {
  X,
  Printer,
  FilePdf,
  WarningCircle,
  ArrowsClockwise,
  CheckCircle,
} from '@phosphor-icons/react';
import { ReportDocument, ReportModalOption } from '../../types/report';
import {
  buildReportPdfHtml,
  downloadReportPdfDocument,
  printReportHtmlViaIframe,
} from '../../utils/reportPdfHtml';
import { buildSuggestedReportPdfName } from '../../utils/reportHelpers';

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ReportDocument | null;
  isPreparing?: boolean;
  options?: ReportModalOption[];
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  document,
  isPreparing = false,
  options = [],
}) => {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const previewHtml = useMemo(() => {
    if (!document) return '';
    try {
      return buildReportPdfHtml(document);
    } catch (err) {
      console.error('[ReportPrintModal] Error construyendo HTML de reporte:', err);
      return '<div style="padding:20px;color:red;">Error al generar la vista previa del reporte.</div>';
    }
  }, [document]);

  const suggestedPdfName = useMemo(() => {
    if (!document) return 'Reporte.pdf';
    return buildSuggestedReportPdfName(document);
  }, [document]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    if (!document || isPrinting || isSavingPdf || isPreparing) return;
    setIsPrinting(true);
    setFeedback(null);

    try {
      await printReportHtmlViaIframe(previewHtml, suggestedPdfName.replace(/\.pdf$/, ''));
      setFeedback({
        type: 'success',
        message: 'Diálogo de impresión del navegador abierto.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'No se pudo abrir el diálogo de impresión.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async () => {
    if (!document || isSavingPdf || isPrinting || isPreparing) return;
    setIsSavingPdf(true);
    setFeedback(null);

    try {
      // Intentamos descarga directa con jsPDF o con el diálogo de guardado del navegador
      const previewEl = window.document.getElementById('report-letter-preview-content');
      await downloadReportPdfDocument(document, previewEl);
      setFeedback({
        type: 'success',
        message: `PDF preparado: ${suggestedPdfName}`,
      });
    } catch (err: any) {
      console.warn('[ReportPrintModal] Falló generación directa jsPDF, abriendo diálogo nativo:', err);
      try {
        await printReportHtmlViaIframe(previewHtml, suggestedPdfName.replace(/\.pdf$/, ''));
        setFeedback({
          type: 'success',
          message: 'Usá "Guardar como PDF" en el diálogo del navegador.',
        });
      } catch (innerErr: any) {
        setFeedback({
          type: 'error',
          message: innerErr?.message || 'Error al generar o guardar el archivo PDF.',
        });
      }
    } finally {
      setIsSavingPdf(false);
    }
  };

  const rowCount = document?.rowCount || 0;
  const isLargeDocument = rowCount > 150;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-print-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shadow-xs">
              <Printer size={18} weight="bold" />
            </div>
            <div>
              <h2
                id="report-print-modal-title"
                className="text-sm sm:text-base font-bold text-gray-900 tracking-tight"
              >
                Imprimir reporte
              </h2>
              <p className="text-[11px] text-gray-500">
                {document?.title ? `${document.title} · Hoja carta (PDF)` : 'Vista previa de hoja carta'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Cerrar modal"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Barra de opciones y avisos */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Opciones configurables del reporte */}
          <div className="flex items-center gap-4 flex-wrap">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none hover:text-gray-900"
              >
                <input
                  type="checkbox"
                  checked={opt.checked}
                  onChange={(e) => opt.onChange(e.target.checked)}
                  disabled={isPreparing}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="text-[11px] text-gray-500 font-mono">
            {rowCount} {rowCount === 1 ? 'fila' : 'filas'} en el filtro
          </div>
        </div>

        {/* Aviso de más de 150 filas */}
        {isLargeDocument && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <WarningCircle size={16} className="text-amber-600 shrink-0" weight="fill" />
            <span>
              Este reporte tiene <strong>{rowCount}</strong> filas. El PDF puede tener varias páginas.
            </span>
          </div>
        )}

        {/* Feedback de estado */}
        {feedback && (
          <div
            className={`px-5 py-2 text-xs flex items-center gap-2 border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
            ) : (
              <WarningCircle size={15} weight="fill" className="text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Área de Vista Previa (Hoja Carta) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100/80 flex justify-center">
          {isPreparing ? (
            <div className="m-auto text-center space-y-2 py-16">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-gray-600">Preparando reporte...</p>
            </div>
          ) : !document ? (
            <div className="m-auto text-center py-16 text-xs text-gray-400">
              No hay documento para previsualizar.
            </div>
          ) : (
            <div className="w-full max-w-[780px] bg-white rounded-xl shadow-lg border border-gray-200/90 overflow-hidden flex flex-col min-h-[580px]">
              {/* Vista previa real mediante iframe con aislamiento de estilos */}
              <iframe
                title="Vista previa del reporte"
                srcDoc={previewHtml}
                className="w-full h-[62vh] border-0"
              />

              {/* Elemento oculto renderizado para jsPDF html2canvas */}
              <div
                id="report-letter-preview-content"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  top: '0',
                  width: '794px',
                  background: '#FFFFFF',
                  padding: '20px',
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>

        {/* Footer con botones de acción */}
        <div className="px-5 py-3.5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 truncate max-w-sm hidden sm:block">
            Archivo sugerido: <span className="font-mono text-gray-700">{suggestedPdfName}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isSavingPdf || isPreparing || !document}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Guardar archivo PDF"
            >
              {isSavingPdf ? (
                <ArrowsClockwise size={14} className="animate-spin" />
              ) : (
                <FilePdf size={15} weight="bold" />
              )}
              <span>Guardar PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting || isPreparing || !document}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Abrir diálogo de impresión del navegador"
            >
              {isPrinting ? (
                <ArrowsClockwise size={14} className="animate-spin" />
              ) : (
                <Printer size={15} weight="bold" />
              )}
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

