import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIndustry, useCreateIndustryField, useUpdateIndustryField, type IndustryField } from '../hooks/useIndustries';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Plus, ArrowLeft } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export const IndustryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: industry, isLoading } = useIndustry(id || '');
  const createMutation = useCreateIndustryField();
  const updateMutation = useUpdateIndustryField();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<IndustryField | null>(null);

  const [label, setLabel] = useState('');
  const [type, setType] = useState<'TEXT' | 'NUMBER' | 'LIST' | 'BOOLEAN' | 'DATE'>('TEXT');
  const [optionsStr, setOptionsStr] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isSearchable, setIsSearchable] = useState(false);
  const [showInPos, setShowInPos] = useState(false);

  const activeFieldsCount = industry?.fields?.filter(f => f.isActive).length || 0;

  const openCreateModal = () => {
    if (activeFieldsCount >= 15) {
      toast.error('Tope máximo de 15 campos activos alcanzado');
      return;
    }
    setEditingField(null);
    setLabel('');
    setType('TEXT');
    setOptionsStr('');
    setIsRequired(false);
    setIsSearchable(false);
    setShowInPos(false);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, field: IndustryField) => {
    e.stopPropagation();
    setEditingField(field);
    setLabel(field.label);
    setType(field.type);
    setOptionsStr(field.options?.join(', ') || '');
    setIsRequired(field.isRequired);
    setIsSearchable(field.isSearchable);
    setShowInPos(field.showInPos);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !label) return;

    const payload: Partial<IndustryField> = {
      label,
      type,
      options: type === 'LIST' ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      isRequired,
      isSearchable,
      showInPos,
    };

    if (editingField) {
      updateMutation.mutate(
        { industryId: id, fieldId: editingField.id, payload },
        {
          onSuccess: () => {
            toast.success('Campo actualizado');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error al actualizar');
          },
        }
      );
    } else {
      createMutation.mutate(
        { industryId: id, payload },
        {
          onSuccess: () => {
            toast.success('Campo creado');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error al crear');
          },
        }
      );
    }
  };

  const toggleStatus = (e: React.MouseEvent, fieldId: string, currentStatus: boolean) => {
    e.stopPropagation();
    if (!id) return;
    
    if (!currentStatus && activeFieldsCount >= 15) {
      toast.error('Tope máximo de 15 campos activos alcanzado');
      return;
    }

    updateMutation.mutate(
      { industryId: id, fieldId, payload: { isActive: !currentStatus } },
      {
        onSuccess: () => {
          toast.success(currentStatus ? 'Campo desactivado' : 'Campo activado');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Error al cambiar estado');
        },
      }
    );
  };

  const moveField = (e: React.MouseEvent, fieldId: string, direction: 'UP' | 'DOWN') => {
    e.stopPropagation();
    if (!id || !industry?.fields) return;
    
    const sorted = [...industry.fields].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(f => f.id === fieldId);
    if (index === -1) return;
    
    if (direction === 'UP' && index > 0) {
      const prev = sorted[index - 1];
      updateMutation.mutate({ industryId: id, fieldId: prev.id, payload: { order: sorted[index].order } });
      updateMutation.mutate({ industryId: id, fieldId: fieldId, payload: { order: prev.order } });
    } else if (direction === 'DOWN' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      updateMutation.mutate({ industryId: id, fieldId: next.id, payload: { order: sorted[index].order } });
      updateMutation.mutate({ industryId: id, fieldId: fieldId, payload: { order: next.order } });
    }
  };

  const columns: Column<IndustryField>[] = [
    {
      header: 'Etiqueta',
      accessor: (row) => <span className="font-medium text-gray-900">{row.label}</span>,
    },
    {
      header: 'Tipo',
      accessor: (row) => <span className="text-sm text-gray-600">{row.type}</span>,
    },
    {
      header: 'Atributos',
      accessor: (row) => (
        <div className="flex gap-1">
          {row.isRequired && <Badge variant="warning" size="sm">Requerido</Badge>}
          {row.isSearchable && <Badge variant="info" size="sm">Buscable</Badge>}
          {row.showInPos && <Badge variant="neutral" size="sm">En POS</Badge>}
        </div>
      ),
    },
    {
      header: 'Orden',
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => moveField(e, row.id, 'UP')} className="p-1 hover:bg-gray-100 rounded text-gray-500">↑</button>
          <span className="text-xs w-4 text-center">{row.order}</span>
          <button onClick={(e) => moveField(e, row.id, 'DOWN')} className="p-1 hover:bg-gray-100 rounded text-gray-500">↓</button>
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: (row) => (
        <button
          onClick={(e) => toggleStatus(e, row.id, row.isActive)}
          disabled={updateMutation.isPending}
          className="group flex items-center gap-2 text-xs font-medium cursor-pointer"
        >
          <Badge variant={row.isActive ? 'success' : 'neutral'} dot size="sm">
            {row.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </button>
      ),
    },
    {
      header: 'Acción',
      className: 'text-right',
      accessor: (row) => (
        <button
          onClick={(e) => openEditModal(e, row)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 transition-colors"
        >
          Editar
        </button>
      ),
    },
  ];

  return (
    <div>
      <TopBar
        title={`Campos de: ${industry?.name || '...'}`}
        subtitle={`${activeFieldsCount}/15 campos activos`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/industries')}
              className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Volver</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs"
            >
              <Plus size={14} weight="bold" />
              <span>Nuevo Campo</span>
            </button>
          </div>
        }
      />

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
        <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg border border-blue-200">
          <strong>Aviso:</strong> Los cambios en la plantilla solo afectan a negocios nuevos. Los negocios existentes mantendrán la estructura que tenían al momento de su creación.
        </div>
        
        <DataTable
          columns={columns}
          data={[...(industry?.fields || [])].sort((a, b) => a.order - b.order)}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No hay campos configurados para este tipo de negocio."
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingField ? 'Editar Campo' : 'Nuevo Campo'}
        subtitle="Configura un campo para el formulario de negocios."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Etiqueta del campo *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de dato *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              required
              disabled={!!editingField}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 disabled:bg-gray-50"
            >
              <option value="TEXT">Texto corto</option>
              <option value="NUMBER">Número</option>
              <option value="LIST">Lista (Selector)</option>
              <option value="BOOLEAN">Si/No (Switch)</option>
              <option value="DATE">Fecha</option>
            </select>
          </div>

          {type === 'LIST' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Opciones (separadas por coma) *</label>
              <input
                type="text"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                required={type === 'LIST'}
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
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
