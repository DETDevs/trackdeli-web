import React, { useState, useEffect } from 'react';
import {
  Desktop,
  ForkKnife,
  Wrench,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  PencilSimple,
  FloppyDisk,
  Prohibit,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import {
  useBusinessDevices,
  useUpdatePosSubscription,
  useUpdateBusinessDevice,
  PosDeviceItem,
  BusinessDetail,
} from '../../hooks/useBusinesses';
import { formatDateTime, formatRelativeTime } from '../../utils/format';

interface BusinessPosDevicesSectionProps {
  business: BusinessDetail;
}

export const BusinessPosDevicesSection: React.FC<BusinessPosDevicesSectionProps> = ({
  business,
}) => {
  const { data: devices = [], isLoading: isLoadingDevices, refetch } = useBusinessDevices(business.id);
  const updatePosSubMutation = useUpdatePosSubscription();
  const updateDeviceMutation = useUpdateBusinessDevice();

  // Estados locales editables para perfil de salón y límite de computadoras
  const currentProfile = (business.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE';
  const [salonProfile, setSalonProfile] = useState<'RESTAURANTE' | 'TALLER'>(currentProfile);
  const [isUnlimited, setIsUnlimited] = useState<boolean>(business.maxDevices === null || business.maxDevices === undefined);
  const [maxDevicesInput, setMaxDevicesInput] = useState<string>(
    business.maxDevices !== null && business.maxDevices !== undefined
      ? String(business.maxDevices)
      : '1'
  );
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  // Sincronizar estado local al cambiar business
  useEffect(() => {
    setSalonProfile((business.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE');
    setIsUnlimited(business.maxDevices === null || business.maxDevices === undefined);
    setMaxDevicesInput(
      business.maxDevices !== null && business.maxDevices !== undefined
        ? String(business.maxDevices)
        : '1'
    );
  }, [business.salonProfile, business.maxDevices]);

  const activeDevicesCount = devices.filter((d) => d.status === 'ACTIVE').length;
  const effectiveActiveDevices = business.activeDevices ?? activeDevicesCount;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMaxDevices = isUnlimited ? null : Math.max(1, parseInt(maxDevicesInput, 10) || 1);

    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          salonProfile,
          maxDevices: finalMaxDevices,
        },
      });
      setIsEditingConfig(false);
    } catch {
      // Error is caught and notified by useUpdatePosSubscription
    }
  };

  const handleRevokeDevice = async (device: PosDeviceItem) => {
    if (!window.confirm(`¿Estás seguro de revocar el acceso a "${device.name}" (${device.deviceId})?\n\nEsta computadora no podrá iniciar sesión en el POS hasta que sea reactivada.`)) {
      return;
    }

    setRevokingDeviceId(device.id);
    try {
      await updateDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: device.id,
        data: { status: 'REVOKED' },
      });
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleReactivateDevice = async (device: PosDeviceItem) => {
    setRevokingDeviceId(device.id);
    try {
      await updateDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: device.id,
        data: { status: 'ACTIVE' },
      });
    } finally {
      setRevokingDeviceId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs space-y-6">
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <Desktop size={20} className="text-purple-700" weight="duotone" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Terminales POS y Perfil del Salón
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestión de computadoras autorizadas para iniciar sesión y modo operativo del salón
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditingConfig ? (
            <button
              type="button"
              onClick={() => setIsEditingConfig(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
            >
              <PencilSimple size={14} />
              <span>Editar Configuración POS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsEditingConfig(false);
                setSalonProfile((business.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE');
                setIsUnlimited(business.maxDevices === null || business.maxDevices === undefined);
                setMaxDevicesInput(
                  business.maxDevices !== null && business.maxDevices !== undefined
                    ? String(business.maxDevices)
                    : '1'
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Modo Edición vs Modo Visualización de Configuración */}
      {isEditingConfig ? (
        <form onSubmit={handleSaveConfig} className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/80 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo 1: Perfil del Salón */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Perfil del Salón *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSalonProfile('RESTAURANTE')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    salonProfile === 'RESTAURANTE'
                      ? 'border-purple-600 bg-purple-100/70 text-purple-950 font-semibold shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ForkKnife size={15} className={salonProfile === 'RESTAURANTE' ? 'text-purple-700' : 'text-gray-500'} />
                    <span className="text-xs font-bold">Restaurante</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Mesas, comensales y comanderas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSalonProfile('TALLER')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    salonProfile === 'TALLER'
                      ? 'border-purple-600 bg-purple-100/70 text-purple-950 font-semibold shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wrench size={15} className={salonProfile === 'TALLER' ? 'text-purple-700' : 'text-gray-500'} />
                    <span className="text-xs font-bold">Taller</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Bahías, vehículos y técnicos
                  </p>
                </button>
              </div>
            </div>

            {/* Campo 2: Computadoras permitidas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Computadoras permitidas *
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs font-semibold text-purple-950">Sin límite</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  disabled={isUnlimited}
                  value={isUnlimited ? '' : maxDevicesInput}
                  onChange={(e) => setMaxDevicesInput(e.target.value)}
                  placeholder={isUnlimited ? 'Sin límite de computadoras' : '1'}
                  className={`w-full h-10 px-3 rounded-lg border text-xs bg-white focus:outline-none focus:border-purple-600 ${
                    isUnlimited
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'text-gray-900 border-gray-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Cantidad de computadoras que pueden iniciar sesión con este negocio
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200/60">
            <button
              type="submit"
              disabled={updatePosSubMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FloppyDisk size={15} />
              <span>{updatePosSubMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Tarjetas de Resumen de Configuración */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Perfil del Salón
              </span>
              <div className="flex items-center gap-2">
                {currentProfile === 'TALLER' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Wrench size={14} weight="bold" className="text-amber-700" />
                    <span>Taller Automotriz</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                    <ForkKnife size={14} weight="bold" className="text-purple-700" />
                    <span>Restaurante / Mesas</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {currentProfile === 'TALLER'
                  ? 'Operación por bahías, placa de vehículo y técnico'
                  : 'Operación por zonas de mesas y comensales'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Límite de Computadoras
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-gray-900">
                  {effectiveActiveDevices}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {business.maxDevices === null || business.maxDevices === undefined
                    ? 'activas (Sin límite permitido)'
                    : `de ${business.maxDevices} permitida${business.maxDevices === 1 ? '' : 's'}`}
                </span>
                {business.maxDevices !== null &&
                  business.maxDevices !== undefined &&
                  effectiveActiveDevices >= business.maxDevices && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <WarningCircle size={12} weight="fill" />
                      <span>Límite alcanzado</span>
                    </span>
                  )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {business.maxDevices === null || business.maxDevices === undefined
                  ? 'Cualquier computadora autorizada puede iniciar sesión'
                  : `Máximo ${business.maxDevices} equipo(s) simultáneo(s)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Listado de Computadoras / Dispositivos Registrados */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Computadoras Registradas
            </h4>
            <span className="text-xs font-bold text-gray-400">
              ({devices.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoadingDevices}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Actualizar listado de dispositivos"
          >
            <ArrowsClockwise size={15} className={isLoadingDevices ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoadingDevices && devices.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Cargando computadoras registradas...
          </div>
        ) : devices.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center space-y-1 bg-gray-50/50">
            <Desktop size={28} className="mx-auto text-gray-300" weight="duotone" />
            <p className="text-xs font-semibold text-gray-700">
              No hay computadoras registradas
            </p>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Cada equipo que inicie sesión en la aplicación de escritorio TrackDeli POS se registrará automáticamente aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Equipo / Nombre</th>
                  <th className="py-2.5 px-3">ID Dispositivo</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Última Conexión</th>
                  <th className="py-2.5 px-3">Fecha Registro</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {devices.map((device) => {
                  const isActive = device.status === 'ACTIVE';
                  const isProcessing = revokingDeviceId === device.id;

                  return (
                    <tr key={device.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Desktop size={16} className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                          <span className="font-semibold text-gray-900">{device.name || 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500">
                        {device.deviceId}
                      </td>
                      <td className="py-2.5 px-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={11} weight="bold" />
                            <span>Activa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <Prohibit size={11} weight="bold" />
                            <span>Revocada</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {device.lastSeenAt ? (
                          <div>
                            <span className="block text-[11px] text-gray-900">
                              {formatDateTime(device.lastSeenAt)}
                            </span>
                            <span className="block text-[10px] text-gray-400">
                              {formatRelativeTime(device.lastSeenAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                        {formatDateTime(device.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isActive ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleRevokeDevice(device)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            title="Revocar acceso a esta computadora"
                          >
                            <Prohibit size={13} weight="bold" />
                            <span>{isProcessing ? 'Revocando...' : 'Revocar'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReactivateDevice(device)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            title="Reactivar acceso a esta computadora"
                          >
                            <ArrowCounterClockwise size={13} weight="bold" />
                            <span>{isProcessing ? 'Reactivando...' : 'Reactivar'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
