import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  PencilSimple,
  Paperclip,
  Prohibit,
  UploadSimple,
  Check,
  X,
  Gear,
} from '@phosphor-icons/react';
import { Badge, BadgeVariant } from '../ui/Badge';
import {
  BusinessDetail,
  UnifiedPaymentItem,
  useBusinessUnifiedPayments,
} from '../../hooks/useBusinesses';
import {
  MembershipItem,
  useUploadPaymentProof,
} from '../../hooks/useMemberships';
import {
  AccountStatementData,
  CommercialEquipment,
  CommercialInstallmentStatus,
  CommercialPayment,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  useCommercial,
  useSaveCommercialEquipment,
  useUploadCommercialPaymentProof,
} from '../../hooks/useCommercial';
import {
  BusinessBillingResolved,
  formatDateClean,
} from '../../utils/membershipDates';
import { formatCurrency, formatDateShort } from '../../utils/format';
import { CommercialAgreementModal } from '../modals/CommercialAgreementModal';
import { CommercialPaymentModal } from '../modals/CommercialPaymentModal';
import { VoidCommercialPaymentModal } from '../modals/VoidCommercialPaymentModal';
import { CommercialEquipmentModal } from '../modals/CommercialEquipmentModal';

type PaymentFilterKey = 'all' | 'membresia' | 'cuotas' | 'mantenimiento';

const INSTALLMENT_BADGE: Record<
  CommercialInstallmentStatus,
  { label: string; variant: BadgeVariant }
> = {
  PAGADA: { label: 'Pagada', variant: 'success' },
  PARCIAL: { label: 'Parcial', variant: 'warning' },
  PENDIENTE: { label: 'Pendiente', variant: 'neutral' },
  VENCIDA: { label: 'Vencida', variant: 'danger' },
};

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'TRANSFERENCIA':
      return 'Transferencia';
    case 'EFECTIVO':
      return 'Efectivo';
    case 'PAYPAL':
      return 'PayPal';
    case 'BINANCE':
      return 'Binance';
    case 'ALTA_INICIAL':
      return 'Alta inicial';
    case 'AUTOMATICO':
      return 'Automático';
    default:
      return method
        ? method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()
        : 'Otro';
  }
}

function getUnifiedStatusBadge(status: string): {
  label: string;
  variant: BadgeVariant;
} {
  const s = (status || '').toUpperCase();
  if (s === 'ANULADO' || s === 'CANCELLED') {
    return { label: 'Anulado', variant: 'danger' };
  }
  if (s === 'VIGENTE' || s === 'PAGADO' || s === 'PAID') {
    return { label: s === 'VIGENTE' ? 'Vigente' : 'Pagado', variant: 'success' };
  }
  if (s === 'FINALIZADA') {
    return { label: 'Finalizada', variant: 'neutral' };
  }
  return {
    label: status
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
      : 'Registrado',
    variant: 'neutral',
  };
}

function getSaleModalityDisplay(
  statement?: AccountStatementData | null,
  businessType?: string
): string {
  if (businessType === 'EMPRESA_RIDERS') {
    return 'Comisión por envío (liquidación mensual)';
  }
  if (!statement) return 'Membresía mensual';
  switch (statement.saleModality) {
    case 'MEMBRESIA':
      return 'Membresía mensual';
    case 'SOLO_SISTEMA':
      return 'Pago único (solo sistema)';
    case 'COMBO_COMPLETO':
      return 'Combo completo';
    case 'COMBO_PARCIAL':
      return 'Combo parcial';
    default:
      return statement.saleModality || 'Membresía mensual';
  }
}

interface BusinessBillingTabProps {
  business: BusinessDetail;
  billingInfo: BusinessBillingResolved;
  memberships: MembershipItem[];
  accountStatement?: AccountStatementData | null;
  onOpenRegisterPayment: () => void;
  onEditMembership: (membership: MembershipItem) => void;
  onVoidMembership: (membership: MembershipItem) => void;
  onOpenEditModel: () => void;
  onSelectProofUrl: (url: string) => void;
}

const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap';

