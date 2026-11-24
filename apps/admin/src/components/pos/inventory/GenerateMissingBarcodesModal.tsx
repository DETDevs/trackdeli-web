import React, { useEffect, useState } from 'react';
import {
  Barcode,
  CheckCircle,
  CircleNotch,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import {
  generateMissingPosBarcodes,
  type PosGenerateMissingBarcodesResponse,
} from 'api-client';
import toast from 'react-hot-toast';

interface GenerateMissingBarcodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

export const GenerateMissingBarcodesModal: React.FC<GenerateMissingBarcodesModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<PosGenerateMissingBarcodesResponse | null>(null);
  const [result, setResult] = useState<PosGenerateMissingBarcodesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const runDryRun = async () => {
      setIsChecking(true);
      setError(null);
      try {
        const res = await generateMissingPosBarcodes({ dryRun: true });
        if (!cancelled) {
          setPreview(res);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'No se pudo revisar cuántos productos faltan por código de barras.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    runDryRun();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await generateMissingPosBarcodes({ dryRun: false });
      setResult(res);
      toast.success(
        res.generated === 1
          ? 'Se generó 1 código de barras.'
          : `Se generaron ${res.generated} códigos de barras.`,
      );
      onGenerated();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudieron generar los códigos faltantes.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const countToGenerate = preview?.wouldGenerate ?? preview?.eligible ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Barcode size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Generar códigos faltantes</h2>
              <p className="text-xs text-gray-500">
                Códigos internos EAN-13 para productos y variantes sin código
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {isChecking && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-gray-600">
              <CircleNotch size={24} className="animate-spin text-purple-600" />
              <span>Revisando tu catálogo...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isChecking && preview && !result && (
            <div className="space-y-3 text-xs text-gray-700">
              {countToGenerate === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Todo tu catálogo activo ya tiene código</p>
                    <p className="text-emerald-800 mt-0.5">
                      No encontramos productos ni variantes activas sin código de barras.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-sm font-bold text-gray-900">
                      {countToGenerate === 1
                        ? 'Se generará 1 código de barras'
                        : `Se generarán ${countToGenerate} códigos de barras`}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Se asignará un código EAN-13 único a cada producto simple activo y variante
                      activa que hoy no tenga código.
                    </p>
                    {preview.remaining > 0 && (
                      <p className="text-xs text-amber-800 font-medium mt-2">
                        Quedarán {preview.remaining} pendientes para un siguiente lote (máximo{' '}
                        {preview.maxPerCall} por llamada).
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Los productos que ya tienen código no se modifican. Los productos inactivos y
                    padres con variantes se omiten.
                  </p>
                </>
              )}
            </div>
          )}

          {result && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                <span>
                  {result.generated === 1
                    ? 'Se generó 1 código correctamente'
                    : `Se generaron ${result.generated} códigos correctamente`}
                </span>
              </div>
              {result.skipped > 0 && (
                <p className="text-emerald-800">Omitidos: {result.skipped}.</p>
              )}
              {result.remaining > 0 && (
                <p className="text-amber-800 font-medium">
                  Todavía quedan {result.remaining} sin código. Podés volver a ejecutar esta acción.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {result || countToGenerate === 0 ? 'Cerrar' : 'Cancelar'}
          </button>

          {!isChecking && preview && !result && countToGenerate > 0 && (
            <button
              type="button"
              onClick={handleConfirmGenerate}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isGenerating && <CircleNotch size={14} className="animate-spin" />}
              <span>
                {isGenerating
                  ? 'Generando...'
                  : countToGenerate === 1
                  ? 'Generar 1 código'
                  : `Generar ${countToGenerate} códigos`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
