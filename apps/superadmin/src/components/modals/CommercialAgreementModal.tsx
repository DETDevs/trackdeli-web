import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { LockSimple, WarningCircle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  CommercialData,
  CommercialPaymentType,
  CommercialSaleModality,
  SALE_MODALITY_LABELS,
  getApiErrorMessage,
  useUpsertCommercialAgreement,
} from '../../hooks/useCommercial';
import { formatCurrency, formatDateShort } from '../../utils/format';

// ── Utilidades de fechas YYYY-MM-DD (misma regla que addMonthsManagua del API) ──
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export function addMonthsYmd(ymd: string, months: number, preferredDay?: number): string {
  const [y0, m0, d0] = ymd.split('-').map(Number);
  if (!y0 || !m0 || !d0) return ymd;
  let y = y0;
  let m = m0 + months;
  while (m > 12) {
    y++;
    m -= 12;
  }
  while (m < 1) {
    y--;
    m += 12;
  }
  const day = Math.min(preferredDay ?? d0, daysInMonth(y, m));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(day)}`;
}

/** Vista previa de cuotas: división al centavo, la diferencia va a la última (generateInstallments del API). */
export function previewInstallments(financed: number, count: number, firstDate: string) {
  if (count < 1 || financed <= 0 || !firstDate) return [];
  const totalCents = Math.round(financed * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  const anchorDay = Number(firstDate.split('-')[2]);
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    dueDate: i === 0 ? firstDate : addMonthsYmd(firstDate, i, anchorDay),
    amount: (i === count - 1 ? base + remainder : base) / 100,
  }));
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  existing: CommercialData | null;
}

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1.5';

export const CommercialAgreementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  existing,
}) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const agreement = existing?.agreement ?? null;
  // Términos bloqueados si hay pagos no anulados (commercial.service.ts:295-317)
  const hasValidPayments = (existing?.payments || []).some((p) => !p.voidedAt);

  const [saleModality, setSaleModality] = useState<CommercialSaleModality>('COMBO_COMPLETO');
  const [activatedAt, setActivatedAt] = useState(today);
  const [totalPrice, setTotalPrice] = useState('');
  const [paymentType, setPaymentType] = useState<CommercialPaymentType>('CONTADO');
  const [downPayment, setDownPayment] = useState('');
  const [downTouched, setDownTouched] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(4);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(addMonthsYmd(today, 1));
  const [maintenanceFreeMonths, setMaintenanceFreeMonths] = useState('12');
  const [maintenanceFeeNio, setMaintenanceFeeNio] = useState('550');
  const [graceDays, setGraceDays] = useState('3');
  const [installationDoneAt, setInstallationDoneAt] = useState('');
  const [trainingDoneAt, setTrainingDoneAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDateChange, setConfirmDateChange] = useState(false);

  const mutation = useUpsertCommercialAgreement(businessId);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmDateChange(false);
    if (agreement) {
      setSaleModality(agreement.saleModality);
      setActivatedAt(agreement.activatedAt);
      setTotalPrice(String(agreement.totalPrice));
      setPaymentType(agreement.paymentType);
      setDownPayment(String(agreement.downPayment));
      setDownTouched(true);
      setInstallmentsCount(agreement.installmentsCount || 4);
      setFirstInstallmentDate(agreement.firstInstallmentDate || addMonthsYmd(agreement.activatedAt, 1));
      setMaintenanceFreeMonths(String(agreement.maintenanceFreeMonths));
      setMaintenanceFeeNio(String(agreement.maintenanceFeeNio));
      setGraceDays(String(agreement.graceDays ?? 3));
      setInstallationDoneAt(agreement.installationDoneAt || '');
      setTrainingDoneAt(agreement.trainingDoneAt || '');
      setNotes(agreement.notes || '');
    } else {
      setSaleModality('COMBO_COMPLETO');
      setActivatedAt(today);
      setTotalPrice('');
      setPaymentType('CONTADO');
      setDownPayment('');
      setDownTouched(false);
      setInstallmentsCount(4);
      setFirstInstallmentDate(addMonthsYmd(today, 1));
      setMaintenanceFreeMonths('12');
      setMaintenanceFeeNio('550');
      setGraceDays('3');
      setInstallationDoneAt('');
      setTrainingDoneAt('');
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, agreement?.id, agreement?.updatedAt]);

  const total = parseFloat(totalPrice) || 0;
  const isCredit = paymentType === 'CREDITO';
  const isMonthly = saleModality === 'MEMBRESIA_MENSUAL';

  // Adelanto sugerido: 50 % mientras el usuario no lo edite
  useEffect(() => {
    if (isCredit && !downTouched && !hasValidPayments) {
      setDownPayment(total > 0 ? (Math.round(total * 50) / 100).toFixed(2) : '');
    }
  }, [total, isCredit, downTouched, hasValidPayments]);

  // Membresía mensual: el API fuerza 0 meses gratis (commercial.service.ts:346-351)
  useEffect(() => {
    if (isMonthly) setMaintenanceFreeMonths('0');
    else if (maintenanceFreeMonths === '0' && !agreement) setMaintenanceFreeMonths('12');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonthly]);

  const down = isCredit ? parseFloat(downPayment) || 0 : 0;
  const financed = isCredit ? Math.max(0, Math.round((total - down) * 100) / 100) : 0;
  const preview = useMemo(
    () => (isCredit ? previewInstallments(financed, installmentsCount, firstInstallmentDate) : []),
    [isCredit, financed, installmentsCount, firstInstallmentDate],
  );

  const freeMonths = isMonthly ? 0 : parseInt(maintenanceFreeMonths, 10) || 0;
  const maintenanceEndPreview = freeMonths > 0 && activatedAt ? addMonthsYmd(activatedAt, freeMonths) : null;
  const activationChanged = !!agreement && activatedAt !== agreement.activatedAt;

  const validationError = (() => {
    if (total <= 0) return 'Ingresá el precio total acordado.';
    if (!activatedAt) return 'Elegí la fecha de activación.';
    if (isCredit) {
      if (down < 0 || down >= total) return 'El adelanto tiene que ser menor que el total.';
      if (!firstInstallmentDate) return 'Elegí la fecha de la primera cuota.';
    }
    return null;
  })();

  const buildPayload = () => ({
    saleModality,
    paymentType,
    totalPrice: total,
    currency: 'USD',
    // Con pagos, se reenvían los valores guardados para no disparar el 409
    downPayment: isCredit ? down : 0,
    installmentsCount: isCredit ? installmentsCount : 0,
    firstInstallmentDate: isCredit ? firstInstallmentDate : undefined,
    graceDays: parseInt(graceDays, 10) || 0,
    activatedAt,
    maintenanceFreeMonths: freeMonths,
    maintenanceFeeNio: parseFloat(maintenanceFeeNio) || 0,
    installationDoneAt: installationDoneAt || undefined,
    trainingDoneAt: trainingDoneAt || undefined,
    notes: notes.trim() || undefined,
  });

  const doSave = () => {
    setError(null);
    mutation.mutate(buildPayload(), {
      onSuccess: () => onClose(),
      onError: (err) => {
        setConfirmDateChange(false);
        setError(getApiErrorMessage(err, 'No se pudo guardar el acuerdo comercial.'));
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (activationChanged && !confirmDateChange) {
      setConfirmDateChange(true);
      return;
    }
    doSave();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={agreement ? 'Editar acuerdo comercial' : 'Crear acuerdo comercial'}
      subtitle={`Negocio: ${businessName}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {hasValidPayments && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <LockSimple size={16} weight="bold" className="shrink-0 mt-0.5" />
            <p>
              Este acuerdo ya tiene pagos registrados, así que la modalidad, la forma de pago, el
              total, el adelanto y las cuotas quedan bloqueados. Para cambiarlos, anulá primero los
              pagos. Podés seguir editando la activación, el mantenimiento, la gracia, la instalación
              y la capacitación.
            </p>
          </div>
        )}

        {/* Modalidad y activación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Modalidad de venta</label>
            <select
              value={saleModality}
              onChange={(e) => setSaleModality(e.target.value as CommercialSaleModality)}
              disabled={hasValidPayments}
              className={inputCls}
            >
              {(Object.keys(SALE_MODALITY_LABELS) as CommercialSaleModality[]).map((k) => (
                <option key={k} value={k}>
                  {SALE_MODALITY_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha de activación</label>
            <input
              type="date"
              value={activatedAt}
              onChange={(e) => {
                setActivatedAt(e.target.value);
                setConfirmDateChange(false);
              }}
              className={inputCls}
            />
          </div>
        </div>

        {/* Precio y forma de pago */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Precio total (US$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              disabled={hasValidPayments}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {(['CONTADO', 'CREDITO'] as CommercialPaymentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={hasValidPayments}
                  onClick={() => setPaymentType(t)}
                  className={`h-10 rounded-xl border text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    paymentType === t
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t === 'CONTADO' ? 'Contado' : 'Crédito'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isCredit && (
          <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Adelanto (US$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => {
                    setDownTouched(true);
                    setDownPayment(e.target.value);
                  }}
                  disabled={hasValidPayments}
                  className={inputCls}
                />
                <p className="text-xs text-gray-500 mt-1">Sugerido: 50 % del total.</p>
              </div>
              <div>
                <label className={labelCls}>Cantidad de cuotas</label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                  disabled={hasValidPayments}
                  className={inputCls}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'cuota' : 'cuotas'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Primera cuota</label>
                <input
                  type="date"
                  value={firstInstallmentDate}
                  onChange={(e) => setFirstInstallmentDate(e.target.value)}
                  disabled={hasValidPayments}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                Vista previa: adelanto {formatCurrency(down)} y {formatCurrency(financed)} en cuotas
              </p>
              {preview.length === 0 ? (
                <p className="text-xs text-gray-500">Completá el total y el adelanto para ver las cuotas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-200">
                        <th className="py-1.5 pr-3 font-medium">Cuota</th>
                        <th className="py-1.5 pr-3 font-medium">Vence</th>
                        <th className="py-1.5 font-medium text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.map((p) => (
                        <tr key={p.number}>
                          <td className="py-1.5 pr-3 text-gray-900">{p.number}</td>
                          <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">{formatDateShort(p.dueDate)}</td>
                          <td className="py-1.5 text-right font-mono text-gray-900">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {hasValidPayments && (
                <p className="text-xs text-gray-500 mt-1.5">Las cuotas guardadas no cambian mientras haya pagos.</p>
              )}
            </div>
          </div>
        )}

        {/* Mantenimiento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Meses de mantenimiento gratis</label>
            <input
              type="number"
              min="0"
              max="60"
              value={maintenanceFreeMonths}
              onChange={(e) => setMaintenanceFreeMonths(e.target.value)}
              disabled={isMonthly}
              className={inputCls}
            />
            {isMonthly && (
              <p className="text-xs text-gray-500 mt-1">La membresía mensual no incluye meses gratis.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Cuota posterior (C$ al mes)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maintenanceFeeNio}
              onChange={(e) => setMaintenanceFeeNio(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Días de gracia</label>
            <input
              type="number"
              min="0"
              max="30"
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        {maintenanceEndPreview && (
          <p className="text-xs text-gray-600 -mt-2">
            Mantenimiento incluido hasta el <strong>{formatDateShort(maintenanceEndPreview)}</strong>.
          </p>
        )}

        {/* Instalación y capacitación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Instalación hecha el (opcional)</label>
            <input
              type="date"
              value={installationDoneAt}
              onChange={(e) => setInstallationDoneAt(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Capacitación hecha el (opcional)</label>
            <input
              type="date"
              value={trainingDoneAt}
              onChange={(e) => setTrainingDoneAt(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
        </div>

        {confirmDateChange && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
            <p className="font-semibold">¿Confirmás el cambio de la fecha de activación?</p>
            <p>
              {maintenanceEndPreview
                ? `Esto mueve el fin del mantenimiento gratis a ${formatDateShort(maintenanceEndPreview)}.`
                : 'Este acuerdo no tiene meses de mantenimiento gratis.'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            {mutation.isPending
              ? 'Guardando…'
              : confirmDateChange
              ? 'Sí, cambiar la fecha y guardar'
              : agreement
              ? 'Guardar cambios'
              : 'Crear acuerdo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

