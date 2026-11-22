import React, { useState } from 'react';
import { X, Scales, FloppyDisk, WarningCircle } from '@phosphor-icons/react';
import { createPosUnit, type PosUnit } from 'api-client';

interface CreateUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (unit: PosUnit) => void;
  businessId?: string;
}

export const CreateUnitModal: React.FC<CreateUnitModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  businessId,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [allowsDecimals, setAllowsDecimals] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setError('El código de la unidad es obligatorio.');
      return;
    }
    if (cleanCode.length > 10) {
      setError('El código no puede superar los 10 caracteres.');
      return;
    }
    if (!cleanName) {
      setError('El nombre de la unidad es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createPosUnit(
        {
          code: cleanCode,
          name: cleanName,
          allowsDecimals,
        },
        businessId,
      );
      setCode('');
      setName('');
      setAllowsDecimals(false);
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo crear la unidad de medida. Verificá que el código no esté repetido.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              <Scales size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nueva unidad de medida</h3>
              <p className="text-xs text-gray-500">Creá una unidad personalizada para el catálogo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
              <WarningCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Código corto <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej. ROLLO, DOC, MT"
              maxLength={10}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-900 uppercase focus:outline-none focus:border-purple-600"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">Máximo 10 letras o números.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Nombre descriptivo <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Rollo, Docena, Metro"
              maxLength={100}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
            />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={allowsDecimals}
              onChange={(e) => setAllowsDecimals(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 mt-0.5"
            />
            <div className="text-xs">
              <span className="font-semibold text-gray-900 block">
                Se vende por peso o medida (acepta decimales)
              </span>
              <span className="text-gray-500 block mt-0.5">
                Permite registrar cantidades fraccionarias en ventas e inventario (ej. 0.5 o 2.75).
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[40px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <FloppyDisk size={16} weight="bold" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar unidad'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
