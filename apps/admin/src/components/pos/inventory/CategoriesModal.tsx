import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Tag,
  PencilSimple,
  Trash,
  Check,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  PosCategory,
  getPosCategories,
  createPosCategory,
  updatePosCategory,
  deletePosCategory,
} from 'api-client';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
}) => {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [isSaving, setIsSaving] = useState(false);

  // Deletion confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPosCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las categorías.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor('#3B82F6');
    setError(null);
    setSuccess(null);
    setDeletingId(null);
  };

  const handleStartEdit = (cat: PosCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color || '#3B82F6');
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await updatePosCategory(editingId, { name: trimmed, color });
        setSuccess('Categoría actualizada correctamente.');
      } else {
        await createPosCategory({ name: trimmed, color });
        setSuccess('Categoría creada correctamente.');
      }
      resetForm();
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'No se pudo guardar la categoría.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deletePosCategory(id);
      setSuccess('Categoría eliminada.');
      setDeletingId(null);
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      if (err?.response?.data?.code === 'CATEGORY_HAS_PRODUCTS' || err?.response?.status === 409) {
        setError(
          err?.response?.data?.message ||
            'No se puede eliminar la categoría porque tiene productos asignados. Cambia de categoría sus productos primero.',
        );
      } else {
        setError(err?.response?.data?.message || 'No se pudo eliminar la categoría.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
              <Tag size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Administrar categorías
              </h2>
              <p className="text-xs text-gray-500">
                Crea, edita o elimina las categorías de tus productos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensajes de error o éxito */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
            <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}
        {success && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
            <Check size={18} className="shrink-0 text-emerald-600 mt-0.5" />
            <p className="leading-snug">{success}</p>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Formulario de creación / edición */}
          <form onSubmit={handleSave} className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {editingId ? 'Editar categoría' : 'Nueva categoría'}
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre de la categoría <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Bebidas, Carnes, Abarrotes..."
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-600 shadow-2xs"
                maxLength={60}
                required
              />
            </div>

            {/* Selector de color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Color de identificación
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      color.toLowerCase() === c.toLowerCase()
                        ? 'border-gray-900 scale-110 shadow-xs ring-2 ring-purple-400'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-semibold text-xs transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {editingId ? (
                  <>
                    <Check size={16} weight="bold" />
                    <span>Guardar cambios</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} weight="bold" />
                    <span>Agregar categoría</span>
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-medium text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Listado de categorías */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2.5">
              Categorías registradas ({categories.length})
            </h3>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Cargando categorías...
              </div>
            ) : categories.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-4 text-center">
                No hay categorías creadas aún.
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200/80 bg-white hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#94A3B8' }}
                      />
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Editar nombre y color"
                        aria-label="Editar"
                      >
                        <PencilSimple size={18} />
                      </button>

                      {deletingId === cat.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                          <span className="text-xs text-red-700 font-medium px-2">¿Eliminar?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id)}
                            disabled={isSaving}
                            className="min-h-[36px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="min-h-[36px] px-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingId(cat.id);
                            setError(null);
                          }}
                          className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar categoría"
                          aria-label="Eliminar"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

