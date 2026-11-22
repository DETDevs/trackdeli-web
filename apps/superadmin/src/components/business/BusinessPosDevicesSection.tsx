import React, { useState, useEffect, useMemo } from 'react';
import {
  Desktop,
  Globe,
  DeviceMobile,
  DotsThreeVertical,
  PencilSimple,
  Copy,
  Check,
  Clock,
  Archive,
  ArrowCounterClockwise,
  PlusCircle,
  StopCircle,
  Trash,
  X,
  WarningCircle,
  Key,
} from '@phosphor-icons/react';
import {
  useBusinessDevices,
  useBusinessDevicesSummary,
  useUpdatePosSubscription,
  useUpdateBusinessDevice,
  useArchiveBusinessDevice,
  useUnarchiveBusinessDevice,
  useArchiveRevokedDevices,
  useCreateMobilePairingCode,
  PosDeviceItem,
  BusinessDetail,
} from '../../hooks/useBusinesses';
import toast from 'react-hot-toast';
import { formatDateTime, formatDateShort, formatRelativeTime } from '../../utils/format';

interface BusinessPosDevicesSectionProps {
  business: BusinessDetail;
}

function shortenId(id?: string | null): string {
  if (!id) return '—';
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}…${id.slice(-5)}`;
}

function formatNicaraguaTrialDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('es-NI', {
      timeZone: 'America/Managua',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d).replace(/\./g, '').replace(' de ', ' ');
  } catch {
    return '—';
  }
}

function getDeviceTypeAndPlatform(device: PosDeviceItem): {
  type: string;
  platform: string;
  icon: 'desktop' | 'web' | 'mobile';
} {
  const cat = (device.category || '').toUpperCase();
  const plat = (device.platform || '').trim();
  if (cat === 'MOBILE' || plat.toUpperCase().includes('ANDROID') || plat.toUpperCase().includes('IOS')) {
    return {
      type: 'Teléfono',
      platform: plat || 'Android',
      icon: 'mobile',
    };
  }
  if (
    cat === 'WEB' ||
    plat.toUpperCase().includes('WEB') ||
    plat.toUpperCase().includes('CHROME') ||
    plat.toUpperCase().includes('SAFARI') ||
    plat.toUpperCase().includes('FIREFOX')
  ) {
    return {
      type: 'Navegador',
      platform: plat || 'Web',
      icon: 'web',
    };
  }
  return {
    type: 'Computadora',
    platform: plat || 'Windows',
    icon: 'desktop',
  };
}

export const BusinessPosDevicesSection: React.FC<BusinessPosDevicesSectionProps> = ({ business }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'revoked' | 'archived'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'desktop' | 'web' | 'mobile'>('all');
  const [openMenuDeviceId, setOpenMenuDeviceId] = useState<string | null>(null);
  const [copiedIdDeviceId, setCopiedIdDeviceId] = useState<string | null>(null);

  // Queries
  const { data: summary } = useBusinessDevicesSummary(business.id);
  const {
    data: allDevices = [],
    isLoading: isLoadingDevices,
  } = useBusinessDevices(business.id, activeTab === 'archived');

  // Mutations
  const updatePosSubMutation = useUpdatePosSubscription();
  const updateDeviceMutation = useUpdateBusinessDevice();
  const archiveDeviceMutation = useArchiveBusinessDevice();
  const unarchiveDeviceMutation = useUnarchiveBusinessDevice();
  const archiveRevokedDevicesMutation = useArchiveRevokedDevices();
  const createPairingCodeMutation = useCreateMobilePairingCode();

  // Subscripción POS actual
  const posSub = business.productSubscriptions?.find((s) => s.productType === 'POS');
  const currentProfile = (business.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE';
  const currentWebAdmin = (business as any).webAdminEnabled ?? posSub?.webAdminEnabled ?? true;
  const currentWebBilling = (business as any).webBillingEnabled ?? posSub?.webBillingEnabled ?? false;
  const currentMaxWebDevices = (business as any).maxWebDevices !== undefined
    ? (business as any).maxWebDevices
    : (posSub?.maxWebDevices !== undefined ? posSub?.maxWebDevices : 2);
  const currentWebBillingMonthlyUsd = (business as any).webBillingMonthlyUsd !== undefined
    ? (business as any).webBillingMonthlyUsd
    : ((posSub as any)?.webBillingMonthlyUsd !== undefined ? (posSub as any)?.webBillingMonthlyUsd : null);
  const currentMaxMobileDevices = (business as any).maxMobileDevices !== undefined
    ? Number((business as any).maxMobileDevices)
    : (posSub?.maxMobileDevices !== undefined ? Number(posSub?.maxMobileDevices) : 0);

  // Conteo de activos por tipo
  const activeComputersCount = useMemo(() => {
    if (business.activeDevices !== undefined) return business.activeDevices;
    return allDevices.filter((d) => {
      const { icon } = getDeviceTypeAndPlatform(d);
      return icon === 'desktop' && d.status === 'ACTIVE' && !d.archivedAt;
    }).length;
  }, [business.activeDevices, allDevices]);

  const activeWebDevicesCount = useMemo(() => {
    return allDevices.filter((d) => {
      const { icon } = getDeviceTypeAndPlatform(d);
      return icon === 'web' && d.status === 'ACTIVE' && !d.archivedAt;
    }).length;
  }, [allDevices]);

  const activeMobileDevicesCount = useMemo(() => {
    if (business.activeMobileDevices !== undefined) return business.activeMobileDevices;
    return allDevices.filter((d) => {
      const { icon } = getDeviceTypeAndPlatform(d);
      return icon === 'mobile' && d.status === 'ACTIVE' && !d.archivedAt;
    }).length;
  }, [business.activeMobileDevices, allDevices]);

  // Modo edición de configuración general POS
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [salonProfile, setSalonProfile] = useState<'RESTAURANTE' | 'TALLER'>(currentProfile);
  const [isUnlimitedComputers, setIsUnlimitedComputers] = useState<boolean>(
    business.maxDevices === null || business.maxDevices === undefined
  );
  const [maxDevicesInput, setMaxDevicesInput] = useState<string>(
    business.maxDevices !== null && business.maxDevices !== undefined ? String(business.maxDevices) : '1'
  );
  const [maxMobileDevicesInput, setMaxMobileDevicesInput] = useState<string>(
    String(currentMaxMobileDevices ?? 0)
  );
  const [formTrialHours, setFormTrialHours] = useState<string>(
    business.trialHours ? String(business.trialHours) : ''
  );
  const [webAdminEnabledForm, setWebAdminEnabledForm] = useState<boolean>(currentWebAdmin);
  const [webBillingEnabledForm, setWebBillingEnabledForm] = useState<boolean>(currentWebBilling);
  const [isUnlimitedWeb, setIsUnlimitedWeb] = useState<boolean>(currentMaxWebDevices === null);
  const [maxWebDevicesInput, setMaxWebDevicesInput] = useState<string>(
    currentMaxWebDevices !== null ? String(currentMaxWebDevices ?? 2) : '2'
  );
  const [webBillingMonthlyUsdInput, setWebBillingMonthlyUsdInput] = useState<string>(
    currentWebBillingMonthlyUsd !== null && currentWebBillingMonthlyUsd !== undefined
      ? String(currentWebBillingMonthlyUsd)
      : ''
  );

  // Sincronización al cambiar negocio
  useEffect(() => {
    setSalonProfile((business.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE');
    setIsUnlimitedComputers(business.maxDevices === null || business.maxDevices === undefined);
    setMaxDevicesInput(
      business.maxDevices !== null && business.maxDevices !== undefined ? String(business.maxDevices) : '1'
    );
    setMaxMobileDevicesInput(String(currentMaxMobileDevices ?? 0));
    setFormTrialHours(business.trialHours ? String(business.trialHours) : '');
    setWebAdminEnabledForm(currentWebAdmin);
    setWebBillingEnabledForm(currentWebBilling);
    setIsUnlimitedWeb(currentMaxWebDevices === null);
    setMaxWebDevicesInput(currentMaxWebDevices !== null ? String(currentMaxWebDevices ?? 2) : '2');
    setWebBillingMonthlyUsdInput(
      currentWebBillingMonthlyUsd !== null && currentWebBillingMonthlyUsd !== undefined
        ? String(currentWebBillingMonthlyUsd)
        : ''
    );
  }, [
    business.salonProfile,
    business.maxDevices,
    business.trialHours,
    currentWebAdmin,
    currentWebBilling,
    currentMaxWebDevices,
    currentWebBillingMonthlyUsd,
    currentMaxMobileDevices,
  ]);

  // Click outside para cerrar el menú ⋯
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-device-menu]')) {
        setOpenMenuDeviceId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal de código de vinculación móvil
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<Date | null>(null);
  const [pairingSecondsLeft, setPairingSecondsLeft] = useState<number>(600);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!pairingModalOpen || !pairingExpiresAt) return;
    const updateCountdown = () => {
      const diffSec = Math.max(0, Math.floor((pairingExpiresAt.getTime() - Date.now()) / 1000));
      setPairingSecondsLeft(diffSec);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pairingModalOpen, pairingExpiresAt]);

  const handleGeneratePairingCode = async () => {
    try {
      const data = await createPairingCodeMutation.mutateAsync({ businessId: business.id });
      setPairingCode(data.code);
      setPairingExpiresAt(new Date(data.expiresAt));
      setPairingSecondsLeft(
        Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000))
      );
      setCodeCopied(false);
      setPairingModalOpen(true);
    } catch {
      // Manejado en mutación
    }
  };

  const handleCopyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCodeCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Modales de acciones sobre equipos
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    device: PosDeviceItem | null;
    newName: string;
  }>({
    isOpen: false,
    device: null,
    newName: '',
  });

  const [revokeModal, setRevokeModal] = useState<{
    isOpen: boolean;
    device: PosDeviceItem | null;
  }>({
    isOpen: false,
    device: null,
  });

  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    device: PosDeviceItem | null;
  }>({
    isOpen: false,
    device: null,
  });

  const [archiveAllModalOpen, setArchiveAllModalOpen] = useState(false);

  // Estados de carga para toggles directos
  const [isTogglingWebAdmin, setIsTogglingWebAdmin] = useState(false);
  const [isTogglingWebBilling, setIsTogglingWebBilling] = useState(false);

  const handleToggleWebAdminDirect = async () => {
    const nextVal = !currentWebAdmin;
    if (!nextVal && currentWebBilling) {
      if (
        !window.confirm(
          '¿Confirmás desactivar el acceso a la web admin?\n\nAl desactivar la web admin, también se desactivará la facturación web para este negocio.'
        )
      ) {
        return;
      }
      setIsTogglingWebAdmin(true);
      try {
        await updatePosSubMutation.mutateAsync({
          businessId: business.id,
          data: {
            webAdminEnabled: false,
            webBillingEnabled: false,
          },
        });
      } finally {
        setIsTogglingWebAdmin(false);
      }
      return;
    }

    if (
      !window.confirm(
        nextVal
          ? '¿Confirmás activar el acceso a la web admin para este negocio?'
          : '¿Confirmás desactivar el acceso a la web admin para este negocio?'
      )
    ) {
      return;
    }

    setIsTogglingWebAdmin(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          webAdminEnabled: nextVal,
        },
      });
    } finally {
      setIsTogglingWebAdmin(false);
    }
  };

  const handleToggleWebBillingDirect = async () => {
    const nextVal = !currentWebBilling;
    if (nextVal && !currentWebAdmin) {
      toast.error('La facturación web requiere que el acceso a la web admin esté habilitado.');
      return;
    }

    if (
      !window.confirm(
        nextVal
          ? '¿Confirmás activar la facturación web para este negocio?'
          : '¿Confirmás desactivar la facturación web para este negocio?'
      )
    ) {
      return;
    }

    setIsTogglingWebBilling(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          webBillingEnabled: nextVal,
        },
      });
    } finally {
      setIsTogglingWebBilling(false);
    }
  };

  // Sección de Prueba
  const trialHours = business.trialHours ?? null;
  const trialStartedAt = business.trialStartedAt ?? null;
  const trialEndsAt = business.trialEndsAt ?? null;
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  let trialState: 'SIN_PRUEBA' | 'SIN_INICIAR' | 'EN_CURSO' | 'VENCIDA' = 'SIN_PRUEBA';
  if (!trialHours || trialHours <= 0) {
    trialState = 'SIN_PRUEBA';
  } else if (!trialStartedAt) {
    trialState = 'SIN_INICIAR';
  } else if (trialEndsAt) {
    const ends = new Date(trialEndsAt);
    if (currentTime.getTime() > ends.getTime()) {
      trialState = 'VENCIDA';
    } else {
      trialState = 'EN_CURSO';
    }
  }

  const [isEditingTrialHours, setIsEditingTrialHours] = useState(false);
  const [trialHoursInput, setTrialHoursInput] = useState(
    business.trialHours ? String(business.trialHours) : ''
  );
  const [extendHours, setExtendHours] = useState<number>(6);
  const [isActionPending, setIsActionPending] = useState(false);

  const handleSaveTrialHours = async () => {
    const val = parseInt(trialHoursInput, 10);
    if (isNaN(val) || val < 1) {
      alert('Ingresá una cantidad de horas válida (número entero mayor o igual a 1).');
      return;
    }
    if (
      !window.confirm(
        trialHours
          ? `¿Confirmás cambiar las horas de prueba a ${val} hora(s)?`
          : `¿Confirmás establecer las horas de prueba en ${val} hora(s)?`
      )
    ) {
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

  const handleExtendTrial = async () => {
    if (!window.confirm(`¿Confirmás extender la prueba en +${extendHours} hora(s)?`)) return;
    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: { trialAction: 'extend', extendHours },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResetTrial = async () => {
    if (
      !window.confirm(
        '¿Confirmás reiniciar el reloj de prueba? El conteo volverá a empezar en el próximo inicio de sesión en computadora.'
      )
    ) {
      return;
    }
    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: { trialAction: 'reset' },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTerminateTrial = async () => {
    if (
      !window.confirm(
        '¿Confirmás terminar la prueba ahora mismo? La prueba quedará vencida inmediatamente.'
      )
    ) {
      return;
    }
    setIsActionPending(true);
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: { trialAction: 'terminate' },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRemoveTrial = async () => {
    if (
      !window.confirm(
        '¿Confirmás eliminar el período de prueba de este negocio? El negocio quedará sin prueba.'
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
    } finally {
      setIsActionPending(false);
    }
  };

  // Guardar configuración general
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDevices = isUnlimitedComputers ? null : parseInt(maxDevicesInput, 10);
    if (!isUnlimitedComputers && (isNaN(parsedDevices as number) || (parsedDevices as number) < 0)) {
      toast.error('Ingresá un número válido para el cupo de computadoras (≥ 0).');
      return;
    }

    const parsedWeb = isUnlimitedWeb ? null : parseInt(maxWebDevicesInput, 10);
    if (webBillingEnabledForm && !isUnlimitedWeb && (isNaN(parsedWeb as number) || (parsedWeb as number) < 0)) {
      toast.error('Ingresá un número válido para dispositivos web autorizados (≥ 0).');
      return;
    }

    const parsedMobile = parseInt(maxMobileDevicesInput, 10);
    const finalMaxMobileDevices = isNaN(parsedMobile) ? 0 : Math.max(0, Math.min(50, parsedMobile));

    const parsedMonthlyFee =
      webBillingEnabledForm && webBillingMonthlyUsdInput.trim() !== ''
        ? parseFloat(webBillingMonthlyUsdInput)
        : null;

    const parsedTrial =
      formTrialHours.trim() !== '' ? parseInt(formTrialHours, 10) : null;

    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: {
          salonProfile,
          maxDevices: parsedDevices,
          maxMobileDevices: finalMaxMobileDevices,
          webAdminEnabled: webAdminEnabledForm,
          webBillingEnabled: webBillingEnabledForm,
          maxWebDevices: parsedWeb,
          webBillingMonthlyUsd: parsedMonthlyFee,
          trialHours: parsedTrial,
        },
      });
      setIsEditingConfig(false);
    } catch {
      // Manejado en mutación
    }
  };

  // Acciones individuales sobre equipos
  const handleCopyId = (deviceId: string) => {
    navigator.clipboard.writeText(deviceId);
    setCopiedIdDeviceId(deviceId);
    toast.success('ID copiado al portapapeles');
    setTimeout(() => setCopiedIdDeviceId(null), 2000);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeModal.device) return;
    try {
      await updateDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: revokeModal.device.id,
        data: { status: 'REVOKED' },
      });
      setRevokeModal({ isOpen: false, device: null });
      setOpenMenuDeviceId(null);
    } catch {
      // Manejado en mutación
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveModal.device) return;
    try {
      await archiveDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: archiveModal.device.id,
      });
      setArchiveModal({ isOpen: false, device: null });
      setOpenMenuDeviceId(null);
    } catch {
      // Manejado en mutación
    }
  };

  const handleConfirmUnarchive = async (device: PosDeviceItem) => {
    try {
      await unarchiveDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: device.id,
      });
      setOpenMenuDeviceId(null);
    } catch {
      // Manejado en mutación
    }
  };

  const handleConfirmReactivate = async (device: PosDeviceItem) => {
    try {
      await updateDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: device.id,
        data: { status: 'ACTIVE' },
      });
      setOpenMenuDeviceId(null);
    } catch {
      // Manejado en mutación
    }
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal.device) return;
    const trimmed = renameModal.newName.trim();
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    try {
      await updateDeviceMutation.mutateAsync({
        businessId: business.id,
        deviceId: renameModal.device.id,
        data: { name: trimmed },
      });
      setRenameModal({ isOpen: false, device: null, newName: '' });
      setOpenMenuDeviceId(null);
    } catch {
      // Manejado en mutación
    }
  };

  const handleConfirmArchiveAll = async () => {
    try {
      await archiveRevokedDevicesMutation.mutateAsync({ businessId: business.id });
      setArchiveAllModalOpen(false);
    } catch {
      // Manejado en mutación
    }
  };

  // Filtrado de equipos según pestaña y tipo
  const tabDevices = useMemo(() => {
    if (activeTab === 'active') {
      return allDevices.filter((d) => d.status === 'ACTIVE' && !d.archivedAt);
    }
    if (activeTab === 'revoked') {
      return allDevices.filter((d) => d.status === 'REVOKED' && !d.archivedAt);
    }
    return allDevices.filter((d) => !!d.archivedAt);
  }, [allDevices, activeTab]);

  const filteredDevices = useMemo(() => {
    if (typeFilter === 'all') return tabDevices;
    return tabDevices.filter((d) => {
      const { icon } = getDeviceTypeAndPlatform(d);
      if (typeFilter === 'desktop') return icon === 'desktop';
      if (typeFilter === 'web') return icon === 'web';
      if (typeFilter === 'mobile') return icon === 'mobile';
      return true;
    });
  }, [tabDevices, typeFilter]);

  // Cálculos de cupos para las 3 tarjetas
  // 1. Computadoras
  const isComputersUnlimited = business.maxDevices === null || business.maxDevices === undefined;
  const computersAllowed = isComputersUnlimited ? null : business.maxDevices;
  const computersPercent = computersAllowed
    ? Math.min(100, Math.round((activeComputersCount / computersAllowed) * 100))
    : 0;
  const isComputersFull = !isComputersUnlimited && activeComputersCount >= (computersAllowed ?? 0);

  // 2. Navegadores
  const isWebUnlimited = currentMaxWebDevices === null;
  const webAllowed = currentMaxWebDevices;
  const webPercent = webAllowed
    ? Math.min(100, Math.round((activeWebDevicesCount / webAllowed) * 100))
    : 0;
  const isWebFull = !isWebUnlimited && activeWebDevicesCount >= (webAllowed ?? 0);

  // 3. Teléfonos
  const mobileAllowed = currentMaxMobileDevices;
  const isMobileDisabled = mobileAllowed === 0;
  const mobilePercent = mobileAllowed > 0
    ? Math.min(100, Math.round((activeMobileDevicesCount / mobileAllowed) * 100))
    : 0;
  const isMobileFull = !isMobileDisabled && activeMobileDevicesCount >= mobileAllowed;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Equipos y operación del POS
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Cupos, equipos autorizados y configuración de cobro
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isEditingConfig ? (
            <button
              type="button"
              onClick={() => setIsEditingConfig(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            >
              <PencilSimple size={14} />
              <span>Editar configuración POS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingConfig(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <X size={14} />
              <span>Cancelar edición</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario de edición (si está activo) */}
      {isEditingConfig && (
        <form
          onSubmit={handleSaveConfig}
          className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/80 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
            <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
              Ajustes de configuración
            </span>
            <span className="text-xs text-purple-700">Edición en progreso</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Campo 1: Perfil del salón */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Perfil del salón *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSalonProfile('RESTAURANTE')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    salonProfile === 'RESTAURANTE'
                      ? 'border-purple-600 bg-white ring-1 ring-purple-600 text-purple-950 font-bold'
                      : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-white'
                  }`}
                >
                  <Desktop size={16} className="text-purple-600 shrink-0" />
                  <span className="text-xs">Restaurante / mesas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSalonProfile('TALLER')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    salonProfile === 'TALLER'
                      ? 'border-purple-600 bg-white ring-1 ring-purple-600 text-purple-950 font-bold'
                      : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-white'
                  }`}
                >
                  <Desktop size={16} className="text-amber-600 shrink-0" />
                  <span className="text-xs">Taller / órdenes</span>
                </button>
              </div>
            </div>

            {/* Campo 2: Cupo de computadoras */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cupo de computadoras *
                </label>
                <label className="flex items-center gap-1.5 text-xs select-none cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={isUnlimitedComputers}
                    onChange={(e) => setIsUnlimitedComputers(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-purple-950">Ilimitado</span>
                </label>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                disabled={isUnlimitedComputers}
                value={isUnlimitedComputers ? '' : maxDevicesInput}
                onChange={(e) => setMaxDevicesInput(e.target.value)}
                placeholder={isUnlimitedComputers ? 'Sin límite' : '1'}
                className={`w-full h-10 px-3 rounded-lg border text-xs bg-white focus:outline-none focus:border-purple-600 ${
                  isUnlimitedComputers
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'text-gray-900 border-gray-300'
                }`}
              />
            </div>

            {/* Campo 3: Teléfonos (app móvil) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Teléfonos (app móvil) *
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={maxMobileDevicesInput}
                onChange={(e) => setMaxMobileDevicesInput(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border text-xs bg-white text-gray-900 border-gray-300 focus:outline-none focus:border-purple-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Con 0, la app móvil queda apagada para este negocio.
              </p>
            </div>

            {/* Campo 4: Horas de prueba */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Horas de prueba (opcional)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formTrialHours}
                onChange={(e) => setFormTrialHours(e.target.value)}
                placeholder="Ej. 24"
                className="w-full h-10 px-3 rounded-lg border text-xs bg-white text-gray-900 border-gray-300 focus:outline-none focus:border-purple-600"
              />
            </div>

            {/* Campo 5: Web admin básico */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Web admin básico
              </label>
              <div className="flex items-center gap-3 h-10">
                <button
                  type="button"
                  role="switch"
                  aria-checked={webAdminEnabledForm}
                  onClick={() => {
                    const next = !webAdminEnabledForm;
                    setWebAdminEnabledForm(next);
                    if (!next) setWebBillingEnabledForm(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    webAdminEnabledForm ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      webAdminEnabledForm ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-700">
                  {webAdminEnabledForm ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </div>
            </div>

            {/* Campo 6: Facturación web */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Facturación web
              </label>
              <div className="flex items-center gap-3 h-10">
                <button
                  type="button"
                  role="switch"
                  aria-checked={webBillingEnabledForm}
                  disabled={!webAdminEnabledForm}
                  onClick={() => setWebBillingEnabledForm(!webBillingEnabledForm)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                    webBillingEnabledForm ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      webBillingEnabledForm ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-700">
                  {webBillingEnabledForm ? 'Habilitada' : 'Deshabilitada'}
                </span>
              </div>
            </div>
          </div>

          {/* Subcampos de facturación web */}
          {webBillingEnabledForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white rounded-xl border border-purple-200/60">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dispositivos web autorizados *
                  </label>
                  <label className="flex items-center gap-1.5 text-xs select-none cursor-pointer text-gray-700">
                    <input
                      type="checkbox"
                      checked={isUnlimitedWeb}
                      onChange={(e) => setIsUnlimitedWeb(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                    />
                    <span className="font-semibold text-purple-950">Ilimitado</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={isUnlimitedWeb}
                  value={isUnlimitedWeb ? '' : maxWebDevicesInput}
                  onChange={(e) => setMaxWebDevicesInput(e.target.value)}
                  placeholder={isUnlimitedWeb ? 'Sin límite' : '2'}
                  className={`w-full h-10 px-3 rounded-lg border text-xs bg-white focus:outline-none focus:border-purple-600 ${
                    isUnlimitedWeb
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'text-gray-900 border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tarifa mensual en USD (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={webBillingMonthlyUsdInput}
                    onChange={(e) => setWebBillingMonthlyUsdInput(e.target.value)}
                    placeholder="Ej. 15.00"
                    className="w-full h-10 pl-7 pr-3 rounded-lg border text-xs bg-white text-gray-900 border-gray-300 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200/60">
            <button
              type="button"
              onClick={() => setIsEditingConfig(false)}
              className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updatePosSubMutation.isPending}
              className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {updatePosSubMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      )}

      {/* 1. Cupos (fila de 3 tarjetas iguales) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Tarjeta 1: Computadoras */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Desktop size={18} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Computadoras
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {activeComputersCount} de {isComputersUnlimited ? 'Ilimitado' : computersAllowed}
            </div>

            {/* Barra de uso delgada */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden my-2.5">
              <div
                className={`h-full transition-all duration-300 ${
                  isComputersFull ? 'bg-amber-500' : 'bg-gray-400'
                }`}
                style={{ width: `${computersPercent}%` }}
              />
            </div>
          </div>

          <div className="text-xs font-medium text-gray-500 pt-1">
            {isComputersUnlimited ? (
              <span>Disponible: Ilimitado</span>
            ) : isComputersFull ? (
              <span className="text-amber-700 font-bold">Cupo lleno</span>
            ) : (
              <span>Disponible: {(computersAllowed ?? 0) - activeComputersCount}</span>
            )}
          </div>
        </div>

        {/* Tarjeta 2: Navegadores */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={18} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Navegadores
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {activeWebDevicesCount} de {isWebUnlimited ? 'Ilimitado' : webAllowed}
            </div>

            {/* Barra de uso delgada */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden my-2.5">
              <div
                className={`h-full transition-all duration-300 ${
                  isWebFull ? 'bg-amber-500' : 'bg-gray-400'
                }`}
                style={{ width: `${webPercent}%` }}
              />
            </div>
          </div>

          <div className="text-xs font-medium text-gray-500 pt-1">
            {isWebUnlimited ? (
              <span>Disponible: Ilimitado</span>
            ) : isWebFull ? (
              <span className="text-amber-700 font-bold">Cupo lleno</span>
            ) : (
              <span>Disponible: {(webAllowed ?? 0) - activeWebDevicesCount}</span>
            )}
          </div>
        </div>

        {/* Tarjeta 3: Teléfonos (app) */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DeviceMobile size={18} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Teléfonos (app)
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {isMobileDisabled ? '0 de 0' : `${activeMobileDevicesCount} de ${mobileAllowed}`}
            </div>

            {/* Barra de uso delgada */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden my-2.5">
              <div
                className={`h-full transition-all duration-300 ${
                  isMobileFull ? 'bg-amber-500' : 'bg-gray-400'
                }`}
                style={{ width: `${mobilePercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-xs font-medium text-gray-500">
              {isMobileDisabled ? (
                <span className="text-gray-400">Apagada</span>
              ) : isMobileFull ? (
                <span className="text-amber-700 font-bold">Cupo lleno</span>
              ) : (
                <span>Disponible: {mobileAllowed - activeMobileDevicesCount}</span>
              )}
            </div>

            {!isMobileDisabled && (
              <button
                type="button"
                onClick={handleGeneratePairingCode}
                disabled={createPairingCodeMutation.isPending}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Key size={13} weight="bold" />
                <span>Generar código</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Operación (lista de ajustes, no tarjetas) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs divide-y divide-gray-100 overflow-hidden">
        {/* Fila 1: Perfil del salón */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Perfil del salón
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Modalidad de atención y disposición del local.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-sm font-semibold text-gray-900">
              {currentProfile === 'RESTAURANTE' ? 'Restaurante / mesas' : 'Taller / órdenes'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingConfig(true)}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer underline underline-offset-2"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Fila 2: Web admin básico */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Web admin básico
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Acceso al panel web de administración para encargados y administradores.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              role="switch"
              aria-checked={currentWebAdmin}
              disabled={isTogglingWebAdmin}
              onClick={handleToggleWebAdminDirect}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 ${
                currentWebAdmin ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentWebAdmin ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Fila 3: Facturación web */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Facturación web
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Emisión de comprobantes y cobro directo desde navegadores autorizados.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {currentWebBilling && (
              <span className="text-xs font-semibold text-gray-600">
                {currentMaxWebDevices === null
                  ? 'Disponibles: Ilimitado'
                  : `${Math.max(0, currentMaxWebDevices - activeWebDevicesCount)} de ${currentMaxWebDevices} disponibles`}
              </span>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={currentWebBilling}
              disabled={isTogglingWebBilling}
              onClick={handleToggleWebBillingDirect}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 ${
                currentWebBilling ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentWebBilling ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Prueba */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock size={20} className="text-gray-400 shrink-0" weight="duotone" />
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Prueba
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {trialState === 'SIN_PRUEBA' && 'Sin prueba'}
                {trialState === 'SIN_INICIAR' && `Prueba sin iniciar (${trialHours} h)`}
                {trialState === 'EN_CURSO' && `Termina el ${formatNicaraguaTrialDate(trialEndsAt)}`}
                {trialState === 'VENCIDA' && `Vencida el ${formatNicaraguaTrialDate(trialEndsAt)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setTrialHoursInput(trialHours ? String(trialHours) : '24');
                setIsEditingTrialHours(!isEditingTrialHours);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            >
              <PencilSimple size={13} />
              <span>{trialHours ? 'Cambiar horas de prueba' : 'Fijar horas de prueba'}</span>
            </button>
          </div>
        </div>

        {/* Acciones de la prueba al expandir */}
        {isEditingTrialHours && (
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
            <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 font-semibold">Horas:</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej. 24"
                  value={trialHoursInput}
                  onChange={(e) => setTrialHoursInput(e.target.value)}
                  className="w-24 h-8 px-2.5 rounded-lg border border-gray-300 text-xs bg-white font-semibold focus:outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleSaveTrialHours}
                  className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTrialHours(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {trialHours && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="text-xs text-gray-500 font-medium pl-1">Extender:</span>
                    <select
                      value={extendHours}
                      onChange={(e) => setExtendHours(Number(e.target.value))}
                      disabled={isActionPending}
                      aria-label="Horas para extender la prueba"
                      className="h-7 px-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-800 focus:outline-none"
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
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <PlusCircle size={13} weight="bold" />
                      <span>Extender</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isActionPending}
                    onClick={handleResetTrial}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ArrowCounterClockwise size={13} weight="bold" />
                    <span>Reiniciar reloj</span>
                  </button>

                  {trialState === 'EN_CURSO' && (
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={handleTerminateTrial}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <StopCircle size={13} weight="bold" />
                      <span>Terminar ahora</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isActionPending}
                    onClick={handleRemoveTrial}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash size={13} />
                    <span>Quitar prueba</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Equipos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 space-y-4">
        {/* Pestañas con conteo del API y botón Archivar todos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          {/* Pestañas */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Activos ({summary?.active ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('revoked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'revoked'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Revocados ({summary?.revoked ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'archived'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Archivados ({summary?.archived ?? 0})
            </button>
          </div>

          {/* Botón Archivar todos (solo en pestaña Revocados) */}
          {activeTab === 'revoked' && (summary?.revoked ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setArchiveAllModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <Archive size={14} className="text-gray-500" />
              <span>Archivar todos</span>
            </button>
          )}
        </div>

        {/* Filtro por tipo */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 mr-1">Filtrar por tipo:</span>
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'desktop', label: 'Computadoras' },
              { key: 'web', label: 'Navegadores' },
              { key: 'mobile', label: 'Teléfonos' },
            ] as const
          ).map((item) => {
            const isActive = typeFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTypeFilter(item.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Listado de equipos */}
        {isLoadingDevices ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-gray-100 text-xs text-gray-500">
            Cargando equipos...
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500">
              {typeFilter !== 'all'
                ? 'No hay equipos de este tipo en esta pestaña.'
                : activeTab === 'active'
                ? 'No hay equipos activos.'
                : activeTab === 'revoked'
                ? 'No hay equipos revocados.'
                : 'No hay equipos archivados.'}
            </p>
          </div>
        ) : (
          <>
            {/* Vista desktop: tabla */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    <th className="py-2.5 px-3">Equipo</th>
                    <th className="py-2.5 px-3">Última conexión</th>
                    <th className="py-2.5 px-3">Registrado</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDevices.map((device) => {
                    const { type, platform, icon } = getDeviceTypeAndPlatform(device);
                    const isMenuOpen = openMenuDeviceId === device.id;
                    const isArchived = !!device.archivedAt;

                    return (
                      <tr key={device.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Columna Equipo */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-center shrink-0">
                              {icon === 'desktop' && <Desktop size={16} className="text-gray-600" />}
                              {icon === 'web' && <Globe size={16} className="text-gray-600" />}
                              {icon === 'mobile' && <DeviceMobile size={16} className="text-gray-600" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">
                                {device.name || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {type} · {platform}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Columna Última conexión */}
                        <td
                          className="py-3 px-3 text-xs text-gray-700 whitespace-nowrap cursor-help"
                          title={device.lastSeenAt ? formatDateTime(device.lastSeenAt) : undefined}
                        >
                          {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : 'Nunca'}
                        </td>

                        {/* Columna Registrado */}
                        <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatDateShort(device.createdAt)}
                        </td>

                        {/* Columna Estado */}
                        <td className="py-3 px-3 whitespace-nowrap text-xs font-medium text-gray-700">
                          {isArchived ? (
                            <span className="inline-flex items-center">
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5 shrink-0" />
                              Archivado
                            </span>
                          ) : device.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center">
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5 shrink-0" />
                              Revocado
                            </span>
                          )}
                        </td>

                        {/* Columna Acciones (menú ⋯) */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="relative inline-block text-left" data-device-menu>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuDeviceId(isMenuOpen ? null : device.id)
                              }
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Acciones"
                            >
                              <DotsThreeVertical size={18} weight="bold" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white border border-gray-200 shadow-lg py-1 z-30 divide-y divide-gray-100 text-left">
                                {/* Encabezado con ID abreviado y botón Copiar */}
                                <div className="px-3 py-2 flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs text-gray-500 truncate">
                                    {shortenId(device.deviceId || device.id)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyId(device.deviceId || device.id)}
                                    className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer shrink-0"
                                  >
                                    {copiedIdDeviceId === (device.deviceId || device.id) ? (
                                      <>
                                        <Check size={12} className="text-emerald-600" />
                                        <span>Copiado</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copiar ID</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Opciones del menú */}
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenameModal({
                                        isOpen: true,
                                        device,
                                        newName: device.name || '',
                                      });
                                      setOpenMenuDeviceId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                  >
                                    Renombrar
                                  </button>

                                  {device.status === 'ACTIVE' && !isArchived && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRevokeModal({ isOpen: true, device });
                                        setOpenMenuDeviceId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                    >
                                      Revocar
                                    </button>
                                  )}

                                  {device.status === 'REVOKED' && !isArchived && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmReactivate(device)}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                      >
                                        Reactivar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setArchiveModal({ isOpen: true, device });
                                          setOpenMenuDeviceId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                      >
                                        Archivar
                                      </button>
                                    </>
                                  )}

                                  {isArchived && (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmUnarchive(device)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                    >
                                      Desarchivar
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista móvil (< md): fila de dos líneas */}
            <div className="md:hidden space-y-2.5">
              {filteredDevices.map((device) => {
                const { type, platform, icon } = getDeviceTypeAndPlatform(device);
                const isMenuOpen = openMenuDeviceId === device.id;
                const isArchived = !!device.archivedAt;

                return (
                  <div
                    key={device.id}
                    className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs space-y-2"
                  >
                    {/* Línea 1: Nombre y tipo arriba + Menú ⋯ a la derecha */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-center shrink-0">
                          {icon === 'desktop' && <Desktop size={14} className="text-gray-600" />}
                          {icon === 'web' && <Globe size={14} className="text-gray-600" />}
                          {icon === 'mobile' && <DeviceMobile size={14} className="text-gray-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 truncate">
                            {device.name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {type} · {platform}
                          </div>
                        </div>
                      </div>

                      <div className="relative shrink-0" data-device-menu>
                        <button
                          type="button"
                          onClick={() => setOpenMenuDeviceId(isMenuOpen ? null : device.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <DotsThreeVertical size={18} weight="bold" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1 z-30 divide-y divide-gray-100 text-left">
                            <div className="px-3 py-2 flex items-center justify-between gap-1">
                              <span className="font-mono text-xs text-gray-500 truncate">
                                {shortenId(device.deviceId || device.id)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyId(device.deviceId || device.id)}
                                className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer shrink-0"
                              >
                                {copiedIdDeviceId === (device.deviceId || device.id) ? (
                                  <>
                                    <Check size={12} className="text-emerald-600" />
                                    <span>Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameModal({
                                    isOpen: true,
                                    device,
                                    newName: device.name || '',
                                  });
                                  setOpenMenuDeviceId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                              >
                                Renombrar
                              </button>

                              {device.status === 'ACTIVE' && !isArchived && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRevokeModal({ isOpen: true, device });
                                    setOpenMenuDeviceId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                >
                                  Revocar
                                </button>
                              )}

                              {device.status === 'REVOKED' && !isArchived && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmReactivate(device)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                  >
                                    Reactivar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setArchiveModal({ isOpen: true, device });
                                      setOpenMenuDeviceId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                  >
                                    Archivar
                                  </button>
                                </>
                              )}

                              {isArchived && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmUnarchive(device)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                                >
                                  Desarchivar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Línea 2: Conexión y estado abajo */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
                      <span title={device.lastSeenAt ? formatDateTime(device.lastSeenAt) : undefined}>
                        {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : 'Nunca'}
                      </span>
                      <div>
                        {isArchived ? (
                          <span className="inline-flex items-center font-medium text-gray-600">
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5 shrink-0" />
                            Archivado
                          </span>
                        ) : device.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center font-medium text-gray-800">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center font-medium text-gray-600">
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5 shrink-0" />
                            Revocado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal: Renombrar equipo */}
      {renameModal.isOpen && renameModal.device && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Renombrar equipo</h3>
              <button
                type="button"
                onClick={() => setRenameModal({ isOpen: false, device: null, newName: '' })}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nombre del equipo
                </label>
                <input
                  type="text"
                  value={renameModal.newName}
                  onChange={(e) =>
                    setRenameModal((prev) => ({ ...prev, newName: e.target.value }))
                  }
                  placeholder="Ej. Caja Principal"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 focus:outline-none focus:border-purple-600"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameModal({ isOpen: false, device: null, newName: '' })}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateDeviceMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de revocar equipo (con botón rojo) */}
      {revokeModal.isOpen && revokeModal.device && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <WarningCircle size={22} weight="fill" />
              <h3 className="text-sm font-bold text-gray-900">Revocar equipo</h3>
            </div>
            <p className="text-xs text-gray-600">
              ¿Confirmás revocar el acceso al equipo{' '}
              <strong>"{revokeModal.device.name || revokeModal.device.deviceId}"</strong>? Dejará de
              poder operar en el punto de venta.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeModal({ isOpen: false, device: null })}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={updateDeviceMutation.isPending}
                onClick={handleConfirmRevoke}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {updateDeviceMutation.isPending ? 'Revocando...' : 'Revocar equipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de archivar equipo individual */}
      {archiveModal.isOpen && archiveModal.device && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Archive size={20} weight="bold" />
              <h3 className="text-sm font-bold text-gray-900">Archivar equipo</h3>
            </div>
            <p className="text-xs text-gray-600">
              ¿Confirmás archivar el equipo{' '}
              <strong>"{archiveModal.device.name || archiveModal.device.deviceId}"</strong>? Se
              moverá a la pestaña de archivados.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModal({ isOpen: false, device: null })}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={archiveDeviceMutation.isPending}
                onClick={handleConfirmArchive}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {archiveDeviceMutation.isPending ? 'Archivando...' : 'Archivar equipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de archivar todos los revocados */}
      {archiveAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Archive size={20} weight="bold" />
              <h3 className="text-sm font-bold text-gray-900">Archivar equipos revocados</h3>
            </div>
            <p className="text-xs text-gray-600">
              ¿Confirmás archivar los <strong>{summary?.revoked ?? 0}</strong> equipos revocados de
              este negocio? Se moverán a la pestaña de archivados.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveAllModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={archiveRevokedDevicesMutation.isPending}
                onClick={handleConfirmArchiveAll}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {archiveRevokedDevicesMutation.isPending ? 'Archivando...' : 'Archivar todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vinculación móvil */}
      {pairingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <DeviceMobile size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Vincular un teléfono</h3>
                  <p className="text-xs text-gray-500">App móvil NEXOL POS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPairingModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5 text-center space-y-2">
              <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider block">
                Código de vinculación
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-purple-950 py-1 select-all">
                {pairingCode}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyPairingCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-purple-200 text-xs font-semibold text-purple-800 hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer"
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

            <div className="flex items-center justify-center gap-2 text-xs font-medium">
              <Clock
                size={16}
                className={pairingSecondsLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-amber-600'}
                weight="fill"
              />
              <span className={pairingSecondsLeft < 60 ? 'text-rose-600 font-bold' : 'text-gray-600'}>
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

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Pasos para vincular
              </span>
              <ol className="text-xs text-gray-600 space-y-2 list-none">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Abrí la app <strong>NEXOL POS</strong> en el teléfono.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Escribí este código.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Iniciá sesión con tu usuario.</span>
                </li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPairingModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
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
