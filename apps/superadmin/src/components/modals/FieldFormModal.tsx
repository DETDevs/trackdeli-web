import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';

export interface FieldFormValues {
  label: string;
  dataType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN' | 'DATE';
  options: string[];
  isRequired: boolean;
  isSearchable: boolean;
  showInPos: boolean;
}

interface FieldFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  initialValues?: FieldFormValues;
  isEditMode?: boolean;
  isKeyLocked?: boolean;
  isLoading?: boolean;
  onSubmit: (values: FieldFormValues) => void;
}

export const FieldFormModal: React.FC<FieldFormModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  initialValues,
  isEditMode,
  isKeyLocked,
  isLoading,
  onSubmit,
}) => {
  const [label, setLabel] = useState('');
  const [dataType, setDataType] = useState<'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN' | 'DATE'>('TEXT');
  const [optionsStr, setOptionsStr] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isSearchable, setIsSearchable] = useState(false);
  const [showInPos, setShowInPos] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setLabel(initialValues.label);
        setDataType(initialValues.dataType);
        setOptionsStr(initialValues.options?.join(', ') || '');
        setIsRequired(initialValues.isRequired);
        setIsSearchable(initialValues.isSearchable);
        setShowInPos(initialValues.showInPos);
      } else {
        setLabel('');
        setDataType('TEXT');
        setOptionsStr('');
        setIsRequired(false);
        setIsSearchable(false);
        setShowInPos(false);
      }
    }
  }, [isOpen, initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;

    onSubmit({
      label,
      dataType,
      options: dataType === 'SELECT' ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      isRequired,
      isSearchable,
      showInPos,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Etiqueta del campo *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            disabled={isKeyLocked && isEditMode}
            className={`w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 ${isKeyLocked && isEditMode ? 'bg-gray-50' : ''}`}
          />
          {isKeyLocked && isEditMode && (
             <p className="text-[10px] text-gray-400 mt-1">La etiqueta y tipo están bloqueados porque este campo ya tiene datos asociados.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de dato *</label>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as any)}
            required
            disabled={isEditMode}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 disabled:bg-gray-50"
          >
            <option value="TEXT">Texto corto</option>
            <option value="NUMBER">Número</option>
            <option value="SELECT">Lista (Selector)</option>
            <option value="BOOLEAN">Si/No (Switch)</option>
            <option value="DATE">Fecha</option>
          </select>
        </div>

        {dataType === 'SELECT' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Opciones (separadas por coma) *</label>
            <input
              type="text"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              required={dataType === 'SELECT'}
              placeholder="Opción 1, Opción 2, Opción 3"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
            Campo obligatorio
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isSearchable} onChange={e => setIsSearchable(e.target.checked)} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
            Buscable (en la lista de negocios)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showInPos} onChange={e => setShowInPos(e.target.checked)} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
            Mostrar en el perfil dentro del POS
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};
