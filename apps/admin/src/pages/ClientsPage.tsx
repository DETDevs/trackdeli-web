import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBusinessClients,
  createBusinessClient,
  updateBusinessClient,
  deleteBusinessClient,
  type BusinessClient,
} from 'api-client';
import {
  Plus,
  MagnifyingGlass,
  Buildings,
  Phone,
  MapPin,
  PencilSimple,
  Trash,
  X,
  CircleNotch,
} from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';

export const ClientsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<BusinessClient | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: clients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['business-clients'],
    queryFn: () => getBusinessClients(),
  });

  const createMutation = useMutation({
    mutationFn: createBusinessClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      toast.success('Cliente agregado correctamente');
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al agregar el cliente');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBusinessClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      toast.success('Cliente actualizado');
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al actualizar el cliente');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      toast.success('Cliente eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar el cliente');
    },
  });

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [clients, searchTerm]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setAddress('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: BusinessClient) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setIsActive(client.isActive);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre del negocio es requerido');
      return;
    }

    if (editingClient) {
      updateMutation.mutate({
        id: editingClient.id,
        data: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          isActive,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        isActive,
      });
    }
  };

  const handleDelete = (client: BusinessClient) => {
    if (window.confirm(`¿Estás seguro de eliminar a "${client.name}"?`)) {
      deleteMutation.mutate(client.id);
    }
  };

  const handleToggleActive = (client: BusinessClient) => {
    updateMutation.mutate({
      id: client.id,
      data: { isActive: !client.isActive },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">Clientes del Negocio</h2>
          <p className="text-xs text-gray-500 mt-1">
            Negocios y comercios asociados que solicitan envíos a través de tu empresa de repartidores.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
        >
          <Plus size={16} weight="bold" />
          <span>Agregar cliente</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:border-gray-900 outline-none transition-colors"
          />
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700 flex items-center justify-between">
          <span>No se pudieron cargar los clientes asociados.</span>
          <button onClick={() => refetch()} className="underline font-medium cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-semibold">
              <th className="py-3 px-5">Negocio / Cliente</th>
              <th className="py-3 px-5">Teléfono</th>
              <th className="py-3 px-5">Dirección de Origen</th>
              <th className="py-3 px-5">Estado</th>
              <th className="py-3 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="p-4">
                    <div className="h-6 bg-gray-100 rounded-lg animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <Buildings size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-medium text-gray-600">No hay clientes registrados</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Agrega los negocios con los que trabajas para seleccionarlos rápidamente al crear pedidos.
                  </p>
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        {client._count?.orders !== undefined && (
                          <p className="text-[11px] text-gray-400">{client._count.orders} envíos realizados</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    {client.phone ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone size={13} className="text-gray-400" />
                        <span>{client.phone}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 max-w-xs truncate text-gray-600">
                    {client.address ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">Sin dirección registrada</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <button
                      onClick={() => handleToggleActive(client)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                        client.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${client.isActive ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                      <span>{client.isActive ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar cliente"
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(client)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse h-28" />
          ))
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-xs text-gray-400">
            No se encontraron clientes registrados.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{client.name}</p>
                    {client.phone && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Phone size={12} className="text-gray-400" />
                        <span>{client.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(client)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    client.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${client.isActive ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                  <span>{client.isActive ? 'Activo' : 'Inactivo'}</span>
                </button>
              </div>

              {client.address && (
                <p className="text-xs text-gray-500 flex items-start gap-1.5 pt-1">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="truncate">{client.address}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(client)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PencilSimple size={13} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(client)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  <Trash size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Crear / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente / Negocio Asociado'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingClient ? 'Modifica los datos del negocio' : 'Registra un comercio para asignarle envíos'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pollos El Buen Sabor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 88998877"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Dirección del Local / Punto de Recogida
                </label>
                <textarea
                  placeholder="Ej. De la iglesia 2 cuadras al norte"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors h-20 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="client-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <label htmlFor="client-active" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Negocio activo (disponible en el selector de pedidos)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <CircleNotch size={14} className="animate-spin" />
                  )}
                  <span>{editingClient ? 'Guardar Cambios' : 'Crear Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
