import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  FilePdf,
  UploadSimple,
  X,
  ArrowRight,
  ArrowLeft,
  Motorcycle,
  Receipt,
  Wallet,
  CalendarBlank,
  Check,
  Money,
  Gift,
  Warning,
  Info,
  CircleNotch,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useCreateMembership,
  useBusinessMemberships,
  useMembershipPreview,
  isAutoInitialMembership,
  PaymentMethod,
  MembershipKind,
  MembershipStartMode,
  MembershipItem,
} from '../../hooks/useMemberships';
import {
  useBusinessProducts,
  BusinessProductType,
} from '../../hooks/useBusinessProducts';
import { BusinessType } from '../../hooks/useBusinesses';
import {
  parseDateClean,
  formatDateClean,
  calculateDueDateFromAnchor,
  getMembershipPeriodDates,
} from '../../utils/membershipDates';

interface RegisterMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  businessType?: BusinessType;
  initialSelectedProductType?: BusinessProductType;
}

type Step = 'type' | 'period' | 'payment' | 'confirm';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia bancaria',
  EFECTIVO: 'Efectivo',
  PAYPAL: 'PayPal',
  BINANCE: 'Binance',
  OTRO: 'Otro',
};

const TRIAL_DAY_OPTIONS = [7, 15, 30];

/** Un período que empieza más allá de esto se considera adelantado y pide confirmación. */
const FAR_FUTURE_DAYS = 31;

const SERVICE_NOTE = 'Disponible cuando se actualice el API (ticket 252b).';

function toNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((toNoon(to).getTime() - toNoon(from).getTime()) / 86_400_000);
}

/**
 * Replica la regla que usa HOY el API en createMembership para mostrar el período
 * antes de guardar: encadena al último registro (incluidos los anulados, porque el API
 * actual todavía no los excluye) y ignora la fecha que mande la web.
 * Solo se usa mientras el endpoint de preview no exista.
 */
function estimateWithCurrentApiRule(
  memberships: MembershipItem[],
  anchorDay: number | null,
  paidAtStr: string
) {
  if (memberships.length === 0) {
    const start = parseDateClean(paidAtStr) ?? toNoon(new Date());
    const anchor = anchorDay ?? start.getDate();
    return {
      start,
      end: calculateDueDateFromAnchor(start, anchor),
      anchor,
      latest: null as MembershipItem | null,
      chainedOnCancelled: false,
    };
  }

  const latest = [...memberships].sort((a, b) => {
    const ea = parseDateClean(a.endDate)?.getTime() ?? 0;
    const eb = parseDateClean(b.endDate)?.getTime() ?? 0;
    return eb - ea;
  })[0];

  const latestStart = parseDateClean(latest.startDate) ?? toNoon(new Date());
  const anchor = anchorDay ?? latestStart.getDate();
  const start = calculateDueDateFromAnchor(latestStart, anchor);
  const end = calculateDueDateFromAnchor(start, anchor);

  return {
    start,
    end,
    anchor,
    latest,
    chainedOnCancelled: latest.status === 'CANCELLED',
  };
}

