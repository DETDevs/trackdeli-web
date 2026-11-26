import { useState } from 'react';
import {
  useBusinessProductFields,
  useCreateBusinessProductField,
  useUpdateBusinessProductField,
  useToggleBusinessProductFieldStatus,
  useReorderBusinessProductFields,
  useApplyBusinessFieldTemplate,
  useMigrateBusinessTextToList,
  type BusinessProductField,
} from '../../hooks/useBusinessProductFields';
import { useIndustries } from '../../hooks/useIndustries';
import { useUpdateBusiness } from '../../hooks/useBusinesses';
import { FieldFormModal, type FieldFormValues } from '../modals/FieldFormModal';
import { Badge } from '../ui/Badge';
import { Plus, ArrowsClockwise, ListChecks, X } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

interface BusinessProductFieldsSectionProps {
  businessId: string;
  industryName?: string;
  posVertical?: string;
}

export const BusinessProductFieldsSection = ({
  businessId,
  industryName,
  posVertical,
}: BusinessProductFieldsSectionProps) => {
  const { data: fields, isLoading } = useBusinessProductFields(businessId);
  const createMutation = useCreateBusinessProductField();
  const updateMutation = useUpdateBusinessProductField();
  const toggleMutation = useToggleBusinessProductFieldStatus();
  const { mutate: reorderFields } = useReorderBusinessProductFields();
  const applyTemplateMutation = useApplyBusinessFieldTemplate();
  const migrateMutation = useMigrateBusinessTextToList();

  const { data: industries = [] } = useIndustries();
  const updateBusinessMutation = useUpdateBusiness();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<BusinessProductField | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [isAssigningIndustry, setIsAssigningIndustry] = useState(false);
  const [selectedIndustryId, setSelectedIndustryId] = useState('');

  const allSorted = [...(fields || [])].sort((a, b) => a.order - b.order);
  const activeFields = allSorted.filter((f) => f.isActive);
  const inactiveFields = allSorted.filter((f) => !f.isActive);
  const activeFieldsCount = activeFields.length;
  const hasListFields = Boolean(fields?.some((f) => f.dataType === 'LIST'));
  const [resultMessage, setResultMessage] = useState<{ title: string; lines: string[] } | null>(null);

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const handleApplyTemplate = () => {
    const rubro = industryName || 'su rubro';
    if (
      !window.confirm(
        `Se actualizarán los campos del negocio con la plantilla de ${rubro}. No se pierden datos ni personalizaciones.`,
      )
    ) {
      return;
    }
    applyTemplateMutation.mutate(
      { businessId },
      {
        onSuccess: (res) => {
          const converted = res.appliedFields.filter((a) => a.action === 'UPGRADED_TO_LIST').length;
          const created = res.appliedFields.filter((a) => a.action === 'CREATED').length;
          const summary = `${plural(converted, 'campo convertido a lista', 'campos convertidos a lista')}, ${plural(created, 'creado', 'creados')}`;
          const lines = [summary];
          if (res.totalMigratedOptions > 0) {
            lines.push(
              `${plural(res.totalMigratedOptions, 'opción creada', 'opciones creadas')} a partir de los textos existentes.`,
            );
          }
          setResultMessage({ title: 'Plantilla aplicada', lines });
          toast.success(summary);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'No se pudo aplicar la plantilla del rubro');
        },
      },
    );
  };

  const handleMigrateTexts = () => {
    if (
      !window.confirm(
        'Los textos que ya tienen los productos en los campos de lista se convertirán en opciones (se unifican mayúsculas, tildes y espacios). Se puede repetir sin duplicar. ¿Continuar?',
      )
    ) {
      return;
    }
    migrateMutation.mutate(
      { businessId },
      {
        onSuccess: (res) => {
          const lines = res.details.map((d) =>
            d.productsMigrated === 0
              ? `${d.fieldLabel}: sin valores por convertir`
              : `${d.fieldLabel}: ${plural(d.productsMigrated, 'valor', 'valores')} → ${plural(d.distinctValuesFound, 'opción', 'opciones')}${d.optionsCreated > 0 ? ` (${d.optionsCreated} nuevas)` : ' (sin cambios)'}`,
          );
          if (lines.length === 0) lines.push('No hay campos de lista para convertir.');
          setResultMessage({ title: 'Conversión de textos a listas', lines });
          toast.success('Textos convertidos a listas');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'No se pudieron convertir los textos');
        },
      },
    );
  };

  const handleOpenCreate = () => {
    if (activeFieldsCount >= 15) {
      toast.error('Tope máximo de 15 campos activos alcanzado');
      return;
    }
    setEditingField(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (field: BusinessProductField) => {
    setEditingField(field);
    setIsModalOpen(true);
  };

  const handleSubmit = (values: FieldFormValues) => {
    const payload = { ...values, required: values.isRequired, searchable: values.isSearchable } as any;
    if (editingField) {
      updateMutation.mutate(
        { businessId, fieldId: editingField.id, payload },
        {
          onSuccess: () => {
            toast.success('Campo actualizado');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error al actualizar el campo');
          },
        },
      );
    } else {
      createMutation.mutate(
        { businessId, payload },
        {
          onSuccess: () => {
            toast.success('Campo creado');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error al crear el campo');
          },
        },
      );
    }
  };

  const toggleStatus = (e: React.MouseEvent, fieldId: string, currentStatus: boolean) => {
    e.stopPropagation();

    if (!currentStatus && activeFieldsCount >= 15) {
      toast.error('Tope máximo de 15 campos activos alcanzado');
      return;
    }

    if (
      currentStatus &&
      !window.confirm('¿Seguro que querés desactivar este campo? No se borrarán los datos de los productos.')
    ) {
      return;
    }

    toggleMutation.mutate(
      { businessId, fieldId, activate: !currentStatus },
      {
        onSuccess: () => {
          toast.success(currentStatus ? 'Campo desactivado' : 'Campo activado');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Error al cambiar estado del campo');
        },
      },
    );
  };

  const moveField = (e: React.MouseEvent, fieldId: string, direction: 'UP' | 'DOWN') => {
    e.stopPropagation();
    if (!fields) return;

    const index = allSorted.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const newSorted = [...allSorted];
    if (direction === 'UP' && index > 0) {
      const temp = newSorted[index];
      newSorted[index] = newSorted[index - 1];
      newSorted[index - 1] = temp;
      reorderFields({ businessId, fieldIds: newSorted.map((f) => f.id) });
    } else if (direction === 'DOWN' && index < allSorted.length - 1) {
      const temp = newSorted[index];
      newSorted[index] = newSorted[index + 1];
      newSorted[index + 1] = temp;
      reorderFields({ businessId, fieldIds: newSorted.map((f) => f.id) });
    }
  };

  const handleAssignIndustry = () => {
    if (!selectedIndustryId) return;
    updateBusinessMutation.mutate(
      { id: businessId, data: { industryId: selectedIndustryId } as any },
      {
        onSuccess: () => {
          toast.success('Rubro asignado exitosamente');
          setIsAssigningIndustry(false);
        },
      },
    );
  };

  const visibleFields = showInactive ? allSorted : activeFields;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900">Campos del catálogo</h3>
          <div className="mt-1 flex items-center flex-wrap gap-2 text-[13px] text-gray-500">
            {industryName ? (
              <span>
                Rubro base: <strong className="font-medium text-gray-800">{industryName}</strong>
                {posVertical ? ` (${posVertical.toLowerCase()})` : ''}
              </span>
            ) : (
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-amber-800 font-medium">Sin rubro asignado</span>
                {!isAssigningIndustry ? (
                  <button
                    type="button"
                    onClick={() => setIsAssigningIndustry(true)}
                    className="text-gray-800 hover:text-black font-semibold underline cursor-pointer text-xs"
                  >
                    Asignar ahora
                  </button>
                ) : (
                  <div className="flex items-center flex-wrap gap-2">
                    <select
                      value={selectedIndustryId}
                      onChange={(e) => setSelectedIndustryId(e.target.value)}
                      className="h-8 px-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-gray-900"
                    >
                      <option value="" disabled>
                        Seleccionar rubro...
                      </option>
                      {industries
                        .filter((i) => i.isActive)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssignIndustry}
                      disabled={!selectedIndustryId || updateBusinessMutation.isPending}
                      className="px-2.5 h-8 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      Asignar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssigningIndustry(false)}
                      className="text-gray-500 hover:text-gray-700 px-1.5 h-8 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
            <span>·</span>
            <span className={activeFieldsCount >= 15 ? 'text-red-600 font-medium' : ''}>
              {activeFieldsCount} de 15 activos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {industryName && (
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={applyTemplateMutation.isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowsClockwise size={14} weight="bold" className={applyTemplateMutation.isPending ? 'animate-spin' : ''} />
              <span>{applyTemplateMutation.isPending ? 'Aplicando…' : 'Aplicar plantilla del rubro'}</span>
            </button>
          )}
          {hasListFields && (
            <button
              type="button"
              onClick={handleMigrateTexts}
              disabled={migrateMutation.isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ListChecks size={14} weight="bold" />
              <span>{migrateMutation.isPending ? 'Convirtiendo…' : 'Convertir textos a listas'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={activeFieldsCount >= 15}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-gray-300 text-gray-900 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus size={14} weight="bold" />
            <span>Crear campo</span>
          </button>
        </div>
      </div>

      {resultMessage && (
        <div className="relative border border-emerald-200 rounded-lg p-3 pr-9 text-xs text-emerald-900" role="status">
          <p className="font-semibold">{resultMessage.title}</p>
          {resultMessage.lines.map((line, i) => (
            <p key={i} className="mt-0.5">
              {line}
            </p>
          ))}
          <button
            type="button"
            onClick={() => setResultMessage(null)}
            className="absolute top-2 right-2 text-emerald-700 hover:text-emerald-900 cursor-pointer"
            aria-label="Cerrar resultado"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400 py-4">Cargando campos...</p>
      ) : visibleFields.length === 0 ? (
        <p className="text-xs text-gray-500 py-3 border-t border-gray-100">
          {inactiveFields.length > 0
            ? 'No hay campos activos en este momento.'
            : 'No hay campos configurados para este negocio.'}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {visibleFields.map((row) => {
            const typeLabel =
              row.dataType === 'LIST'
                ? `Lista (${plural(row.fieldOptions?.length ?? 0, 'opción', 'opciones')})`
                : row.dataType === 'TEXT'
                ? 'Texto'
                : row.dataType === 'NUMBER'
                ? 'Número'
                : row.dataType === 'BOOLEAN'
                ? 'Sí / no'
                : row.dataType === 'DATE'
                ? 'Fecha'
                : row.dataType;

            return (
              <div
                key={row.id}
                className={`py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                  !row.isActive ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 min-w-0">
                  <span className="font-semibold text-gray-900 text-sm">{row.label}</span>
                  <span className="font-mono text-gray-400">{row.key}</span>
                  <span className="text-gray-500">· {typeLabel}</span>
                  {(row.required ?? row.isRequired) && (
                    <Badge variant="warning" size="sm">
                      Obligatorio
                    </Badge>
                  )}
                  {(row.searchable ?? row.isSearchable) && (
                    <Badge variant="neutral" size="sm">
                      Buscable
                    </Badge>
                  )}
                  {row.showInPos && (
                    <Badge variant="neutral" size="sm">
                      Visible en caja
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 text-gray-500">
                    <button
                      type="button"
                      onClick={(e) => moveField(e, row.id, 'UP')}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer"
                      title="Subir orden"
                    >
                      ↑
                    </button>
                    <span className="w-5 text-center font-mono">{row.order}</span>
                    <button
                      type="button"
                      onClick={(e) => moveField(e, row.id, 'DOWN')}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer"
                      title="Bajar orden"
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleStatus(e, row.id, row.isActive)}
                    disabled={toggleMutation.isPending}
                    className="cursor-pointer"
                    title={row.isActive ? 'Desactivar campo' : 'Activar campo'}
                  >
                    <Badge variant={row.isActive ? 'success' : 'neutral'} dot size="sm">
                      {row.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(row)}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inactiveFields.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 cursor-pointer"
          >
            {showInactive
              ? `Ocultar inactivos (${inactiveFields.length})`
              : `Ver inactivos (${inactiveFields.length})`}
          </button>
        </div>
      )}

      <FieldFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingField ? 'Editar campo del negocio' : 'Crear campo del negocio'}
        subtitle="Configurá un campo personalizado para el catálogo de este negocio."
        initialValues={
          editingField
            ? {
                label: editingField.label,
                dataType: editingField.dataType as FieldFormValues['dataType'],
                options: editingField.options || [],
                isRequired: editingField.isRequired,
                isSearchable: editingField.isSearchable,
                showInPos: editingField.showInPos,
                allowCreateInline: editingField.allowCreateInline,
              }
            : undefined
        }
        allowListType
        isEditMode={!!editingField}
        isKeyLocked={true}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
