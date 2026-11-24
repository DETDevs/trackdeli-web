import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FilePdf, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import type { PaymentMethod } from '../../hooks/useMemberships';
import {
  AccountStatementData,
  CommercialData,
  CommercialPaymentKind,
  getApiErrorMessage,
  useRecordCommercialPayment,
} from '../../hooks/useCommercial';
import { formatCurrency } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  data: AccountStatementData | CommercialData;
  initialKind?: CommercialPaymentKind;
  initialInstallmentId?: string;
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'OTRO', label: 'Otro' },
];

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600';
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

export const CommercialPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  data,
  initialKind,
  initialInstallmentId,
}) => {
  const isStatement = 'rawSaleModality' in data || 'saleModality' in data;
  const agreement = 'agreement' in data ? data.agreement : null;
  const statement = isStatement ? (data as AccountStatementData) : null;

  const today = format(new Date(), 'yyyy-MM-dd');

  // Valores unificados
  const currency = statement?.currency || agreement?.currency || 'USD';
  const balance = statement ? statement.balance : (data as CommercialData).summary.balance;
  const downPayment = statement ? statement.downPayment : (agreement?.downPayment || 0);
  const paymentType = statement ? statement.paymentType : (agreement?.paymentType || 'CONTADO');
  const isCredit = paymentType === 'CREDITO';
  const isMembership = statement?.saleModality === 'MEMBRESIA';

  const payments = data.payments || [];
  const installments = (statement ? statement.installments : (data as CommercialData).installments) || [];
  const pendingInstallments = installments.filter((i) => i.status !== 'PAGADA');

  const downPaid = payments
    .filter((p) => !p.voidedAt && (p.kind === 'ADELANTO' || p.kind === 'PRIMA'))
    .reduce((acc, p) => acc + p.amount, 0);
  const remainingDown = Math.max(0, Math.round((downPayment - downPaid) * 100) / 100);

  const maintenance = statement?.maintenance || (data as any).summary?.maintenance;
  const maintenanceApplies = maintenance?.applies || maintenance?.status !== 'NO_APLICA';
  const maintenanceAmount = maintenance?.monthlyAmount || 555;

  // Tipos disponibles
  const availableKinds = useMemo<CommercialPaymentKind[]>(() => {
    if (isMembership) {
      return ['PAGO'];
    }
    const list: CommercialPaymentKind[] = [];
    if (isCredit) {
      if (remainingDown > 0) list.push('PRIMA');
      if (pendingInstallments.length > 0) list.push('CUOTA');
      list.push('PAGO');
    } else {
      list.push('PAGO');
    }
    if (maintenanceApplies) {
      list.push('MANTENIMIENTO');
    }
    return list;
  }, [isMembership, isCredit, remainingDown, pendingInstallments.length, maintenanceApplies]);

  const defaultKind: CommercialPaymentKind =
    initialKind && availableKinds.includes(initialKind)
      ? initialKind
      : isCredit && remainingDown > 0
      ? 'PRIMA'
      : isCredit && pendingInstallments.length > 0
      ? 'CUOTA'
      : availableKinds[0] || 'PAGO';

  const [kind, setKind] = useState<CommercialPaymentKind>(defaultKind);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(
    initialInstallmentId || pendingInstallments[0]?.id || ''
  );
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paidAt, setPaidAt] = useState(today);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useRecordCommercialPayment(businessId);

  // Sugerir monto según tipo
  const getSuggestedAmount = (k: CommercialPaymentKind, instId?: string): string => {
    if (k === 'PRIMA' || k === 'ADELANTO') {
      return remainingDown > 0 ? remainingDown.toFixed(2) : '';
    }
    if (k === 'CUOTA') {
      const inst = pendingInstallments.find((i) => i.id === (instId || selectedInstallmentId)) || pendingInstallments[0];
      return inst ? inst.pendingAmount.toFixed(2) : '';
    }
    if (k === 'MANTENIMIENTO') {
      return maintenanceAmount.toFixed(2);
    }
    return balance > 0 ? balance.toFixed(2) : '';
  };

  useEffect(() => {
    if (!isOpen) return;
    const initialK = initialKind && availableKinds.includes(initialKind) ? initialKind : defaultKind;
    const initialInst = initialInstallmentId || pendingInstallments[0]?.id || '';
    setKind(initialK);
    setSelectedInstallmentId(initialInst);
    setAmount(getSuggestedAmount(initialK, initialInst));
    setMethod('TRANSFERENCIA');
    setPaidAt(today);
    setReference('');
    setNotes('');
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleKindChange = (k: CommercialPaymentKind) => {
    setKind(k);
    setAmount(getSuggestedAmount(k));
    setError(null);
  };

  const handleInstallmentChange = (instId: string) => {
    setSelectedInstallmentId(instId);
    setAmount(getSuggestedAmount('CUOTA', instId));
    setError(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const numAmount = parseFloat(amount) || 0;
  const payCurrency = kind === 'MANTENIMIENTO' ? 'NIO' : currency;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (numAmount <= 0) {
      setError('Ingresá un monto mayor a 0.');
      return;
    }

    mutation.mutate(
      {
        agreementId: agreement?.id,
        input: {
          kind: kind === 'PRIMA' ? 'PRIMA' : kind,
          amount: numAmount,
          currency: payCurrency as any,
          paymentMethod: method,
          referenceNumber: reference.trim() || undefined,
          paidAt,
          installmentId: kind === 'CUOTA' ? selectedInstallmentId || undefined : undefined,
          notes: notes.trim() || undefined,
          file,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(getApiErrorMessage(err, 'No se pudo registrar el pago.')),
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar pago"
      subtitle={`Negocio: ${businessName}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selección de qué se paga */}
        <div>
          <label className={labelCls}>¿Qué concepto se está pagando?</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableKinds.map((k) => {
              const label =
                k === 'PRIMA' || k === 'ADELANTO'
                  ? 'Prima / Adelanto'
                  : k === 'CUOTA'
                  ? 'Cuota de crédito'
                  : k === 'MANTENIMIENTO'
                  ? 'Mantenimiento'
                  : isMembership
                  ? 'Membresía mensual'
                  : 'Liquidar saldo';
              const isSelected = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKindChange(k)}
                  className={`h-9 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer text-center truncate ${
                    isSelected
                      ? 'border-purple-700 bg-purple-700 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {kind === 'PRIMA' && (
            <p className="text-xs text-gray-500 mt-1.5">
              Prima pendiente de cobro: {formatCurrency(remainingDown, currency)}.
            </p>
          )}

          {kind === 'MANTENIMIENTO' && (
            <p className="text-xs text-gray-500 mt-1.5">
              El mantenimiento mensual se registra en córdobas (C$ {maintenanceAmount} NIO).
            </p>
          )}
        </div>

        {/* Si es cuota, selector de cuál cuota */}
        {kind === 'CUOTA' && pendingInstallments.length > 0 && (
          <div>
            <label className={labelCls}>Cuota a pagar</label>
            <select
              value={selectedInstallmentId}
              onChange={(e) => handleInstallmentChange(e.target.value)}
              className={inputCls}
            >
              {pendingInstallments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  Cuota #{inst.installmentNumber} · Vence el {inst.dueDate.slice(0, 10)} · Pendiente: {formatCurrency(inst.pendingAmount, currency)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Monto y fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monto ({payCurrency}) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Fecha del cobro *</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className={inputCls}
              required
            />
          </div>
        </div>

        {/* Método y referencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Método de pago</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className={inputCls}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>N.º de referencia / comprobante</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. Depósito #94821"
              className={inputCls}
            />
          </div>
        </div>

        {/* Comprobante archivo */}
        <div>
          <label className={labelCls}>Comprobante digital (opcional)</label>
          {file ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Comprobante"
                  className="w-10 h-10 rounded object-cover border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-red-50 text-red-600 flex items-center justify-center">
                  <FilePdf size={20} weight="duotone" />
                </div>
              )}
              <span className="text-xs text-gray-700 truncate flex-1">{file.name}</span>
              <button
                type="button"
                onClick={removeFile}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">
              <UploadSimple size={15} />
              <span>Adjuntar imagen o PDF</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <WarningCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
