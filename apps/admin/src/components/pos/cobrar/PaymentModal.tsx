import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Money,
  CreditCard,
  ArrowsLeftRight,
  CircleNotch,
  WarningCircle,
  Receipt,
  Plus,
  Trash,
  ShieldCheck,
  CheckCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import {
  getPosExchangeRate,
  getPosBanks,
  type PosBankItem,
  type CreateSalePaymentPayload,
  type CreateSaleTipPayload,
  type CreditPlanPayload,
} from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import { calculateTipFromTotal, type CalculatedSaleSummary } from '../../../utils/saleCalculation';
import { usePosPolicies } from '../../../hooks/usePosPolicies';
import {
  computeCreditPlanPreview,
  getDefaultFirstDueDate,
  formatCalendarDate,
  type CreditPlanPreviewResult,
} from '../../../utils/creditPlan';
import { CustomerSelector, type SelectedCustomerData } from './CustomerSelector';
import { ManagerApprovalModal } from './ManagerApprovalModal';

export interface FinalPaymentSubmission {
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'MIXTO';
  amountPaid: number;
  amountTendered?: number;
  change?: number;
  reference?: string;
  bankId?: string;
  bankName?: string;
  currency?: string;
  exchangeRate?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerRuc?: string;
  notes?: string;
  creditDueDate?: string;
  creditPlan?: CreditPlanPayload;
  approvalToken?: string;
  payments: CreateSalePaymentPayload[];
  tip?: CreateSaleTipPayload;
  clientGeneratedId: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  discountAmount: number;
  calcSummary?: CalculatedSaleSummary;
  onSubmitSale: (paymentData: FinalPaymentSubmission) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onReloadProducts?: () => void;
  userRole?: string;
  carteraActive?: boolean;
  posVertical?: string;
  deliveryChannelEnabled?: boolean;
  channel?: string;
}

