import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  MagnifyingGlass,
  CircleNotch,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import apiClient from '../../lib/apiClient';
import { Modal } from '../ui/Modal';
import { useCreateBusiness } from '../../hooks/useBusinesses';
import { useIndustries } from '../../hooks/useIndustries';
import {
  useCommercialPricingConfig,
  type CommercialSaleModality,
  type CommercialPaymentType,
  type CommercialEquipmentType,
  SALE_MODALITY_LABELS,
} from '../../hooks/useCommercial';

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatShortDate(input: Date | string): string {
  let d: Date;
  if (typeof input === 'string') {
    const [y, m, day] = input.split('-').map(Number);
    if (!y || !m || !day) return input;
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = input;
  }
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'OTRO', label: 'Otro' },
];

interface CreateBusinessWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credentials: { businessName: string; email: string; password?: string }) => void;
}

interface EquipmentPieceItem {
  id: string;
  equipmentType: CommercialEquipmentType;
  name: string;
  selected: boolean;
  price?: number;
  serialNumber?: string;
  brand?: string;
  model?: string;
}

const DEFAULT_COMBO_PIECES: Array<{ equipmentType: CommercialEquipmentType; name: string }> = [
  { equipmentType: 'COMPUTADORA', name: 'Computadora con Windows' },
  { equipmentType: 'MONITOR', name: 'Monitor 19" o superior' },
  { equipmentType: 'TECLADO', name: 'Teclado y mouse USB' },
  { equipmentType: 'IMPRESORA_TERMICA', name: 'Impresora térmica 80 mm' },
  { equipmentType: 'GAVETA_DINERO', name: 'Gaveta de dinero' },
  { equipmentType: 'LECTOR_BARRA', name: 'Lector de código de barras USB' },
  { equipmentType: 'OTRO', name: 'Rollos de papel térmico' },
];

