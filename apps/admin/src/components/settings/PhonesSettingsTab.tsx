import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  createMobilePairingCode,
  getPosDevices,
  revokePosDevice,
  type PosDevice,
} from 'api-client';
import {
  DeviceMobile,
  Plus,
  ArrowsClockwise,
  CheckCircle,
  Prohibit,
  Clock,
  Copy,
  Check,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { formatDateTime, formatRelative } from '../../utils/formatDate';

interface PhonesSettingsTabProps {
  maxMobileDevices: number;
  isReadOnly?: boolean;
}

export const PhonesSettingsTab: React.FC<PhonesSettingsTabProps> = ({
  maxMobileDevices,
  isReadOnly = false,
}) => {
  const queryClient = useQueryClient();

  // Consulta de dispositivos del negocio
  const {
    data: allDevices = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<PosDevice[]>({
    queryKey: ['pos', 'devices'],
    queryFn: () => getPosDevices(),
    staleTime: 15000,
  });

  // Filtrar solo teléfonos móviles
  const mobileDevices = allDevices.filter((d) => d.category === 'MOBILE');
  const activePhones = mobileDevices.filter((d) => d.status === 'ACTIVE');
  const activePhonesCount = activePhones.length;
  const isLimitReached = activePhonesCount >= maxMobileDevices;

  // Estado del modal de vinculación
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<Date | null>(null);
  const [pairingSecondsLeft, setPairingSecondsLeft] = useState<number>(600);
  const [codeCopied, setCodeCopied] = useState(false);

  // Estado del modal de confirmación de desvinculación
  const [deviceToRevoke, setDeviceToRevoke] = useState<PosDevice | null>(null);

  // Mutación para generar código
  const createCodeMutation = useMutation({
    mutationFn: () => createMobilePairingCode(),
    onSuccess: (data) => {
      setPairingCode(data.code);
      const expires = new Date(data.expiresAt);
      setPairingExpiresAt(expires);
      setPairingSecondsLeft(Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000)));
      setCodeCopied(false);
      setPairingModalOpen(true);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 403 && code === 'MOBILE_DEVICE_LIMIT') {
        toast.error('Ya usás todos tus teléfonos. Desvinculá uno o contactá a NEXOL.');
      } else if (status === 403 && code === 'MOBILE_APP_NOT_ENABLED') {
        toast.error('La app móvil no está activa para este negocio. Contactá a NEXOL.');
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Error al generar código de vinculación';
        toast.error(typeof msg === 'string' ? msg : 'Error al generar código');
      }
    },
  });

  // Mutación para desvincular equipo
  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) => revokePosDevice(deviceId),
    onSuccess: () => {
      toast.success('Teléfono desvinculado exitosamente');
      setDeviceToRevoke(null);
      queryClient.invalidateQueries({ queryKey: ['pos', 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['businesses', 'me', 'products'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Error al desvincular el teléfono';
      toast.error(typeof msg === 'string' ? msg : 'Error al desvincular');
    },
  });

  // Cuenta regresiva del código de vinculación
  useEffect(() => {
    if (!pairingModalOpen || !pairingExpiresAt) return;

    const tick = () => {
      const left = Math.max(0, Math.floor((pairingExpiresAt.getTime() - Date.now()) / 1000));
      setPairingSecondsLeft(left);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pairingModalOpen, pairingExpiresAt]);

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCodeCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleStartPairing = () => {
    createCodeMutation.mutate();
  };

  const handleConfirmRevoke = () => {
    if (!deviceToRevoke) return;
    revokeMutation.mutate(deviceToRevoke.id);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de la sección */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <DeviceMobile size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Teléfonos vinculados
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {activePhonesCount} de {maxMobileDevices} en uso
                </span>
                {isLimitReached && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <WarningCircle size={14} weight="fill" />
                    <span>Cupo completo</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                Gestioná los teléfonos móviles autorizados para operar en tu negocio con la app NEXOL POS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="p-2.5 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Actualizar listado de teléfonos"
            >
              <ArrowsClockwise size={18} className={isLoading || isRefetching ? 'animate-spin' : ''} />
            </button>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleStartPairing}
                disabled={createCodeMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <Plus size={16} weight="bold" />
                <span>{createCodeMutation.isPending ? 'Generando...' : 'Vincular un teléfono'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Teléfonos */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading && mobileDevices.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-xs sm:text-sm text-gray-500">
            Cargando teléfonos vinculados...
          </div>
        ) : mobileDevices.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <DeviceMobile size={32} weight="duotone" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h4 className="text-sm sm:text-base font-bold text-gray-900">
                No hay teléfonos vinculados
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Tocá en &quot;Vincular un teléfono&quot; para generar un código y conectar la app móvil NEXOL POS en tu celular.
              </p>
            </div>
            {!isReadOnly && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartPairing}
                  disabled={createCodeMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  <Plus size={16} weight="bold" />
                  <span>Vincular un teléfono</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {mobileDevices.map((device) => {
              const isActive = device.status === 'ACTIVE';
              const isRevokingThis = revokeMutation.isPending && deviceToRevoke?.id === device.id;

              return (
                <div
                  key={device.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <DeviceMobile size={22} weight={isActive ? 'duotone' : 'regular'} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {device.name || 'Teléfono POS'}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={12} weight="bold" />
                            <span>Activo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <Prohibit size={12} weight="bold" />
                            <span>Desvinculado</span>
                          </span>
                        )}
                        {device.platform && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            {device.platform}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 flex-wrap">
                        <span>
                          Vinculado:{' '}
                          <span className="font-medium text-gray-700">
                            {formatDateTime(device.createdAt)}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Última conexión:{' '}
                          <span className="font-medium text-gray-700">
                            {device.lastSeenAt ? formatRelative(device.lastSeenAt) : 'Sin actividad'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {isActive && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setDeviceToRevoke(device)}
                        disabled={isRevokingThis}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 min-h-[40px]"
                        title="Desvincular este teléfono de tu negocio"
                      >
                        <Prohibit size={14} weight="bold" />
                        <span>Desvincular</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Vincular un teléfono */}
      {pairingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <DeviceMobile size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Vincular un teléfono
                  </h3>
                  <p className="text-xs text-gray-500">
                    App móvil NEXOL POS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPairingModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Bloque con código grande y legible */}
            <div className="bg-purple-50/70 border-2 border-purple-200 rounded-2xl p-5 text-center space-y-2">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                Código de vinculación
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-purple-950 py-1 select-all break-all">
                {pairingCode}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-purple-800 hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer min-h-[36px]"
                >
                  {codeCopied ? (
                    <>
                      <Check size={14} className="text-emerald-600" weight="bold" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Temporizador de cuenta regresiva de 10 minutos */}
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
              <Clock
                size={16}
                className={pairingSecondsLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-amber-600'}
                weight="fill"
              />
              <span className={pairingSecondsLeft < 60 ? 'text-rose-600 font-bold' : 'text-gray-700'}>
                {pairingSecondsLeft > 0 ? (
                  <>
                    Vence en:{' '}
                    <span className="font-mono font-bold">
                      {Math.floor(pairingSecondsLeft / 60)}:
                      {String(pairingSecondsLeft % 60).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <span className="text-rose-600 font-bold">Código vencido</span>
                )}
              </span>
            </div>

            {/* Pasos de vinculación */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Pasos para vincular
              </span>
              <ol className="text-xs sm:text-sm text-gray-700 space-y-2.5 list-none">
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Abrí la app <strong>NEXOL POS</strong> en el teléfono.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Escribí este código.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Iniciá sesión con tu usuario.</span>
                </li>
              </ol>
            </div>

            {pairingSecondsLeft === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
                <span>El código ha vencido. Podés generar uno nuevo cuando quieras.</span>
                <button
                  type="button"
                  onClick={handleStartPairing}
                  disabled={createCodeMutation.isPending}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
                >
                  Nuevo código
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPairingModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[44px]"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desvincular */}
      {deviceToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Prohibit size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  ¿Desvincular este teléfono?
                </h3>
                <p className="text-xs text-gray-500">
                  {deviceToRevoke.name || 'Teléfono POS'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              El teléfono perderá inmediatamente el acceso al POS y se liberará un lugar en tu cupo. Para volver a conectarlo, vas a tener que generar un nuevo código de vinculación.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeviceToRevoke(null)}
                disabled={revokeMutation.isPending}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revokeMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {revokeMutation.isPending ? 'Desvinculando...' : 'Sí, desvincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
