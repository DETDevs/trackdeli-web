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
  MapTrifold,
  Keyboard,
  Check,
} from '@phosphor-icons/react';
import { PinPicker } from 'map';
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationMode, setLocationMode] = useState<'text' | 'map'>('text');
  const [isActive, setIsActive] = useState(true);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['business-clients'],
    queryFn: () => getBusinessClients(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createBusinessClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      toast.success('Cliente agregado correctamente');
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al agregar el cliente');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBusinessClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      toast.success('Cliente actualizado');
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar el cliente');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      toast.success('Cliente eliminado');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al eliminar el cliente');
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
    setLatitude(null);
    setLongitude(null);
    setLocationMode('text');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: BusinessClient) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setLatitude(client.latitude ?? null);
    setLongitude(client.longitude ?? null);
    setLocationMode(client.latitude ? 'map' : 'text');
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

    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      isActive,
    };

    if (editingClient) {
      updateMutation.mutate({
        id: editingClient.id,
        data: payload,
      });
    } else {
      createMutation.mutate(payload);
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
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          <span>Agregar cliente</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
        <MagnifyingGlass size={18} className="text-gray-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o dirección..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
              <th className="py-3.5 px-5">Negocio / Cliente</th>
              <th className="py-3.5 px-4">Teléfono</th>
              <th className="py-3.5 px-4">Dirección / Recogida</th>
              <th className="py-3.5 px-4 text-center">Estado</th>
              <th className="py-3.5 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs text-gray-600">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
                  Cargando clientes del negocio...
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 space-y-1">
                  <p className="font-medium text-gray-600">No se encontraron clientes</p>
                  <p className="text-[11px]">Agrega clientes asociados para seleccionarlos rápidamente al crear pedidos.</p>
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <Buildings size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">{client.name}</p>
                        <span className="text-[11px] text-gray-400">
                          {client._count?.orders ? `${client._count.orders} pedidos` : 'Sin pedidos'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {client.phone ? (
                      <span className="flex items-center gap-1.5 text-gray-700 font-mono text-[11px]">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        {client.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300 italic text-[11px]">Sin teléfono</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 max-w-xs truncate">
                    {client.address ? (
                      <span className="flex items-center gap-1.5 text-gray-700 truncate" title={client.address}>
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300 italic text-[11px]">Sin dirección</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(client)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        client.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${client.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">
            <CircleNotch size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
            Cargando clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 space-y-1">
            <p className="font-medium text-gray-600">No se encontraron clientes</p>
            <p className="text-xs">Agrega clientes asociados para agilizar tus envíos.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <Buildings size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                    <span className="text-[11px] text-gray-400">
                      {client._count?.orders ? `${client._count.orders} pedidos` : 'Sin pedidos'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(client)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    client.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${client.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span>{client.isActive ? 'Activo' : 'Inactivo'}</span>
                </button>
              </div>

              {client.phone && (
                <p className="text-xs text-gray-600 flex items-center gap-1.5 font-mono">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <span>{client.phone}</span>
                </p>
              )}

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

          <div className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 max-h-[94vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
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

            {/* Form */}
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

              {/* Selector de Modo de Ubicación (Manual vs Pin en Mapa) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dirección / Punto de Recogida
                  </label>
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setLocationMode('text')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        locationMode === 'text'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Keyboard size={13} />
                      <span>Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('map')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        locationMode === 'map'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <MapTrifold size={13} />
                      <span>Pin en Mapa</span>
                    </button>
                  </div>
                </div>

                {locationMode === 'map' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Arrastrá el pin o buscá la dirección para fijar la ubicación exacta del local del cliente.
                    </p>
                    <PinPicker
                      mapboxToken={(import.meta as any).env.VITE_MAPBOX_TOKEN}
                      initialLat={latitude || 12.1328}
                      initialLng={longitude || -86.2504}
                      onConfirm={(lat, lng, addr) => {
                        setLatitude(lat);
                        setLongitude(lng);
                        if (addr) setAddress(addr);
                        toast.success('Ubicación fijada en el mapa');
                      }}
                    />
                    {(latitude && longitude) || address ? (
                      <div className="text-[11px] text-gray-600 bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-600 shrink-0" weight="fill" />
                        <span className="truncate flex-1 font-medium">
                          {address || `Coordenadas: ${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold shrink-0 flex items-center gap-1">
                          <Check size={12} weight="bold" /> Guardado
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <textarea
                    placeholder="Ej. De la iglesia 2 cuadras al norte, frente al parque"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-900 outline-none transition-colors h-20 resize-none"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="client-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <label htmlFor="client-active" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Negocio activo (disponible en el selector de pedidos)
                </label>
              </div>

              {/* Action Buttons */}
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
