import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createBusinessMarker } from 'map';
import {
  ArrowLeft,
  Storefront,
  Motorcycle,
  Phone,
  EnvelopeSimple,
  Plus,
  Gear,
  Coins,
  Key,
  Lock,
  LockOpen,
  PencilSimple,
  Trash,
  Warning,
  Info,
  Prohibit,
  WarningOctagon,
  WhatsappLogo,
  DotsThreeVertical,
  List,
  ArrowRight,
} from '@phosphor-icons/react';
import { useSuperadminSidebar } from '../components/layout/Layout';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  useBusinessDetail,
  useToggleBusiness,
  useUpdateBusiness,
  useUpdateUserQuota,
  useBusinessDevices,
  useUpdatePosSubscription,
  useBusinessUnifiedPayments,
  type BusinessAccountType,
  type BusinessType,
} from '../hooks/useBusinesses';
import {
  useBusinessMemberships,
  useVoidMembership,
  MembershipItem,
} from '../hooks/useMemberships';
import {
  formatDateTime,
  formatDateShort,
  formatRelativeTime,
  formatCurrency,
} from '../utils/format';
import {
  resolveBusinessBillingInfo,
  getMembershipPeriodDates,
} from '../utils/membershipDates';
import { RegisterMembershipModal } from '../components/modals/RegisterMembershipModal';
import { EditMembershipModal } from '../components/modals/EditMembershipModal';
import { DeactivateBusinessModal } from '../components/modals/DeactivateBusinessModal';
import { ImageViewerModal } from '../components/modals/ImageViewerModal';
import { BusinessProductsSection } from '../components/business/BusinessProductsSection';
import { BusinessProductFieldsSection } from '../components/business/BusinessProductFieldsSection';
import { BusinessPosDevicesSection } from '../components/business/BusinessPosDevicesSection';
import { BusinessOrganizationSection } from '../components/business/BusinessOrganizationSection';
import { BusinessBillingTab } from '../components/business/BusinessBillingTab';
import { useAccountStatement } from '../hooks/useCommercial';
import {
  useBusinessProducts,
  type BusinessProductType,
} from '../hooks/useBusinessProducts';
import { useSuperAdminUsers } from '../hooks/useSuperAdminUsers';
import { type AdminUser } from 'api-client';
import { CreateSuperAdminUserModal } from '../components/modals/users/CreateSuperAdminUserModal';
import { UserPasswordModal } from '../components/modals/users/UserPasswordModal';
import { ChangeUserPasswordModal } from '../components/modals/users/ChangeUserPasswordModal';
import { DeactivateUserModal } from '../components/modals/users/DeactivateUserModal';
import { EditBusinessModal } from '../components/modals/EditBusinessModal';
import { DeleteBusinessModal } from '../components/modals/DeleteBusinessModal';
import toast from 'react-hot-toast';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type DetailTabKey =
  | 'resumen'
  | 'cobros'
  | 'equipos'
  | 'usuarios'
  | 'configuracion';

const VALID_TABS: DetailTabKey[] = [
  'resumen',
  'cobros',
  'equipos',
  'usuarios',
  'configuracion',
];

function cleanWhatsappDigits(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.length === 8 ? `505${digits}` : digits;
}

function cleanPhoneHref(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^\d+]/g, '');
  return cleaned.length >= 7 ? cleaned : null;
}

