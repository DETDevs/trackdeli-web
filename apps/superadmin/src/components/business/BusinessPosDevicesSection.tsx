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
  Clock,
  Hourglass,
  PlusCircle,
  StopCircle,
  Trash,
  X,
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
  const [formTrialHours, setFormTrialHours] = useState<string>(
    business.trialHours ? String(business.trialHours) : ''
  );
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  // Estados locales para la sección de Prueba
  const [isEditingTrialHours, setIsEditingTrialHours] = useState(false);
  const [trialHoursInput, setTrialHoursInput] = useState(
    business.trialHours ? String(business.trialHours) : ''
  );
  const [extendHours, setExtendHours] = useState<number>(6);
  const [isActionPending, setIsActionPending] = useState(false);

  // Hora actual para cálculo dinámico del tiempo restante
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Sincronizar estado local al cambiar business
  useEffect(() => {
    setSalonProfile((business.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE');
    setIsUnlimited(business.maxDevices === null || business.maxDevices === undefined);
    setMaxDevicesInput(
      business.maxDevices !== null && business.maxDevices !== undefined
        ? String(business.maxDevices)
        : '1'
    );
    setFormTrialHours(business.trialHours ? String(business.trialHours) : '');
    setTrialHoursInput(business.trialHours ? String(business.trialHours) : '');
  }, [business.salonProfile, business.maxDevices, business.trialHours]);

  const activeDevicesCount = devices.filter((d) => d.status === 'ACTIVE').length;
  const effectiveActiveDevices = business.activeDevices ?? activeDevicesCount;

  // Lógica de estado de la prueba
  const trialHours = business.trialHours ?? null;
  const trialStartedAt = business.trialStartedAt ?? null;
  const trialEndsAt = business.trialEndsAt ?? null;

  let trialState: 'SIN_PRUEBA' | 'SIN_INICIAR' | 'EN_CURSO' | 'VENCIDA' = 'SIN_PRUEBA';
  let remainingText = '';

  if (!trialHours || trialHours <= 0) {
    trialState = 'SIN_PRUEBA';
  } else if (!trialStartedAt) {
    trialState = 'SIN_INICIAR';
  } else {
    const ends = trialEndsAt ? new Date(trialEndsAt) : null;
    if (ends && ends.getTime() <= currentTime.getTime()) {
      trialState = 'VENCIDA';
    } else if (ends) {
      trialState = 'EN_CURSO';
      const diffMs = Math.max(0, ends.getTime() - currentTime.getTime());
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      remainingText = `${h} h ${m} min`;
    } else {
      trialState = 'SIN_PRUEBA';
    }
  }

  // Formato de fecha y hora local de Nicaragua (America/Managua, UTC-6)
  const formatNicaraguaDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('es-NI', {
        timeZone: 'America/Managua',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '—';
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMaxDevices = isUnlimited ? null : Math.max(1, parseInt(maxDevicesInput, 10) || 1);
    const parsedTrial = formTrialHours.trim() === '' ? null : parseInt(formTrialHours, 10);
    const finalTrialHours =
      parsedTrial === null
        ? null
        : !isNaN(parsedTrial) && parsedTrial >= 1
        ? parsedTrial
        : null;

    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          salonProfile,
          maxDevices: finalMaxDevices,
          trialHours: finalTrialHours,
        },
      });
      setIsEditingConfig(false);
    } catch {
      // Error is caught and notified by useUpdatePosSubscription
    }
  };

  // Acciones de prueba con confirmación
  const handleSaveTrialHours = async () => {
    const val = parseInt(trialHoursInput, 10);
    if (isNaN(val) || val < 1) {
      alert('Ingresa una cantidad de horas válida (número entero mayor o igual a 1).');
      return;
    }

    const confirmMsg = trialHours
      ? `¿Confirmas cambiar las horas de prueba a ${val} hora(s)?`
      : `¿Confirmas establecer las horas de prueba en ${val} hora(s)?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: { trialHours: val },
      });
      setIsEditingTrialHours(false);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRemoveTrial = async () => {
    if (
      !window.confirm(
        '¿Estás seguro de quitar la prueba de este negocio?\n\nSe restablecerá la configuración sin período de prueba.'
      )
    ) {
      return;
    }

    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: { trialHours: null },
      });
      setIsEditingTrialHours(false);
      setTrialHoursInput('');
      setFormTrialHours('');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleExtendTrial = async () => {
    if (
      !window.confirm(
        `¿Confirmas extender la prueba por ${extendHours} hora(s) adicional(es)?`
      )
    ) {
      return;
    }

    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          trialAction: 'extend',
          extendHours,
        },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResetTrial = async () => {
    if (
      !window.confirm(
        '¿Estás seguro de reiniciar el reloj de prueba?\n\nEl tiempo volverá a contar desde el próximo inicio de sesión en la computadora.'
      )
    ) {
      return;
    }

    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          trialAction: 'reset',
        },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTerminateTrial = async () => {
    if (
      !window.confirm(
        '¿Estás seguro de terminar la prueba inmediatamente?\n\nLa prueba quedará vencida y se bloqueará el acceso al POS en la computadora.'
      )
    ) {
      return;
    }

    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          trialAction: 'terminate',
        },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRevokeDevice = async (device: PosDeviceItem) => {
    if (
      !window.confirm(
        `¿Estás seguro de revocar el acceso a "${device.name}" (${device.deviceId})?\n\nEsta computadora no podrá iniciar sesión en el POS hasta que sea reactivada.`
      )
    ) {
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
              Terminales POS y Configuración de Operación
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestión de computadoras autorizadas, perfil del salón y período de prueba por horas
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
                setFormTrialHours(business.trialHours ? String(business.trialHours) : '');
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                Cantidad de computadoras que pueden iniciar sesión simultáneamente
              </p>
            </div>

            {/* Campo 3: Prueba (horas) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Prueba (horas)
                </label>
                {formTrialHours && (
                  <button
                    type="button"
                    onClick={() => setFormTrialHours('')}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  >
                    Quitar prueba
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formTrialHours}
                  onChange={(e) => setFormTrialHours(e.target.value)}
                  placeholder="Opcional (ej. 24)"
                  className="w-full h-10 px-3 rounded-lg border text-xs bg-white text-gray-900 border-gray-300 focus:outline-none focus:border-purple-600"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                El tiempo empieza a contar desde el primer inicio de sesión en la computadora. Vacío = no es prueba.
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

      {/* Sección Prueba */}
      <div className="p-4 sm:p-5 rounded-xl bg-gray-50/80 border border-gray-200 space-y-4">
        {/* Cabecera de la sección de Prueba */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-600" weight="duotone" />
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Prueba
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Estado Badge según los 4 estados especificados */}
            {trialState === 'SIN_PRUEBA' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                <Prohibit size={13} weight="bold" />
                <span>Sin prueba</span>
              </span>
            )}
            {trialState === 'SIN_INICIAR' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <Hourglass size={13} weight="bold" className="text-blue-600" />
                <span>Prueba sin iniciar ({trialHours} h)</span>
              </span>
            )}
            {trialState === 'EN_CURSO' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Clock size={13} weight="bold" className="text-amber-700 animate-pulse" />
                <span>En curso · quedan {remainingText}</span>
              </span>
            )}
            {trialState === 'VENCIDA' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <WarningCircle size={13} weight="bold" className="text-rose-600" />
                <span>Vencida</span>
              </span>
            )}
          </div>
        </div>

        {/* Metadatos y Fechas (Hora local de Nicaragua) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200/80">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
              Horas de Prueba
            </span>
            <span className="text-sm font-bold text-gray-900">
              {trialHours ? `${trialHours} horas` : 'No configuradas'}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {trialHours
                ? 'Conteo por horas de uso en computadora'
                : 'Sin período de prueba configurado'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200/80">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
              Fecha de Inicio (Nicaragua)
            </span>
            <span className="text-xs font-semibold text-gray-900">
              {trialStartedAt
                ? formatNicaraguaDateTime(trialStartedAt)
                : trialHours
                ? 'Pendiente de inicio en PC'
                : '—'}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {trialStartedAt
                ? 'Primer inicio de sesión en computadora'
                : trialHours
                ? 'Empieza al primer inicio de sesión'
                : 'Sin prueba'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200/80">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
              Fecha de Fin (Nicaragua)
            </span>
            <span className="text-xs font-semibold text-gray-900">
              {trialEndsAt
                ? formatNicaraguaDateTime(trialEndsAt)
                : trialHours
                ? `Al iniciar + ${trialHours}h`
                : '—'}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {trialEndsAt
                ? trialState === 'VENCIDA'
                  ? 'Prueba finalizada'
                  : 'Límite de bloqueo automático en POS'
                : '—'}
            </p>
          </div>
        </div>

        {/* Acciones de la Prueba */}
        <div className="pt-2 border-t border-gray-200/80 space-y-3">
          {/* Subformulario inline para Fijar / Cambiar horas */}
          {isEditingTrialHours && (
            <div className="p-3 bg-white rounded-lg border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex-1 max-w-sm">
                <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {trialHours ? 'Cambiar Horas de Prueba' : 'Fijar Horas de Prueba'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ej. 24"
                    value={trialHoursInput}
                    onChange={(e) => setTrialHoursInput(e.target.value)}
                    className="w-28 h-8 px-2.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-purple-600 font-semibold"
                  />
                  <span className="text-xs text-gray-500">horas</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Número entero ≥ 1.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleSaveTrialHours}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FloppyDisk size={14} />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTrialHours(false);
                    setTrialHoursInput(trialHours ? String(trialHours) : '');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <X size={14} />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}

          {/* Barra de botones de acción */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Lado izquierdo: Fijar o cambiar horas y Quitar prueba */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isEditingTrialHours && (
                <button
                  type="button"
                  onClick={() => {
                    setTrialHoursInput(trialHours ? String(trialHours) : '24');
                    setIsEditingTrialHours(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <PencilSimple size={13} />
                  <span>{trialHours ? 'Cambiar horas' : 'Fijar horas de prueba'}</span>
                </button>
              )}

              {trialHours && (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleRemoveTrial}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 bg-rose-50/50 hover:bg-rose-100/60 transition-colors cursor-pointer disabled:opacity-50"
                  title="Eliminar período de prueba de este negocio"
                >
                  <Trash size={13} />
                  <span>Quitar prueba</span>
                </button>
              )}
            </div>

            {/* Lado derecho: Extender, Reiniciar reloj, Terminar ahora */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Extender con selector 1 h / 6 h / 12 h / 24 h */}
              {trialHours && (
                <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-lg border border-gray-200 shadow-2xs">
                  <span className="text-[11px] text-gray-500 font-medium pl-1.5">Extender:</span>
                  <select
                    value={extendHours}
                    onChange={(e) => setExtendHours(Number(e.target.value))}
                    disabled={isActionPending}
                    aria-label="Horas para extender la prueba"
                    className="h-7 px-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-800 focus:outline-none focus:border-purple-600"
                  >
                    <option value={1}>1 h</option>
                    <option value={6}>6 h</option>
                    <option value={12}>12 h</option>
                    <option value={24}>24 h</option>
                  </select>
                  <button
                    type="button"
                    disabled={isActionPending}
                    onClick={handleExtendTrial}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    title="Extender tiempo de prueba"
                  >
                    <PlusCircle size={13} weight="bold" />
                    <span>Extender</span>
                  </button>
                </div>
              )}

              {/* Reiniciar reloj */}
              {trialHours && (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleResetTrial}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Reinicia el reloj para que vuelva a contar desde el próximo inicio de sesión"
                >
                  <ArrowCounterClockwise size={13} weight="bold" className="text-gray-500" />
                  <span>Reiniciar reloj</span>
                </button>
              )}

              {/* Terminar ahora */}
              {trialHours && trialState === 'EN_CURSO' && (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleTerminateTrial}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                  title="Terminar la prueba inmediatamente (marcar como vencida)"
                >
                  <StopCircle size={13} weight="bold" />
                  <span>Terminar ahora</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
