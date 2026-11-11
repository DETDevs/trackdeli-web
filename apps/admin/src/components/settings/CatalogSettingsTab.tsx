import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getPosProductFields,
  createPosProductField,
  updatePosProductField,
  activatePosProductField,
  deactivatePosProductField,
  getPosProductFieldOptions,
  createPosProductFieldOption,
  deletePosProductFieldOption,
} from 'api-client';
import {
  Plus,
  PencilSimple,
  Trash,
  Eye,
  EyeSlash,
  CaretDown,
  CaretUp,
  ListDashes,
} from '@phosphor-icons/react';

interface CatalogSettingsTabProps {
  isReadOnly?: boolean;
}

export const CatalogSettingsTab: React.FC<CatalogSettingsTabProps> = ({ isReadOnly = false }) => {
  const queryClient = useQueryClient();

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['pos', 'product-fields'],
    queryFn: () => getPosProductFields(),
  });

  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  // Field modal state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldDataType, setFieldDataType] = useState('TEXT');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldSearchable, setFieldSearchable] = useState(false);

  // Option modal state
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [activeFieldForOption, setActiveFieldForOption] = useState<string | null>(null);
  const [optionLabel, setOptionLabel] = useState('');

  // Fetch options for expanded field
  const { data: options = [], refetch: refetchOptions } = useQuery({
    queryKey: ['pos', 'product-fields', expandedFieldId, 'options'],
    queryFn: () => (expandedFieldId ? getPosProductFieldOptions(expandedFieldId) : Promise.resolve([])),
    enabled: Boolean(expandedFieldId),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        return deactivatePosProductField(id);
      }
      return activatePosProductField(id);
    },
    onSuccess: () => {
      toast.success('Estado del campo actualizado');
      queryClient.invalidateQueries({ queryKey: ['pos', 'product-fields'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al cambiar estado del campo';
      toast.error(msg);
    },
  });

  const saveFieldMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        return updatePosProductField(payload.id, {
          label: payload.label,
          required: payload.required,
          searchable: payload.searchable,
        });
      }
      return createPosProductField({
        label: payload.label,
        dataType: payload.dataType,
        required: payload.required,
        searchable: payload.searchable,
      });
    },
    onSuccess: () => {
      toast.success(editingField ? 'Campo actualizado' : 'Campo creado');
      setIsFieldModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pos', 'product-fields'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar el campo';
      toast.error(msg);
    },
  });

  const createOptionMutation = useMutation({
    mutationFn: async ({ fieldId, label }: { fieldId: string; label: string }) => {
      return createPosProductFieldOption(fieldId, { label });
    },
    onSuccess: () => {
      toast.success('Opción agregada al catálogo');
      setIsOptionModalOpen(false);
      setOptionLabel('');
      refetchOptions();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al crear opción';
      toast.error(msg);
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async ({ fieldId, optionId }: { fieldId: string; optionId: string }) => {
      return deletePosProductFieldOption(fieldId, optionId);
    },
    onSuccess: () => {
      toast.success('Opción eliminada');
      refetchOptions();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al eliminar opción';
      toast.error(msg);
    },
  });

  const handleOpenNewField = () => {
    setEditingField(null);
    setFieldLabel('');
    setFieldDataType('TEXT');
    setFieldRequired(false);
    setFieldSearchable(false);
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (field: any) => {
    setEditingField(field);
    setFieldLabel(field.label);
    setFieldDataType(field.dataType);
    setFieldRequired(Boolean(field.required));
    setFieldSearchable(Boolean(field.searchable));
    setIsFieldModalOpen(true);
  };

  const handleSaveField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) {
      toast.error('El nombre del campo es obligatorio');
      return;
    }
    saveFieldMutation.mutate({
      id: editingField?.id,
      label: fieldLabel.trim(),
      dataType: fieldDataType,
      required: fieldRequired,
      searchable: fieldSearchable,
    });
  };

  const handleOpenAddOption = (fieldId: string) => {
    setActiveFieldForOption(fieldId);
    setOptionLabel('');
    setIsOptionModalOpen(true);
  };

  const handleSaveOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFieldForOption || !optionLabel.trim()) return;
    createOptionMutation.mutate({
      fieldId: activeFieldForOption,
      label: optionLabel.trim(),
    });
  };

  const activeFields = fields.filter((f: any) => !f.key?.endsWith('_id'));

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-gray-100 rounded-2xl" />
        <div className="h-44 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Campos del catálogo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Personalizá los atributos y listas desplegables que aparecen al crear y editar productos.
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={handleOpenNewField}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Nuevo campo</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {activeFields.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No hay campos configurados para este rubro.
          </div>
        ) : (
          activeFields.map((field: any) => {
            const isExpanded = expandedFieldId === field.id;
            const isListType = field.dataType === 'LIST' || field.dataType === 'SELECT';

            return (
              <div key={field.id} className="transition-colors">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {field.label}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {field.dataType}
                      </span>
                      {field.required && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Requerido
                        </span>
                      )}
                      {field.isSystem && (
                        <span className="text-[10px] text-gray-400 font-medium">Sistema</span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {field.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isListType && (
                      <button
                        type="button"
                        onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200"
                      >
                        <ListDashes size={14} />
                        <span>Opciones</span>
                        {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
                      </button>
                    )}

                    {!isReadOnly && !field.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditField(field)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                      >
                        <PencilSimple size={15} />
                      </button>
                    )}

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          toggleActiveMutation.mutate({ id: field.id, active: field.isActive })
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          field.isActive
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={field.isActive ? 'Desactivar campo' : 'Activar campo'}
                      >
                        {field.isActive ? <Eye size={16} /> : <EyeSlash size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-panel de opciones para listas */}
                {isExpanded && isListType && (
                  <div className="bg-gray-50/70 p-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        Opciones del catálogo ({options.length})
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddOption(field.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Plus size={13} />
                          <span>Agregar opción</span>
                        </button>
                      )}
                    </div>

                    {options.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        No hay opciones registradas. Los usuarios podrán crearlas al guardar productos.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {options.map((opt: any) => (
                          <div
                            key={opt.id}
                            className="bg-white p-2 rounded-lg border border-gray-200/80 flex items-center justify-between text-xs"
                          >
                            <span className="text-gray-800 font-medium truncate pr-2">
                              {opt.label}
                            </span>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteOptionMutation.mutate({
                                    fieldId: field.id,
                                    optionId: opt.id,
                                  })
                                }
                                className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              >
                                <Trash size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Crear / Editar Campo */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingField ? 'Editar campo del catálogo' : 'Nuevo campo del catálogo'}
            </h3>

            <form onSubmit={handleSaveField} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre de la etiqueta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laboratorio, Talla, Modelo"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              {!editingField && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo de dato
                  </label>
                  <select
                    value={fieldDataType}
                    onChange={(e) => setFieldDataType(e.target.value)}
                    className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl bg-white"
                  >
                    <option value="TEXT">Texto libre</option>
                    <option value="LIST">Lista con buscador y catálogo</option>
                    <option value="SELECT">Menú desplegable simple</option>
                    <option value="NUMBER">Número</option>
                    <option value="BOOLEAN">Casilla sí / no</option>
                    <option value="DATE">Fecha</option>
                  </select>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Campo obligatorio al guardar producto
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldSearchable}
                    onChange={(e) => setFieldSearchable(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Permitir buscar productos por este campo
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveFieldMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-gray-900 hover:bg-black text-white rounded-xl"
                >
                  {saveFieldMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar Opción a Lista */}
      {isOptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <h3 className="text-sm font-semibold text-gray-900">
              Agregar opción al catálogo
            </h3>

            <form onSubmit={handleSaveOption} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre de la opción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pfizer, Bayer, Caja x 30"
                  value={optionLabel}
                  onChange={(e) => setOptionLabel(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOptionModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createOptionMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-gray-900 hover:bg-black text-white rounded-xl"
                >
                  {createOptionMutation.isPending ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
