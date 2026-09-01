import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInviteCodes,
  createInviteCode,
  toggleInviteCode,
  getInviteCodeUsages,
  type InviteCode,
  type InviteCodeUsage,
} from 'api-client';
import {
  Plus,
  Copy,
  WhatsappLogo,
  Users,
  X,
  CircleNotch,
  Phone,
  EnvelopeSimple,
  Key,
} from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';

export const InviteCodesPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState<InviteCode | null>(null);
  const [viewingCode, setViewingCode] = useState<InviteCode | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const {
    data: inviteCodes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<InviteCode[]>({
    queryKey: ['invite-codes'],
    queryFn: getInviteCodes,
  });

  const { data: usages = [], isLoading: loadingUsages } = useQuery<InviteCodeUsage[]>({
    queryKey: ['invite-code-usages', viewingCode?.id],
    queryFn: () => (viewingCode ? getInviteCodeUsages(viewingCode.id) : Promise.resolve([])),
    enabled: !!viewingCode?.id,
  });

  const createMutation = useMutation({
    mutationFn: createInviteCode,
    onSuccess: (newCode) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      setCreatedCode(newCode);
      toast.success('Código generado con éxito');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al generar el código');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleInviteCode(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast.success(
        updated?.isActive === false ? 'Código desactivado' : 'Código activado'
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado del código');
    },
  });

  const handleOpenModal = () => {
    setDescription('');
    setMaxUses('');
    setExpiresAt('');
    setCreatedCode(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCreatedCode(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      description: description.trim() || undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
  };

  const handleShareWhatsApp = (otp: string) => {
    const message =
      `¡Hola! 👋 Te invito a unirte a nuestro equipo de repartidores.\n\n` +
      `📱 Descargá la app TrackDeli\n` +
      `🔑 Al registrarte, ingresá este código:\n\n` +
      `*${otp}*\n\n` +
      `¡Bienvenido al equipo! 🛵`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Key size={24} className="text-gray-800" />
            <span>Códigos de Invitación</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Generá códigos OTP para que tus repartidores se vinculen a tu empresa al registrarse en la app
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-xs cursor-pointer w-full sm:w-auto"
        >
          <Plus size={16} weight="bold" />
          <span>+ Nuevo código</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CircleNotch size={32} className="animate-spin text-gray-400" />
          <p className="text-xs text-gray-400 font-medium">Cargando códigos...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium text-red-800">
            No se pudieron cargar los códigos de invitación
          </p>
          <button
            onClick={() => refetch()}
            className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && inviteCodes.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-700 mx-auto flex items-center justify-center">
            <Key size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-gray-900">
              No tienes códigos de invitación creados
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Generá tu primer código OTP para compartirlo con tus repartidores por WhatsApp.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Crear primer código</span>
          </button>
        </div>
      )}

      {/* List of Invite Codes */}
      {!isLoading && !isError && inviteCodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inviteCodes.map((code) => (
            <div
              key={code.id}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {/* OTP grande con tracking amplio */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold tracking-[0.3em] text-[#0F0F0F] font-mono">
                      {code.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(code.code);
                        toast.success('Código copiado');
                      }}
                      className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
                      title="Copiar"
                    >
                      <Copy size={18} />
                    </button>
                  </div>

                  {code.description && (
                    <p className="text-sm text-gray-500 mt-1">{code.description}</p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {code.usedCount} uso{code.usedCount !== 1 ? 's' : ''}
                    {code.maxUses ? ` de ${code.maxUses}` : ' · Sin límite'}
                    {code.expiresAt
                      ? ` · Vence ${formatDate(code.expiresAt)}`
                      : ' · Sin expiración'}
                  </p>
                </div>

                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    code.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {code.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Usages quick link */}
              {code.usedCount > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setViewingCode(code)}
                    className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users size={14} />
                    <span>Ver {code.usedCount} rider{code.usedCount !== 1 ? 's' : ''} registrado{code.usedCount !== 1 ? 's' : ''}</span>
                  </button>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                <button
                  onClick={() => handleShareWhatsApp(code.code)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  <span>Compartir por WhatsApp</span>
                </button>
                <button
                  onClick={() => toggleMutation.mutate(code.id)}
                  disabled={toggleMutation.isPending}
                  className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800 text-sm rounded-lg transition-colors cursor-pointer"
                >
                  {code.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Éxito Código */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-semibold text-base text-gray-900">
                {createdCode ? 'Código Generado' : 'Nuevo código de invitación'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 4. Modal de éxito — mostrar el OTP generado */}
            {createdCode ? (
              <div className="text-center py-2 space-y-4">
                <p className="text-sm text-gray-500">
                  ✅ Código generado. Compartilo con tu rider por WhatsApp.
                </p>

                <div className="text-5xl font-semibold tracking-[0.4em] text-[#0F0F0F] font-mono py-3 select-all">
                  {createdCode.code}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCode.code);
                      toast.success('Copiado');
                    }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    📋 Copiar código
                  </button>
                  <button
                    onClick={() => handleShareWhatsApp(createdCode.code)}
                    className="flex-1 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20BD5A] transition-colors cursor-pointer"
                  >
                    📤 WhatsApp
                  </button>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="mt-2 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            ) : (
              /* 3. Modal de crear código — simplificado */
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Se generará un código de 6 dígitos automáticamente.
                </p>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Para riders zona norte"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Límite de usos (vacío = ilimitado)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Sin límite"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Fecha de expiración (vacío = no expira)
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {createMutation.isPending && (
                      <CircleNotch size={14} className="animate-spin" />
                    )}
                    <span>Generar código →</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Ver Riders Vinculados */}
      {viewingCode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <span>Riders vinculados con</span>
                  <span className="font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-sm tracking-wider">
                    {viewingCode.code}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewingCode.description ? `"${viewingCode.description}"` : 'Repartidores registrados mediante este código'}
                </p>
              </div>
              <button
                onClick={() => setViewingCode(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingUsages ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CircleNotch size={24} className="animate-spin text-gray-400" />
                  <p className="text-xs text-gray-400">Cargando repartidores...</p>
                </div>
              ) : usages.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Users size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs text-gray-500 font-medium">
                    Aún ningún repartidor ha utilizado este código.
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    Comparte el código por WhatsApp para que los repartidores se registren en la app.
                  </p>
                </div>
              ) : (
                usages.map((usage) => (
                  <div
                    key={usage.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {usage.rider?.name ? usage.rider.name.charAt(0).toUpperCase() : 'R'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">
                          {usage.rider?.name || 'Repartidor'}
                        </p>
                        <div className="flex items-center gap-3 text-gray-500 text-[11px] mt-0.5">
                          {usage.rider?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} />
                              {usage.rider.phone}
                            </span>
                          )}
                          {usage.rider?.email && (
                            <span className="flex items-center gap-1 text-gray-400 truncate max-w-[150px]">
                              <EnvelopeSimple size={11} />
                              {usage.rider.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-gray-400 shrink-0">
                      <span>Registrado</span>
                      <p className="font-medium text-gray-600">{formatDateTime(usage.usedAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewingCode(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
