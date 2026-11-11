import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  getPosUsers,
  createPosUser,
  setPosUserPin,
  activatePosUser,
  deactivatePosUser,
  type PosUserData,
} from 'api-client';
import {
  Plus,
  Key,
  Eye,
  EyeSlash,
  ArrowSquareOut,
} from '@phosphor-icons/react';

interface StaffSettingsTabProps {
  isReadOnly?: boolean;
}

export const StaffSettingsTab: React.FC<StaffSettingsTabProps> = ({ isReadOnly = false }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: users = [], isLoading } = useQuery<PosUserData[]>({
    queryKey: ['pos', 'users'],
    queryFn: () => getPosUsers(),
  });

  // Modal create user
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'CAJERO' | 'ENCARGADO' | 'VENDEDOR'>('CAJERO');
  const [newPin, setNewPin] = useState('');

  // Modal PIN
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState<PosUserData | null>(null);
  const [pinValue, setPinValue] = useState('');

  const createUserMutation = useMutation({
    mutationFn: (dto: any) => createPosUser(dto),
    onSuccess: () => {
      toast.success('Usuario registrado');
      setIsCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPin('');
      queryClient.invalidateQueries({ queryKey: ['pos', 'users'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al crear usuario';
      toast.error(msg);
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => setPosUserPin(id, pin),
    onSuccess: () => {
      toast.success('PIN de 4 dígitos actualizado');
      setIsPinModalOpen(false);
      setPinValue('');
      queryClient.invalidateQueries({ queryKey: ['pos', 'users'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al asignar PIN';
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => {
      if (active) return deactivatePosUser(id);
      return activatePosUser(id);
    },
    onSuccess: () => {
      toast.success('Estado del usuario actualizado');
      queryClient.invalidateQueries({ queryKey: ['pos', 'users'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
    },
  });

  const handleOpenPinModal = (u: PosUserData) => {
    setSelectedUserForPin(u);
    setPinValue('');
    setIsPinModalOpen(true);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;
    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      toast.error('El PIN debe tener exactamente 4 dígitos numéricos');
      return;
    }
    pinMutation.mutate({ id: selectedUserForPin.id, pin: pinValue });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Nombre y correo son obligatorios');
      return;
    }
    if (newPin && (newPin.length !== 4 || !/^\d{4}$/.test(newPin))) {
      toast.error('El PIN debe tener exactamente 4 dígitos');
      return;
    }
    createUserMutation.mutate({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim() || undefined,
      role: newRole,
      pin: newPin || undefined,
    });
  };

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
          <h2 className="text-base font-semibold text-gray-900">Personal del punto de venta</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Administrá cajeros, encargados y asigná códigos PIN de 4 dígitos para autorizaciones y turnos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/team')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <span>Ver equipo completo</span>
            <ArrowSquareOut size={13} />
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Nuevo usuario</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No hay usuarios registrados en el punto de venta.
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900">{u.name}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      u.role === 'SUPERADMIN' || u.role === 'ENCARGADO'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.hasPin ? (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      PIN activo
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Sin PIN
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {u.email} {u.phone ? `· ${u.phone}` : ''}
                </p>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenPinModal(u)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer"
                  >
                    <Key size={13} />
                    <span>{u.hasPin ? 'Cambiar PIN' : 'Asignar PIN'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleActiveMutation.mutate({ id: u.id, active: u.isActive })
                    }
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      u.isActive
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                  >
                    {u.isActive ? <Eye size={16} /> : <EyeSlash size={16} />}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Asignar / Cambiar PIN */}
      {isPinModalOpen && selectedUserForPin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                PIN de acceso y autorizaciones
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Para: <span className="font-semibold text-gray-800">{selectedUserForPin.name}</span>
              </p>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nuevo PIN (4 dígitos numéricos) *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full text-center text-lg tracking-widest font-mono py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pinMutation.isPending || pinValue.length !== 4}
                  className="px-4 py-2 text-xs font-medium bg-gray-900 hover:bg-black text-white rounded-xl disabled:opacity-40 cursor-pointer"
                >
                  {pinMutation.isPending ? 'Guardando...' : 'Asignar PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Usuario POS */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <h3 className="text-sm font-semibold text-gray-900">
              Registrar nuevo usuario de caja
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="juan@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="text"
                  placeholder="8888-8888"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rol en el sistema
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl bg-white"
                >
                  <option value="CAJERO">Cajero (Ventas y cobro)</option>
                  <option value="ENCARGADO">Encargado (Autorizaciones y configuración)</option>
                  <option value="VENDEDOR">Vendedor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  PIN inicial de 4 dígitos (opcional)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full text-center font-mono py-2 px-3 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-gray-900 hover:bg-black text-white rounded-xl cursor-pointer"
                >
                  {createUserMutation.isPending ? 'Guardando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