interface MixedPaymentLine {
  id: string;
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  currency: 'NIO' | 'USD';
  amountStr: string;
  amountTenderedStr: string;
  reference: string;
  bankId: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  calcSummary,
  onSubmitSale,
  isSubmitting,
  errorMessage,
  onReloadProducts,
  userRole = 'CAJERO',
  carteraActive = true,
  posVertical = 'RETAIL',
  deliveryChannelEnabled = false,
  channel = 'MOSTRADOR',
}) => {
  const {
    enabledPaymentMethods,
    multiCurrencyEnabled,
    requireReferenceCard,
    requireReferenceTransfer,
    requireBankCardTransfer,
    creditInterestEnabled,
    creditInterestType,
    creditInterestRate,
    creditMaxInstallments,
    creditAllowedFrequencies,
    creditLimitOverrideRequiresApproval,
    tipEnabled,
    tipDefaultPercent,
  } = usePosPolicies(isOpen);

  // Cliente seleccionado (por defecto Consumidor final)
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomerData>({
    id: null,
    name: 'Consumidor final',
  });

  // Modalidad principal de cobro
  const [activeTab, setActiveTab] = useState<'SIMPLE' | 'MIXTO'>('SIMPLE');
  const [singleMethod, setSingleMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'>('EFECTIVO');

  // Multimoneda (USD)
  const [currency, setCurrency] = useState<'NIO' | 'USD'>('NIO');
  const [exchangeRate, setExchangeRate] = useState<number>(36.6242);
  // exchange rate loading handled inline

  // Bancos disponibles para tarjeta / transferencia
  const [banks, setBanks] = useState<PosBankItem[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // Efectivo
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>('');

  // Referencias para tarjeta y transferencia
  const [reference, setReference] = useState('');

  // Notas de la venta
  const [notes, setNotes] = useState('');

  // Líneas de Pago Mixto
  const [mixedLines, setMixedLines] = useState<MixedPaymentLine[]>([]);

  // Configuración de Crédito
  const [creditMode, setCreditMode] = useState<'SINGLE' | 'INSTALLMENTS'>('INSTALLMENTS');
  const [singleDueDate, setSingleDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [creditInstallmentsCount, setCreditInstallmentsCount] = useState<number>(4);
  const [creditFrequency, setCreditFrequency] = useState<'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('QUINCENAL');
  const [creditFirstDueDate, setCreditFirstDueDate] = useState<string>(() => {
    return getDefaultFirstDueDate('QUINCENAL');
  });
  const [creditPrimaStr, setCreditPrimaStr] = useState<string>('0');

  // Autorización de encargado (Override de límite de crédito)
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Clave de Idempotencia por intento (se mantiene en reintentos mientras el modal esté abierto)
  const idempotencyKeyRef = useRef<string>('');

  // Propina voluntaria
  const [tipMode, setTipMode] = useState<'NONE' | 'PERCENT' | 'CUSTOM'>('NONE');
  const [tipMethod, setTipMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [tipCurrency, setTipCurrency] = useState<'NIO' | 'USD'>('NIO');
  const [tipCustomAmountStr, setTipCustomAmountStr] = useState<string>('');
  const [tipBankId, setTipBankId] = useState<string>('');
  const [tipReference, setTipReference] = useState<string>('');

  const [localError, setLocalError] = useState<string | null>(null);

  const tipBlockedByChannel = ['PEDIDOSYA', 'DOMICILIO', 'WHATSAPP'].includes(channel);
  const canOfferTip = Boolean(tipEnabled && !tipBlockedByChannel);

  // Inicializar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      setAmountTenderedStr(total.toFixed(2));
      setCurrency('NIO');
      setReference('');
      setNotes('');
      setLocalError(null);
      setApprovalToken(null);
      setCreditPrimaStr('0');
      setTipMode('NONE');
      setTipMethod('EFECTIVO');
      setTipCurrency('NIO');
      setTipCustomAmountStr('');
      setTipBankId('');
      setTipReference('');

      // Si multimoneda o propina están activas, cargar tasa de cambio
      if (multiCurrencyEnabled || tipEnabled) {
        getPosExchangeRate()
          .then((rateData) => {
            if (rateData && typeof rateData.rate === 'number') {
              setExchangeRate(rateData.rate);
            }
          })
          .catch(() => {});
      }

      // Cargar bancos si se requieren
      getPosBanks()
        .then((bList) => {
          setBanks(bList || []);
          if (bList && bList.length > 0) {
            setSelectedBankId(bList[0].id);
            setTipBankId(bList[0].id);
          }
        })
        .catch(() => {});

      // Inicializar líneas de pago mixto
      setMixedLines([
        {
          id: 'line-1',
          method: 'EFECTIVO',
          currency: 'NIO',
          amountStr: (total / 2).toFixed(2),
          amountTenderedStr: (total / 2).toFixed(2),
          reference: '',
          bankId: '',
        },
        {
          id: 'line-2',
          method: 'TRANSFERENCIA',
          currency: 'NIO',
          amountStr: (total - total / 2).toFixed(2),
          amountTenderedStr: (total - total / 2).toFixed(2),
          reference: '',
          bankId: '',
        },
      ]);
    } else {
      // Limpiar clave cuando se cierra
      idempotencyKeyRef.current = '';
    }
  }, [isOpen, total, multiCurrencyEnabled, tipEnabled]);

  // Actualizar primera fecha de pago de crédito cuando cambia la frecuencia
  useEffect(() => {
    setCreditFirstDueDate(getDefaultFirstDueDate(creditFrequency));
  }, [creditFrequency]);

  // Cálculos de montos en moneda extranjera y vuelto
  const numericPrima = Math.max(0, parseFloat(creditPrimaStr) || 0);

  // Equivalente en dólares del total
  const totalInUsd = useMemo(() => {
    return Math.ceil((total / exchangeRate) * 100) / 100;
  }, [total, exchangeRate]);

  // Cálculos de propina voluntaria (siempre separada de payments[])
  const tipPercentAmountNio = useMemo(() => {
    return calculateTipFromTotal(total, tipDefaultPercent);
  }, [total, tipDefaultPercent]);

  const effectiveTipCurrency: 'NIO' | 'USD' =
    tipMode === 'CUSTOM' && tipMethod === 'EFECTIVO' ? tipCurrency : 'NIO';

  const parsedCustomTipAmount = useMemo(() => {
    const val = parseFloat(tipCustomAmountStr);
    return Number.isFinite(val) ? val : 0;
  }, [tipCustomAmountStr]);

  const tipPreviewNio = useMemo(() => {
    if (!canOfferTip || tipMode === 'NONE') return 0;
    if (tipMode === 'PERCENT') return tipPercentAmountNio;
    if (parsedCustomTipAmount <= 0) return 0;
    if (effectiveTipCurrency === 'USD') {
      return Math.round(parsedCustomTipAmount * exchangeRate * 100) / 100;
    }
    return Math.round(parsedCustomTipAmount * 100) / 100;
  }, [canOfferTip, tipMode, tipPercentAmountNio, parsedCustomTipAmount, effectiveTipCurrency, exchangeRate]);

  const isTipCustomInvalid = canOfferTip && tipMode === 'CUSTOM' && parsedCustomTipAmount <= 0;
  const totalWithTip = Math.round((total + tipPreviewNio) * 100) / 100;

  // Monto recibido
  const amountTendered = useMemo(() => {
    const val = parseFloat(amountTenderedStr) || 0;
    return val;
  }, [amountTenderedStr]);

  // Monto cubierto en córdobas por el pago simple
  const singleCoveredNio = useMemo(() => {
    if (singleMethod === 'CREDITO') {
      return total; // El crédito cubre el total (menos prima pagada)
    }
    if (currency === 'USD') {
      return Math.round(amountTendered * exchangeRate * 100) / 100;
    }
    return amountTendered;
  }, [singleMethod, currency, amountTendered, exchangeRate, total]);

  // Vuelto / Cambio en córdobas
  const singleChangeNio = useMemo(() => {
    if (singleMethod === 'CREDITO') return 0;
    const diff = singleCoveredNio - total;
    return diff > 0 ? Math.round(diff * 100) / 100 : 0;
  }, [singleCoveredNio, total, singleMethod]);

  const isSingleShort = useMemo(() => {
    if (singleMethod === 'CREDITO') return false;
    return singleCoveredNio < total - 0.009;
  }, [singleCoveredNio, total, singleMethod]);

  // Sugerencias de billetes rápidos
  const quickBills = useMemo(() => {
    if (currency === 'USD') {
      const bills = [1, 5, 10, 20, 50, 100];
      const suggestions = bills.filter((b) => b >= totalInUsd);
      return (suggestions.length > 0 ? suggestions : bills).slice(0, 4);
    } else {
      const bills = [50, 100, 200, 500, 1000];
      const suggestions = bills.filter((b) => b >= total);
      return (suggestions.length > 0 ? suggestions : bills).slice(0, 4);
    }
  }, [currency, total, totalInUsd]);

  // Vista previa del plan de crédito con computeCreditPlanPreview
  const creditPlanPreview: CreditPlanPreviewResult | null = useMemo(() => {
    if (singleMethod !== 'CREDITO') return null;

    if (creditMode === 'SINGLE') {
      return null;
    }

    const preview = computeCreditPlanPreview({
      mode: 'INSTALLMENTS',
      total,
      downPayment: numericPrima,
      installmentsCount: creditInstallmentsCount,
      frequency: creditFrequency,
      firstDueDate: creditFirstDueDate,
      interestEnabled: creditInterestEnabled,
      interestType: creditInterestType,
      interestRate: creditInterestRate,
    });

    return preview;
  }, [
    singleMethod,
    creditMode,
    total,
    numericPrima,
    creditInstallmentsCount,
    creditFrequency,
    creditFirstDueDate,
    creditInterestEnabled,
    creditInterestType,
    creditInterestRate,
  ]);

  // Validación de Límite de Crédito
  const creditValidation = useMemo(() => {
    if (singleMethod !== 'CREDITO') return { valid: true };

    if (!selectedCustomer.id || selectedCustomer.name === 'Consumidor final') {
      return {
        valid: false,
        error: 'Para vender al crédito debés seleccionar un cliente identificado con cuenta activa.',
        requiresCustomer: true,
      };
    }

    const available = selectedCustomer.creditSummary?.availableCredit;
    const requested = total - numericPrima;

    if (available !== null && available !== undefined && requested > available) {
      const isExceeded = true;
      return {
        valid: Boolean(approvalToken) || userRole === 'ENCARGADO' || userRole === 'SUPERADMIN',
        isExceeded,
        available,
        requested,
        error: `El crédito solicitado (${formatCurrency(requested)}) supera el disponible (${formatCurrency(available)}).`,
        needsApproval: creditLimitOverrideRequiresApproval && !approvalToken && userRole === 'CAJERO',
      };
    }

    return { valid: true, isExceeded: false };
  }, [singleMethod, selectedCustomer, total, numericPrima, approvalToken, userRole]);

  // Cálculos de Pago Mixto
  const mixedSummary = useMemo(() => {
    let totalCoveredNio = 0;
    mixedLines.forEach((line) => {
      const amt = parseFloat(line.amountStr) || 0;
      if (line.currency === 'USD') {
        totalCoveredNio += amt * exchangeRate;
      } else {
        totalCoveredNio += amt;
      }
    });

    totalCoveredNio = Math.round(totalCoveredNio * 100) / 100;
    const remainingNio = Math.max(0, Math.round((total - totalCoveredNio) * 100) / 100);
    const changeNio = Math.max(0, Math.round((totalCoveredNio - total) * 100) / 100);
    const isCovered = totalCoveredNio >= total - 0.01;

    return {
      totalCoveredNio,
      remainingNio,
      changeNio,
      isCovered,
    };
  }, [mixedLines, total, exchangeRate]);

  // Acciones en líneas de pago mixto
  const handleAddMixedLine = () => {
    const remaining = mixedSummary.remainingNio > 0 ? mixedSummary.remainingNio : 0;
    const newLine: MixedPaymentLine = {
      id: `line-${Date.now()}`,
      method: 'EFECTIVO',
      currency: 'NIO',
      amountStr: remaining > 0 ? remaining.toFixed(2) : '0.00',
      amountTenderedStr: remaining > 0 ? remaining.toFixed(2) : '0.00',
      reference: '',
      bankId: banks[0]?.id || '',
    };
    setMixedLines((prev) => [...prev, newLine]);
  };

  const handleUpdateMixedLine = (id: string, updates: Partial<MixedPaymentLine>) => {
    setMixedLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleRemoveMixedLine = (id: string) => {
    if (mixedLines.length <= 1) return;
    setMixedLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Envío final del cobro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setLocalError(null);

    // Validación de turno e idempotencia
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `pos-${Date.now()}`;
    }

    // Validación de propina voluntaria (nunca se mezcla con payments[])
    let tipPayload: CreateSaleTipPayload | undefined = undefined;
    if (canOfferTip && tipMode !== 'NONE') {
      const cleanBankId =
        (tipMethod === 'TARJETA' || tipMethod === 'TRANSFERENCIA') && tipBankId
          ? tipBankId
          : undefined;
      const cleanRef =
        (tipMethod === 'TARJETA' || tipMethod === 'TRANSFERENCIA') && tipReference.trim()
          ? tipReference.trim()
          : undefined;

      if (tipMode === 'PERCENT') {
        if (tipPercentAmountNio > 0) {
          tipPayload = {
            mode: 'PERCENT',
            percent: tipDefaultPercent,
            currency: 'NIO',
            paymentMethod: tipMethod,
            bankId: cleanBankId,
            reference: cleanRef,
          };
        }
      } else if (tipMode === 'CUSTOM') {
        if (!Number.isFinite(parsedCustomTipAmount) || parsedCustomTipAmount <= 0) {
          setLocalError('Ingresá un monto de propina mayor a cero.');
          return;
        }
        tipPayload = {
          mode: 'CUSTOM',
          amount: Math.round(parsedCustomTipAmount * 100) / 100,
          currency: effectiveTipCurrency,
          exchangeRate: effectiveTipCurrency === 'USD' ? exchangeRate : undefined,
          paymentMethod: tipMethod,
          bankId: cleanBankId,
          reference: cleanRef,
        };
      }
    }

    // 1. Validaciones Pago Mixto
    if (activeTab === 'MIXTO') {
      if (!mixedSummary.isCovered) {
        setLocalError(`Aún faltan ${formatCurrency(mixedSummary.remainingNio)} para cubrir el total de la venta.`);
        return;
      }

      // Validar referencias y bancos si políticas lo exigen
      for (const line of mixedLines) {
        if (line.method === 'TARJETA' && requireReferenceCard && !line.reference.trim()) {
          setLocalError('El número de referencia o voucher de la tarjeta es obligatorio.');
          return;
        }
        if (line.method === 'TRANSFERENCIA' && requireReferenceTransfer && !line.reference.trim()) {
          setLocalError('El número de referencia de la transferencia es obligatorio.');
          return;
        }
        if ((line.method === 'TARJETA' || line.method === 'TRANSFERENCIA') && requireBankCardTransfer && !line.bankId) {
          setLocalError('Debés seleccionar el banco emisor o receptor.');
          return;
        }
      }

      const paymentsPayload: CreateSalePaymentPayload[] = mixedLines.map((line) => {
        const amt = parseFloat(line.amountStr) || 0;
        const bankObj = banks.find((b) => b.id === line.bankId);
        return {
          method: line.method,
          currency: line.currency,
          exchangeRate: line.currency === 'USD' ? exchangeRate : undefined,
          amount: amt,
          amountTendered: parseFloat(line.amountTenderedStr) || amt,
          reference: line.reference.trim() || undefined,
          bankId: line.bankId || undefined,
          bankName: bankObj?.name,
        };
      });

      const submission: FinalPaymentSubmission = {
        method: 'MIXTO',
        amountPaid: mixedSummary.totalCoveredNio,
        change: mixedSummary.changeNio,
        customerName: selectedCustomer.name !== 'Consumidor final' ? selectedCustomer.name : undefined,
        customerPhone: selectedCustomer.phone || undefined,
        customerId: selectedCustomer.id || undefined,
        customerRuc: selectedCustomer.ruc || undefined,
        notes: notes.trim() || undefined,
        payments: paymentsPayload,
        tip: tipPayload,
        clientGeneratedId: idempotencyKeyRef.current,
      };

      try {
        await onSubmitSale(submission);
      } catch {
        // El error ya es manejado en el componente padre
      }
      return;
    }

    // 2. Validaciones Pago Simple
    if (singleMethod === 'EFECTIVO' && isSingleShort) {
      setLocalError(
        `El monto recibido (${formatCurrency(singleCoveredNio)}) no alcanza a cubrir el total (${formatCurrency(total)}).`,
      );
      return;
    }

    if (singleMethod === 'TARJETA') {
      if (requireReferenceCard && !reference.trim()) {
        setLocalError('El número de referencia o voucher de la tarjeta es obligatorio según las políticas del negocio.');
        return;
      }
      if (requireBankCardTransfer && !selectedBankId) {
        setLocalError('Debés seleccionar el banco procesador.');
        return;
      }
    }

    if (singleMethod === 'TRANSFERENCIA') {
      if (requireReferenceTransfer && !reference.trim()) {
        setLocalError('El número de referencia de la transferencia es obligatorio según las políticas del negocio.');
        return;
      }
      if (requireBankCardTransfer && !selectedBankId) {
        setLocalError('Debés seleccionar el banco receptor.');
        return;
      }
    }

    // 3. Validación de Crédito
    if (singleMethod === 'CREDITO') {
      if (!selectedCustomer.id || selectedCustomer.name === 'Consumidor final') {
        setLocalError('Para otorgar crédito debés seleccionar un cliente registrado.');
        return;
      }

      if (creditValidation.isExceeded && !creditValidation.valid) {
        setLocalError('El monto solicitado supera el límite de crédito disponible. Requiere autorización de encargado.');
        return;
      }
    }

    const selectedBankObj = banks.find((b) => b.id === selectedBankId);

    let creditPlanPayload: CreditPlanPayload | undefined = undefined;
    let finalDueDateStr: string | undefined = undefined;

    if (singleMethod === 'CREDITO') {
      if (creditMode === 'SINGLE') {
        finalDueDateStr = singleDueDate;
      } else if (creditPlanPreview) {
        finalDueDateStr = creditPlanPreview.finalDueDate;
        creditPlanPayload = {
          installmentsCount: creditInstallmentsCount,
          frequency: creditFrequency,
          firstDueDate: creditFirstDueDate,
          interestRate: creditInterestEnabled ? creditInterestRate : 0,
          interestAmount: creditPlanPreview.interestAmount,
          prima: numericPrima,
          approvalToken: approvalToken || undefined,
        };
      }
    }

    const paymentLine: CreateSalePaymentPayload = {
      method: singleMethod,
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : undefined,
      amount: currency === 'USD' ? totalInUsd : total,
      amountTendered: singleMethod === 'EFECTIVO' ? amountTendered : total,
      reference: reference.trim() || undefined,
      bankId: selectedBankId || undefined,
      bankName: selectedBankObj?.name,
    };

    const submission: FinalPaymentSubmission = {
      method: singleMethod,
      amountPaid: singleMethod === 'EFECTIVO' ? singleCoveredNio : total,
      amountTendered: singleMethod === 'EFECTIVO' ? amountTendered : total,
      change: singleChangeNio,
      reference: reference.trim() || undefined,
      bankId: selectedBankId || undefined,
      bankName: selectedBankObj?.name,
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : undefined,
      customerId: selectedCustomer.id || undefined,
      customerName: selectedCustomer.name !== 'Consumidor final' ? selectedCustomer.name : undefined,
      customerPhone: selectedCustomer.phone || undefined,
      customerRuc: selectedCustomer.ruc || undefined,
      notes: notes.trim() || undefined,
      creditDueDate: finalDueDateStr,
      creditPlan: creditPlanPayload,
      approvalToken: approvalToken || undefined,
      payments: [paymentLine],
      tip: tipPayload,
      clientGeneratedId: idempotencyKeyRef.current,
    };

    try {
      await onSubmitSale(submission);
    } catch {
      // Manejado arriba
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs select-none p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Encabezado */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-xs">
              POS
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">Cobrar venta</h3>
              <p className="text-xs text-gray-500">Comprobante y forma de pago</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario scrolleable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Display de Total */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
              {calcSummary && calcSummary.taxAmount > 0
                ? 'Total de la venta (con IVA)'
                : 'Total de la venta'}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight tabular-nums whitespace-nowrap">
              {formatCurrency(total)}
            </div>
            {tipPreviewNio > 0 && (
              <div className="mt-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 tabular-nums">
                <span>+ Propina: {formatCurrency(tipPreviewNio)}</span>
                <span className="text-amber-500">•</span>
                <span className="text-emerald-950 font-black">
                  Total a cobrar: {formatCurrency(totalWithTip)}
                </span>
              </div>
            )}
            {multiCurrencyEnabled && (
              <div className="text-xs text-emerald-900/80 font-bold mt-1.5 inline-flex items-center gap-1.5 bg-emerald-100/60 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                <span>Equivalente venta: US$ {totalInUsd.toFixed(2)}</span>
                <span className="text-gray-400">•</span>
                <span className="text-xs font-medium text-emerald-800">
                  Tasa: C$ {exchangeRate.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Errores del API o de validación local */}
          {(localError || errorMessage) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={17} className="shrink-0 mt-0.5" weight="fill" />
              <div className="flex-1">
                <span>{localError || errorMessage}</span>
                {errorMessage && (errorMessage.includes('precio') || errorMessage.includes('stock') || errorMessage.includes('PRICE_MISMATCH')) && onReloadProducts && (
                  <button
                    type="button"
                    onClick={onReloadProducts}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold text-xs cursor-pointer min-h-[44px]"
                  >
                    <ArrowsClockwise size={15} />
                    <span>Recargar catálogo y actualizar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. Selector de Cliente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Cliente de la venta
            </label>
            <CustomerSelector
              selectedCustomer={selectedCustomer}
              onChangeCustomer={(c) => {
                setSelectedCustomer(c);
                setApprovalToken(null);
              }}
              carteraActive={carteraActive}
              userRole={userRole}
              posVertical={posVertical}
              deliveryChannelEnabled={deliveryChannelEnabled}
            />
          </div>

          {/* 2. Modalidad: Simple vs Mixto */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('SIMPLE')}
              className={`px-3 py-2 rounded-lg transition-all min-h-[44px] flex items-center justify-center text-center leading-tight whitespace-normal cursor-pointer ${
                activeTab === 'SIMPLE' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pago único
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MIXTO')}
              className={`px-3 py-2 rounded-lg transition-all min-h-[44px] flex items-center justify-center text-center leading-tight whitespace-normal cursor-pointer ${
                activeTab === 'MIXTO' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pago mixto (combinar)
            </button>
          </div>

          {/* VISTA 1: PAGO ÚNICO */}
          {activeTab === 'SIMPLE' && (
            <div className="space-y-3.5">
              {/* Selector de Métodos de Pago */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Método de pago
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {enabledPaymentMethods.includes('EFECTIVO') && (
                    <button
                      type="button"
                      onClick={() => setSingleMethod('EFECTIVO')}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 min-h-[52px] cursor-pointer transition-all ${
                        singleMethod === 'EFECTIVO'
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Money size={18} weight={singleMethod === 'EFECTIVO' ? 'fill' : 'regular'} />
                      <span>Efectivo</span>
                    </button>
                  )}

                  {enabledPaymentMethods.includes('TARJETA') && (
                    <button
                      type="button"
                      onClick={() => setSingleMethod('TARJETA')}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 min-h-[52px] cursor-pointer transition-all ${
                        singleMethod === 'TARJETA'
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard size={18} weight={singleMethod === 'TARJETA' ? 'fill' : 'regular'} />
                      <span>Tarjeta</span>
                    </button>
                  )}

                  {enabledPaymentMethods.includes('TRANSFERENCIA') && (
                    <button
                      type="button"
                      onClick={() => setSingleMethod('TRANSFERENCIA')}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 min-h-[52px] cursor-pointer transition-all ${
                        singleMethod === 'TRANSFERENCIA'
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowsLeftRight size={18} weight={singleMethod === 'TRANSFERENCIA' ? 'bold' : 'regular'} />
                      <span>Transferencia</span>
                    </button>
                  )}

                  {enabledPaymentMethods.includes('CREDITO') && carteraActive && (
                    <button
                      type="button"
                      onClick={() => setSingleMethod('CREDITO')}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 min-h-[52px] cursor-pointer transition-all ${
                        singleMethod === 'CREDITO'
                          ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Receipt size={18} weight={singleMethod === 'CREDITO' ? 'fill' : 'regular'} />
                      <span>Crédito</span>
                    </button>
                  )}
                </div>
              </div>

              {/* OPCIONES DE EFECTIVO */}
              {singleMethod === 'EFECTIVO' && (
                <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
                  {/* Selector Córdobas / Dólares */}
                  {multiCurrencyEnabled && (
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                      <span className="text-xs font-semibold text-gray-700">Moneda del cobro</span>
                      <div className="flex rounded-lg bg-gray-200 p-0.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrency('NIO');
                            setAmountTenderedStr(total.toFixed(2));
                          }}
                          className={`px-3 py-1 rounded-md transition-colors cursor-pointer min-h-[36px] ${
                            currency === 'NIO' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                          }`}
                        >
                          C$ Córdobas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrency('USD');
                            setAmountTenderedStr(totalInUsd.toFixed(2));
                          }}
                          className={`px-3 py-1 rounded-md transition-colors cursor-pointer min-h-[36px] ${
                            currency === 'USD' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                          }`}
                        >
                          US$ Dólares
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input de monto recibido */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Monto recibido {currency === 'USD' ? '(US$)' : '(C$)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                        {currency === 'USD' ? 'US$' : 'C$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountTenderedStr}
                        onChange={(e) => setAmountTenderedStr(e.target.value)}
                        className="w-full pl-11 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:outline-hidden focus:border-gray-900 min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Sugerencias de billetes rápidos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setAmountTenderedStr(currency === 'USD' ? totalInUsd.toFixed(2) : total.toFixed(2))
                      }
                      className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-lg border border-gray-200 min-h-[40px] cursor-pointer"
                    >
                      Exacto ({currency === 'USD' ? `US$ ${totalInUsd.toFixed(2)}` : formatCurrency(total)})
                    </button>
                    {quickBills.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setAmountTenderedStr(b.toFixed(2))}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-lg border border-gray-200 min-h-[40px] cursor-pointer"
                      >
                        {currency === 'USD' ? `US$ ${b}` : `C$ ${b}`}
                      </button>
                    ))}
                  </div>

                  {/* Cuadro de vuelto en Córdobas */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isSingleShort
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">
                        {isSingleShort ? 'Faltan para completar el total' : 'Cambio / Vuelto a entregar'}
                      </span>
                      {currency === 'USD' && !isSingleShort && (
                        <span className="text-xs text-emerald-800/80 font-normal">
                          El vuelto siempre se entrega en Córdobas (C$)
                        </span>
                      )}
                    </div>
                    <span className="text-base font-black">
                      {isSingleShort
                        ? formatCurrency(total - singleCoveredNio)
                        : formatCurrency(singleChangeNio)}
                    </span>
                  </div>
                </div>
              )}

              {/* OPCIONES DE TARJETA */}
              {singleMethod === 'TARJETA' && (
                <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                  {requireBankCardTransfer && banks.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Banco procesador *
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                      >
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code || 'POS'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Número de autorización / voucher {requireReferenceCard && '*'}
                    </label>
                    <input
                      type="text"
                      required={requireReferenceCard}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej: 123456"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px] focus:outline-hidden focus:border-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* OPCIONES DE TRANSFERENCIA */}
              {singleMethod === 'TRANSFERENCIA' && (
                <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                  {requireBankCardTransfer && banks.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Banco receptor *
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                      >
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code || 'Cuenta'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Número de referencia o confirmación {requireReferenceTransfer && '*'}
                    </label>
                    <input
                      type="text"
                      required={requireReferenceTransfer}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej: BAC-987654 / Banpro"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px] focus:outline-hidden focus:border-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* OPCIONES DE CRÉDITO */}
              {singleMethod === 'CREDITO' && (
                <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 space-y-3">
                  {/* Validación de cliente identificado */}
                  {(!selectedCustomer.id || selectedCustomer.name === 'Consumidor final') && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
                      <span>
                        Debés buscar o registrar un cliente identificado para otorgar una venta al crédito.
                      </span>
                    </div>
                  )}

                  {/* Alerta de Límite Superado */}
                  {creditValidation.isExceeded && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
                      <div className="flex items-start gap-2">
                        <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
                        <div>
                          <p className="font-bold">Límite de crédito superado</p>
                          <p className="mt-0.5">{creditValidation.error}</p>
                        </div>
                      </div>

                      {creditValidation.needsApproval && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setIsApprovalModalOpen(true)}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                          >
                            <ShieldCheck size={16} weight="bold" />
                            <span>Solicitar PIN o aprobación de encargado</span>
                          </button>
                        </div>
                      )}

                      {approvalToken && (
                        <div className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                          <CheckCircle size={14} weight="fill" />
                          <span>Autorización concedida por encargado</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selector modalidad de crédito: Un solo pago vs En cuotas */}
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 border border-emerald-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCreditMode('SINGLE')}
                      className={`px-3 py-2 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center justify-center text-center leading-tight whitespace-normal ${
                        creditMode === 'SINGLE'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-700 hover:bg-emerald-50'
                      }`}
                    >
                      Un solo pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditMode('INSTALLMENTS')}
                      className={`px-3 py-2 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center justify-center text-center leading-tight whitespace-normal ${
                        creditMode === 'INSTALLMENTS'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-700 hover:bg-emerald-50'
                      }`}
                    >
                      En cuotas (plan de pagos)
                    </button>
                  </div>

                  {creditMode === 'SINGLE' ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Fecha límite de vencimiento
                      </label>
                      <input
                        type="date"
                        value={singleDueDate}
                        onChange={(e) => setSingleDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white p-3 rounded-xl border border-emerald-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Prima / Abono inicial (C$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={total}
                            value={creditPrimaStr}
                            onChange={(e) => setCreditPrimaStr(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Número de cuotas
                          </label>
                          <select
                            value={creditInstallmentsCount}
                            onChange={(e) => setCreditInstallmentsCount(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                          >
                            {[2, 3, 4, 5, 6, 8, 10, 12]
                              .filter((n) => n <= creditMaxInstallments)
                              .map((n) => (
                                <option key={n} value={n}>
                                  {n} cuotas
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Frecuencia de pago
                          </label>
                          <select
                            value={creditFrequency}
                            onChange={(e) =>
                              setCreditFrequency(e.target.value as 'SEMANAL' | 'QUINCENAL' | 'MENSUAL')
                            }
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                          >
                            {creditAllowedFrequencies.includes('SEMANAL') && (
                              <option value="SEMANAL">Semanal (cada 7 días)</option>
                            )}
                            {creditAllowedFrequencies.includes('QUINCENAL') && (
                              <option value="QUINCENAL">Quincenal (cada 15 días)</option>
                            )}
                            {creditAllowedFrequencies.includes('MENSUAL') && (
                              <option value="MENSUAL">Mensual (cada 30 días)</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Primera fecha de vencimiento
                          </label>
                          <input
                            type="date"
                            value={creditFirstDueDate}
                            onChange={(e) => setCreditFirstDueDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 min-h-[44px]"
                          />
                        </div>
                      </div>

                      {/* Vista previa de cuotas */}
                      {creditPlanPreview && (
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-gray-700">Monto por cuota:</span>
                            <span className="font-black text-emerald-800 text-sm whitespace-nowrap tabular-nums shrink-0">
                              {formatCurrency(creditPlanPreview.cuotas[0]?.amount || 0)}
                            </span>
                          </div>

                          <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-xs">
                            {creditPlanPreview.cuotas.map((c) => (
                              <div
                                key={c.installmentNumber}
                                className="px-2.5 py-1.5 flex items-center justify-between gap-2 bg-white hover:bg-gray-50"
                              >
                                <span className="font-medium text-gray-700 min-w-0">
                                  Cuota {c.installmentNumber} ({formatCalendarDate(c.dueDate)})
                                </span>
                                <span className="font-bold text-gray-900 whitespace-nowrap tabular-nums shrink-0">
                                  {formatCurrency(c.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: PAGO MIXTO */}
          {activeTab === 'MIXTO' && (
            <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Líneas de pago</span>
                <button
                  type="button"
                  onClick={handleAddMixedLine}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[40px]"
                >
                  <Plus size={14} weight="bold" />
                  <span>Agregar método</span>
                </button>
              </div>

              {/* Lista de Líneas */}
              <div className="space-y-2.5">
                {mixedLines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="p-3 bg-white rounded-xl border border-gray-200 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Línea {idx + 1}
                      </span>
                      {mixedLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMixedLine(line.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                          Método
                        </label>
                        <select
                          value={line.method}
                          onChange={(e) =>
                            handleUpdateMixedLine(line.id, {
                              method: e.target.value as 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA',
                            })
                          }
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs min-h-[40px]"
                        >
                          <option value="EFECTIVO">Efectivo</option>
                          <option value="TARJETA">Tarjeta</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                          Moneda
                        </label>
                        <select
                          value={line.currency}
                          onChange={(e) =>
                            handleUpdateMixedLine(line.id, {
                              currency: e.target.value as 'NIO' | 'USD',
                            })
                          }
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs min-h-[40px]"
                        >
                          <option value="NIO">Córdobas (C$)</option>
                          {multiCurrencyEnabled && <option value="USD">Dólares (US$)</option>}
                        </select>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                          Monto {line.currency === 'USD' ? '(US$)' : '(C$)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.amountStr}
                          onChange={(e) =>
                            handleUpdateMixedLine(line.id, {
                              amountStr: e.target.value,
                              amountTenderedStr: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 min-h-[40px]"
                        />
                      </div>
                    </div>

                    {(line.method === 'TARJETA' || line.method === 'TRANSFERENCIA') && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                        {requireBankCardTransfer && banks.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                              Banco
                            </label>
                            <select
                              value={line.bankId}
                              onChange={(e) => handleUpdateMixedLine(line.id, { bankId: e.target.value })}
                              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs min-h-[40px]"
                            >
                              {banks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-0.5">
                            Referencia / Voucher
                          </label>
                          <input
                            type="text"
                            value={line.reference}
                            onChange={(e) => handleUpdateMixedLine(line.id, { reference: e.target.value })}
                            placeholder="Ej: Ref-001"
                            className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs min-h-[40px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumen de cubierto vs pendiente */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Total venta:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cubierto con líneas:</span>
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(mixedSummary.totalCoveredNio)}
                  </span>
                </div>
                {mixedSummary.remainingNio > 0 ? (
                  <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-gray-100">
                    <span>Pendiente por cubrir:</span>
                    <span>{formatCurrency(mixedSummary.remainingNio)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-800 font-black pt-1 border-t border-gray-100">
                    <span>Cambio / Vuelto:</span>
                    <span>{formatCurrency(mixedSummary.changeNio)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección Propina voluntaria (aparte del total de la venta) */}
          {canOfferTip && (
            <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-900">
                  Propina (voluntaria)
                </label>
                {tipPreviewNio > 0 && (
                  <span className="text-xs font-extrabold text-amber-800 tabular-nums whitespace-nowrap">
                    + {formatCurrency(tipPreviewNio)}
                    {effectiveTipCurrency === 'USD' && parsedCustomTipAmount > 0
                      ? ` (US$ ${parsedCustomTipAmount.toFixed(2)})`
                      : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipMode('NONE')}
                  className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    tipMode === 'NONE'
                      ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Sin propina
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipMode('PERCENT');
                    setTipCurrency('NIO');
                  }}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center leading-tight ${
                    tipMode === 'PERCENT'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-amber-50'
                  }`}
                >
                  <span>{tipDefaultPercent} %</span>
                  <span
                    className={`text-xs font-medium tabular-nums whitespace-nowrap ${
                      tipMode === 'PERCENT' ? 'text-amber-100' : 'text-gray-500'
                    }`}
                  >
                    {formatCurrency(tipPercentAmountNio)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipMode('CUSTOM')}
                  className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    tipMode === 'CUSTOM'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-amber-50'
                  }`}
                >
                  Otro monto
                </button>
              </div>

              {tipMode !== 'NONE' && (
                <div className="space-y-2.5 pt-1 border-t border-amber-200/70">
                  {tipMode === 'CUSTOM' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex-1 min-w-[140px]">
                        <label
                          htmlFor="tip-custom-amount"
                          className="block text-xs font-semibold text-gray-700 mb-1"
                        >
                          Monto de propina ({effectiveTipCurrency === 'USD' ? 'US$' : 'C$'})
                        </label>
                        <input
                          id="tip-custom-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={tipCustomAmountStr}
                          onChange={(e) => setTipCustomAmountStr(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 tabular-nums focus:outline-hidden focus:border-amber-600 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-gray-700 mb-1">
                          Moneda
                        </span>
                        <div className="inline-flex rounded-xl border border-gray-300 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setTipCurrency('NIO')}
                            className={`min-h-[44px] px-3 text-xs font-bold cursor-pointer ${
                              effectiveTipCurrency === 'NIO'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            C$
                          </button>
                          <button
                            type="button"
                            disabled={tipMethod !== 'EFECTIVO'}
                            onClick={() => setTipCurrency('USD')}
                            title={
                              tipMethod !== 'EFECTIVO'
                                ? 'La propina en US$ solo se acepta en efectivo'
                                : 'Propina en dólares'
                            }
                            className={`min-h-[44px] px-3 text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              effectiveTipCurrency === 'USD'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            US$
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {effectiveTipCurrency === 'USD' && parsedCustomTipAmount > 0 && (
                    <p className="text-xs text-gray-600 tabular-nums">
                      Equivale a {formatCurrency(tipPreviewNio)} (tasa C$ {exchangeRate.toFixed(2)})
                    </p>
                  )}

                  <div>
                    <span className="block text-xs font-semibold text-gray-700 mb-1">
                      Método de pago de la propina
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'EFECTIVO', label: 'Efectivo' },
                          { id: 'TARJETA', label: 'Tarjeta' },
                          { id: 'TRANSFERENCIA', label: 'Transferencia' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setTipMethod(m.id);
                            if (m.id !== 'EFECTIVO') {
                              setTipCurrency('NIO');
                            }
                          }}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            tipMethod === m.id
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(tipMethod === 'TARJETA' || tipMethod === 'TRANSFERENCIA') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {banks.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Banco (opcional)
                          </label>
                          <select
                            value={tipBankId}
                            onChange={(e) => setTipBankId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 min-h-[44px]"
                          >
                            <option value="">Sin especificar</option>
                            {banks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Referencia (opcional)
                        </label>
                        <input
                          type="text"
                          value={tipReference}
                          onChange={(e) => setTipReference(e.target.value)}
                          placeholder="Número de voucher o ref."
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 min-h-[44px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notas de la Venta */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notas u observaciones (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales o referencia adicional"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900 min-h-[44px]"
            />
          </div>

          {/* Resumen final cuando aplica propina */}
          {canOfferTip && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2 text-gray-700">
                <span>Total de la venta</span>
                <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-gray-700">
                <span>Propina (voluntaria)</span>
                <span className="font-bold text-amber-800 tabular-nums whitespace-nowrap">
                  {formatCurrency(tipPreviewNio)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200 text-sm font-black text-emerald-900">
                <span>Total a cobrar</span>
                <span className="tabular-nums whitespace-nowrap">
                  {formatCurrency(totalWithTip)}
                </span>
              </div>
            </div>
          )}

          {/* Botón de confirmar cobro */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isTipCustomInvalid ||
                (activeTab === 'SIMPLE' && singleMethod === 'EFECTIVO' && isSingleShort) ||
                (activeTab === 'SIMPLE' && singleMethod === 'CREDITO' && !creditValidation.valid) ||
                (activeTab === 'MIXTO' && !mixedSummary.isCovered)
              }
              className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-98 min-h-[50px]"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Cobrando...</span>
                </>
              ) : (
                <span className="tabular-nums whitespace-nowrap">
                  Confirmar y cobrar {formatCurrency(totalWithTip)}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Aprobación de Encargado */}
      <ManagerApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        actionTitle="Autorizar crédito excedido"
        actionDescription={`El monto solicitado (${formatCurrency(
          creditValidation.requested || total,
        )}) supera el límite de crédito disponible del cliente (${formatCurrency(
          creditValidation.available || 0,
        )}). Ingresá las credenciales del encargado para autorizar.`}
        actionCode="CREDIT_LIMIT_OVERRIDE"
        entityType="Customer"
        entityId={selectedCustomer.id || undefined}
        onApproved={(token) => {
          setApprovalToken(token);
          setLocalError(null);
        }}
      />
    </div>
  );
};
