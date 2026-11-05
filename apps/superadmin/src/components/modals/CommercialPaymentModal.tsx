import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { FilePdf, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import type { PaymentMethod } from '../../hooks/useMemberships';
import {
  CommercialData,
  CommercialPaymentKind,
  PAYMENT_KIND_LABELS,
  getApiErrorMessage,
  useRecordCommercialPayment,
} from '../../hooks/useCommercial';
import { formatCurrency } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  data: CommercialData;
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'OTRO', label: 'Otro' },
];

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1.5';

export const CommercialPaymentModal: React.FC<Props> = ({ isOpen, onClose, businessId, businessName, data }) => {
  const { agreement, summary, payments } = data;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Adelanto pendiente (mismo cálculo que commercial.service.ts:590-607)
  const downPaid = payments
    .filter((p) => !p.voidedAt && p.kind === 'ADELANTO')
    .reduce((acc, p) => acc + p.amount, 0);
  const remainingDown = Math.max(0, Math.round((agreement.downPayment - downPaid) * 100) / 100);
  const isCredit = agreement.paymentType === 'CREDITO';

  const defaultKind: CommercialPaymentKind = !isCredit ? 'PAGO' : remainingDown > 0 ? 'ADELANTO' : 'CUOTA';

  const [kind, setKind] = useState<CommercialPaymentKind>(defaultKind);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paidAt, setPaidAt] = useState(today);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [amountNio, setAmountNio] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useRecordCommercialPayment(businessId);

  const suggestedFor = (k: CommercialPaymentKind): string => {
    if (k === 'ADELANTO') return remainingDown > 0 ? remainingDown.toFixed(2) : '';
    if (k === 'CUOTA') return summary.nextInstallment ? summary.nextInstallment.pendingAmount.toFixed(2) : '';
    return summary.balance > 0 ? summary.balance.toFixed(2) : '';
  };

  useEffect(() => {
    if (!isOpen) return;
    setKind(defaultKind);
    setAmount(suggestedFor(defaultKind));
    setMethod('TRANSFERENCIA');
    setPaidAt(today);
    setReference('');
    setNotes('');
    setAmountNio('');
    setExchangeRate('');
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleKind = (k: CommercialPaymentKind) => {
    setKind(k);
    setAmount(suggestedFor(k));
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

  // Equivalente en córdobas: si hay monto en C$ y tipo de cambio se muestran tal cual
  const handleRateChange = (val: string) => {
    setExchangeRate(val);
    const rate = parseFloat(val);
    const usd = parseFloat(amount);
    if (rate > 0 && usd > 0 && !amountNio) {
      setAmountNio((Math.round(usd * rate * 100) / 100).toFixed(2));
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const balanceAfter = Math.round((summary.balance - numAmount) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (numAmount <= 0) {
      setError('Ingresá un monto mayor a 0.');
      return;
    }
    mutation.mutate(
      {
        agreementId: agreement.id,
        input: {
          kind,
          amount: numAmount,
          paymentMethod: method,
          referenceNumber: reference.trim() || undefined,
          paidAt,
          paidAmountNio: amountNio ? parseFloat(amountNio) : undefined,
          exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
          notes: notes.trim() || undefined,
          file,
        },
      },
      {
        onSuccess: () => onClose(),
        // 422 PAYMENT_EXCEEDS_BALANCE y demás: el mensaje del API queda dentro del modal
        onError: (err) => setError(getApiErrorMessage(err, 'No se pudo registrar el pago.')),
      },
    );
  };

  const kinds: CommercialPaymentKind[] = isCredit ? ['ADELANTO', 'CUOTA', 'PAGO'] : ['PAGO'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago del acuerdo" subtitle={`Negocio: ${businessName}`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Tipo de pago</label>
          <div className={`grid gap-2 ${kinds.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKind(k)}
                className={`h-10 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                  kind === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {PAYMENT_KIND_LABELS[k]}
              </button>
            ))}
          </div>
          {kind === 'ADELANTO' && (
            <p className="text-xs text-gray-500 mt-1">Adelanto pendiente: {formatCurrency(remainingDown)}.</p>
          )}
          {kind === 'CUOTA' && summary.nextInstallment && (
            <p className="text-xs text-gray-500 mt-1">
              Próxima: cuota {summary.nextInstallment.installmentNumber}, pendiente{' '}
              {formatCurrency(summary.nextInstallment.pendingAmount)}. Lo que sobre pasa a la siguiente.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monto (US$)</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha del pago</label>
            <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
          <div>
            <p className="text-gray-500">Saldo antes</p>
            <p className="font-semibold text-gray-900 font-mono text-sm">{formatCurrency(summary.balance)}</p>
          </div>
          <div>
            <p className="text-gray-500">Saldo después</p>
            <p className={`font-semibold font-mono text-sm ${balanceAfter < 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {formatCurrency(balanceAfter)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Método</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Referencia (opcional)</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo de cambio (opcional)</label>
            <input type="number" min="0" step="0.0001" value={exchangeRate} onChange={(e) => handleRateChange(e.target.value)} placeholder="Ej. 36.62" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pagado en córdobas (opcional)</label>
            <input type="number" min="0" step="0.01" value={amountNio} onChange={(e) => setAmountNio(e.target.value)} placeholder="C$" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Comprobante (imagen o PDF, opcional)</label>
          {file ? (
            <div className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-gray-50">
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <FilePdf size={22} weight="duotone" />
                </div>
              )}
              <span className="text-xs text-gray-700 truncate flex-1 min-w-0">{file.name}</span>
              <button type="button" onClick={removeFile} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 cursor-pointer" aria-label="Quitar archivo">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">
              <UploadSimple size={16} />
              <span>Subir JPG, PNG, WebP o PDF (máx. 5 MB)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} className="hidden" />
            </label>
          )}
        </div>

        <div>
          <label className={labelCls}>Nota (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900" />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
            {mutation.isPending ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

