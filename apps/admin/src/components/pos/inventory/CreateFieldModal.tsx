import React, { useState } from 'react';
import { X, SlidersHorizontal, FloppyDisk, WarningCircle, Plus } from '@phosphor-icons/react';
import { createPosProductField } from 'api-client';

interface CreateFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (field: any) => void;
  businessId?: string;
}

export const CreateFieldModal: React.FC<CreateFieldModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  businessId,
}) => {
  const [label, setLabel] = useState('');
  const [optionInput, setOptionInput] = useState('');
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;
    if (optionsList.includes(trimmed)) {
      setOptionInput('');
      return;
    }
    setOptionsList((prev) => [...prev, trimmed]);
    setOptionInput('');
  };

  const handleRemoveOption = (index: number) => {
    setOptionsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();

    if (!cleanLabel) {
      setError('El nombre del atributo es obligatorio.');
      return;
    }

    // Si tiene texto pendiente en el input de opciones, agregarlo
    const finalOptions = [...optionsList];
    const pending = optionInput.trim();
    if (pending && !finalOptions.includes(pending)) {
      finalOptions.push(pending);
    }

    if (finalOptions.length === 0) {
      setError('Ingresá al menos una opción para este atributo (ej. S, M, L o Blanco, Rojo).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createPosProductField(
        {
          label: cleanLabel,
          dataType: 'LIST',
          options: finalOptions,
        },
        businessId,
      );
      setLabel('');
      setOptionInput('');
      setOptionsList([]);
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudo crear el atributo. Verificá que no exista ya uno con ese nombre.',
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
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nuevo atributo del negocio</h3>
              <p className="text-xs text-gray-500">Creá un atributo propio (ej. Talla, Color, Sabor)</p>
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
              Nombre del atributo <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. Talla, Color, Sabor, Capacidad"
              maxLength={100}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Opciones del atributo <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="Escribí una opción y presioná Agregar"
                className="flex-1 h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600"
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                <span>Agregar</span>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Podés agregar más opciones ahora o más adelante al editar el producto.
            </p>

            {optionsList.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 p-2 rounded-xl bg-gray-50 border border-gray-200">
                {optionsList.map((opt, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-gray-800 border border-gray-200 shadow-2xs"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-gray-400 hover:text-red-600 ml-0.5"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
              <span>{isSubmitting ? 'Guardando...' : 'Guardar atributo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

