import React, { useState } from 'react';
import { X, Tag, Plus, Check, PencilSimple } from '@phosphor-icons/react';
import { ExpenseCategory } from '../../types/finances';
import {
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
} from '../../hooks/useFinances';

interface ManageExpenseCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#64748B', // Slate
];

export const ManageExpenseCategoriesModal: React.FC<ManageExpenseCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const createCategoryMutation = useCreateExpenseCategory();
  const updateCategoryMutation = useUpdateExpenseCategory();

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setError(null);
    setIsCreating(true);
  };

  const handleStartEdit = (cat: ExpenseCategory) => {
    setIsCreating(false);
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setColor(cat.color || PRESET_COLORS[0]);
    setError(null);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingCategory(null);
    setName('');
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    setError(null);

    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        dto: {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        },
      });
      setEditingCategory(null);
    } else {
      await createCategoryMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      setIsCreating(false);
    }

    setName('');
    setDescription('');
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    await updateCategoryMutation.mutateAsync({
      id: cat.id,
      dto: { isActive: !cat.isActive },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
              <Tag size={18} weight="bold" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Categorías de Gastos</h3>
              <p className="text-xs text-gray-500">Organiza tus costos operativos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Formulario de creación o edición */}
          {(isCreating || editingCategory) && (
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Alquiler, Servicios Básicos, Salarios..."
                  autoFocus
                  required
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre lo que agrupa esta categoría"
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-gray-900"
                />
              </div>

              {/* Selector de color */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Color</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        color === c ? 'scale-115 ring-2 ring-gray-900 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    createCategoryMutation.isPending || updateCategoryMutation.isPending
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <Check size={13} weight="bold" />
                  <span>{editingCategory ? 'Actualizar' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Botón para añadir si no está abierto el formulario */}
          {!isCreating && !editingCategory && (
            <button
              onClick={handleStartCreate}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
            >
              <Plus size={14} weight="bold" />
              <span>Añadir nueva categoría</span>
            </button>
          )}

          {/* Lista de categorías */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Categorías registradas ({categories.length})
            </span>

            {categories.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">
                Aún no has registrado ninguna categoría.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200/80 bg-white overflow-hidden">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#3B82F6' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold truncate ${
                              cat.isActive ? 'text-gray-900' : 'text-gray-400 line-through'
                            }`}
                          >
                            {cat.name}
                          </span>
                          {!cat.isActive && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              Inactiva
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-gray-400 truncate">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                          cat.isActive
                            ? 'text-gray-500 hover:bg-gray-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {cat.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex justify-end shrink-0 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
