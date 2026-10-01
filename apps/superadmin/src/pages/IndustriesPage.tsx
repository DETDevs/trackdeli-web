import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIndustries, useCreateIndustry, useUpdateIndustry, type Industry } from '../hooks/useIndustries';
import { TopBar } from '../components/layout/TopBar';
import { DataTable, Column } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Plus, ArrowRight, Tag } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

export const IndustriesPage = () => {
  const navigate = useNavigate();
  const { data: industries = [], isLoading } = useIndustries();
  const createMutation = useCreateIndustry();
  const updateMutation = useUpdateIndustry();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [posVertical, setPosVertical] = useState<'RESTAURANTE' | 'RETAIL'>('RESTAURANTE');

  const openCreateModal = () => {
    setEditingIndustry(null);
    setName('');
    setCode('');
    setPosVertical('RESTAURANTE');
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, ind: Industry) => {
    e.stopPropagation();
    setEditingIndustry(ind);
    setName(ind.name);
    setCode(ind.code);
    setPosVertical(ind.posVertical);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    if (editingIndustry) {
      updateMutation.mutate(
        { id: editingIndustry.id, payload: { name, code, posVertical } },
        {
          onSuccess: () => {
            toast.success('Tipo de negocio actualizado');
            setIsModalOpen(false);
          },
          onError: () => {
            toast.error('Error al actualizar el tipo de negocio');
          },
        }
      );
    } else {
      createMutation.mutate(
        { name, code, posVertical },
        {
          onSuccess: () => {
            toast.success('Tipo de negocio creado');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error al crear el tipo de negocio');
          },
        }
      );
    }
  };

  const toggleStatus = (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    updateMutation.mutate(
      { id, payload: { isActive: !currentStatus } },
      {
        onSuccess: () => {
          toast.success(currentStatus ? 'Desactivado' : 'Activado');
        },
        onError: () => {
          toast.error('Error al cambiar estado');
        },
      }
    );
  };

  const columns: Column<Industry>[] = [
    {
      header: 'Nombre y Código',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
            <Tag size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-900 leading-tight">{row.name}</p>
            <p className="text-xs text-gray-400 font-mono">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'POS Vertical',
      accessor: (row) => (
        <span className="text-gray-600 text-sm">
          {row.posVertical === 'RETAIL' ? 'Retail' : 'Restaurante'}
        </span>
      ),
    },
    {
      header: 'Campos',
      accessor: (row) => (
        <span className="font-medium text-gray-900">
          {row._count?.fields ?? row.fields?.length ?? 0}
        </span>
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
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => openEditModal(e, row)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => navigate(`/industries/${row.id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 border border-transparent transition-colors shadow-xs"
          >
            <span>Campos</span>
            <ArrowRight size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <TopBar
        title="Tipos de Negocio"
        subtitle={`Gestiona los tipos de negocio y sus campos`}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-xs"
          >
            <Plus size={14} weight="bold" />
            <span>Nuevo Tipo</span>
          </button>
        }
      />

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <DataTable
          columns={columns}
          data={industries}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/industries/${row.id}`)}
          pageSize={10}
          isLoading={isLoading}
          emptyMessage="No se encontraron tipos de negocio"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndustry ? 'Editar Tipo de Negocio' : 'Nuevo Tipo de Negocio'}
        subtitle={editingIndustry ? 'Modifica los datos del tipo de negocio' : 'Crea un nuevo tipo de negocio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Código único (sin espacios)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={!!editingIndustry}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">POS Vertical</label>
            <select
              value={posVertical}
              onChange={(e) => setPosVertical(e.target.value as any)}
              required
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            >
              <option value="RESTAURANTE">Restaurante</option>
              <option value="RETAIL">Retail</option>
            </select>
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