function shortenBusinessId(id: string): string {
  if (!id || id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

const SwitchButton: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-emerald-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-2xs transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export const BusinessDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setSidebarOpen } = useSuperadminSidebar();

  const rawTab = (searchParams.get('tab') || 'resumen').toLowerCase() as DetailTabKey;
  const activeTab: DetailTabKey = VALID_TABS.includes(rawTab) ? rawTab : 'resumen';

  const setActiveTab = (next: DetailTabKey) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    params.delete('editContact');
    setSearchParams(params, { replace: true });
  };

  const { data: business, isLoading, isError } = useBusinessDetail(id!);
  const { data: memberships = [] } = useBusinessMemberships(id!);
  const { data: productsData } = useBusinessProducts(id!);
  const { data: accountStatement } = useAccountStatement(id!);
  const { data: unifiedPaymentsData } = useBusinessUnifiedPayments(id!);
  const { data: allPosDevices = [] } = useBusinessDevices(id!, false);

  const toggleMutation = useToggleBusiness();
  const updateMutation = useUpdateBusiness();
  const updateQuotaMutation = useUpdateUserQuota();
  const updatePosSubMutation = useUpdatePosSubscription();

  const [extraSlotsInput, setExtraSlotsInput] = useState<string>('');

  useEffect(() => {
    if (business?.userUsage) {
      setExtraSlotsInput(String(business.userUsage.extra));
    }
  }, [business?.userUsage?.extra]);

  const isDeliveryActive = productsData
    ? productsData.products.DELIVERY.status === 'ACTIVE'
    : (business?.hasTrackDeli ?? false);

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerModalInitialProductType, setRegisterModalInitialProductType] =
    useState<BusinessProductType | undefined>(undefined);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [membershipToVoid, setMembershipToVoid] = useState<MembershipItem | null>(
    null
  );
  const [membershipToEdit, setMembershipToEdit] = useState<MembershipItem | null>(
    null
  );
  const [voidReason, setVoidReason] = useState('');
  const voidMembershipMutation = useVoidMembership(id || '');

  // Si llega desde la lista con ?editContact=1, abrir modal de edición
  useEffect(() => {
    if (searchParams.get('editContact') === '1' && business) {
      setIsEditDataModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('editContact');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, business, setSearchParams]);

  const handleOpenVoidModal = (membership: MembershipItem) => {
    setMembershipToVoid(membership);
    setVoidReason('');
  };

  const handleConfirmVoid = () => {
    if (!membershipToVoid || voidReason.trim().length < 5) return;
    voidMembershipMutation.mutate(
      { id: membershipToVoid.id, reason: voidReason.trim() },
      {
        onSuccess: () => {
          setMembershipToVoid(null);
          setVoidReason('');
        },
      }
    );
  };

  const handleOpenRegisterPayment = (productType?: BusinessProductType) => {
    setRegisterModalInitialProductType(productType);
    setIsRegisterModalOpen(true);
  };

  const { data: businessUsers = [], isLoading: loadingBusinessUsers } =
    useSuperAdminUsers({
      businessId: id,
    });
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<AdminUser | null>(null);
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(
    null
  );
  const [passwordTargetUser, setPasswordTargetUser] = useState<AdminUser | null>(
    null
  );
  const [deactivateTargetUser, setDeactivateTargetUser] =
    useState<AdminUser | null>(null);

  const activeEncargados = businessUsers.filter(
    (u) => u.role === 'ENCARGADO' && u.isActive
  );
  const isTargetOnlyActiveEncargado =
    deactivateTargetUser?.role === 'ENCARGADO' &&
    deactivateTargetUser?.isActive &&
    activeEncargados.length === 1 &&
    activeEncargados[0].id === deactivateTargetUser.id;

  const [modelBusinessType, setModelBusinessType] =
    useState<BusinessType>('NEGOCIO');
  const [modelCommissionRate, setModelCommissionRate] = useState('15');
  const [modelAltCommissionRate, setModelAltCommissionRate] = useState('12');
  const [modelAltCommissionDistanceKm, setModelAltCommissionDistanceKm] =
    useState('40');
  const [modelDispatchTimeoutMin, setModelDispatchTimeoutMin] = useState('3');

  const openEditModelModal = () => {
    if (!business) return;
    setModelBusinessType(business.businessType || 'NEGOCIO');
    setModelCommissionRate(
      String(Math.round((business.commissionRate || 0.15) * 100))
    );
    setModelAltCommissionRate(
      String(Math.round((business.altCommissionRate || 0.12) * 100))
    );
    setModelAltCommissionDistanceKm(
      String(business.altCommissionDistanceKm || 40)
    );
    setModelDispatchTimeoutMin(String(business.dispatchTimeoutMin || 3));
    setIsEditModelModalOpen(true);
  };

  // Lotes y funciones
  const [isActivateBatchesModalOpen, setIsActivateBatchesModalOpen] =
    useState(false);
  const [isDeactivateBatchesModalOpen, setIsDeactivateBatchesModalOpen] =
    useState(false);
  const [deactivateBatchesError, setDeactivateBatchesError] = useState<
    string | null
  >(null);

  const handleConfirmActivateBatches = () => {
    if (!business) return;
    updateMutation.mutate(
      { id: business.id, data: { tracksBatches: true } },
      {
        onSuccess: () => {
          setIsActivateBatchesModalOpen(false);
          toast.success('Control de lotes activado');
        },
      }
    );
  };

  const handleDeactivateBatchesClick = () => {
    if (!business) return;
    updateMutation.mutate(
      { id: business.id, data: { tracksBatches: false } },
      {
        onSuccess: () => {
          toast.success('Control de lotes desactivado');
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message;
          const errorText = Array.isArray(msg) ? msg.join(', ') : msg;
          setDeactivateBatchesError(
            errorText || 'El negocio tiene lotes con existencias activas.'
          );
          setIsDeactivateBatchesModalOpen(true);
        },
      }
    );
  };

  const handleConfirmDeactivateBatchesWithConfirm = () => {
    if (!business) return;
    updateMutation.mutate(
      { id: business.id, data: { tracksBatches: false, confirm: true } },
      {
        onSuccess: () => {
          setIsDeactivateBatchesModalOpen(false);
          setDeactivateBatchesError(null);
          toast.success('Control de lotes desactivado');
        },
      }
    );
  };

  const handleToggleUseListPrice = () => {
    if (!business) return;
    const nextVal = !business.useListPrice;
    updateMutation.mutate(
      { id: business.id, data: { useListPrice: nextVal } },
      {
        onSuccess: () => {
          toast.success(
            nextVal
              ? 'Precio de etiqueta activado'
              : 'Precio de etiqueta desactivado'
          );
        },
      }
    );
  };

  const [isEditingTtl, setIsEditingTtl] = useState(false);
  const [ttlInput, setTtlInput] = useState<number>(4);

  useEffect(() => {
    if (business) {
      setTtlInput(business.twoStepTicketTtlHours || 4);
    }
  }, [business?.twoStepTicketTtlHours]);

  const handleToggleTwoStepSale = () => {
    if (!business) return;
    const nextVal = !business.twoStepSaleEnabled;
    updateMutation.mutate(
      {
        id: business.id,
        data: {
          twoStepSaleEnabled: nextVal,
          twoStepTicketTtlHours: business.twoStepTicketTtlHours || 4,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            nextVal
              ? 'Venta en dos pasos activada'
              : 'Venta en dos pasos desactivada'
          );
        },
      }
    );
  };

  const handleSaveTtl = () => {
    if (!business) return;
    const hours = Math.max(1, Math.min(72, Number(ttlInput) || 4));
    updateMutation.mutate(
      {
        id: business.id,
        data: { twoStepTicketTtlHours: hours },
      },
      {
        onSuccess: () => {
          toast.success('Vencimiento del ticket actualizado');
          setIsEditingTtl(false);
        },
      }
    );
  };

  const handleToggleDeliveryChannel = () => {
    if (!business) return;
    const nextVal = !business.deliveryChannelEnabled;
    updateMutation.mutate(
      {
        id: business.id,
        data: { deliveryChannelEnabled: nextVal },
      },
      {
        onSuccess: () => {
          toast.success(
            nextVal
              ? 'Venta a domicilio activada'
              : 'Venta a domicilio desactivada'
          );
        },
      }
    );
  };

  const handleTogglePedidosYaChannel = () => {
    if (!business) return;
    const nextVal = !business.pedidosYaChannelEnabled;
    updateMutation.mutate(
      {
        id: business.id,
        data: { pedidosYaChannelEnabled: nextVal },
      },
      {
        onSuccess: () => {
          toast.success(
            nextVal ? 'Canal PedidosYa activado' : 'Canal PedidosYa desactivado'
          );
        },
      }
    );
  };

  // Perfil del salón en Configuración -> Funciones
  const [isEditingSalonProfile, setIsEditingSalonProfile] = useState(false);
  const currentSalonProfile: 'RESTAURANTE' | 'TALLER' =
    (business?.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE';
  const [salonProfileDraft, setSalonProfileDraft] =
    useState<'RESTAURANTE' | 'TALLER'>(currentSalonProfile);

  useEffect(() => {
    setSalonProfileDraft(
      (business?.salonProfile as 'RESTAURANTE' | 'TALLER') || 'RESTAURANTE'
    );
  }, [business?.salonProfile]);

  const handleSaveSalonProfile = async () => {
    if (!business) return;
    try {
      await updatePosSubMutation.mutateAsync({
        businessId: business.id,
        data: { salonProfile: salonProfileDraft },
      });
      setIsEditingSalonProfile(false);
    } catch {
      // Manejado por mutación
    }
  };

  const handleChangeAccountType = (nextType: BusinessAccountType) => {
    if (!business || (business.accountType || 'CLIENTE') === nextType) return;
    updateMutation.mutate(
      { id: business.id, data: { accountType: nextType } },
      {
        onSuccess: () => {
          const label =
            nextType === 'DEMO'
              ? 'Demo'
              : nextType === 'INTERNO'
              ? 'Interno'
              : 'Cliente';
          toast.success(`Tipo de cuenta actualizado a ${label}`);
        },
      }
    );
  };

  // Mapbox en pestaña Resumen
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (
      activeTab !== 'resumen' ||
      !mapContainer.current ||
      !business?.latitude ||
      !business?.longitude
    ) {
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [business.longitude, business.latitude],
      zoom: 14,
    });

    const el = createBusinessMarker({ name: business.name });

    new mapboxgl.Marker({ element: el })
      .setLngLat([business.longitude, business.latitude])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [activeTab, business?.latitude, business?.longitude, business?.name]);

  // Cálculos de dispositivos activos para resumen y franja superior
  const deviceCounts = useMemo(() => {
    let desktop = 0;
    let web = 0;
    let mobile = 0;
    for (const d of allPosDevices) {
      if (d.status !== 'ACTIVE' || d.archivedAt) continue;
      const cat = (d.category || '').toUpperCase();
      const plat = (d.platform || '').toUpperCase();
      if (cat === 'MOBILE' || plat.includes('ANDROID') || plat.includes('IOS')) {
        mobile += 1;
      } else if (
        cat === 'WEB' ||
        plat.includes('WEB') ||
        plat.includes('CHROME') ||
        plat.includes('SAFARI') ||
        plat.includes('FIREFOX')
      ) {
        web += 1;
      } else {
        desktop += 1;
      }
    }
    return {
      desktop: business?.activeDevices ?? desktop,
      web,
      mobile: business?.activeMobileDevices ?? mobile,
    };
  }, [allPosDevices, business?.activeDevices, business?.activeMobileDevices]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 lg:px-8 py-4">
          <button
            type="button"
            onClick={() => navigate('/businesses')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Negocios</span>
          </button>
        </header>
        <div className="p-6 max-w-6xl mx-auto flex items-center justify-center py-24 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-700 border-t-transparent mr-3" />
          <span>Cargando información del negocio…</span>
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 lg:px-8 py-4">
          <button
            type="button"
            onClick={() => navigate('/businesses')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Negocios</span>
          </button>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="p-5 bg-white border border-red-200 rounded-xl text-sm text-red-700">
            No se pudo encontrar la información del negocio solicitado.
          </div>
        </div>
      </div>
    );
  }

  const accountType: BusinessAccountType = business.accountType || 'CLIENTE';
  const isDemo = accountType === 'DEMO';
  const isInterno = accountType === 'INTERNO';
  const isNonBilling = isDemo || isInterno;

  const accountTypeLabel =
    accountType === 'DEMO'
      ? 'Demo'
      : accountType === 'INTERNO'
      ? 'Interno'
      : 'Cliente';

  const latestMembership: MembershipItem | undefined =
    memberships[0] || (business as any).latestMembership;

  const billingInfo = resolveBusinessBillingInfo(
    business,
    latestMembership,
    productsData
  );

  const rubroLabel =
    business.industry?.name ||
    (business.businessType === 'EMPRESA_RIDERS'
      ? 'Empresa de riders'
      : business.type || 'Comercio');

  // Contacto consolidado
  const contactData = {
    name: business.contact?.name ?? business.contactName ?? null,
    role: business.contact?.role ?? business.contactRole ?? null,
    phone:
      business.contact?.phone ??
      business.contactPhone ??
      business.posPhone ??
      business.phone ??
      null,
    whatsapp:
      business.contact?.whatsapp ??
      business.contactWhatsapp ??
      business.whatsappNumber ??
      null,
    email: business.contact?.email ?? business.contactEmail ?? null,
    address:
      business.contact?.address ??
      business.contactAddress ??
      business.posAddress ??
      business.address ??
      null,
    municipality:
      business.contact?.municipality ?? business.contactMunicipality ?? null,
    department:
      business.contact?.department ?? business.contactDepartment ?? null,
    taxId:
      business.contact?.taxId ?? business.contactTaxId ?? business.taxId ?? null,
    notes: business.contact?.notes ?? business.contactNotes ?? null,
  };

  const waDigits = cleanWhatsappDigits(
    contactData.whatsapp || contactData.phone
  );
  const telHref = cleanPhoneHref(contactData.phone || contactData.whatsapp);
  const hasAnyContactData = Object.values(contactData).some((v) => Boolean(v));

  // Datos de franja superior (4 datos)
  const posSub = business.productSubscriptions?.find(
    (s) => s.productType === 'POS'
  );
  const maxComputers =
    business.maxDevices !== undefined ? business.maxDevices : posSub?.maxDevices ?? 1;
  const isComputersUnlimited = maxComputers === null || maxComputers === undefined;
  const isComputersQuotaFull =
    !isComputersUnlimited && deviceCounts.desktop >= (maxComputers ?? 0);

  const maxWebAllowed =
    business.maxWebDevices !== undefined
      ? business.maxWebDevices
      : posSub?.maxWebDevices !== undefined
      ? posSub.maxWebDevices
      : 2;
  const maxMobileAllowed =
    business.maxMobileDevices !== undefined
      ? Number(business.maxMobileDevices)
      : posSub?.maxMobileDevices !== undefined
      ? Number(posSub.maxMobileDevices)
      : 0;

  const usedUsers =
    business.userUsage?.used ?? businessUsers.filter((u) => u.isActive).length;
  const limitUsers =
    business.userUsage?.limit ?? (businessUsers.length || 5);
  const lastActivitySignal =
    business.last_sale_at ||
    business.last_seen_at ||
    business.lastActivity ||
    business.lastLoginAt ||
    null;

  // Resumen de cuenta en pestaña Resumen
  const validUnifiedPayments = (unifiedPaymentsData?.payments || []).filter(
    (p) => p.status !== 'ANULADO' && !p.voidedAt
  );
  const lastValidPayment = validUnifiedPayments[0] || null;

  const saleModalityLabel =
    business.businessType === 'EMPRESA_RIDERS'
      ? 'Comisión por envío'
      : !accountStatement || accountStatement.saleModality === 'MEMBRESIA'
      ? 'Membresía mensual'
      : accountStatement.saleModality === 'SOLO_SISTEMA'
      ? 'Pago único (solo sistema)'
      : accountStatement.saleModality === 'COMBO_COMPLETO'
      ? 'Combo completo'
      : accountStatement.saleModality === 'COMBO_PARCIAL'
      ? 'Combo parcial'
      : accountStatement.saleModality;

  const maintenanceSummaryLabel =
    accountStatement?.maintenance?.status === 'INCLUIDO' &&
    accountStatement.maintenance.includedUntil
      ? `Incluido hasta ${formatDateShort(
          accountStatement.maintenance.includedUntil
        )}`
      : accountStatement?.maintenance?.status === 'EN_COBRO'
      ? `${formatCurrency(
          accountStatement.maintenance.monthlyAmount || 550,
          'NIO'
        )} / mes`
      : 'No aplica';

  const equipmentDeliveredCount = (accountStatement?.equipment || []).length;

  // Etiquetas de funciones activas para pestaña Resumen
  const activeFeatureTags: string[] = [];
  if (business.tracksBatches) activeFeatureTags.push('Lotes y vencimientos');
  if (business.useListPrice) activeFeatureTags.push('Precio de etiqueta');
  if (business.twoStepSaleEnabled) {
    activeFeatureTags.push(
      `Venta en dos pasos (${business.twoStepTicketTtlHours || 4} h)`
    );
  }
  if (business.deliveryChannelEnabled) activeFeatureTags.push('Venta a domicilio');
  if (business.pedidosYaChannelEnabled) activeFeatureTags.push('PedidosYa');
  if (business.hasPOS || productsData?.products?.POS?.status === 'ACTIVE') {
    activeFeatureTags.push(
      `Perfil del salón: ${
        currentSalonProfile === 'TALLER'
          ? 'Taller / órdenes'
          : 'Restaurante / mesas'
      }`
    );
  }

  const handleDeactivateConfirm = (bizId: string) => {
    toggleMutation.mutate(bizId, {
      onSuccess: () => {
        setIsDeactivateModalOpen(false);
      },
    });
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: business.id,
        data: {
          businessType: modelBusinessType,
          commissionRate:
            modelBusinessType === 'EMPRESA_RIDERS'
              ? Number(modelCommissionRate) / 100
              : undefined,
          altCommissionRate:
            modelBusinessType === 'EMPRESA_RIDERS'
              ? Number(modelAltCommissionRate) / 100
              : undefined,
          altCommissionDistanceKm:
            modelBusinessType === 'EMPRESA_RIDERS'
              ? Number(modelAltCommissionDistanceKm)
              : undefined,
          dispatchTimeoutMin:
            modelBusinessType === 'EMPRESA_RIDERS'
              ? Number(modelDispatchTimeoutMin)
              : undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditModelModalOpen(false);
        },
      }
    );
  };

  const detailTabs: Array<{ id: DetailTabKey; label: string }> = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'cobros', label: 'Cobros' },
    { id: 'equipos', label: 'Equipos y accesos' },
    { id: 'usuarios', label: `Usuarios (${businessUsers.length})` },
    { id: 'configuracion', label: 'Configuración' },
  ];

  const btnSecondary =
    'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap';

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Encabezado del negocio */}
      <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Fila superior: menú móvil + ← Negocios */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Abrir menú"
            >
              <List size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/businesses')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Negocios</span>
            </button>
          </div>

          {/* Nombre, etiquetas, subtítulo y acciones */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">
                  {business.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                    isNonBilling
                      ? 'bg-gray-100 text-gray-700 border-gray-300/80'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {accountTypeLabel}
                </span>

                {!business.isActive ? (
                  <Badge variant="danger" dot size="sm">
                    Inactivo
                  </Badge>
                ) : isNonBilling ? (
                  <Badge variant="neutral" size="sm">
                    Sin vencimiento
                  </Badge>
                ) : (
                  <Badge variant={billingInfo.variant} dot size="sm">
                    {billingInfo.label}
                  </Badge>
                )}
              </div>

              <p className="text-[13px] text-gray-500 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="capitalize">{rubroLabel}</span>
                <span>·</span>
                <span>Registrado el {formatDateShort(business.createdAt)}</span>
                <span>·</span>
                <span className="font-mono text-xs" title={business.id}>
                  ID {shortenBusinessId(business.id)}
                </span>
              </p>
            </div>

            {/* Acciones derechas: WhatsApp, Editar, Registrar pago (principal), ⋯ */}
            <div className="flex items-center flex-wrap gap-2 shrink-0">
              {waDigits ? (
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnSecondary}
                >
                  <WhatsappLogo
                    size={15}
                    weight="fill"
                    className="text-emerald-600"
                  />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    toast('Agregá un teléfono de contacto para abrir WhatsApp');
                    setIsEditDataModalOpen(true);
                  }}
                  className={btnSecondary}
                >
                  <WhatsappLogo size={15} className="text-gray-500" />
                  <span>WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditDataModalOpen(true)}
                className={btnSecondary}
              >
                <PencilSimple size={14} />
                <span>Editar</span>
              </button>

              {!isNonBilling && (
                <button
                  type="button"
                  onClick={() => handleOpenRegisterPayment(undefined)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} weight="bold" />
                  <span>Registrar pago</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHeaderMenuOpen((prev) => !prev)}
                  className="w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center cursor-pointer"
                  aria-label="Más acciones del negocio"
                  title="Más acciones"
                >
                  <DotsThreeVertical size={18} weight="bold" />
                </button>

                {headerMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setHeaderMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white shadow-lg border border-gray-200/80 py-1.5 z-50 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          openEditModelModal();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Gear size={14} />
                        <span>Configurar modelo</span>
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      {business.isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderMenuOpen(false);
                            setIsDeactivateModalOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Desactivar negocio
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderMenuOpen(false);
                            toggleMutation.mutate(business.id);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                        >
                          Activar negocio
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Barra de 5 pestañas sincronizada con ?tab= */}
          <nav
            aria-label="Secciones del negocio"
            className="flex items-center gap-6 overflow-x-auto -mb-px"
          >
            {detailTabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`py-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Aviso si el negocio está bloqueado */}
        {!isNonBilling && accountStatement?.billingStatus?.isBlocked && (
          <div className="p-4 rounded-xl bg-white border border-red-200 text-red-900 flex items-start gap-3">
            <WarningOctagon
              size={20}
              weight="fill"
              className="text-red-600 shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold">Negocio bloqueado</p>
              <p className="text-[13px] text-red-700 mt-0.5">
                {accountStatement.billingStatus.blockMessage ||
                  accountStatement.billingStatus.blockReason ||
                  'Este negocio está bloqueado por cuota o membresía vencida. Registrá el pago para reactivar el servicio.'}
              </p>
            </div>
          </div>
        )}

        {/* Franja de 4 datos en una sola tarjeta dividida */}
        <div className="bg-white rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/70">
          {/* 1. Membresía */}
          <div className="p-4 sm:p-5 space-y-1">
            <p className="text-[13px] font-medium text-gray-500">Membresía</p>
            {isNonBilling ? (
              <>
                <p className="text-base font-semibold text-gray-700">
                  Sin vencimiento
                </p>
                <p className="text-[13px] text-gray-500">
                  No se cobra ni se bloquea
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${billingInfo.statusBadge.dotClass}`}
                  />
                  <span className="text-base font-semibold text-gray-900">
                    {billingInfo.statusBadge.text}
                  </span>
                </div>
                <p className="text-[13px] text-gray-500">
                  {billingInfo.hasMembership &&
                  billingInfo.dueDateFormatted !== '—'
                    ? `Vence ${billingInfo.dueDateFormatted}${
                        billingInfo.daysRemainingText
                          ? ` · ${billingInfo.daysRemainingText}`
                          : ''
                      } · ${
                        billingInfo.status === 'EN_GRACIA'
                          ? billingInfo.graceText
                          : '3 días de gracia'
                      }`
                    : 'Sin membresía registrada'}
                </p>
              </>
            )}
          </div>

          {/* 2. Próximo cobro */}
          <div className="p-4 sm:p-5 space-y-1">
            <p className="text-[13px] font-medium text-gray-500">
              Próximo cobro
            </p>
            {isNonBilling ? (
              <>
                <p className="text-base font-semibold text-gray-700">
                  Sin cobro
                </p>
                <p className="text-[13px] text-gray-500">
                  Cuenta {accountTypeLabel.toLowerCase()}
                </p>
              </>
            ) : accountStatement?.maintenance?.status === 'INCLUIDO' &&
              accountStatement.maintenance.includedUntil ? (
              <>
                <p className="text-base font-semibold text-emerald-700">
                  Incluido
                </p>
                <p className="text-[13px] text-gray-500">
                  Mantenimiento hasta{' '}
                  {formatDateShort(accountStatement.maintenance.includedUntil)}
                </p>
              </>
            ) : accountStatement?.maintenance?.status === 'EN_COBRO' ? (
              <>
                <p className="text-base font-semibold text-gray-900 font-mono">
                  {formatCurrency(
                    accountStatement.maintenance.monthlyAmount || 550,
                    'NIO'
                  )}
                </p>
                <p className="text-[13px] text-gray-500">
                  Mantenimiento mensual
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-gray-900 font-mono">
                  {billingInfo.priceFormatted}
                </p>
                <p className="text-[13px] text-gray-500">
                  {billingInfo.hasMembership &&
                  billingInfo.dueDateFormatted !== '—'
                    ? `Programado el ${billingInfo.dueDateFormatted}`
                    : 'Sin fecha programada'}
                </p>
              </>
            )}
          </div>

          {/* 3. Computadoras */}
          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-gray-500">
                Computadoras
              </p>
              {isComputersQuotaFull && (
                <Badge variant="orange" size="sm">
                  Cupo lleno
                </Badge>
              )}
            </div>
            <p className="text-base font-semibold text-gray-900 font-mono">
              {deviceCounts.desktop} /{' '}
              {isComputersUnlimited ? 'Sin límite' : maxComputers}
            </p>
            <p className="text-[13px] text-gray-500">
              Equipos de escritorio activos
            </p>
          </div>

          {/* 4. Usuarios */}
          <div className="p-4 sm:p-5 space-y-1">
            <p className="text-[13px] font-medium text-gray-500">Usuarios</p>
            <p className="text-base font-semibold text-gray-900 font-mono">
              {usedUsers} / {limitUsers} activos
            </p>
            <p className="text-[13px] text-gray-500 truncate">
              {lastActivitySignal
                ? `Última actividad: ${formatRelativeTime(lastActivitySignal)}`
                : 'Sin actividad reciente'}
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PESTAÑA 1: RESUMEN
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            {/* Tarjeta Cliente */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">
                    Cliente
                  </h3>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Persona de contacto, ubicación fiscal y notas comerciales
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditDataModalOpen(true)}
                  className={btnSecondary}
                >
                  <PencilSimple size={14} />
                  <span>Editar datos</span>
                </button>
              </div>

              {!hasAnyContactData ? (
                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-[13px] text-gray-500">
                    Todavía no cargaste los datos de contacto de este negocio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditDataModalOpen(true)}
                    className="text-xs font-semibold text-gray-800 underline underline-offset-2 cursor-pointer text-left"
                  >
                    Agregar contacto
                  </button>
                </div>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-gray-100 text-xs">
                  <div className="space-y-0.5">
                    <dt className="text-[13px] text-gray-500">Contacto</dt>
                    <dd className="text-sm font-semibold text-gray-900">
                      {contactData.name || '—'}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[13px] text-gray-500">Cargo</dt>
                    <dd className="text-sm text-gray-900">
                      {contactData.role || '—'}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[13px] text-gray-500">Teléfono</dt>
                    <dd className="text-sm text-gray-900 flex items-center flex-wrap gap-2">
                      <span className="font-mono">
                        {contactData.phone || contactData.whatsapp || '—'}
                      </span>
                      {telHref && (
                        <a
                          href={`tel:${telHref}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2"
                        >
                          <Phone size={12} />
                          <span>Llamar</span>
                        </a>
                      )}
                      {waDigits && (
                        <a
                          href={`https://wa.me/${waDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                        >
                          <WhatsappLogo size={13} weight="fill" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[13px] text-gray-500">Correo</dt>
                    <dd className="text-sm text-gray-900 break-all">
                      {contactData.email ? (
                        <a
                          href={`mailto:${contactData.email}`}
                          className="hover:underline"
                        >
                          {contactData.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[13px] text-gray-500">RUC o cédula</dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {contactData.taxId || '—'}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[13px] text-gray-500">
                      Municipio y departamento
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {[contactData.municipality, contactData.department]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </dd>
                  </div>

                  <div className="space-y-0.5 sm:col-span-2">
                    <dt className="text-[13px] text-gray-500">Dirección</dt>
                    <dd className="text-sm text-gray-900">
                      {contactData.address || '—'}
                    </dd>
                  </div>

                  <div className="space-y-0.5 sm:col-span-3">
                    <dt className="text-[13px] text-gray-500">Notas</dt>
                    <dd className="text-sm text-gray-700 whitespace-pre-line">
                      {contactData.notes || '—'}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {/* Productos contratados y No contratados */}
            <BusinessProductsSection
              businessId={business.id}
              businessName={business.name}
              accountType={accountType}
              businessType={business.businessType}
              businessCommissionRate={business.commissionRate}
              businessAltCommissionRate={business.altCommissionRate}
              businessAltCommissionDistanceKm={business.altCommissionDistanceKm}
              businessDispatchTimeoutMin={business.dispatchTimeoutMin}
              salonProfile={business.salonProfile}
              maxDevices={business.maxDevices}
              activeDevices={business.activeDevices}
              onRegisterPaymentClick={
                isNonBilling ? undefined : handleOpenRegisterPayment
              }
            />

            {/* Resumen de cuenta, Funciones y Equipos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resumen de cuenta */}
              <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900">
                      Resumen de cuenta
                    </h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Estado financiero, pagos y equipo instalado
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cobros')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 cursor-pointer shrink-0"
                  >
                    <span>Ver cobros</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <dt className="text-[13px] text-gray-500">Forma de venta</dt>
                    <dd className="text-sm font-semibold text-gray-900 mt-0.5">
                      {isNonBilling ? `Sin cobro (${accountTypeLabel.toLowerCase()})` : saleModalityLabel}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[13px] text-gray-500">Pagado</dt>
                    <dd className="text-sm font-semibold text-emerald-700 font-mono mt-0.5">
                      {accountStatement
                        ? formatCurrency(
                            accountStatement.totalPaid,
                            accountStatement.currency
                          )
                        : '$0.00'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[13px] text-gray-500">Saldo</dt>
                    <dd className="text-sm font-semibold text-gray-900 font-mono mt-0.5">
                      {accountStatement
                        ? formatCurrency(
                            accountStatement.balance,
                            accountStatement.currency
                          )
                        : '$0.00'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[13px] text-gray-500">Último pago</dt>
                    <dd className="text-sm text-gray-900 mt-0.5">
                      {lastValidPayment
                        ? `${formatDateShort(
                            lastValidPayment.paidAt
                          )} · ${formatCurrency(
                            lastValidPayment.amount,
                            lastValidPayment.currency
                          )}`
                        : 'Sin pagos'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[13px] text-gray-500">Mantenimiento</dt>
                    <dd className="text-sm text-gray-900 mt-0.5">
                      {maintenanceSummaryLabel}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[13px] text-gray-500">
                      Equipo entregado
                    </dt>
                    <dd className="text-sm text-gray-900 mt-0.5">
                      {equipmentDeliveredCount === 0
                        ? 'Ninguna pieza'
                        : `${equipmentDeliveredCount} ${
                            equipmentDeliveredCount === 1 ? 'pieza' : 'piezas'
                          }`}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Columna derecha: Funciones activas + Resumen de equipos */}
              <div className="space-y-6">
                {/* Funciones activas */}
                <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">
                        Funciones
                      </h3>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        Módulos y reglas operativas habilitadas
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('configuracion')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 cursor-pointer shrink-0"
                    >
                      <span>Configurar</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {activeFeatureTags.length > 0 ? (
                      activeFeatureTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200/80"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] text-gray-500">
                        Ninguna función adicional activa
                      </span>
                    )}
                  </div>
                </div>

                {/* Resumen de equipos */}
                <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">
                        Resumen de equipos
                      </h3>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        Uso actual de cupos por tipo de acceso
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('equipos')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 cursor-pointer shrink-0"
                    >
                      <span>Ver equipos</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-xs">
                    <div>
                      <p className="text-[13px] text-gray-500">Computadoras</p>
                      <p className="text-sm font-semibold text-gray-900 font-mono mt-0.5">
                        {deviceCounts.desktop} /{' '}
                        {isComputersUnlimited ? '∞' : maxComputers}
                      </p>
                    </div>
                    <div>
                      <p className="text-[13px] text-gray-500">Navegadores</p>
                      <p className="text-sm font-semibold text-gray-900 font-mono mt-0.5">
                        {deviceCounts.web} /{' '}
                        {maxWebAllowed === null ? '∞' : maxWebAllowed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[13px] text-gray-500">Teléfonos</p>
                      <p className="text-sm font-semibold text-gray-900 font-mono mt-0.5">
                        {deviceCounts.mobile} / {maxMobileAllowed}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actividad de entregas si tiene Delivery contratado */}
            {isDeliveryActive && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/70">
                  <div className="p-4 sm:p-5 space-y-1">
                    <p className="text-[13px] font-medium text-gray-500">
                      Pedidos hoy
                    </p>
                    <p className="text-lg font-semibold text-gray-900 font-mono">
                      {business.ordersToday}
                    </p>
                    <p className="text-[13px] text-gray-500">
                      Creados hoy por este negocio
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 space-y-1">
                    <p className="text-[13px] font-medium text-gray-500">
                      Pedidos este mes
                    </p>
                    <p className="text-lg font-semibold text-gray-900 font-mono">
                      {business.monthlyMetrics.ordersCreated}
                    </p>
                    <p className="text-[13px] text-gray-500">
                      {business.monthlyMetrics.ordersDelivered} entregados (
                      {business.monthlyMetrics.deliveryRate}%)
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 space-y-1">
                    <p className="text-[13px] font-medium text-gray-500">
                      Total histórico
                    </p>
                    <p className="text-lg font-semibold text-gray-900 font-mono">
                      {business._count?.orders ?? 0}
                    </p>
                    <p className="text-[13px] text-gray-500">
                      {business.monthlyMetrics.ordersCancelled} cancelados este
                      mes
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
                    <h3 className="text-[15px] font-semibold text-gray-900">
                      Repartidores vinculados ({business.riders.length})
                    </h3>
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {business.riders.map((r) => (
                        <div
                          key={r.id}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {r.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {r.vehicleType || 'Repartidor'}
                              {r.vehiclePlate ? ` · ${r.vehiclePlate}` : ''}
                            </p>
                          </div>
                          {r.phone && (
                            <span className="text-xs text-gray-600 font-mono shrink-0">
                              {r.phone}
                            </span>
                          )}
                        </div>
                      ))}
                      {business.riders.length === 0 && (
                        <p className="py-6 text-center text-[13px] text-gray-500">
                          Aún ningún repartidor tomó pedidos de este negocio.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-gray-900">
                        Últimos pedidos
                      </h3>
                      <span className="text-[13px] text-gray-500">
                        10 más recientes
                      </span>
                    </div>
                    <div className="overflow-x-auto border-t border-gray-100">
                      <table className="w-full text-left border-collapse text-xs min-w-[460px]">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                            <th className="py-2.5 px-2">Cliente</th>
                            <th className="py-2.5 px-2">Monto</th>
                            <th className="py-2.5 px-2">Fecha</th>
                            <th className="py-2.5 px-2 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {business.recentOrders.map((o) => {
                            const isDelivered = o.status === 'ENTREGADO';
                            const isCancelled = o.status === 'CANCELADO';
                            const isPending = o.status === 'PENDIENTE';
                            return (
                              <tr key={o.id}>
                                <td className="py-2.5 px-2">
                                  <p className="font-medium text-gray-900">
                                    {o.customerName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {o.customerPhone}
                                  </p>
                                </td>
                                <td className="py-2.5 px-2 font-mono font-semibold text-gray-900 whitespace-nowrap">
                                  C$ {Number(o.deliveryFee).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                                  {formatDateTime(o.createdAt)}
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  <Badge
                                    variant={
                                      isDelivered
                                        ? 'success'
                                        : isCancelled
                                        ? 'danger'
                                        : isPending
                                        ? 'warning'
                                        : 'neutral'
                                    }
                                    size="sm"
                                  >
                                    {o.status.charAt(0) +
                                      o.status.slice(1).toLowerCase()}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                          {business.recentOrders.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-6 text-center text-[13px] text-gray-500"
                              >
                                No hay pedidos registrados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ubicación en mapa si tiene coordenadas */}
            {business.latitude && business.longitude && (
              <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-3">
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Ubicación del negocio
                </h3>
                <div className="h-64 rounded-xl overflow-hidden border border-gray-200/80">
                  <div ref={mapContainer} className="w-full h-full" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            PESTAÑA 2: COBROS
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'cobros' && (
          <BusinessBillingTab
            business={business}
            billingInfo={billingInfo}
            memberships={memberships}
            accountStatement={accountStatement}
            onOpenRegisterPayment={() => handleOpenRegisterPayment(undefined)}
            onEditMembership={(m) => setMembershipToEdit(m)}
            onVoidMembership={handleOpenVoidModal}
            onOpenEditModel={openEditModelModal}
            onSelectProofUrl={(url) => setSelectedProofUrl(url)}
          />
        )}

        {/* ════════════════════════════════════════════════════════════════
            PESTAÑA 3: EQUIPOS Y ACCESOS
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'equipos' && (
          <BusinessPosDevicesSection business={business} />
        )}

        {/* ════════════════════════════════════════════════════════════════
            PESTAÑA 4: USUARIOS (N)
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'usuarios' && (
          <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Usuarios y cupo
                </h3>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  Cuentas con acceso al sistema, cupo incluido y plazas extra
                </p>
              </div>
              <button
                id="btn-add-biz-user"
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                disabled={
                  Boolean(
                    business.userUsage &&
                      business.userUsage.used >= business.userUsage.limit
                  )
                }
                className={`${btnSecondary} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={
                  business.userUsage &&
                  business.userUsage.used >= business.userUsage.limit
                    ? 'Límite de usuarios alcanzado'
                    : ''
                }
              >
                <Plus size={14} weight="bold" />
                <span>Agregar usuario</span>
              </button>
            </div>

            {business.userUsage && (
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      business.userUsage.used >= business.userUsage.limit
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {business.userUsage.used} de {business.userUsage.limit}{' '}
                    usuarios activos
                  </p>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    El cupo base es de {business.userUsage.base} usuarios. Cada
                    usuario extra se cobra aparte.
                  </p>
                  {business.userUsage.used >= business.userUsage.limit && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Este negocio alcanzó su cupo. Ampliá los cupos extra para
                      agregar otro usuario.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-gray-600 font-medium">
                    Extras:
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-16 h-9 px-2.5 border border-gray-300 rounded-lg text-xs focus:border-gray-900 focus:outline-none bg-white"
                    value={extraSlotsInput}
                    onChange={(e) => setExtraSlotsInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const extra = parseInt(extraSlotsInput, 10);
                      if (!isNaN(extra) && extra >= 0) {
                        if (
                          window.confirm(
                            `¿Confirmás actualizar los cupos extra a ${extra}?`
                          )
                        ) {
                          updateQuotaMutation.mutate({
                            id: business.id,
                            extraUserSlots: extra,
                          });
                        }
                      }
                    }}
                    disabled={
                      updateQuotaMutation.isPending ||
                      parseInt(extraSlotsInput, 10) === business.userUsage.extra
                    }
                    className={`${btnSecondary} disabled:opacity-50`}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {businessUsers.map((u) => {
                const roleLabel =
                  u.role === 'ENCARGADO'
                    ? 'Encargado'
                    : u.role === 'CAJERO'
                    ? 'Cajero'
                    : u.role === 'VENDEDOR'
                    ? 'Vendedor'
                    : u.role;

                return (
                  <div
                    key={u.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {u.name}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80">
                          {roleLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-4 gap-y-1 text-gray-500 mt-1 flex-wrap text-xs">
                        <span className="flex items-center gap-1 font-mono break-all sm:break-normal">
                          <EnvelopeSimple size={13} className="shrink-0" />
                          {u.email}
                        </span>
                        {u.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={13} className="shrink-0" />
                            {u.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <Badge
                        variant={u.isActive ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>

                      <div className="flex items-center gap-1.5 sm:ml-2 sm:border-l sm:border-gray-100 sm:pl-3">
                        <button
                          type="button"
                          onClick={() => setPasswordTargetUser(u)}
                          title="Cambiar contraseña"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <Key size={14} />
                          <span>Contraseña</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeactivateTargetUser(u)}
                          title={
                            u.isActive ? 'Bloquear usuario' : 'Activar usuario'
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            u.isActive
                              ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <Lock size={14} />
                              <span>Bloquear</span>
                            </>
                          ) : (
                            <>
                              <LockOpen size={14} />
                              <span>Activar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loadingBusinessUsers && businessUsers.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <p className="text-[13px] text-gray-500">
                    No hay usuarios registrados para este negocio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="text-xs text-gray-800 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Agregar el primer usuario
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            PESTAÑA 5: CONFIGURACIÓN
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'configuracion' && (
          <div className="space-y-6">
            {/* 1. Tipo de cuenta */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Tipo de cuenta
                </h3>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  Las demos y cuentas internas no cuentan en los ingresos, no se
                  cobran y no se bloquean.
                </p>
              </div>

              <div className="inline-flex flex-wrap items-center gap-2 pt-1">
                {(
                  [
                    { id: 'CLIENTE', label: 'Cliente' },
                    { id: 'DEMO', label: 'Demo' },
                    { id: 'INTERNO', label: 'Interno' },
                  ] as Array<{ id: BusinessAccountType; label: string }>
                ).map((opt) => {
                  const selected = accountType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => handleChangeAccountType(opt.id)}
                      className={`h-9 px-4 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                        selected
                          ? opt.id === 'CLIENTE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-gray-100 text-gray-900 border-gray-400'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Funciones como filas con interruptor */}
            <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-2">
              <div className="pb-2">
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Funciones
                </h3>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  Activá o desactivá módulos operativos y definí el perfil del
                  salón
                </p>
              </div>

              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {/* Lotes y vencimientos */}
                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Lotes y vencimientos
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Agrega número de lote y fecha de vencimiento a compras,
                      ventas, alertas y plantillas Excel.
                    </p>
                  </div>
                  <SwitchButton
                    checked={Boolean(business.tracksBatches)}
                    disabled={updateMutation.isPending}
                    label="Lotes y vencimientos"
                    onChange={() => {
                      if (business.tracksBatches) {
                        handleDeactivateBatchesClick();
                      } else {
                        setIsActivateBatchesModalOpen(true);
                      }
                    }}
                  />
                </div>

                {/* Precio de etiqueta */}
                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Precio de etiqueta
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Muestra precio de etiqueta y descuento en productos y
                      comprobantes.
                    </p>
                  </div>
                  <SwitchButton
                    checked={Boolean(business.useListPrice)}
                    disabled={updateMutation.isPending}
                    label="Precio de etiqueta"
                    onChange={handleToggleUseListPrice}
                  />
                </div>

                {/* Venta en dos pasos */}
                <div className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        Venta en dos pasos
                      </p>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        El vendedor arma la orden y la envía a caja; el cajero
                        la cobra.
                      </p>
                    </div>
                    <SwitchButton
                      checked={Boolean(business.twoStepSaleEnabled)}
                      disabled={updateMutation.isPending}
                      label="Venta en dos pasos"
                      onChange={handleToggleTwoStepSale}
                    />
                  </div>

                  {business.twoStepSaleEnabled && (
                    <div className="pl-0 sm:pl-4 border-l-2 border-gray-200 space-y-2.5 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-900">
                            Vencimiento del ticket
                          </p>
                          <p className="text-[13px] text-gray-500">
                            Los tickets no cobrados vencen después de este
                            tiempo.
                          </p>
                        </div>

                        {isEditingTtl ? (
                          <div className="flex items-center flex-wrap gap-2">
                            <input
                              type="number"
                              min={1}
                              max={72}
                              value={ttlInput}
                              onChange={(e) =>
                                setTtlInput(
                                  Math.max(
                                    1,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                )
                              }
                              className="w-20 h-8 px-2.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-gray-900"
                            />
                            <span className="text-xs text-gray-600">horas</span>
                            <button
                              type="button"
                              onClick={handleSaveTtl}
                              disabled={updateMutation.isPending}
                              className="h-8 px-3 text-xs font-semibold border border-gray-300 bg-white text-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTtlInput(
                                  business.twoStepTicketTtlHours || 4
                                );
                                setIsEditingTtl(false);
                              }}
                              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 font-mono">
                              {business.twoStepTicketTtlHours || 4} horas
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditingTtl(true)}
                              className="text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 cursor-pointer"
                            >
                              Cambiar
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-2 text-xs text-gray-600">
                        <Info
                          size={15}
                          className="text-orange-600 shrink-0 mt-0.5"
                          weight="fill"
                        />
                        <p className="text-[13px] text-gray-600">
                          Las computadoras de vendedores cuentan en el límite
                          del plan.
                          {business.twoStepMinVersion
                            ? ` Requiere el POS de escritorio versión ${business.twoStepMinVersion} o superior.`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Venta a domicilio */}
                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Venta a domicilio
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Habilita pedidos a domicilio, tarifa de envío y asignación
                      de repartidores.
                    </p>
                  </div>
                  <SwitchButton
                    checked={Boolean(business.deliveryChannelEnabled)}
                    disabled={updateMutation.isPending}
                    label="Venta a domicilio"
                    onChange={handleToggleDeliveryChannel}
                  />
                </div>

                {/* PedidosYa */}
                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      PedidosYa
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Habilita el canal de venta para órdenes recibidas desde
                      PedidosYa.
                    </p>
                  </div>
                  <SwitchButton
                    checked={Boolean(business.pedidosYaChannelEnabled)}
                    disabled={updateMutation.isPending}
                    label="PedidosYa"
                    onChange={handleTogglePedidosYaChannel}
                  />
                </div>

                {/* Perfil del salón */}
                <div className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        Perfil del salón
                      </p>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        Define si el punto de venta trabaja con mesas de
                        restaurante o con órdenes de taller.
                      </p>
                    </div>

                    {!isEditingSalonProfile ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-semibold text-gray-800">
                          {currentSalonProfile === 'TALLER'
                            ? 'Taller / órdenes'
                            : 'Restaurante / mesas'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingSalonProfile(true)}
                          className={btnSecondary}
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center flex-wrap gap-2 shrink-0">
                        <select
                          value={salonProfileDraft}
                          onChange={(e) =>
                            setSalonProfileDraft(
                              e.target.value as 'RESTAURANTE' | 'TALLER'
                            )
                          }
                          className="h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                        >
                          <option value="RESTAURANTE">
                            Restaurante / mesas
                          </option>
                          <option value="TALLER">Taller / órdenes</option>
                        </select>
                        <button
                          type="button"
                          disabled={updatePosSubMutation.isPending}
                          onClick={handleSaveSalonProfile}
                          className={btnSecondary}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSalonProfileDraft(currentSalonProfile);
                            setIsEditingSalonProfile(false);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-800 px-2 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Campos del catálogo */}
            <BusinessProductFieldsSection
              businessId={business.id}
              industryName={business.industry?.name}
              posVertical={productsData?.products?.POS?.posVertical || undefined}
            />

            {/* 4. Empresa y sucursales */}
            <BusinessOrganizationSection business={business} />

            {/* 5. Zona de peligro */}
            <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
              <div>
                <h3 className="text-[15px] font-semibold text-red-700">
                  Zona de peligro
                </h3>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  Acciones delicadas sobre el acceso y los datos permanentes del
                  negocio
                </p>
              </div>

              <div className="divide-y divide-gray-100 border-t border-gray-100">
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {business.isActive
                        ? 'Desactivar negocio'
                        : 'Activar negocio'}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      {business.isActive
                        ? 'Pausa temporalmente el acceso de los usuarios de este negocio sin borrar sus datos.'
                        : 'Restaura el acceso operativo para los usuarios de este negocio.'}
                    </p>
                  </div>

                  {business.isActive ? (
                    <button
                      type="button"
                      disabled={toggleMutation.isPending}
                      onClick={() => setIsDeactivateModalOpen(true)}
                      className="h-9 px-4 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-semibold text-red-600 transition-colors cursor-pointer shrink-0"
                    >
                      Desactivar negocio
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(business.id)}
                      className="h-9 px-4 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-xs font-semibold text-emerald-700 transition-colors cursor-pointer shrink-0"
                    >
                      Activar negocio
                    </button>
                  )}
                </div>

                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Eliminar definitivamente
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Borra de forma permanente usuarios, productos, ventas y
                      configuraciones asociadas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <Trash size={14} />
                    <span>Eliminar definitivamente</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODALES
         ════════════════════════════════════════════════════════════════ */}
      <RegisterMembershipModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setRegisterModalInitialProductType(undefined);
        }}
        businessId={business.id}
        businessName={business.name}
        businessType={business.businessType}
        initialSelectedProductType={registerModalInitialProductType}
      />

      <EditMembershipModal
        isOpen={Boolean(membershipToEdit)}
        onClose={() => setMembershipToEdit(null)}
        membership={membershipToEdit}
        businessId={business.id}
        businessName={business.name}
      />

      <DeactivateBusinessModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
        onConfirm={handleDeactivateConfirm}
        isLoading={toggleMutation.isPending}
      />

      <ImageViewerModal
        isOpen={Boolean(selectedProofUrl)}
        onClose={() => setSelectedProofUrl(null)}
        imageUrl={selectedProofUrl}
        title={`Comprobante de pago — ${business.name}`}
      />

      {/* Modal para anular pago de membresía */}
      <Modal
        isOpen={Boolean(membershipToVoid)}
        onClose={() => setMembershipToVoid(null)}
        title="Anular pago de membresía"
        subtitle={business.name ? `Negocio: ${business.name}` : undefined}
        maxWidth="max-w-md"
      >
        {membershipToVoid && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Período:</span>
                <span className="font-medium text-gray-900">
                  {
                    getMembershipPeriodDates(
                      membershipToVoid,
                      billingInfo.anchorDay
                    ).periodStr
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Monto:</span>
                <span className="font-semibold text-gray-900">
                  ${Number(membershipToVoid.amount).toFixed(2)}{' '}
                  {membershipToVoid.currency}
                </span>
              </div>
              {membershipToVoid.paidAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Fecha de pago:</span>
                  <span className="text-gray-700">
                    {formatDateShort(membershipToVoid.paidAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
              <Warning
                size={18}
                weight="fill"
                className="text-amber-600 shrink-0 mt-0.5"
              />
              <p className="leading-relaxed">
                Esta membresía dejará de contar para la vigencia. No se borra:
                queda en el historial como anulada.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Motivo de anulación <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Ej.: Pago duplicado al registrar transferencia…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors resize-none"
              />
              <span className="text-xs text-gray-400 mt-1 block">
                Mínimo 5 caracteres ({voidReason.trim().length}/5)
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setMembershipToVoid(null)}
                disabled={voidMembershipMutation.isPending}
                className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={
                  voidReason.trim().length < 5 ||
                  voidMembershipMutation.isPending
                }
                className="h-10 flex items-center justify-center gap-1.5 px-4 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Prohibit size={14} weight="bold" />
                <span>
                  {voidMembershipMutation.isPending
                    ? 'Anulando…'
                    : 'Confirmar anulación'}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Configurar modelo de negocio */}
      <Modal
        isOpen={isEditModelModalOpen}
        onClose={() => setIsEditModelModalOpen(false)}
        title="Configurar modelo de negocio"
        subtitle={`Definí si ${business.name} opera como comercio común o empresa de riders`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveModel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Modelo de negocio *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setModelBusinessType('NEGOCIO')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                  modelBusinessType === 'NEGOCIO'
                    ? 'border-gray-900 bg-gray-50/70'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div
                    className={`p-2 rounded-lg ${
                      modelBusinessType === 'NEGOCIO'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Storefront size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">
                      Negocio común
                    </p>
                    <p className="text-xs text-gray-500">
                      Membresía o pago único
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-tight">
                  Restaurantes, farmacias o comercios tradicionales.
                </p>
              </div>

              <div
                onClick={() => setModelBusinessType('EMPRESA_RIDERS')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                  modelBusinessType === 'EMPRESA_RIDERS'
                    ? 'border-gray-900 bg-gray-50/70'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div
                    className={`p-2 rounded-lg ${
                      modelBusinessType === 'EMPRESA_RIDERS'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Motorcycle size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">
                      Empresa de riders
                    </p>
                    <p className="text-xs text-gray-500">
                      Liquidación por comisión
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-tight">
                  Agencia de delivery que liquida comisiones por envío.
                </p>
              </div>
            </div>
          </div>

          {modelBusinessType === 'EMPRESA_RIDERS' && (
            <div className="border border-gray-200 rounded-xl p-3.5 space-y-3">
              <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                <Coins size={15} className="text-amber-700" />
                <span>Configuración de comisiones y despacho</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Comisión base (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={modelCommissionRate}
                    onChange={(e) => setModelCommissionRate(e.target.value)}
                    placeholder="15"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Comisión distancia larga (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={modelAltCommissionRate}
                    onChange={(e) => setModelAltCommissionRate(e.target.value)}
                    placeholder="12"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Umbral distancia (km)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={modelAltCommissionDistanceKm}
                    onChange={(e) =>
                      setModelAltCommissionDistanceKm(e.target.value)
                    }
                    placeholder="40"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tiempo de despacho (min)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={modelDispatchTimeoutMin}
                    onChange={(e) => setModelDispatchTimeoutMin(e.target.value)}
                    placeholder="3"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEditModelModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      <CreateSuperAdminUserModal
        isOpen={isAddUserModalOpen}
        presetBusinessId={business.id}
        presetBusinessName={business.name}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={(newUser, initialPass) => {
          setIsAddUserModalOpen(false);
          setCreatedUser(newUser);
          setCreatedUserPassword(initialPass);
        }}
      />

      <UserPasswordModal
        isOpen={Boolean(createdUser && createdUserPassword)}
        user={createdUser}
        password={createdUserPassword}
        onClose={() => {
          setCreatedUser(null);
          setCreatedUserPassword(null);
        }}
      />

      <ChangeUserPasswordModal
        isOpen={Boolean(passwordTargetUser)}
        user={passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
      />

      <DeactivateUserModal
        isOpen={Boolean(deactivateTargetUser)}
        user={deactivateTargetUser}
        isOnlyActiveEncargado={isTargetOnlyActiveEncargado}
        onClose={() => setDeactivateTargetUser(null)}
      />

      <EditBusinessModal
        isOpen={isEditDataModalOpen}
        onClose={() => setIsEditDataModalOpen(false)}
        business={business}
      />

      <DeleteBusinessModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
        onSuccess={() => navigate('/businesses')}
      />

      {/* Modal confirmar activación de lotes */}
      {isActivateBatchesModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsActivateBatchesModalOpen(false)}
          title="Activar control de lotes y vencimientos"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Agrega número de lote y fecha de vencimiento a compras, ventas,
              alertas y a la plantilla Excel de este negocio, con rotación FEFO.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsActivateBatchesModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmActivateBatches}
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Activando…' : 'Confirmar y activar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal confirmación de desactivación con lotes activos */}
      {isDeactivateBatchesModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsDeactivateBatchesModalOpen(false);
            setDeactivateBatchesError(null);
          }}
          title="Confirmar desactivación de lotes"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <Warning size={20} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">
                  {deactivateBatchesError ||
                    'El negocio tiene lotes con existencias activas.'}
                </p>
                <p className="text-amber-800">
                  Al desactivar el control de lotes, los productos dejarán de
                  descontar existencias por lote y los vencimientos no se
                  validarán en ventas ni compras.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              ¿Confirmás desactivar el control de lotes y vencimientos para{' '}
              <strong>{business.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeactivateBatchesModalOpen(false);
                  setDeactivateBatchesError(null);
                }}
                className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivateBatchesWithConfirm}
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending
                  ? 'Desactivando…'
                  : 'Confirmar y desactivar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
