import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIndustry, useCreateIndustryField, useUpdateIndustryField, useReorderIndustryFields, type IndustryField } from '../hooks/useIndustries';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { FieldFormModal, type FieldFormValues } from '../components/modals/FieldFormModal';
import { Plus, ArrowLeft } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export const IndustryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: industry, isLoading } = useIndustry(id || '');
  const createMutation = useCreateIndustryField();
  const updateMutation = useUpdateIndustryField();
  const { mutate: reorderFields } = useReorderIndustryFields();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<IndustryField | null>(null);

  const activeFieldsCount = industry?.fields?.filter(f => f.isActive).length || 0;

  const openCreateModal = () => {
    if (activeFieldsCount >= 15) {
      toast.error('Tope máximo de 15 campos activos alcanzado');
      return;
    }
    setEditingField(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, field: IndustryField) => {
    e.stopPropagation();
    setEditingField(field);
    setIsModalOpen(true);
  };

  const handleSubmit = (values: FieldFormValues) => {
    if (!id) return;

    if (editingField) {
      updateMutation.mutate(
        { industryId: id, fieldId: editingField.id, payload: values },
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
        { industryId: id, payload: values },
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
    
    let newSorted = [...sorted];
    if (direction === 'UP' && index > 0) {
      const temp = newSorted[index];
      newSorted[index] = newSorted[index - 1];
      newSorted[index - 1] = temp;
      reorderFields({ industryId: id, fieldIds: newSorted.map(f => f.id) });
    } else if (direction === 'DOWN' && index < sorted.length - 1) {
      const temp = newSorted[index];
      newSorted[index] = newSorted[index + 1];
      newSorted[index + 1] = temp;
      reorderFields({ industryId: id, fieldIds: newSorted.map(f => f.id) });
    }
  };

  const columns: Column<IndustryField>[] = [
    {
      header: 'Etiqueta',
      accessor: (row) => <span className="font-medium text-gray-900">{row.label}</span>,
    },
    {
      header: 'Tipo',
      accessor: (row) => <span className="text-sm text-gray-600">{row.dataType}</span>,
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

      <FieldFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingField ? 'Editar Campo' : 'Nuevo Campo'}
        subtitle="Configura un campo para el formulario de negocios."
        initialValues={editingField ? {
          label: editingField.label,
          dataType: editingField.dataType,
          options: editingField.options || [],
          isRequired: editingField.isRequired,
          isSearchable: editingField.isSearchable,
          showInPos: editingField.showInPos,
        } : undefined}
        isEditMode={!!editingField}
        isKeyLocked={false} // Templates don't lock keys the same way if they don't have business data linked yet, but API might reject type changes. Let's just pass false for templates or true if editing. Actually, templates can edit type if no business uses it. Let's pass false.
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