export const BusinessBillingTab: React.FC<BusinessBillingTabProps> = ({
  business,
  billingInfo,
  memberships,
  accountStatement,
  onOpenRegisterPayment,
  onEditMembership,
  onVoidMembership,
  onOpenEditModel,
  onSelectProofUrl,
}) => {
  const accountType = business.accountType || 'CLIENTE';
  const isDemo = accountType === 'DEMO';
  const isInterno = accountType === 'INTERNO';
  const isNonBilling = isDemo || isInterno;

  const { data: unifiedData, isLoading: loadingPayments } =
    useBusinessUnifiedPayments(business.id);
  const { data: commercialData } = useCommercial(business.id);

  const uploadMembershipProof = useUploadPaymentProof();
  const uploadCommercialProof = useUploadCommercialPaymentProof(business.id);
  const saveEquipmentMutation = useSaveCommercialEquipment(business.id);

  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterKey>('all');
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState<{
    open: boolean;
    initialKind?: any;
    initialInstallmentId?: string;
  }>({ open: false });
  const [commercialVoidTarget, setCommercialVoidTarget] =
    useState<CommercialPayment | null>(null);
  const [equipmentModal, setEquipmentModal] = useState<{
    open: boolean;
    item: CommercialEquipment | null;
  }>({
    open: false,
    item: null,
  });

  // Edición en línea de número de serie
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [serialInput, setSerialInput] = useState('');

  // Input oculto para adjuntar comprobante
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofTargetPayment, setProofTargetPayment] =
    useState<UnifiedPaymentItem | null>(null);

  const allPayments = unifiedData?.payments || [];

  const filterCounts = useMemo(() => {
    const membresia = allPayments.filter((p) => p.type === 'MEMBRESIA').length;
    const cuotas = allPayments.filter(
      (p) =>
        p.type === 'CUOTA' || p.type === 'PRIMA' || p.type === 'PAGO_UNICO'
    ).length;
    const mantenimiento = allPayments.filter(
      (p) => p.type === 'MANTENIMIENTO'
    ).length;
    return {
      all: allPayments.length,
      membresia,
      cuotas,
      mantenimiento,
    };
  }, [allPayments]);

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return allPayments;
    if (paymentFilter === 'membresia') {
      return allPayments.filter((p) => p.type === 'MEMBRESIA');
    }
    if (paymentFilter === 'cuotas') {
      return allPayments.filter(
        (p) =>
          p.type === 'CUOTA' || p.type === 'PRIMA' || p.type === 'PAGO_UNICO'
      );
    }
    return allPayments.filter((p) => p.type === 'MANTENIMIENTO');
  }, [allPayments, paymentFilter]);

  const saleModalityDisplay = getSaleModalityDisplay(
    accountStatement,
    business.businessType
  );

  const isOneTimeOrCombo = Boolean(
    accountStatement && accountStatement.saleModality !== 'MEMBRESIA'
  );

  const handleTriggerAttachProof = (payment: UnifiedPaymentItem) => {
    setProofTargetPayment(payment);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !proofTargetPayment) return;

    if (
      proofTargetPayment.source === 'MEMBERSHIP' &&
      proofTargetPayment.actions.membershipId
    ) {
      uploadMembershipProof.mutate(
        { id: proofTargetPayment.actions.membershipId, file },
        { onSettled: () => setProofTargetPayment(null) }
      );
    } else if (
      proofTargetPayment.source === 'COMMERCIAL' &&
      proofTargetPayment.actions.commercialPaymentId
    ) {
      uploadCommercialProof.mutate(
        { paymentId: proofTargetPayment.actions.commercialPaymentId, file },
        { onSettled: () => setProofTargetPayment(null) }
      );
    } else {
      setProofTargetPayment(null);
    }
  };

  const buildFallbackMembership = (p: UnifiedPaymentItem): MembershipItem => {
    const existing = memberships.find((m) => m.id === p.actions.membershipId);
    if (existing) return existing;
    return {
      id: p.actions.membershipId || p.id,
      businessId: business.id,
      startDate: p.period?.start || p.paidAt,
      endDate: p.period?.end || p.paidAt,
      amount: p.amount,
      currency: p.currency,
      paymentMethod: (p.paymentMethod as any) || 'TRANSFERENCIA',
      paymentProofUrl: p.paymentProofUrl,
      paidAt: p.paidAt,
      notes: p.notes,
      status: p.status === 'ANULADO' ? 'CANCELLED' : 'ACTIVE',
      createdAt: p.createdAt,
    };
  };

  const handleEditUnifiedPayment = (p: UnifiedPaymentItem) => {
    if (p.source === 'MEMBERSHIP' && p.actions.membershipId) {
      onEditMembership(buildFallbackMembership(p));
    }
  };

  const handleVoidUnifiedPayment = (p: UnifiedPaymentItem) => {
    if (p.source === 'MEMBERSHIP' && p.actions.membershipId) {
      onVoidMembership(buildFallbackMembership(p));
      return;
    }
    if (p.source === 'COMMERCIAL') {
      const targetId = p.actions.commercialPaymentId || p.id;
      const found = commercialData?.payments?.find((cp) => cp.id === targetId);
      if (found) {
        setCommercialVoidTarget(found);
      } else {
        setCommercialVoidTarget({
          id: targetId,
          agreementId: p.actions.agreementId || accountStatement?.agreementId || '',
          kind: (p.type === 'PAGO_UNICO' ? 'PAGO' : p.type) as any,
          amount: p.amount,
          paymentMethod: (p.paymentMethod as any) || 'TRANSFERENCIA',
          referenceNumber: p.referenceNumber,
          paymentProofUrl: p.paymentProofUrl,
          paidAt: p.paidAt,
          paidAtIso: p.paidAtIso,
          paidAmountNio: null,
          exchangeRate: null,
          notes: p.notes,
          registeredBy: '',
          voidedAt: p.voidedAt,
          voidedBy: null,
          voidReason: p.voidReason,
          createdAt: p.createdAt,
        });
      }
    }
  };

  const handleOpenProof = (url: string) => {
    if (url.toLowerCase().endsWith('.pdf')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onSelectProofUrl(url);
    }
  };

  const handleStartEditSerial = (eq: CommercialEquipment) => {
    setEditingSerialId(eq.id);
    setSerialInput(eq.serialNumber || '');
  };

  const handleSaveSerial = (eq: CommercialEquipment) => {
    saveEquipmentMutation.mutate(
      {
        equipmentId: eq.id,
        input: {
          equipmentType: eq.equipmentType,
          brand: eq.brand,
          model: eq.model,
          serialNumber: serialInput.trim(),
          status: eq.status,
          price: eq.price ?? undefined,
        },
      },
      {
        onSuccess: () => setEditingSerialId(null),
      }
    );
  };

  const blockDateText = (() => {
    if (isNonBilling) return 'No se bloquea';
    if (accountStatement?.billingStatus?.graceEndsAt) {
      return `${formatDateClean(accountStatement.billingStatus.graceEndsAt)} (fin de gracia)`;
    }
    if (billingInfo.hasMembership && billingInfo.graceDateFormatted) {
      return `${billingInfo.graceDateFormatted} (3 días de gracia)`;
    }
    return '3 días después del vencimiento';
  })();

  const monthlyTariffText = (() => {
    if (isNonBilling) return 'Sin cobro';
    if (business.businessType === 'EMPRESA_RIDERS') return 'Según comisiones del mes';
    if (accountStatement?.maintenance?.status === 'EN_COBRO') {
      return `${formatCurrency(accountStatement.maintenance.monthlyAmount || 550, 'NIO')} / mes (mantenimiento)`;
    }
    if (
      accountStatement?.maintenance?.status === 'INCLUIDO' &&
      accountStatement.maintenance.includedUntil
    ) {
      return `Incluido hasta ${formatDateShort(accountStatement.maintenance.includedUntil)}`;
    }
    return `${billingInfo.priceFormatted} / mes`;
  })();

  const installments = accountStatement?.installments || [];
  const pendingInstallments = accountStatement?.upcomingInstallments || [];
  const equipment = accountStatement?.equipment || [];
  const maintenanceInfo = accountStatement?.maintenance;

  const maintenanceText =
    maintenanceInfo?.status === 'INCLUIDO' && maintenanceInfo.includedUntil
      ? `Incluido hasta el ${formatDateShort(maintenanceInfo.includedUntil)}`
      : maintenanceInfo?.status === 'EN_COBRO'
      ? `Próximo cobro: ${formatCurrency(maintenanceInfo.monthlyAmount || 550, 'NIO')} al mes`
      : 'No aplica';

  const filterTabs: Array<{ id: PaymentFilterKey; label: string; count: number }> = [
    { id: 'all', label: 'Todos', count: filterCounts.all },
    { id: 'membresia', label: 'Membresía', count: filterCounts.membresia },
    { id: 'cuotas', label: 'Cuotas', count: filterCounts.cuotas },
    { id: 'mantenimiento', label: 'Mantenimiento', count: filterCounts.mantenimiento },
  ];

  const isUploadingProof =
    uploadMembershipProof.isPending || uploadCommercialProof.isPending;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Aviso de cuenta demo o interna */}
      {isNonBilling && (
        <div className="bg-white rounded-xl border border-gray-200/80 px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Badge variant="neutral" size="sm">
              {isInterno ? 'Interno' : 'Demo'}
            </Badge>
            <p className="text-[13px] font-medium text-gray-700">
              {isInterno
                ? 'Cuenta interna: no se cobra ni se bloquea.'
                : 'Cuenta demo: no se cobra ni se bloquea.'}
            </p>
          </div>
          <span className="text-[13px] text-gray-500 hidden sm:inline">
            El historial previo, si existe, se conserva abajo
          </span>
        </div>
      )}

      {/* Período actual */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[15px] font-semibold text-gray-900">
                Período actual
              </h3>
              {isNonBilling ? (
                <Badge variant="neutral" size="sm">
                  Sin vencimiento
                </Badge>
              ) : (
                <Badge variant={billingInfo.variant} dot size="sm">
                  {billingInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Vigencia, día de cobro, fecha de bloqueo y modalidad comercial
            </p>
          </div>

          {!isNonBilling && business.businessType !== 'EMPRESA_RIDERS' && (
            <button
              id="btn-register-membership-payment"
              type="button"
              onClick={onOpenRegisterPayment}
              className={btnSecondary}
            >
              <Plus size={14} weight="bold" />
              <span>Registrar pago</span>
            </button>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-gray-100 text-xs">
          <div className="space-y-0.5">
            <dt className="text-[13px] text-gray-500">Período</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {isNonBilling
                ? 'Sin vencimiento'
                : billingInfo.hasMembership
                ? billingInfo.periodStr
                : 'Sin período registrado'}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-[13px] text-gray-500">Vence</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {isNonBilling
                ? 'No vence'
                : billingInfo.hasMembership
                ? `${billingInfo.dueDateFormatted}${
                    billingInfo.daysRemainingText
                      ? ` · ${billingInfo.daysRemainingText}`
                      : ''
                  }`
                : '—'}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-[13px] text-gray-500">Día de cobro</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {isNonBilling
                ? 'No aplica'
                : billingInfo.hasMembership
                ? `Día ${billingInfo.anchorDay} de cada mes`
                : '—'}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-[13px] text-gray-500">Cuándo se bloquea</dt>
            <dd
              className={`text-sm font-semibold ${
                !isNonBilling && billingInfo.status === 'EN_GRACIA'
                  ? 'text-orange-700'
                  : !isNonBilling && billingInfo.status === 'VENCIDO'
                  ? 'text-red-700'
                  : 'text-gray-900'
              }`}
            >
              {blockDateText}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-[13px] text-gray-500">Tarifa mensual</dt>
            <dd className="text-sm font-semibold text-gray-900 font-mono">
              {monthlyTariffText}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-[13px] text-gray-500">Forma de venta</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {saleModalityDisplay}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bloque adicional para empresa de riders (si aplica) */}
      {business.businessType === 'EMPRESA_RIDERS' && (
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">
                Comisiones y liquidaciones
              </h3>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Tasas por envío completado y liquidación mensual de riders
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenEditModel}
              className={btnSecondary}
            >
              <Gear size={14} />
              <span>Modificar tasas de comisión</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-[13px] text-gray-500">Comisión base</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {(Number(business.commissionRate || 0.15) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">Por envío completado</p>
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Distancia larga</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {(Number(business.altCommissionRate || 0.12) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                Más de {business.altCommissionDistanceKm || 40} km
              </p>
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Tiempo de despacho</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {business.dispatchTimeoutMin || 3} min
              </p>
              <p className="text-xs text-gray-500">Por intento a repartidor</p>
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Comisión estimada del mes</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5 font-mono">
                C${' '}
                {business.recentOrders
                  .reduce((acc, o) => {
                    if (o.status !== 'ENTREGADO') return acc;
                    const rate = business.commissionRate || 0.15;
                    return acc + Number(o.deliveryFee || 0) * rate;
                  }, 0)
                  .toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {business.monthlyMetrics.ordersDelivered} entregas este mes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pagos unificados (307a) */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Pagos</h3>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Historial unificado de membresías, cuotas, pagos únicos y mantenimiento
            </p>
          </div>

          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/80 overflow-x-auto max-w-full">
            {filterTabs.map((ft) => {
              const active = paymentFilter === ft.id;
              return (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() => setPaymentFilter(ft.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-gray-900 shadow-2xs border border-gray-200/80'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>{ft.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      active ? 'bg-gray-100 text-gray-800' : 'bg-gray-200/70 text-gray-600'
                    }`}
                  >
                    {ft.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loadingPayments ? (
          <p className="py-8 text-center text-xs text-gray-500">
            Cargando pagos registrados…
          </p>
        ) : filteredPayments.length === 0 ? (
          <div className="py-8 text-center border-t border-gray-100">
            <p className="text-[13px] text-gray-500">
              {allPayments.length === 0
                ? 'Aún no hay pagos registrados para este negocio.'
                : 'No hay pagos que coincidan con el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <>
            {/* Vista móvil */}
            <div className="lg:hidden divide-y divide-gray-100 border-t border-gray-100">
              {filteredPayments.map((p) => {
                const isVoided =
                  p.status === 'ANULADO' || Boolean(p.voidedAt);
                const stBadge = getUnifiedStatusBadge(p.status);
                const periodLabel = p.period
                  ? `${formatDateClean(p.period.start)} → ${formatDateClean(p.period.end)}`
                  : '—';

                return (
                  <div key={`${p.source}-${p.id}`} className="py-4 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={`font-semibold text-sm ${
                            isVoided ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {p.concept}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.paidAt ? formatDateShort(p.paidAt) : '—'} ·{' '}
                          {getPaymentMethodLabel(p.paymentMethod)}
                        </p>
                      </div>
                      <Badge variant={stBadge.variant} size="sm">
                        {stBadge.label}
                      </Badge>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-gray-500">Período</dt>
                      <dd className="text-right text-gray-700">{periodLabel}</dd>
                      <dt className="text-gray-500">Monto</dt>
                      <dd
                        className={`text-right font-mono font-semibold ${
                          isVoided ? 'line-through text-gray-400' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(p.amount, p.currency)}
                      </dd>
                    </dl>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {p.paymentProofUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenProof(p.paymentProofUrl!)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Paperclip size={13} />
                          <span>Ver comprobante</span>
                        </button>
                      )}
                      {p.actions.canAttachProof && (
                        <button
                          type="button"
                          disabled={isUploadingProof}
                          onClick={() => handleTriggerAttachProof(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <UploadSimple size={13} />
                          <span>Adjuntar comprobante</span>
                        </button>
                      )}
                      {p.actions.canEdit && (
                        <button
                          type="button"
                          onClick={() => handleEditUnifiedPayment(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <PencilSimple size={13} />
                          <span>Editar</span>
                        </button>
                      )}
                      {p.actions.canVoid && (
                        <button
                          type="button"
                          onClick={() => handleVoidUnifiedPayment(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Prohibit size={13} />
                          <span>Anular</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla en escritorio */}
            <div className="hidden lg:block overflow-x-auto border-t border-gray-100">
              <table className="w-full text-left border-collapse text-xs min-w-[920px]">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                    <th className="py-3 px-3 whitespace-nowrap">Fecha</th>
                    <th className="py-3 px-3 whitespace-nowrap">Concepto</th>
                    <th className="py-3 px-3 whitespace-nowrap">Período</th>
                    <th className="py-3 px-3 whitespace-nowrap">Productos</th>
                    <th className="py-3 px-3 whitespace-nowrap">Método</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Monto</th>
                    <th className="py-3 px-3 whitespace-nowrap">Comprobante</th>
                    <th className="py-3 px-3 whitespace-nowrap">Estado</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredPayments.map((p) => {
                    const isVoided =
                      p.status === 'ANULADO' || Boolean(p.voidedAt);
                    const stBadge = getUnifiedStatusBadge(p.status);
                    const periodLabel = p.period
                      ? `${formatDateClean(p.period.start)} → ${formatDateClean(p.period.end)}`
                      : '—';

                    return (
                      <tr
                        key={`${p.source}-${p.id}`}
                        className={
                          isVoided
                            ? 'bg-gray-50/60 text-gray-400'
                            : 'hover:bg-gray-50/50 transition-colors'
                        }
                      >
                        <td className="py-3 px-3 whitespace-nowrap font-medium">
                          {p.paidAt ? formatDateShort(p.paidAt) : '—'}
                        </td>
                        <td className="py-3 px-3 max-w-[220px]">
                          <span
                            className={`font-semibold block ${
                              isVoided ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}
                          >
                            {p.concept}
                          </span>
                          {p.voidReason ? (
                            <span className="text-xs text-red-600 block truncate">
                              Motivo: {p.voidReason}
                            </span>
                          ) : p.notes ? (
                            <span className="text-xs text-gray-500 block truncate">
                              {p.notes}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-gray-600">
                          {periodLabel}
                        </td>
                        <td className="py-3 px-3">
                          {p.products && p.products.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {p.products.map((prod, idx) => {
                                const label =
                                  prod.productType === 'CARTERA_COBRO'
                                    ? 'Finanzas'
                                    : prod.productType === 'DELIVERY'
                                    ? 'Delivery'
                                    : prod.productType === 'POS'
                                    ? 'POS'
                                    : prod.productType === 'CITAS'
                                    ? 'Citas'
                                    : prod.name;
                                return (
                                  <span
                                    key={prod.id || `${prod.productType}-${idx}`}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200/80"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-gray-600">
                          <span>{getPaymentMethodLabel(p.paymentMethod)}</span>
                          {p.referenceNumber && (
                            <span className="block text-xs font-mono text-gray-400">
                              Ref: {p.referenceNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-semibold">
                          <span
                            className={
                              isVoided
                                ? 'line-through text-gray-400'
                                : 'text-emerald-700'
                            }
                          >
                            {formatCurrency(p.amount, p.currency)}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {p.paymentProofUrl ? (
                            <button
                              type="button"
                              onClick={() => handleOpenProof(p.paymentProofUrl!)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2 cursor-pointer"
                            >
                              <Paperclip size={13} />
                              <span>Ver</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant={stBadge.variant} size="sm">
                            {stBadge.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {p.actions.canEdit && (
                              <button
                                type="button"
                                onClick={() => handleEditUnifiedPayment(p)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 cursor-pointer"
                              >
                                Editar
                              </button>
                            )}
                            {p.actions.canAttachProof && (
                              <button
                                type="button"
                                disabled={isUploadingProof}
                                onClick={() => handleTriggerAttachProof(p)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 cursor-pointer disabled:opacity-50"
                                title={
                                  p.paymentProofUrl
                                    ? 'Reemplazar comprobante'
                                    : 'Adjuntar comprobante'
                                }
                              >
                                Adjuntar comprobante
                              </button>
                            )}
                            {p.actions.canVoid && (
                              <button
                                type="button"
                                onClick={() => handleVoidUnifiedPayment(p)}
                                className="px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-red-600 cursor-pointer"
                              >
                                Anular
                              </button>
                            )}
                            {!p.actions.canEdit &&
                              !p.actions.canAttachProof &&
                              !p.actions.canVoid && (
                                <span className="text-gray-400">—</span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Cuotas, mantenimiento y equipo entregado (solo pago único o combo) */}
      {isOneTimeOrCombo && accountStatement ? (
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">
                Cuotas, mantenimiento y equipo entregado
              </h3>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Seguimiento del acuerdo comercial, cuotas pactadas y equipos instalados
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAgreementOpen(true)}
                className={btnSecondary}
              >
                <PencilSimple size={14} />
                <span>Editar acuerdo</span>
              </button>
              {!isNonBilling && (
                <button
                  type="button"
                  onClick={() => setPaymentModalState({ open: true })}
                  className={btnSecondary}
                >
                  <Plus size={14} weight="bold" />
                  <span>Registrar abono o mantenimiento</span>
                </button>
              )}
            </div>
          </div>

          {/* Resumen del acuerdo dividido sin subtarjetas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-[13px] text-gray-500">Total acordado</p>
              <p className="text-base font-semibold text-gray-900 font-mono mt-0.5">
                {formatCurrency(
                  accountStatement.totalPrice || 0,
                  accountStatement.currency
                )}
              </p>
              <p className="text-xs text-gray-500">{saleModalityDisplay}</p>
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Pagado</p>
              <p className="text-base font-semibold text-emerald-700 font-mono mt-0.5">
                {formatCurrency(
                  accountStatement.totalPaid,
                  accountStatement.currency
                )}
              </p>
              <p className="text-xs text-gray-500">
                {accountStatement.paymentType === 'CREDITO'
                  ? `Prima: ${formatCurrency(
                      accountStatement.downPayment,
                      accountStatement.currency
                    )}`
                  : 'Pago de contado'}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Saldo pendiente</p>
              <p
                className={`text-base font-semibold font-mono mt-0.5 ${
                  accountStatement.balance > 0
                    ? 'text-gray-900'
                    : 'text-emerald-700'
                }`}
              >
                {formatCurrency(
                  accountStatement.balance,
                  accountStatement.currency
                )}
              </p>
              <p className="text-xs text-gray-500">
                {pendingInstallments.length > 0
                  ? `Próxima cuota: ${formatDateShort(
                      pendingInstallments[0].dueDate
                    )}`
                  : 'Sin cuotas pendientes'}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-gray-500">Mantenimiento</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {maintenanceText}
              </p>
              <p className="text-xs text-gray-500">
                Fecha de venta: {accountStatement.saleDate || '—'}
              </p>
            </div>
          </div>

          {/* Plan de cuotas */}
          {accountStatement.paymentType === 'CREDITO' &&
            installments.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Plan de cuotas ({installments.length})
                  </h4>
                  <span className="text-xs text-gray-500">
                    {pendingInstallments.length === 0
                      ? 'Todas las cuotas pagadas'
                      : `${pendingInstallments.length} pendiente(s)`}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[560px]">
                    <thead className="text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Cuota</th>
                        <th className="py-2.5 px-3 font-semibold">Vencimiento</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Abonado</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Pendiente</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {installments.map((inst) => {
                        const b = INSTALLMENT_BADGE[inst.status] || {
                          label: inst.status,
                          variant: 'neutral' as BadgeVariant,
                        };
                        const isPaid = inst.status === 'PAGADA';
                        return (
                          <tr key={inst.id}>
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              Cuota #{inst.installmentNumber}
                            </td>
                            <td
                              className={`py-2.5 px-3 ${
                                inst.status === 'VENCIDA'
                                  ? 'text-red-700 font-semibold'
                                  : 'text-gray-700'
                              }`}
                            >
                              {formatDateShort(inst.dueDate)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">
                              {formatCurrency(inst.amount, accountStatement.currency)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                              {formatCurrency(
                                inst.paidAmount,
                                accountStatement.currency
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-900">
                              {formatCurrency(
                                inst.pendingAmount,
                                accountStatement.currency
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant={b.variant} size="sm">
                                {b.label}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!isPaid && !isNonBilling && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentModalState({
                                      open: true,
                                      initialKind: 'CUOTA',
                                      initialInstallmentId: inst.id,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 cursor-pointer"
                                >
                                  Pagar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Equipo entregado */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                Equipo entregado ({equipment.length})
              </h4>
              <button
                type="button"
                onClick={() => setEquipmentModal({ open: true, item: null })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 cursor-pointer"
              >
                <Plus size={13} weight="bold" />
                <span>Agregar pieza</span>
              </button>
            </div>

            {equipment.length === 0 ? (
              <p className="text-[13px] text-gray-500">
                No hay piezas de equipo registradas para este negocio.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[560px]">
                  <thead className="text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Pieza</th>
                      <th className="py-2.5 px-3 font-semibold">Marca / modelo</th>
                      <th className="py-2.5 px-3 font-semibold">Número de serie</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {equipment.map((eq) => {
                      const isEditingSerial = editingSerialId === eq.id;
                      const typeLabel =
                        EQUIPMENT_TYPE_LABELS[eq.equipmentType] || eq.equipmentType;
                      const eqVariant: BadgeVariant =
                        eq.status === 'ENTREGADO'
                          ? 'success'
                          : eq.status === 'RETIRADO'
                          ? 'neutral'
                          : 'warning';
                      return (
                        <tr key={eq.id}>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {eq.description || typeLabel}
                          </td>
                          <td className="py-2.5 px-3 text-gray-700">
                            {eq.brand} {eq.model ? `· ${eq.model}` : ''}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {isEditingSerial ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={serialInput}
                                  onChange={(e) => setSerialInput(e.target.value)}
                                  placeholder="N.º de serie"
                                  className="h-8 px-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 w-36 font-mono"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveSerial(eq)}
                                  disabled={saveEquipmentMutation.isPending}
                                  className="p-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
                                  title="Guardar serie"
                                >
                                  <Check size={12} weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSerialId(null)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <span
                                  className={
                                    eq.serialNumber
                                      ? 'text-gray-900 font-semibold'
                                      : 'text-gray-400'
                                  }
                                >
                                  {eq.serialNumber || 'Sin serie registrada'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSerial(eq)}
                                  className="text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                                  title="Editar número de serie"
                                >
                                  <PencilSimple size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant={eqVariant} size="sm">
                              {EQUIPMENT_STATUS_LABELS[eq.status] || eq.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setEquipmentModal({ open: true, item: eq })
                              }
                              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 cursor-pointer"
                            >
                              Editar
                            </button>
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
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-gray-500">
            Cuotas, mantenimiento y equipo entregado solo se muestran cuando la venta es de pago único o combo (este negocio opera con membresía mensual).
          </p>
          <button
            type="button"
            onClick={() => setAgreementOpen(true)}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-2 shrink-0 cursor-pointer text-left sm:text-right"
          >
            Configurar acuerdo de pago único o combo
          </button>
        </div>
      )}

      {/* Modales comerciales */}
      {agreementOpen && (
        <CommercialAgreementModal
          isOpen={agreementOpen}
          onClose={() => setAgreementOpen(false)}
          businessId={business.id}
          businessName={business.name}
          existing={commercialData ?? null}
        />
      )}

      {paymentModalState.open && accountStatement && (
        <CommercialPaymentModal
          isOpen={paymentModalState.open}
          onClose={() => setPaymentModalState({ open: false })}
          businessId={business.id}
          businessName={business.name}
          data={accountStatement}
          initialKind={paymentModalState.initialKind}
          initialInstallmentId={paymentModalState.initialInstallmentId}
        />
      )}

      {equipmentModal.open && (
        <CommercialEquipmentModal
          isOpen={equipmentModal.open}
          onClose={() => setEquipmentModal({ open: false, item: null })}
          businessId={business.id}
          agreementId={accountStatement?.agreementId || ''}
          equipment={equipmentModal.item}
        />
      )}

      {commercialVoidTarget && (
        <VoidCommercialPaymentModal
          isOpen={Boolean(commercialVoidTarget)}
          onClose={() => setCommercialVoidTarget(null)}
          businessId={business.id}
          payment={commercialVoidTarget}
        />
      )}
    </div>
  );
};
