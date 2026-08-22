import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, deleteUser, type User } from 'api-client';
import { Plus, CircleNotch, X } from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

const inputClass = 'w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-gray-400 outline-none transition-colors';

interface AddModalProps {
  onClose: () => void;
}

const AddModal = ({ onClose }: AddModalProps) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => createUser({ ...form, role: 'deliveryman' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Repartidor agregado');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al crear repartidor.');
    },
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Nombre, email y contraseña son requeridos.');
      return;
    }
    mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Agregar repartidor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
            <input className={inputClass} type="text" placeholder="Juan Pérez" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <input className={inputClass} type="email" placeholder="juan@empresa.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">WhatsApp (opcional)</label>
            <input className={inputClass} type="tel" placeholder="8888 7777" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Contraseña</label>
            <input className={inputClass} type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              {isPending ? <><CircleNotch size={16} className="animate-spin" /> Creando...</> : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConfirmDeleteProps {
  user: User;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

const ConfirmDelete = ({ user, onCancel, onConfirm, isPending }: ConfirmDeleteProps) => (
  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
    <p className="text-red-700 font-medium mb-2">¿Desactivar a {user.name}?</p>
    <div className="flex gap-2">
      <button onClick={onCancel} className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50">
        Cancelar
      </button>
      <button onClick={onConfirm} disabled={isPending} className="flex-1 bg-red-600 text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1">
        {isPending ? <CircleNotch size={12} className="animate-spin" /> : null}
        Desactivar
      </button>
    </div>
  </div>
);

export const StaffPage = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const { mutate: deactivate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Repartidor desactivado');
      setConfirmDeleteId(null);
    },
    onError: () => {
      toast.error('No se pudo desactivar el repartidor.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{isLoading ? '—' : `${users.length} repartidor${users.length !== 1 ? 'es' : ''}`}</p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Agregar
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
          No se pudo cargar la información.
          <button onClick={() => refetch()} className="underline">Reintentar</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-gray-900">No hay repartidores aún</p>
          <p className="mt-1 text-sm text-gray-400">Agrega tu primer repartidor para comenzar</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            + Agregar repartidor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm shrink-0">
                  {initials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {user.phone && <p className="text-xs text-gray-400 truncate">{user.phone}</p>}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <span className={`text-xs ${user.isActive ? 'text-green-700' : 'text-gray-400'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
              {confirmDeleteId === user.id ? (
                <ConfirmDelete
                  user={user}
                  onCancel={() => setConfirmDeleteId(null)}
                  onConfirm={() => deactivate(user.id)}
                  isPending={isDeleting}
                />
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(user.id)}
                  className="mt-4 w-full text-xs text-red-600 hover:bg-red-50 border border-red-100 rounded-md px-3 py-1.5 transition-colors"
                >
                  Desactivar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && <AddModal onClose={() => setShowModal(false)} />}
    </div>
  );
};