export const CreateBusinessWizardModal: React.FC<CreateBusinessWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const createMutation = useCreateBusiness();
  const { data: industries = [] } = useIndustries();
  const { data: pricingConfig } = useCommercialPricingConfig();
  const activeIndustries = useMemo(() => industries.filter((i) => i.isActive), [industries]);

  // Paso actual (1 a 5)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // ── Paso 1: Negocio ──
  const [name, setName] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const [posVertical, setPosVertical] = useState<'RESTAURANTE' | 'RETAIL'>('RESTAURANTE');
  const [salonProfile, setSalonProfile] = useState<'RESTAURANTE' | 'TALLER'>('RESTAURANTE');
  const [showAdvancedProfile, setShowAdvancedProfile] = useState(false);

  // ── Paso 2: Productos contratados y opciones ──
  const [hasPOS, setHasPOS] = useState(true);
  const [posMonthlyFee, setPosMonthlyFee] = useState('45');
  const [hasCarteraCobro, setHasCarteraCobro] = useState(false);
  const [carteraMonthlyFee, setCarteraMonthlyFee] = useState('30');
  const [hasCitas, setHasCitas] = useState(false);
  const [citasMonthlyFee, setCitasMonthlyFee] = useState('25');
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryMonthlyFee, setDeliveryMonthlyFee] = useState('35');

  // Opciones
  const [tracksBatches, setTracksBatches] = useState(false);
  const [useListPrice, setUseListPrice] = useState(false);

  // ── Paso 3: Forma de venta (302a/302b) ──
  const [saleModality, setSaleModality] = useState<CommercialSaleModality>('MEMBRESIA_MENSUAL');

  // Sub-opciones de Membresía mensual
  const [startType, setStartType] = useState<'TRIAL' | 'PAID'>('TRIAL');
  const [trialUnit, setTrialUnit] = useState<'HOURS' | 'DAYS'>('HOURS');
  const trialHoursPreset = 24;
  const trialDaysPreset = 15;
  const [customTrialDuration, setCustomTrialDuration] = useState('');

  // Pago inicial membresía
  const [initialPaidAmount, setInitialPaidAmount] = useState('45');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('TRANSFERENCIA');
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [initialPaidAt, setInitialPaidAt] = useState(todayIso);
  const [initialProofFile, setInitialProofFile] = useState<File | null>(null);

  // Sub-opciones de Pago Único / Combo
  const [commercialTotalPrice, setCommercialTotalPrice] = useState('800');
  const [commercialCurrency, setCommercialCurrency] = useState<'USD' | 'NIO'>('USD');
  const [commercialPaymentType, setCommercialPaymentType] = useState<CommercialPaymentType>('CONTADO');
  const [commercialDownPayment, setCommercialDownPayment] = useState('400');
  const [commercialInstallmentsCount, setCommercialInstallmentsCount] = useState<number>(4);

  // Pago recibido hoy para acuerdo comercial
  const [commercialPaidTodayAmount, setCommercialPaidTodayAmount] = useState('800');
  const [commercialPaymentMethod, setCommercialPaymentMethod] = useState('TRANSFERENCIA');
  const [commercialPaidAt, setCommercialPaidAt] = useState(todayIso);
  const [commercialReferenceNumber, setCommercialReferenceNumber] = useState('');

  // Equipos entregados
  const [comboPieces, setComboPieces] = useState<EquipmentPieceItem[]>(
    DEFAULT_COMBO_PIECES.map((p, idx) => ({
      id: `piece-${idx}`,
      equipmentType: p.equipmentType,
      name: p.name,
      selected: true,
      serialNumber: '',
    }))
  );

  // Piezas en combo parcial
  const [partialPieces, setPartialPieces] = useState<EquipmentPieceItem[]>([
    { id: 'part-1', equipmentType: 'COMPUTADORA', name: 'Computadora', selected: true, price: 280, serialNumber: '' },
    { id: 'part-2', equipmentType: 'IMPRESORA_TERMICA', name: 'Impresora térmica 80 mm', selected: true, price: 140, serialNumber: '' },
    { id: 'part-3', equipmentType: 'GAVETA_DINERO', name: 'Gaveta de dinero', selected: true, price: 70, serialNumber: '' },
  ]);

  // Mantenimiento comercial
  const [maintenanceFreeMonths, setMaintenanceFreeMonths] = useState<number>(12);
  const [maintenanceMonthlyNio, setMaintenanceMonthlyNio] = useState<number>(555);
  const [showEditMaintenance, setShowEditMaintenance] = useState(false);

  // ── Paso 4: Equipos y accesos ──
  const [maxDevices, setMaxDevices] = useState('1');
  const [isUnlimitedDevices, setIsUnlimitedDevices] = useState(false);
  const [maxMobileDevices, setMaxMobileDevices] = useState('0');
  const [webAdminEnabled, setWebAdminEnabled] = useState(true);
  const [webBillingEnabled, setWebBillingEnabled] = useState(false);
  const [maxWebDevices, setMaxWebDevices] = useState('2');
  const [isUnlimitedWebDevices, setIsUnlimitedWebDevices] = useState(false);
  const [webBillingMonthlyUsd, setWebBillingMonthlyUsd] = useState('');

  // ── Paso 5: Encargado y confirmación ──
  const [encargadoName, setEncargadoName] = useState('');
  const [encargadoEmail, setEncargadoEmail] = useState('');
  const [encargadoPassword, setEncargadoPassword] = useState('');

  // Errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rubro seleccionado
  const selectedIndustry = useMemo(
    () => industries.find((i) => i.id === industryId) || null,
    [industries, industryId]
  );

  const filteredIndustries = useMemo(() => {
    if (!industrySearch.trim()) return activeIndustries;
    const term = industrySearch.toLowerCase();
    return activeIndustries.filter((i) => i.name.toLowerCase().includes(term));
  }, [activeIndustries, industrySearch]);

  // Actualizar valores sugeridos al seleccionar rubro o cargar pricing config
  useEffect(() => {
    if (selectedIndustry) {
      if (selectedIndustry.posVertical) {
        setPosVertical(selectedIndustry.posVertical);
      }
      const isTaller =
        selectedIndustry.code === 'taller' ||
        selectedIndustry.name.toLowerCase().includes('taller');
      setSalonProfile(isTaller ? 'TALLER' : 'RESTAURANTE');
      if (selectedIndustry.tracksBatches || selectedIndustry.code === 'farmacia') {
        setTracksBatches(true);
      }
      if (selectedIndustry.code === 'farmacia') {
        setUseListPrice(true);
      }
    }
  }, [selectedIndustry]);

  // Sincronizar precios sugeridos de pricing config
  useEffect(() => {
    if (pricingConfig) {
      if (saleModality === 'PAGO_UNICO_SISTEMA') {
        setCommercialTotalPrice(String(pricingConfig.soloSistemaPriceUsd ?? 380));
      } else if (saleModality === 'COMBO_COMPLETO') {
        setCommercialTotalPrice(String(pricingConfig.comboCompletoPriceUsd ?? 800));
      }
      if (pricingConfig.maintenanceMonthlyNio) {
        setMaintenanceMonthlyNio(pricingConfig.maintenanceMonthlyNio);
      }
      if (pricingConfig.maintenanceFreeMonths) {
        setMaintenanceFreeMonths(pricingConfig.maintenanceFreeMonths);
      }
    }
  }, [pricingConfig, saleModality]);

  // Recalcular total mensual de membresía
  const totalMonthlyFee = useMemo(() => {
    let sum = 0;
    if (hasPOS) sum += Number(posMonthlyFee) || 0;
    if (hasCarteraCobro) sum += Number(carteraMonthlyFee) || 0;
    if (hasCitas) sum += Number(citasMonthlyFee) || 0;
    if (hasDelivery) sum += Number(deliveryMonthlyFee) || 0;
    return sum;
  }, [hasPOS, posMonthlyFee, hasCarteraCobro, carteraMonthlyFee, hasCitas, citasMonthlyFee, hasDelivery, deliveryMonthlyFee]);

  // Sincronizar pago inicial membresía con la tarifa mensual
  useEffect(() => {
    if (saleModality === 'MEMBRESIA_MENSUAL' && totalMonthlyFee > 0) {
      setInitialPaidAmount(totalMonthlyFee.toFixed(2));
    }
  }, [totalMonthlyFee, saleModality]);

  // Sincronizar prima al cambiar precio total en crédito
  useEffect(() => {
    if (commercialPaymentType === 'CREDITO') {
      const tot = Number(commercialTotalPrice) || 0;
      const downPct = pricingConfig?.defaultCreditDownPaymentPct ?? 50;
      const down = Math.round((tot * (downPct / 100)) * 100) / 100;
      setCommercialDownPayment(String(down));
      setCommercialPaidTodayAmount(String(down));
    } else {
      setCommercialPaidTodayAmount(commercialTotalPrice);
    }
  }, [commercialTotalPrice, commercialPaymentType, pricingConfig]);

  // Sincronizar precio en combo parcial con la suma de piezas
  const partialPiecesSum = useMemo(() => {
    return partialPieces
      .filter((p) => p.selected)
      .reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  }, [partialPieces]);

  useEffect(() => {
    if (saleModality === 'COMBO_PARCIAL') {
      setCommercialTotalPrice(String(partialPiecesSum));
    }
  }, [saleModality, partialPiecesSum]);

  // Calendario de cuotas calculado
  const installmentSchedule = useMemo(() => {
    if (commercialPaymentType !== 'CREDITO') return [];
    const tot = Number(commercialTotalPrice) || 0;
    const down = Number(commercialDownPayment) || 0;
    const financed = Math.max(0, tot - down);
    const count = commercialInstallmentsCount || 1;
    const totalCents = Math.round(financed * 100);
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents - baseCents * count;

    const schedule = [];
    const today = new Date();
    for (let k = 1; k <= count; k++) {
      const instCents = k === count ? baseCents + remainder : baseCents;
      const dueDate = addMonths(today, k);
      schedule.push({
        number: k,
        dueDateStr: formatShortDate(dueDate),
        amount: (instCents / 100).toFixed(2),
      });
    }
    return schedule;
  }, [commercialPaymentType, commercialTotalPrice, commercialDownPayment, commercialInstallmentsCount]);

  // Fecha en que inicia el cobro de mantenimiento (mes 13)
  const maintenanceStartDateStr = useMemo(() => {
    const today = new Date();
    const startDate = addMonths(today, maintenanceFreeMonths);
    return formatShortDate(startDate);
  }, [maintenanceFreeMonths]);

  // Duración efectiva de la prueba
  const effectiveTrialHours = useMemo(() => {
    if (trialUnit === 'HOURS') {
      const v = customTrialDuration.trim() ? parseInt(customTrialDuration, 10) : trialHoursPreset;
      return v > 0 ? v : 24;
    } else {
      const d = customTrialDuration.trim() ? parseInt(customTrialDuration, 10) : trialDaysPreset;
      return (d > 0 ? d : 15) * 24;
    }
  }, [trialUnit, customTrialDuration, trialHoursPreset, trialDaysPreset]);

  // Validación de pasos
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!name.trim()) newErrors.name = 'Ingresá el nombre del negocio.';
      if (!industryId) newErrors.industryId = 'Seleccioná el tipo de negocio.';
    }

    if (step === 2) {
      if (!hasPOS && !hasCarteraCobro && !hasCitas && !hasDelivery) {
        newErrors.products = 'Marcá al menos un producto para el negocio.';
      }
      if (hasPOS && (!posMonthlyFee || Number(posMonthlyFee) < 0)) {
        newErrors.posMonthlyFee = 'Ingresá una tarifa válida para POS.';
      }
      if (hasCarteraCobro && (!carteraMonthlyFee || Number(carteraMonthlyFee) < 0)) {
        newErrors.carteraMonthlyFee = 'Ingresá una tarifa válida para Finanzas.';
      }
    }

    if (step === 3) {
      if (saleModality === 'MEMBRESIA_MENSUAL') {
        if (startType === 'PAID') {
          const amt = Number(initialPaidAmount);
          if (isNaN(amt) || amt <= 0) {
            newErrors.initialPaidAmount = 'Ingresá un monto mayor a 0.';
          }
          if (!initialPaidAt) {
            newErrors.initialPaidAt = 'Indicá la fecha del pago recibido.';
          }
        }
      } else {
        const tot = Number(commercialTotalPrice);
        if (isNaN(tot) || tot <= 0) {
          newErrors.commercialTotalPrice = 'Ingresá un precio total mayor a 0.';
        }
        if (commercialPaymentType === 'CREDITO') {
          const down = Number(commercialDownPayment);
          if (isNaN(down) || down < 0 || down >= tot) {
            newErrors.commercialDownPayment = 'La prima debe ser menor al total y mayor a 0.';
          }
        }
        const paidToday = Number(commercialPaidTodayAmount);
        if (isNaN(paidToday) || paidToday <= 0) {
          newErrors.commercialPaidTodayAmount = 'Ingresá el monto recibido hoy (mayor a 0).';
        }
      }
    }

    if (step === 4) {
      if (!isUnlimitedDevices) {
        const dev = parseInt(maxDevices, 10);
        if (isNaN(dev) || dev < 1) newErrors.maxDevices = 'Ingresá al menos 1 computadora autorizada.';
      }
      if (webBillingEnabled && !webAdminEnabled) {
        newErrors.webBilling = 'La facturación web requiere que el acceso a la web admin esté habilitado.';
      }
    }

    if (step === 5) {
      if (!encargadoName.trim()) newErrors.encargadoName = 'Ingresá el nombre del encargado.';
      if (!encargadoEmail.trim()) {
        newErrors.encargadoEmail = 'Ingresá el correo del encargado.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(encargadoEmail.trim())) {
        newErrors.encargadoEmail = 'Ingresá un correo electrónico válido.';
      }
      if (!encargadoPassword) {
        newErrors.encargadoPassword = 'Creá una contraseña temporal.';
      } else if (encargadoPassword.length < 6) {
        newErrors.encargadoPassword = 'La contraseña debe tener al menos 6 caracteres.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(5, prev + 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4 | 5);
  };

  // Guardar negocio
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    try {
      const isOneTime = saleModality !== 'MEMBRESIA_MENSUAL';

      let commercialPayload = undefined;
      if (isOneTime) {
        const tot = Number(commercialTotalPrice);
        const isCred = commercialPaymentType === 'CREDITO';
        const down = isCred ? Number(commercialDownPayment) : tot;

        const piecesToSend =
          saleModality === 'COMBO_COMPLETO'
            ? comboPieces.filter((p) => p.selected)
            : saleModality === 'COMBO_PARCIAL'
            ? partialPieces.filter((p) => p.selected)
            : [];

        commercialPayload = {
          saleModality,
          paymentType: commercialPaymentType,
          totalPrice: tot,
          downPayment: down,
          currency: commercialCurrency,
          installmentsCount: isCred ? commercialInstallmentsCount : 0,
          maintenanceFreeMonths,
          maintenanceFeeNio: maintenanceMonthlyNio,
          equipment: piecesToSend.map((p) => ({
            equipmentType: p.equipmentType,
            name: p.name,
            brand: p.brand || 'Genérica',
            model: p.model || 'POS',
            serialNumber: p.serialNumber?.trim() || undefined,
            price: p.price !== undefined ? Number(p.price) : undefined,
            status: 'ENTREGADO',
          })),
          initialPayment: Number(commercialPaidTodayAmount) > 0 ? {
            kind: isCred ? 'PRIMA' : 'PAGO',
            amount: Number(commercialPaidTodayAmount),
            currency: commercialCurrency,
            paymentMethod: commercialPaymentMethod,
            paidAt: commercialPaidAt,
            referenceNumber: commercialReferenceNumber || undefined,
          } : undefined,
        };
      }

      const input: any = {
        name: name.trim(),
        industryId: selectedIndustry?.id || undefined,
        type: selectedIndustry?.name || undefined,
        hasPOS,
        posMonthlyFee: hasPOS ? Number(posMonthlyFee) : undefined,
        hasCarteraCobro,
        carteraMonthlyFee: hasCarteraCobro ? Number(carteraMonthlyFee) : undefined,
        hasCitas,
        citasMonthlyFee: hasCitas ? Number(citasMonthlyFee) : undefined,
        hasDelivery,
        deliveryMonthlyFee: hasDelivery ? Number(deliveryMonthlyFee) : undefined,
        tracksBatches,
        useListPrice,
        posVertical,
        salonProfile,
        maxDevices: isUnlimitedDevices ? null : Number(maxDevices),
        maxMobileDevices: Number(maxMobileDevices) || 0,
        webAdminEnabled,
        webBillingEnabled,
        maxWebDevices: isUnlimitedWebDevices ? null : Number(maxWebDevices),
        webBillingMonthlyUsd: webBillingEnabled && webBillingMonthlyUsd ? Number(webBillingMonthlyUsd) : null,
        saleModality,
        commercial: commercialPayload,
        startType: !isOneTime ? startType : undefined,
        trialHours: !isOneTime && startType === 'TRIAL' ? effectiveTrialHours : null,
        trialDays: !isOneTime && startType === 'TRIAL' ? Math.max(1, Math.round(effectiveTrialHours / 24)) : undefined,
        firstPayment:
          !isOneTime && startType === 'PAID'
            ? {
                amount: Number(initialPaidAmount),
                paymentMethod: initialPaymentMethod,
                paidAt: initialPaidAt,
              }
            : undefined,
        encargado: {
          name: encargadoName.trim(),
          email: encargadoEmail.trim(),
          password: encargadoPassword,
        },
      };

      const result = await createMutation.mutateAsync(input);

      // Si subió comprobante inicial, intentamos enviarlo
      const createdBizId = result?.business?.id;
      if (initialProofFile && createdBizId && result?.membership?.id) {
        try {
          const formData = new FormData();
          formData.append('file', initialProofFile);
          await apiClient.post(
            `/superadmin/memberships/${result.membership.id}/proof`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } catch {
          // Ya se creó el negocio; el comprobante no bloquea
        }
      }

      onSuccess({
        businessName: name.trim(),
        email: encargadoEmail.trim(),
        password: encargadoPassword,
      });
      onClose();
    } catch {
      // Manejado en mutación
    }
  };

  const stepsList = [
    { num: 1, title: 'Negocio' },
    { num: 2, title: 'Productos' },
    { num: 3, title: 'Forma de venta' },
    { num: 4, title: 'Equipos y accesos' },
    { num: 5, title: 'Encargado y resumen' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear nuevo negocio"
      subtitle={`Paso ${currentStep} de 5: ${stepsList[currentStep - 1].title}`}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Atrás</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Siguiente</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  <span>Creando negocio...</span>
                </>
              ) : (
                <span>
                  {saleModality === 'MEMBRESIA_MENSUAL' && startType === 'PAID'
                    ? 'Crear negocio y registrar pago'
                    : saleModality !== 'MEMBRESIA_MENSUAL' && Number(commercialPaidTodayAmount) > 0
                    ? 'Crear negocio y registrar pago'
                    : 'Crear negocio'}
                </span>
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stepper limpio en una sola línea */}
        <div className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {stepsList.map((s, idx) => {
              const isCurrent = currentStep === s.num;
              const isPassed = currentStep > s.num;
              return (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                        isCurrent
                          ? 'bg-purple-700 text-white'
                          : isPassed
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isPassed ? <Check size={11} weight="bold" /> : s.num}
                    </span>
                    <span
                      className={`text-xs ${
                        isCurrent
                          ? 'font-bold text-gray-900'
                          : isPassed
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < stepsList.length - 1 && (
                    <span className="text-gray-300 shrink-0">·</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Cuerpo del formulario: una sola superficie blanca */}
        <div className="space-y-6">
          {/* ═══════════════════════════════════════════════ */}
          {/* PASO 1: NEGOCIO */}
          {/* ═══════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre del negocio *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Ej. Farmacia San Rafael, Taller Central, Café París"
                  className={`w-full h-10 px-3 rounded-lg border text-xs bg-white text-gray-900 focus:outline-none focus:border-purple-600 ${
                    errors.name ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-300'
                  }`}
                  autoFocus
                />
                {errors.name ? (
                  <p className="text-xs text-rose-600 mt-1">{errors.name}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Nombre comercial con el que se identifica el local.</p>
                )}
              </div>

              {/* Selector de rubro / tipo */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tipo o rubro de negocio *
                </label>

                {!selectedIndustry ? (
                  <div>
                    <div className="relative">
                      <MagnifyingGlass
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={industrySearch}
                        onChange={(e) => {
                          setIndustrySearch(e.target.value);
                          setIsIndustryDropdownOpen(true);
                        }}
                        onFocus={() => setIsIndustryDropdownOpen(true)}
                        placeholder="Buscá un rubro: Farmacia, Taller, Restaurante, Ferretería..."
                        className={`w-full h-10 pl-9 pr-3 rounded-lg border text-xs bg-white text-gray-900 focus:outline-none focus:border-purple-600 ${
                          errors.industryId ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.industryId && (
                      <p className="text-xs text-rose-600 mt-1">{errors.industryId}</p>
                    )}

                    {isIndustryDropdownOpen && (
                      <div className="mt-1.5 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100">
                        {filteredIndustries.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center">
                            No se encontraron rubros con esa búsqueda.
                          </div>
                        ) : (
                          filteredIndustries.map((ind) => (
                            <button
                              key={ind.id}
                              type="button"
                              onClick={() => {
                                setIndustryId(ind.id);
                                setIsIndustryDropdownOpen(false);
                                setIndustrySearch('');
                                if (errors.industryId) {
                                  setErrors((prev) => ({ ...prev, industryId: '' }));
                                }
                              }}
                              className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <span className="text-xs font-semibold text-gray-900 block">
                                  {ind.name}
                                </span>
                                <span className="text-xs text-gray-500 block">
                                  {ind.posVertical === 'RESTAURANTE' ? 'Restaurante / mesas' : 'Retail / mostrador'}
                                </span>
                              </div>
                              <span className="text-xs text-purple-700 font-medium">Elegir</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            {selectedIndustry.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            · {selectedIndustry.posVertical === 'RESTAURANTE' ? 'Mesas y comandas' : 'Punto de venta mostrador (Retail)'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Configuración base aplicada
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIndustryId('');
                          setIsIndustryDropdownOpen(true);
                        }}
                        className="text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer underline underline-offset-2"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ajuste de perfil de salón (discreto) */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdvancedProfile(!showAdvancedProfile)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                >
                  {showAdvancedProfile ? 'Ocultar ajuste de perfil' : 'Personalizar perfil del local (opcional)'}
                </button>

                {showAdvancedProfile && (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 cursor-pointer">
                      <input
                        type="radio"
                        name="salonProfileRadio"
                        checked={salonProfile === 'RESTAURANTE'}
                        onChange={() => setSalonProfile('RESTAURANTE')}
                        className="text-purple-700 focus:ring-purple-600"
                      />
                      <span className="text-xs font-semibold text-gray-900">
                        Restaurante / mesas
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 cursor-pointer">
                      <input
                        type="radio"
                        name="salonProfileRadio"
                        checked={salonProfile === 'TALLER'}
                        onChange={() => setSalonProfile('TALLER')}
                        className="text-purple-700 focus:ring-purple-600"
                      />
                      <span className="text-xs font-semibold text-gray-900">
                        Taller / órdenes de trabajo
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* PASO 2: PRODUCTOS */}
          {/* ═══════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Productos a contratar
                </h3>
                {errors.products && (
                  <p className="text-xs text-rose-600 mb-2">{errors.products}</p>
                )}

                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                  {/* Fila POS */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasPOS}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setHasPOS(next);
                          if (next && !posMonthlyFee) setPosMonthlyFee('45');
                          if (errors.products) setErrors((prev) => ({ ...prev, products: '' }));
                        }}
                        className="mt-0.5 rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Sistema POS
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Punto de venta para computadoras, navegadores y app móvil
                        </span>
                      </div>
                    </label>

                    {hasPOS && (
                      <div className="flex items-center gap-2 self-end sm:self-auto pl-6 sm:pl-0">
                        <span className="text-xs text-gray-600 whitespace-nowrap">Tarifa mensual: US$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={posMonthlyFee}
                          onChange={(e) => setPosMonthlyFee(e.target.value)}
                          className="w-24 h-8 px-2 rounded-lg border border-gray-300 text-xs font-semibold bg-white text-gray-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fila Finanzas */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasCarteraCobro}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setHasCarteraCobro(next);
                          if (next && !carteraMonthlyFee) setCarteraMonthlyFee('30');
                          if (errors.products) setErrors((prev) => ({ ...prev, products: '' }));
                        }}
                        className="mt-0.5 rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Finanzas
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Cuentas por pagar, compras, gastos y cartera de crédito
                        </span>
                      </div>
                    </label>

                    {hasCarteraCobro && (
                      <div className="flex items-center gap-2 self-end sm:self-auto pl-6 sm:pl-0">
                        <span className="text-xs text-gray-600 whitespace-nowrap">Tarifa mensual: US$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={carteraMonthlyFee}
                          onChange={(e) => setCarteraMonthlyFee(e.target.value)}
                          className="w-24 h-8 px-2 rounded-lg border border-gray-300 text-xs font-semibold bg-white text-gray-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fila Citas y reservas */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasCitas}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setHasCitas(next);
                          if (next && !citasMonthlyFee) setCitasMonthlyFee('25');
                          if (errors.products) setErrors((prev) => ({ ...prev, products: '' }));
                        }}
                        className="mt-0.5 rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Citas y reservas
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Agenda de turnos y calendario de atención
                        </span>
                      </div>
                    </label>

                    {hasCitas && (
                      <div className="flex items-center gap-2 self-end sm:self-auto pl-6 sm:pl-0">
                        <span className="text-xs text-gray-600 whitespace-nowrap">Tarifa mensual: US$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={citasMonthlyFee}
                          onChange={(e) => setCitasMonthlyFee(e.target.value)}
                          className="w-24 h-8 px-2 rounded-lg border border-gray-300 text-xs font-semibold bg-white text-gray-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fila Delivery */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasDelivery}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setHasDelivery(next);
                          if (next && !deliveryMonthlyFee) setDeliveryMonthlyFee('35');
                          if (errors.products) setErrors((prev) => ({ ...prev, products: '' }));
                        }}
                        className="mt-0.5 rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Delivery
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Despacho de pedidos con motorizados propios o TrackDeli
                        </span>
                      </div>
                    </label>

                    {hasDelivery && (
                      <div className="flex items-center gap-2 self-end sm:self-auto pl-6 sm:pl-0">
                        <span className="text-xs text-gray-600 whitespace-nowrap">Tarifa mensual: US$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={deliveryMonthlyFee}
                          onChange={(e) => setDeliveryMonthlyFee(e.target.value)}
                          className="w-24 h-8 px-2 rounded-lg border border-gray-300 text-xs font-semibold bg-white text-gray-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Opciones adicionales */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Opciones de catálogo
                </h3>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 block">
                        Control de lotes y vencimientos
                      </span>
                      <span className="text-xs text-gray-500 block">
                        Seguimiento de números de lote y fecha de vencimiento en inventario
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={tracksBatches}
                      onClick={() => setTracksBatches(!tracksBatches)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        tracksBatches ? 'bg-purple-700' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tracksBatches ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 block">
                        Precio de etiqueta
                      </span>
                      <span className="text-xs text-gray-500 block">
                        Mostrar precio tachado y porcentaje de descuento en tickets
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useListPrice}
                      onClick={() => setUseListPrice(!useListPrice)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        useListPrice ? 'bg-purple-700' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useListPrice ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* PASO 3: FORMA DE VENTA (302a/302b) */}
          {/* ═══════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Radios de modalidad de venta */}
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  ¿Cómo se vendió este cliente?
                </h3>
                <div className="space-y-2">
                  {(
                    [
                      {
                        key: 'MEMBRESIA_MENSUAL',
                        title: 'Membresía mensual',
                        desc: 'Suscripción mes a mes con prueba gratis o cobro inicial de mensualidad.',
                      },
                      {
                        key: 'PAGO_UNICO_SISTEMA',
                        title: 'Solo sistema (pago único)',
                        desc: 'Licencia del software sin equipos incluidos.',
                      },
                      {
                        key: 'COMBO_COMPLETO',
                        title: 'Combo completo (pago único)',
                        desc: 'Computadora, monitor, impresora 80 mm, gaveta y lector de barra.',
                      },
                      {
                        key: 'COMBO_PARCIAL',
                        title: 'Combo parcial',
                        desc: 'Piezas de equipo seleccionadas individualmente.',
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        saleModality === opt.key
                          ? 'border-purple-700 bg-purple-50/20 ring-1 ring-purple-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="saleModalityRadio"
                        checked={saleModality === opt.key}
                        onChange={() => setSaleModality(opt.key)}
                        className="mt-0.5 text-purple-700 focus:ring-purple-600"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-gray-900 block">
                          {opt.title}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          {opt.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* OPCIÓN A: MEMBRESÍA MENSUAL */}
              {saleModality === 'MEMBRESIA_MENSUAL' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Inicio de la membresía
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                        startType === 'TRIAL'
                          ? 'border-purple-700 bg-purple-50/20 ring-1 ring-purple-700'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="startTypeRadio"
                        checked={startType === 'TRIAL'}
                        onChange={() => setStartType('TRIAL')}
                        className="text-purple-700 focus:ring-purple-600"
                      />
                      <span className="text-xs font-semibold text-gray-900">
                        Prueba gratis
                      </span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                        startType === 'PAID'
                          ? 'border-purple-700 bg-purple-50/20 ring-1 ring-purple-700'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="startTypeRadio"
                        checked={startType === 'PAID'}
                        onChange={() => {
                          setStartType('PAID');
                          if (totalMonthlyFee > 0) setInitialPaidAmount(totalMonthlyFee.toFixed(2));
                        }}
                        className="text-purple-700 focus:ring-purple-600"
                      />
                      <span className="text-xs font-semibold text-gray-900">
                        Ya pagó el primer mes
                      </span>
                    </label>
                  </div>

                  {startType === 'TRIAL' ? (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="trialUnitRadio"
                            checked={trialUnit === 'HOURS'}
                            onChange={() => setTrialUnit('HOURS')}
                            className="text-purple-700"
                          />
                          <span>En horas</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="trialUnitRadio"
                            checked={trialUnit === 'DAYS'}
                            onChange={() => setTrialUnit('DAYS')}
                            className="text-purple-700"
                          />
                          <span>En días</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min="1"
                          value={customTrialDuration || (trialUnit === 'HOURS' ? trialHoursPreset : trialDaysPreset)}
                          onChange={(e) => setCustomTrialDuration(e.target.value)}
                          placeholder={trialUnit === 'HOURS' ? '24' : '15'}
                          className="w-24 h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 font-semibold"
                        />
                        <span className="text-xs text-gray-600">
                          {trialUnit === 'HOURS' ? 'horas de prueba para POS' : 'días de prueba'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Monto recibido (USD) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={initialPaidAmount}
                            onChange={(e) => {
                              setInitialPaidAmount(e.target.value);
                              if (errors.initialPaidAmount) {
                                setErrors((prev) => ({ ...prev, initialPaidAmount: '' }));
                              }
                            }}
                            className={`w-full h-9 px-2.5 rounded-lg border text-xs bg-white font-semibold text-gray-900 ${
                              errors.initialPaidAmount ? 'border-rose-400' : 'border-gray-300'
                            }`}
                          />
                          {errors.initialPaidAmount && (
                            <p className="text-xs text-rose-600 mt-1">{errors.initialPaidAmount}</p>
                          )}
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Método de pago
                          </label>
                          <select
                            value={initialPaymentMethod}
                            onChange={(e) => setInitialPaymentMethod(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Fecha de cobro *
                          </label>
                          <input
                            type="date"
                            value={initialPaidAt}
                            onChange={(e) => setInitialPaidAt(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Comprobante (opcional)
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setInitialProofFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPCIÓN B, C, D: PAGO ÚNICO / COMBOS */}
              {saleModality !== 'MEMBRESIA_MENSUAL' && (
                <div className="space-y-5 pt-4 border-t border-gray-100">
                  {/* Precio y forma de pago */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Precio total de la venta *
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={commercialCurrency}
                          onChange={(e) => setCommercialCurrency(e.target.value as 'USD' | 'NIO')}
                          className="w-20 h-9 px-2 rounded-lg border border-gray-300 text-xs bg-white font-bold text-gray-900"
                        >
                          <option value="USD">USD</option>
                          <option value="NIO">NIO</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={saleModality === 'COMBO_PARCIAL'}
                          value={commercialTotalPrice}
                          onChange={(e) => {
                            setCommercialTotalPrice(e.target.value);
                            if (errors.commercialTotalPrice) {
                              setErrors((prev) => ({ ...prev, commercialTotalPrice: '' }));
                            }
                          }}
                          className={`flex-1 h-9 px-3 rounded-lg border text-xs bg-white text-gray-900 font-semibold ${
                            errors.commercialTotalPrice ? 'border-rose-400' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.commercialTotalPrice ? (
                        <p className="text-xs text-rose-600 mt-1">{errors.commercialTotalPrice}</p>
                      ) : saleModality === 'COMBO_PARCIAL' ? (
                        <p className="text-xs text-gray-500 mt-1">Suma de las piezas seleccionadas abajo.</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Precio sugerido, editable.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Forma de pago
                      </label>
                      <div className="grid grid-cols-2 gap-2 h-9">
                        <label
                          className={`flex items-center justify-center gap-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                            commercialPaymentType === 'CONTADO'
                              ? 'border-purple-700 bg-purple-50/30 text-purple-900 ring-1 ring-purple-700'
                              : 'border-gray-200 text-gray-600 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="commercialPaymentTypeRadio"
                            checked={commercialPaymentType === 'CONTADO'}
                            onChange={() => setCommercialPaymentType('CONTADO')}
                            className="sr-only"
                          />
                          <span>Contado</span>
                        </label>

                        <label
                          className={`flex items-center justify-center gap-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                            commercialPaymentType === 'CREDITO'
                              ? 'border-purple-700 bg-purple-50/30 text-purple-900 ring-1 ring-purple-700'
                              : 'border-gray-200 text-gray-600 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="commercialPaymentTypeRadio"
                            checked={commercialPaymentType === 'CREDITO'}
                            onChange={() => setCommercialPaymentType('CREDITO')}
                            className="sr-only"
                          />
                          <span>Crédito</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Si es crédito: prima y cuotas */}
                  {commercialPaymentType === 'CREDITO' && (
                    <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Prima (adelanto) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                              {commercialCurrency === 'USD' ? '$' : 'C$'}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={commercialDownPayment}
                              onChange={(e) => {
                                setCommercialDownPayment(e.target.value);
                                setCommercialPaidTodayAmount(e.target.value);
                                if (errors.commercialDownPayment) {
                                  setErrors((prev) => ({ ...prev, commercialDownPayment: '' }));
                                }
                              }}
                              className="w-full h-9 pl-7 pr-3 rounded-lg border border-gray-300 text-xs bg-white font-semibold text-gray-900"
                            />
                          </div>
                          {errors.commercialDownPayment ? (
                            <p className="text-xs text-rose-600 mt-1">{errors.commercialDownPayment}</p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-0.5">Sugerido 50 %, editable.</p>
                          )}
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Número de cuotas
                          </label>
                          <select
                            value={commercialInstallmentsCount}
                            onChange={(e) => setCommercialInstallmentsCount(Number(e.target.value))}
                            className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 font-semibold"
                          >
                            <option value={1}>1 cuota mensual</option>
                            <option value={2}>2 cuotas mensuales</option>
                            <option value={3}>3 cuotas mensuales</option>
                            <option value={4}>4 cuotas mensuales</option>
                          </select>
                        </div>
                      </div>

                      {/* Calendario de cuotas simple */}
                      {installmentSchedule.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Calendario de cuotas estimado
                          </span>
                          <div className="overflow-x-auto border border-gray-200 rounded-md bg-white">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                <tr>
                                  <th className="py-1.5 px-3 font-semibold">Cuota</th>
                                  <th className="py-1.5 px-3 font-semibold">Vencimiento</th>
                                  <th className="py-1.5 px-3 font-semibold text-right">Monto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {installmentSchedule.map((inst) => (
                                  <tr key={inst.number}>
                                    <td className="py-1.5 px-3 font-medium text-gray-900">
                                      Cuota #{inst.number}
                                    </td>
                                    <td className="py-1.5 px-3 text-gray-600">
                                      {inst.dueDateStr}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-gray-900">
                                      {commercialCurrency === 'USD' ? '$' : 'C$'} {inst.amount}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pago recibido hoy */}
                  <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                      Pago recibido hoy
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Monto recibido ({commercialCurrency}) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={commercialPaidTodayAmount}
                          onChange={(e) => {
                            setCommercialPaidTodayAmount(e.target.value);
                            if (errors.commercialPaidTodayAmount) {
                              setErrors((prev) => ({ ...prev, commercialPaidTodayAmount: '' }));
                            }
                          }}
                          className={`w-full h-9 px-2.5 rounded-lg border text-xs bg-white font-semibold text-gray-900 ${
                            errors.commercialPaidTodayAmount ? 'border-rose-400' : 'border-gray-300'
                          }`}
                        />
                        {errors.commercialPaidTodayAmount && (
                          <p className="text-xs text-rose-600 mt-1">{errors.commercialPaidTodayAmount}</p>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Método de pago
                        </label>
                        <select
                          value={commercialPaymentMethod}
                          onChange={(e) => setCommercialPaymentMethod(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Fecha de cobro *
                        </label>
                        <input
                          type="date"
                          value={commercialPaidAt}
                          onChange={(e) => setCommercialPaidAt(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Número de comprobante / ref.
                        </label>
                        <input
                          type="text"
                          value={commercialReferenceNumber}
                          onChange={(e) => setCommercialReferenceNumber(e.target.value)}
                          placeholder="Ej. Depósito #10492"
                          className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Equipo entregado en combos */}
                  {(saleModality === 'COMBO_COMPLETO' || saleModality === 'COMBO_PARCIAL') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                          Equipo entregado
                        </span>
                        {saleModality === 'COMBO_PARCIAL' && (
                          <button
                            type="button"
                            onClick={() => {
                              const newId = `part-${Date.now()}`;
                              setPartialPieces([
                                ...partialPieces,
                                {
                                  id: newId,
                                  equipmentType: 'OTRO',
                                  name: 'Pieza adicional',
                                  price: 50,
                                  selected: true,
                                  serialNumber: '',
                                },
                              ]);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
                          >
                            <Plus size={13} weight="bold" />
                            <span>Agregar pieza</span>
                          </button>
                        )}
                      </div>

                      {saleModality === 'COMBO_COMPLETO' ? (
                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                          {comboPieces.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={p.selected}
                                  onChange={(e) => {
                                    const next = [...comboPieces];
                                    next[idx].selected = e.target.checked;
                                    setComboPieces(next);
                                  }}
                                  className="rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4"
                                />
                                <span className={`text-xs ${p.selected ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                                  {p.name}
                                </span>
                              </label>

                              {p.selected && (
                                <input
                                  type="text"
                                  value={p.serialNumber || ''}
                                  onChange={(e) => {
                                    const next = [...comboPieces];
                                    next[idx].serialNumber = e.target.value;
                                    setComboPieces(next);
                                  }}
                                  placeholder="N.º de serie (opcional)"
                                  className="w-full sm:w-44 h-7 px-2 rounded border border-gray-200 text-xs text-gray-700 placeholder-gray-400"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                          {partialPieces.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="checkbox"
                                  checked={p.selected}
                                  onChange={(e) => {
                                    const next = [...partialPieces];
                                    next[idx].selected = e.target.checked;
                                    setPartialPieces(next);
                                  }}
                                  className="rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-4 h-4"
                                />
                                <input
                                  type="text"
                                  value={p.name}
                                  onChange={(e) => {
                                    const next = [...partialPieces];
                                    next[idx].name = e.target.value;
                                    setPartialPieces(next);
                                  }}
                                  className="text-xs font-semibold text-gray-900 border-0 p-0 focus:ring-0 bg-transparent"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={p.price ?? 0}
                                    onChange={(e) => {
                                      const next = [...partialPieces];
                                      next[idx].price = Number(e.target.value) || 0;
                                      setPartialPieces(next);
                                    }}
                                    className="w-20 h-7 px-1.5 rounded border border-gray-200 text-xs font-mono text-gray-900"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={p.serialNumber || ''}
                                  onChange={(e) => {
                                    const next = [...partialPieces];
                                    next[idx].serialNumber = e.target.value;
                                    setPartialPieces(next);
                                  }}
                                  placeholder="Serie (opcional)"
                                  className="w-32 h-7 px-1.5 rounded border border-gray-200 text-xs text-gray-700 placeholder-gray-400"
                                />
                                {partialPieces.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPartialPieces(partialPieces.filter((_, i) => i !== idx));
                                    }}
                                    className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <Trash size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mantenimiento */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-gray-700">
                        Incluye <strong>{maintenanceFreeMonths} meses</strong> de mantenimiento. Desde el mes{' '}
                        {maintenanceFreeMonths + 1} se cobran{' '}
                        <strong>C$ {maintenanceMonthlyNio} al mes</strong> (desde el{' '}
                        {maintenanceStartDateStr}).
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowEditMaintenance(!showEditMaintenance)}
                        className="text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer underline underline-offset-2 shrink-0 ml-2"
                      >
                        {showEditMaintenance ? 'Cerrar' : 'Cambiar monto'}
                      </button>
                    </div>

                    {showEditMaintenance && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 text-xs">
                        <div>
                          <label className="block text-gray-600 mb-1">Meses de mantenimiento incluidos</label>
                          <input
                            type="number"
                            min="0"
                            value={maintenanceFreeMonths}
                            onChange={(e) => setMaintenanceFreeMonths(Number(e.target.value) || 0)}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">Cuota mensual en córdobas (NIO)</label>
                          <input
                            type="number"
                            min="0"
                            value={maintenanceMonthlyNio}
                            onChange={(e) => setMaintenanceMonthlyNio(Number(e.target.value) || 0)}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-xs bg-white text-gray-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* PASO 4: EQUIPOS Y ACCESOS */}
          {/* ═══════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Cupos de dispositivos y accesos
              </h3>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                {/* Computadoras permitidas */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      Cupo de computadoras (POS desktop)
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Número máximo de computadoras autorizadas simultáneamente.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUnlimitedDevices}
                        onChange={(e) => setIsUnlimitedDevices(e.target.checked)}
                        className="rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-3.5 h-3.5"
                      />
                      <span>Ilimitado</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={isUnlimitedDevices}
                      value={isUnlimitedDevices ? '' : maxDevices}
                      onChange={(e) => setMaxDevices(e.target.value)}
                      placeholder={isUnlimitedDevices ? 'Sin límite' : '1'}
                      className={`w-20 h-8 px-2 rounded-lg border text-xs text-gray-900 font-semibold ${
                        isUnlimitedDevices ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Navegadores web autorizados */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      Cupo de navegadores (web)
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Número máximo de navegadores web autorizados para este negocio.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isUnlimitedWebDevices}
                        onChange={(e) => setIsUnlimitedWebDevices(e.target.checked)}
                        className="rounded border-gray-300 text-purple-700 focus:ring-purple-600 w-3.5 h-3.5"
                      />
                      <span>Ilimitado</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={isUnlimitedWebDevices}
                      value={isUnlimitedWebDevices ? '' : maxWebDevices}
                      onChange={(e) => setMaxWebDevices(e.target.value)}
                      placeholder={isUnlimitedWebDevices ? 'Sin límite' : '2'}
                      className={`w-20 h-8 px-2 rounded-lg border text-xs text-gray-900 font-semibold ${
                        isUnlimitedWebDevices ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Teléfonos (app móvil) */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      Cupo de teléfonos (app móvil)
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Con 0 la app móvil queda desactivada para este negocio.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={maxMobileDevices}
                      onChange={(e) => setMaxMobileDevices(e.target.value)}
                      className="w-20 h-8 px-2 rounded-lg border border-gray-300 text-xs bg-white text-gray-900 font-semibold"
                    />
                  </div>
                </div>

                {/* Web admin básico */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      Acceso web admin básico
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Panel web para que el encargado gestione catálogo y reportes.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={webAdminEnabled}
                    onClick={() => {
                      const next = !webAdminEnabled;
                      setWebAdminEnabled(next);
                      if (!next) setWebBillingEnabled(false);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      webAdminEnabled ? 'bg-purple-700' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        webAdminEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Facturación web */}
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 block">
                        Facturación desde navegador web
                      </span>
                      <span className="text-xs text-gray-500 block">
                        Permite cobrar y emitir comprobantes directamente desde la web.
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={webBillingEnabled}
                      disabled={!webAdminEnabled}
                      onClick={() => setWebBillingEnabled(!webBillingEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                        webBillingEnabled ? 'bg-purple-700' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          webBillingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {webBillingEnabled && (
                    <div className="pt-2 border-t border-gray-100 max-w-xs text-xs">
                      <label className="block font-semibold text-gray-700 mb-1">
                        Tarifa mensual facturación web (USD opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={webBillingMonthlyUsd}
                        onChange={(e) => setWebBillingMonthlyUsd(e.target.value)}
                        placeholder="Ej. 15.00"
                        className="w-full h-8 px-2 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* PASO 5: ENCARGADO Y RESUMEN */}
          {/* ═══════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Datos del primer encargado */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Primer encargado del negocio
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={encargadoName}
                      onChange={(e) => {
                        setEncargadoName(e.target.value);
                        if (errors.encargadoName) {
                          setErrors((prev) => ({ ...prev, encargadoName: '' }));
                        }
                      }}
                      placeholder="Ej. Carlos Mendoza"
                      className={`w-full h-9 px-3 rounded-lg border text-xs bg-white text-gray-900 ${
                        errors.encargadoName ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.encargadoName && (
                      <p className="text-xs text-rose-600 mt-1">{errors.encargadoName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      value={encargadoEmail}
                      onChange={(e) => {
                        setEncargadoEmail(e.target.value);
                        if (errors.encargadoEmail) {
                          setErrors((prev) => ({ ...prev, encargadoEmail: '' }));
                        }
                      }}
                      placeholder="carlos@demo.com"
                      className={`w-full h-9 px-3 rounded-lg border text-xs bg-white text-gray-900 ${
                        errors.encargadoEmail ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.encargadoEmail && (
                      <p className="text-xs text-rose-600 mt-1">{errors.encargadoEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contraseña temporal *
                    </label>
                    <input
                      type="password"
                      value={encargadoPassword}
                      onChange={(e) => {
                        setEncargadoPassword(e.target.value);
                        if (errors.encargadoPassword) {
                          setErrors((prev) => ({ ...prev, encargadoPassword: '' }));
                        }
                      }}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full h-9 px-3 rounded-lg border text-xs bg-white text-gray-900 ${
                        errors.encargadoPassword ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.encargadoPassword && (
                      <p className="text-xs text-rose-600 mt-1">{errors.encargadoPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen en líneas simples (sin cajas anidadas ni paneles de color) */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Resumen de la contratación
                </h3>

                <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg p-3.5 bg-white text-xs space-y-2">
                  {/* Línea 1: Negocio y tipo */}
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-gray-500">Negocio y rubro</span>
                    <span className="font-semibold text-gray-900">
                      {name || '—'} · {selectedIndustry?.name || 'General'}
                    </span>
                  </div>

                  {/* Línea 2: Productos */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">Productos activos</span>
                    <span className="font-semibold text-gray-900">
                      {[
                        hasPOS && 'POS',
                        hasCarteraCobro && 'Finanzas',
                        hasCitas && 'Citas',
                        hasDelivery && 'Delivery',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>

                  {/* Línea 3: Forma de venta y pago */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">Forma de venta</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {saleModality === 'MEMBRESIA_MENSUAL' ? (
                        startType === 'TRIAL'
                          ? `Membresía mensual · Prueba gratis (${effectiveTrialHours}h)`
                          : `Membresía mensual · Primer mes pagado ($${Number(initialPaidAmount || totalMonthlyFee).toFixed(2)} USD)`
                      ) : (
                        `${SALE_MODALITY_LABELS[saleModality]} · ${
                          commercialPaymentType === 'CREDITO'
                            ? `Crédito ${commercialInstallmentsCount} cuotas (Prima $${commercialDownPayment})`
                            : 'Contado'
                        }`
                      )}
                    </span>
                  </div>

                  {/* Línea 4: Equipo entregado */}
                  {(saleModality === 'COMBO_COMPLETO' || saleModality === 'COMBO_PARCIAL') && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">Equipo entregado</span>
                      <span className="font-semibold text-gray-900">
                        {saleModality === 'COMBO_COMPLETO'
                          ? `${comboPieces.filter((p) => p.selected).length} piezas de combo`
                          : `${partialPieces.filter((p) => p.selected).length} piezas seleccionadas`}
                      </span>
                    </div>
                  )}

                  {/* Línea 5: Mantenimiento */}
                  {saleModality !== 'MEMBRESIA_MENSUAL' && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">Mantenimiento</span>
                      <span className="font-semibold text-gray-900">
                        {maintenanceFreeMonths} meses incluidos (luego C$ {maintenanceMonthlyNio}/mes)
                      </span>
                    </div>
                  )}

                  {/* Línea 6: Primer encargado */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">Primer encargado</span>
                    <span className="font-semibold text-gray-900">
                      {encargadoName.trim() || '—'} ({encargadoEmail.trim() || '—'})
                    </span>
                  </div>

                  {/* Línea 7: Total */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-900">
                      {saleModality === 'MEMBRESIA_MENSUAL' ? 'Total mensual estimado' : 'Total acordado de la venta'}
                    </span>
                    <span className="text-sm font-black text-purple-900 font-mono">
                      {saleModality === 'MEMBRESIA_MENSUAL'
                        ? `$${totalMonthlyFee.toFixed(2)} USD / mes`
                        : `${commercialCurrency === 'USD' ? '$' : 'C$'} ${Number(commercialTotalPrice).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