export const RegisterMembershipModal: React.FC<RegisterMembershipModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  businessType,
  initialSelectedProductType,
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState<Step>('type');
  const [kind, setKind] = useState<MembershipKind | null>(null);
  const [startMode, setStartMode] = useState<MembershipStartMode>('CONTINUE');
  const [customStart, setCustomStart] = useState(todayStr);
  const [trialDays, setTrialDays] = useState<number>(15);
  const [customTrialDays, setCustomTrialDays] = useState('');
  const [confirmUnusualPeriod, setConfirmUnusualPeriod] = useState(false);

  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paidAt, setPaidAt] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const { data: productsData } = useBusinessProducts(businessId);
  const { data: memberships = [] } = useBusinessMemberships(businessId);
  const createMembershipMutation = useCreateMembership();

  const anchorDay = useMemo(() => {
    const withAnchor = memberships.find((m) => m.billing_anchor_day);
    return withAnchor?.billing_anchor_day ?? null;
  }, [memberships]);

  const effectiveTrialDays = useMemo(() => {
    if (customTrialDays.trim()) {
      const n = parseInt(customTrialDays, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
    return trialDays;
  }, [customTrialDays, trialDays]);

  const previewParams = useMemo(
    () => ({
      type: kind ?? 'PAID',
      startMode: kind === 'TRIAL' ? ('TODAY' as MembershipStartMode) : startMode,
      startDate: startMode === 'CUSTOM' && kind !== 'TRIAL' ? customStart : undefined,
      trialDays: kind === 'TRIAL' ? effectiveTrialDays : undefined,
    }),
    [kind, startMode, customStart, effectiveTrialDays]
  );

  const {
    isCheckingSupport: checkingSupport,
    supported: canUseNewContract,
    preview,
    isLoadingPreview,
    previewError,
  } = useMembershipPreview(businessId, previewParams, isOpen);

  const availableProducts = useMemo(() => {
    if (!productsData?.products) return [];
    const list: Array<{
      id: string;
      productType: BusinessProductType;
      name: string;
      subtitle: string;
      fee: number | null;
      icon: React.ReactNode;
      activeColor: string;
      isCurrentlyActive: boolean;
    }> = [];

    if (businessType !== 'EMPRESA_RIDERS' && productsData.products.DELIVERY?.id) {
      const sub = productsData.products.DELIVERY;
      const fee = sub.deliveryMonthlyFee;
      list.push({
        id: sub.id!,
        productType: 'DELIVERY',
        name: 'Delivery',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <Motorcycle size={18} weight="duotone" className="text-amber-600 shrink-0" />,
        activeColor: 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/30',
        isCurrentlyActive: sub.status === 'ACTIVE',
      });
    }

    if (productsData.products.POS?.id) {
      const sub = productsData.products.POS;
      const fee = sub.posMonthlyFee;
      list.push({
        id: sub.id!,
        productType: 'POS',
        name: 'Sistema POS',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <Receipt size={18} weight="duotone" className="text-purple-600 shrink-0" />,
        activeColor: 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500/30',
        isCurrentlyActive: sub.status === 'ACTIVE',
      });
    }

    if (productsData.products.CARTERA_COBRO?.id) {
      const sub = productsData.products.CARTERA_COBRO;
      const fee = sub.carteraMonthlyFee;
      list.push({
        id: sub.id!,
        productType: 'CARTERA_COBRO',
        name: 'Finanzas',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <Wallet size={18} weight="duotone" className="text-emerald-600 shrink-0" />,
        activeColor: 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30',
        isCurrentlyActive: sub.status === 'ACTIVE',
      });
    }

    if (productsData.products.CITAS?.id) {
      const sub = productsData.products.CITAS;
      const fee = sub.citasMonthlyFee;
      list.push({
        id: sub.id!,
        productType: 'CITAS',
        name: 'Citas',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <CalendarBlank size={18} weight="duotone" className="text-sky-600 shrink-0" />,
        activeColor: 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500/30',
        isCurrentlyActive: sub.status === 'ACTIVE',
      });
    }

    return list;
  }, [productsData, businessType]);

  const calculateSuggestedAmount = (productIds: string[], curr: string): string => {
    if (curr !== 'USD' || productIds.length === 0) return '';
    const selected = availableProducts.filter((p) => productIds.includes(p.id));
    const sumFees = selected.reduce((acc, p) => acc + (p.fee ? Number(p.fee) : 0), 0);
    return sumFees > 0 ? sumFees.toFixed(2) : '';
  };

  // Reinicio al abrir
  useEffect(() => {
    if (!isOpen) return;
    setIdempotencyKey(crypto.randomUUID());
    setStep('type');
    setKind(null);
    setStartMode('CONTINUE');
    setCustomStart(todayStr);
    setTrialDays(15);
    setCustomTrialDays('');
    setConfirmUnusualPeriod(false);
    setCurrency('USD');
    setPaymentMethod('TRANSFERENCIA');
    setPaidAt(todayStr);
    setNotes('');
    setFile(null);
    setPreviewUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Preselección de productos cuando ya cargaron
  useEffect(() => {
    if (!isOpen) return;
    if (initialSelectedProductType) {
      const target = availableProducts.find((p) => p.productType === initialSelectedProductType);
      if (target) {
        setSelectedProductIds([target.id]);
        setAmount(calculateSuggestedAmount([target.id], 'USD'));
        return;
      }
    }
    const alreadyActive = availableProducts.filter((p) => p.isCurrentlyActive);
    const initialIds = alreadyActive.map((p) => p.id);
    setSelectedProductIds(initialIds);
    setAmount(calculateSuggestedAmount(initialIds, 'USD'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, availableProducts, initialSelectedProductType]);

  // Si cambia el período, la confirmación anterior ya no aplica
  useEffect(() => {
    setConfirmUnusualPeriod(false);
  }, [kind, startMode, customStart, effectiveTrialDays]);

  const toggleProduct = (id: string) => {
    const next = selectedProductIds.includes(id)
      ? selectedProductIds.filter((p) => p !== id)
      : [...selectedProductIds, id];
    setSelectedProductIds(next);
    if (currency === 'USD') setAmount(calculateSuggestedAmount(next, 'USD'));
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    setAmount(newCurrency === 'USD' ? calculateSuggestedAmount(selectedProductIds, 'USD') : '');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // ---------------------------------------------------------------------------
  // Período que se va a guardar
  // ---------------------------------------------------------------------------
  const estimate = useMemo(
    () => estimateWithCurrentApiRule(memberships, anchorDay, paidAt),
    [memberships, anchorDay, paidAt]
  );

  const period = useMemo(() => {
    if (canUseNewContract) {
      if (!preview) return null;
      return {
        start: parseDateClean(preview.startDate),
        end: parseDateClean(preview.endDate),
        anchor: preview.anchorDay,
        anchorChanges: Boolean(preview.anchorChanges),
        previousAnchor: preview.previousAnchorDay ?? anchorDay,
        warnings: preview.warnings ?? [],
        source: 'api' as const,
      };
    }
    if (kind === 'TRIAL' || startMode !== 'CONTINUE') return null;
    return {
      start: estimate.start,
      end: estimate.end,
      anchor: estimate.anchor,
      anchorChanges: false,
      previousAnchor: anchorDay,
      warnings: [] as string[],
      source: 'estimate' as const,
    };
  }, [canUseNewContract, preview, kind, startMode, estimate, anchorDay]);

  const today = toNoon(new Date());
  const daysUntilStart = period?.start ? daysBetween(today, period.start) : 0;
  const startsFarAhead = kind === 'PAID' && daysUntilStart > FAR_FUTURE_DAYS;
  const chainsOnCancelled =
    !canUseNewContract && kind === 'PAID' && startMode === 'CONTINUE' && estimate.chainedOnCancelled;
  const needsUnusualConfirm = startsFarAhead || chainsOnCancelled;

  // Solo avisa si el registro automático del alta es lo único vigente (caso típico: prueba registrada como pago)
  const autoInitial = useMemo(() => {
    const active = memberships.filter((m) => m.status !== 'CANCELLED');
    if (active.length !== 1) return null;
    return isAutoInitialMembership(active[0]) ? active[0] : null;
  }, [memberships]);

  const latestActive = useMemo(() => {
    const active = memberships.filter((m) => m.status !== 'CANCELLED');
    if (active.length === 0) return null;
    return [...active].sort(
      (a, b) =>
        (parseDateClean(b.endDate)?.getTime() ?? 0) - (parseDateClean(a.endDate)?.getTime() ?? 0)
    )[0];
  }, [memberships]);

  // ---------------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------------
  const steps: Array<{ key: Step; label: string }> =
    kind === 'TRIAL'
      ? [
          { key: 'type', label: 'Tipo' },
          { key: 'period', label: 'Período' },
          { key: 'confirm', label: 'Confirmar' },
        ]
      : [
          { key: 'type', label: 'Tipo' },
          { key: 'period', label: 'Período' },
          { key: 'payment', label: 'Pago' },
          { key: 'confirm', label: 'Confirmar' },
        ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  const numAmount = parseFloat(amount);
  const paymentValid = kind === 'TRIAL' || (!isNaN(numAmount) && numAmount > 0 && !!paidAt);

  const periodValid =
    !!period &&
    !!period.start &&
    !!period.end &&
    !previewError &&
    (kind !== 'TRIAL' || effectiveTrialDays > 0) &&
    (startMode !== 'CUSTOM' || !!customStart) &&
    (!needsUnusualConfirm || confirmUnusualPeriod);

  const canGoNext =
    (step === 'type' && kind !== null) ||
    (step === 'period' && periodValid) ||
    (step === 'payment' && paymentValid);

  const goNext = () => {
    if (!canGoNext) return;
    const next = steps[stepIndex + 1];
    if (next) setStep(next.key);
  };

  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const isSubmitting = createMembershipMutation.isPending;

  const handleSubmit = () => {
    if (!kind || !period?.start || !period?.end || !periodValid || !paymentValid || isSubmitting) {
      return;
    }

    const productIds = selectedProductIds.length > 0 ? selectedProductIds : undefined;
    const paidAtIso = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString();

    if (canUseNewContract) {
      createMembershipMutation.mutate(
        {
          businessId,
          type: kind,
          startMode: kind === 'TRIAL' ? 'TODAY' : startMode,
          startDate:
            kind !== 'TRIAL' && startMode === 'CUSTOM'
              ? new Date(customStart).toISOString()
              : period.start.toISOString(),
          endDate: period.end.toISOString(),
          trialDays: kind === 'TRIAL' ? effectiveTrialDays : undefined,
          amount: kind === 'TRIAL' ? 0 : numAmount,
          currency: kind === 'TRIAL' ? 'USD' : currency,
          paymentMethod: kind === 'TRIAL' ? undefined : paymentMethod,
          paidAt: kind === 'TRIAL' ? undefined : paidAtIso,
          notes: notes.trim() || undefined,
          file: kind === 'TRIAL' ? null : file,
          businessProductSubscriptionIds: productIds,
          idempotencyKey,
        },
        { onSuccess: () => onClose() }
      );
      return;
    }

    // API actual: solo pagos y solo renovación encadenada (no se manda ningún campo que el API descarte)
    if (kind !== 'PAID' || startMode !== 'CONTINUE') return;
    createMembershipMutation.mutate(
      {
        businessId,
        startDate: period.start.toISOString(),
        endDate: period.end.toISOString(),
        amount: numAmount,
        currency,
        paymentMethod,
        paidAt: paidAtIso,
        notes: notes.trim() || undefined,
        file,
        businessProductSubscriptionIds: productIds,
        idempotencyKey,
      },
      { onSuccess: () => onClose() }
    );
  };

  const selectedProducts = availableProducts.filter((p) => selectedProductIds.includes(p.id));
  const amountLabel =
    !isNaN(numAmount) && numAmount > 0
      ? `${currency === 'NIO' ? 'C$' : '$'}${numAmount.toFixed(2)}`
      : '';

  const submitLabel =
    kind === 'TRIAL'
      ? `Registrar prueba gratis de ${effectiveTrialDays} ${effectiveTrialDays === 1 ? 'día' : 'días'}`
      : `Registrar pago de ${amountLabel || '—'}`;

  const periodText =
    period?.start && period?.end
      ? `del ${formatDateClean(period.start)} al ${formatDateClean(period.end)}`
      : '';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const footer = (
    <div className="flex items-center justify-between gap-3">
      {stepIndex > 0 ? (
        <button
          type="button"
          onClick={goBack}
          disabled={isSubmitting}
          className="h-11 min-h-[44px] px-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft size={14} />
          Atrás
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="h-11 min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      )}

      {step === 'confirm' ? (
        <button
          id="btn-submit-membership-payment"
          data-testid="btn-submit-membership-payment"
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !periodValid || !paymentValid}
          className="h-11 min-h-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <CircleNotch size={14} className="animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <Check size={14} weight="bold" />
              {submitLabel}
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="h-11 min-h-[44px] px-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          Siguiente
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar membresía"
      subtitle={`Negocio: ${businessName}`}
      maxWidth="max-w-lg"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Indicador de pasos */}
        <ol className="flex items-center gap-2" aria-label="Pasos">
          {steps.map((s, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={s.key} className="flex-1 min-w-0">
                <div
                  className={`h-1.5 rounded-full ${
                    done || current ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                />
                <span
                  className={`mt-1.5 block text-xs truncate ${
                    current ? 'font-semibold text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {i + 1}. {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* ================= PASO 1: TIPO ================= */}
        {step === 'type' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">¿Qué vas a registrar?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={kind === 'PAID'}
                onClick={() => setKind('PAID')}
                className={`min-h-[44px] p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  kind === 'PAID'
                    ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Money size={22} weight="duotone" className="text-emerald-600" />
                  {kind === 'PAID' && <Check size={16} weight="bold" className="text-gray-900" />}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">Pago recibido</p>
                <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                  El cliente pagó. Cuenta como ingreso y extiende la vigencia.
                </p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={kind === 'TRIAL'}
                aria-disabled={!canUseNewContract}
                onClick={() => canUseNewContract && setKind('TRIAL')}
                className={`min-h-[44px] p-4 rounded-xl border text-left transition-all ${
                  !canUseNewContract
                    ? 'border-dashed border-gray-200 bg-gray-50 cursor-not-allowed'
                    : kind === 'TRIAL'
                    ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50/50 cursor-pointer'
                    : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Gift
                    size={22}
                    weight="duotone"
                    className={canUseNewContract ? 'text-purple-600' : 'text-gray-400'}
                  />
                  {kind === 'TRIAL' && <Check size={16} weight="bold" className="text-purple-700" />}
                </div>
                <p
                  className={`mt-2 text-sm font-semibold ${
                    canUseNewContract ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Prueba gratis
                </p>
                <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                  {checkingSupport
                    ? 'Revisando si el API lo permite...'
                    : canUseNewContract
                    ? 'Sin cobro. Da acceso por unos días y no cuenta como ingreso.'
                    : `${SERVICE_NOTE} Hoy el API la guardaría como un pago, por eso está bloqueada.`}
                </p>
              </button>
            </div>

            {autoInitial && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Warning size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  El registro del{' '}
                  <strong>{getMembershipPeriodDates(autoInitial, anchorDay).periodStr}</strong> lo creó
                  el alta del negocio como un <strong>pago de ${Number(autoInitial.amount).toFixed(2)}</strong>.
                  Si en realidad fue prueba gratis, anulalo en el historial antes de registrar el primer
                  pago real.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= PASO 2: PERÍODO ================= */}
        {step === 'period' && (
          <div className="space-y-4">
            {kind === 'PAID' ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">¿Desde cuándo cubre este pago?</p>

                {(
                  [
                    {
                      mode: 'CONTINUE' as const,
                      title: 'Renovar',
                      desc: latestActive
                        ? `Continúa el período actual, que vence el ${getMembershipPeriodDates(latestActive, anchorDay).dueFormatted}.`
                        : 'Primer pago: empieza en la fecha en que se recibió.',
                      enabled: true,
                    },
                    {
                      mode: 'TODAY' as const,
                      title: 'Empieza hoy',
                      desc: canUseNewContract
                        ? `Ideal después de una prueba o para reactivar. El día de cobro pasa a ser el ${today.getDate()}.`
                        : SERVICE_NOTE,
                      enabled: canUseNewContract,
                    },
                    {
                      mode: 'CUSTOM' as const,
                      title: 'Otra fecha',
                      desc: canUseNewContract ? 'Elegís el día de inicio a mano.' : SERVICE_NOTE,
                      enabled: canUseNewContract,
                    },
                  ]
                ).map((opt) => {
                  const selected = startMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={!opt.enabled}
                      onClick={() => opt.enabled && setStartMode(opt.mode)}
                      className={`w-full min-h-[44px] p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        !opt.enabled
                          ? 'border-dashed border-gray-200 bg-gray-50 cursor-not-allowed'
                          : selected
                          ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50 cursor-pointer'
                          : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          selected && opt.enabled ? 'border-gray-900' : 'border-gray-300'
                        }`}
                      >
                        {selected && opt.enabled && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold ${
                            opt.enabled ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {opt.title}
                        </span>
                        <span className="block text-xs text-gray-600 leading-relaxed">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}

                {startMode === 'CUSTOM' && canUseNewContract && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de inicio</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">¿Cuántos días de prueba?</p>
                <div className="flex flex-wrap gap-2">
                  {TRIAL_DAY_OPTIONS.map((d) => {
                    const selected = !customTrialDays.trim() && trialDays === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setTrialDays(d);
                          setCustomTrialDays('');
                        }}
                        className={`h-11 min-h-[44px] px-4 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'border-purple-600 bg-purple-50 text-purple-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {d} días
                      </button>
                    );
                  })}
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={customTrialDays}
                    onChange={(e) => setCustomTrialDays(e.target.value)}
                    placeholder="Otro"
                    aria-label="Días de prueba personalizados"
                    className="h-11 w-24 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-500">La prueba empieza hoy.</p>
              </div>
            )}

            {/* Resultado */}
            <div
              className={`p-4 rounded-xl border ${
                kind === 'TRIAL' ? 'bg-purple-50/60 border-purple-200' : 'bg-emerald-50/60 border-emerald-200'
              }`}
            >
              <p className="text-xs font-medium text-gray-600">
                {kind === 'TRIAL' ? 'La prueba va' : 'Este pago cubre'}
              </p>
              {isLoadingPreview ? (
                <p className="mt-1 text-sm text-gray-500 flex items-center gap-1.5">
                  <CircleNotch size={14} className="animate-spin" /> Calculando...
                </p>
              ) : period?.start && period?.end ? (
                <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900">{periodText}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {previewError || 'Elegí una opción disponible para ver el período.'}
                </p>
              )}
              {period && (
                <p className="mt-1 text-xs text-gray-600">
                  {period.source === 'api'
                    ? 'Calculado por el API: es exactamente lo que se va a guardar.'
                    : 'Estimado con la regla actual del API (encadena al último registro).'}
                  {period.anchor ? ` Día de cobro: ${period.anchor}.` : ''}
                </p>
              )}
            </div>

            {period?.anchorChanges && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5">
                <Info size={18} weight="fill" className="text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Vas a cambiar el día de cobro del <strong>{period.previousAnchor ?? '—'}</strong> al{' '}
                  <strong>{period.anchor ?? '—'}</strong>. Los próximos vencimientos usarán el día nuevo.
                </p>
              </div>
            )}

            {period?.warnings.map((w) => (
              <div
                key={w}
                className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
              >
                <Warning size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{w}</p>
              </div>
            ))}

            {chainsOnCancelled && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                <Warning size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  El API actual todavía cuenta las membresías <strong>anuladas</strong> al encadenar. Por
                  eso este pago quedaría {periodText}, aunque esos períodos estén anulados. Si el pago es
                  de este mes, esperá la actualización del API (252b).
                </p>
              </div>
            )}

            {startsFarAhead && !chainsOnCancelled && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Warning size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Este período empieza dentro de <strong>{daysUntilStart} días</strong>: ya hay pagos que
                  cubren hasta el {period?.start ? formatDateClean(period.start) : '—'}. Si este pago es
                  del mes actual, revisá el historial: puede haber registros duplicados.
                </p>
              </div>
            )}

            {needsUnusualConfirm && period?.start && (
              <label className="flex items-start gap-3 p-3 min-h-[44px] rounded-xl border border-gray-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmUnusualPeriod}
                  onChange={(e) => setConfirmUnusualPeriod(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-gray-900 shrink-0"
                />
                <span className="text-xs text-gray-800 leading-relaxed">
                  Confirmo que este pago corresponde al período {periodText}.
                </span>
              </label>
            )}
          </div>
        )}

        {/* ================= PASO 3: PAGO ================= */}
        {step === 'payment' && kind === 'PAID' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700">Productos que cubre</label>
                {availableProducts.length > 1 && (
                  <span className="text-xs text-gray-500">Uno o varios</span>
                )}
              </div>

              {availableProducts.length === 0 ? (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                  Este negocio no tiene productos de membresía disponibles.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableProducts.map((prod) => {
                    const isSelected = selectedProductIds.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => toggleProduct(prod.id)}
                        className={`min-h-[44px] p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                          isSelected ? `${prod.activeColor}` : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {prod.icon}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{prod.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {prod.subtitle} · {prod.isCurrentlyActive ? 'Activo' : 'Inactivo'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={12} weight="bold" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Monto pagado</label>
                <div className="relative">
                  <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${
                      currency === 'NIO' ? 'text-amber-700' : 'text-gray-500'
                    }`}
                  >
                    {currency === 'NIO' ? 'C$' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={currency === 'USD' ? '0.00' : 'Ej: 1500.00'}
                    className={`w-full h-11 ${
                      currency === 'NIO' ? 'pl-9' : 'pl-7'
                    } pr-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 font-semibold font-mono`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="NIO">NIO (C$)</option>
                </select>
              </div>
            </div>
            <p className="-mt-2 text-xs text-gray-500">
              {currency === 'USD'
                ? selectedProductIds.length > 0
                  ? 'Monto sugerido según las tarifas de los productos. Editalo si hubo descuento.'
                  : 'Elegí productos para sugerir el monto.'
                : 'No hay tasa de cambio oficial: ingresá el monto en córdobas.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha en que se recibió</label>
                <input
                  type="date"
                  value={paidAt}
                  max={todayStr}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Comprobante (opcional)</label>
              {file ? (
                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Comprobante"
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                        <FilePdf size={24} weight="duotone" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    aria-label="Quitar comprobante"
                    className="w-11 h-11 min-w-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center min-h-[44px] p-4 border-2 border-dashed border-gray-200 hover:border-gray-900 rounded-xl cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <UploadSimple size={20} className="text-gray-500 mb-1" />
                  <span className="text-xs font-medium text-gray-700">Subir comprobante (PDF o imagen)</span>
                  <span className="text-xs text-gray-500 mt-0.5">JPG, PNG, WebP o PDF (máx. 5 MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notas internas (opcional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Primer pago después de la prueba, vía BAC"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* ================= PASO 4: CONFIRMAR ================= */}
        {step === 'confirm' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Revisá antes de registrar</p>

            <div
              className={`rounded-xl border overflow-hidden ${
                kind === 'TRIAL' ? 'border-purple-200' : 'border-gray-200'
              }`}
            >
              <div
                className={`px-4 py-3 flex items-center gap-2 ${
                  kind === 'TRIAL' ? 'bg-purple-50' : 'bg-emerald-50'
                }`}
              >
                {kind === 'TRIAL' ? (
                  <Gift size={20} weight="duotone" className="text-purple-600" />
                ) : (
                  <Money size={20} weight="duotone" className="text-emerald-600" />
                )}
                <span className="text-sm font-semibold text-gray-900">
                  {kind === 'TRIAL' ? 'Prueba gratis (sin cobro)' : 'Pago recibido'}
                </span>
              </div>

              <dl className="divide-y divide-gray-100 text-xs">
                <div className="px-4 py-2.5 flex justify-between gap-3">
                  <dt className="text-gray-500">Período</dt>
                  <dd className="font-semibold text-gray-900 text-right">{periodText || '—'}</dd>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-3">
                  <dt className="text-gray-500">Día de cobro</dt>
                  <dd
                    className={`text-right ${
                      period?.anchorChanges ? 'font-semibold text-sky-800' : 'text-gray-900'
                    }`}
                  >
                    {period?.anchor ?? '—'}
                    {period?.anchorChanges ? ` (antes ${period.previousAnchor ?? '—'})` : ''}
                  </dd>
                </div>
                {kind === 'PAID' && (
                  <>
                    <div className="px-4 py-2.5 flex justify-between gap-3">
                      <dt className="text-gray-500">Productos</dt>
                      <dd className="text-gray-900 text-right">
                        {selectedProducts.length > 0
                          ? selectedProducts.map((p) => p.name).join(', ')
                          : 'Sin especificar'}
                      </dd>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between gap-3">
                      <dt className="text-gray-500">Monto</dt>
                      <dd className="font-semibold text-gray-900 text-right">
                        {amountLabel} {currency}
                      </dd>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between gap-3">
                      <dt className="text-gray-500">Método</dt>
                      <dd className="text-gray-900 text-right">
                        {PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod}
                      </dd>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between gap-3">
                      <dt className="text-gray-500">Recibido el</dt>
                      <dd className="text-gray-900 text-right">{formatDateClean(paidAt)}</dd>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between gap-3">
                      <dt className="text-gray-500">Comprobante</dt>
                      <dd className="text-gray-900 text-right truncate max-w-[60%]">
                        {file ? file.name : 'Sin comprobante'}
                      </dd>
                    </div>
                  </>
                )}
                {kind === 'TRIAL' && (
                  <div className="px-4 py-2.5 flex justify-between gap-3">
                    <dt className="text-gray-500">Duración</dt>
                    <dd className="text-gray-900 text-right">
                      {effectiveTrialDays} {effectiveTrialDays === 1 ? 'día' : 'días'}, monto $0.00
                    </dd>
                  </div>
                )}
                {notes.trim() && (
                  <div className="px-4 py-2.5 flex justify-between gap-3">
                    <dt className="text-gray-500">Notas</dt>
                    <dd className="text-gray-900 text-right">{notes.trim()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {period?.source === 'estimate' && (
              <p className="text-xs text-gray-500 leading-relaxed">
                El período es un estimado con la regla actual del API. Si el API guarda otra fecha, revisala
                en el historial y anulá el registro si no corresponde.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
