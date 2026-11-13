import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Minus,
  WarningCircle,
  Package,
  ShieldCheck,
  Tag,
} from '@phosphor-icons/react';
import {
  type PosProductItem,
  type PosProductBatchItem,
  type PosPoliciesData,
  type PosInventoryAdjustmentType,
  createPosInventoryAdjustment,
  getPosProductBatches,
  getPosPolicies,
  createPosApprovalToken,
} from 'api-client';
import { useAuthStore } from '../../../store/auth.store';
import { formatQuantity } from '../../../utils/formatters';
import { formatManaguaDate } from '../../../utils/dateManagua';
import { extractApiErrorMessage, generateIdempotencyKey } from '../../../utils/productCost';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  product: PosProductItem | null;
  businessTracksBatches?: boolean;
  policies?: PosPoliciesData | null;
  initialType?: PosInventoryAdjustmentType;
  initialBatchId?: string;
  initialBatchNumber?: string;
  initialQty?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ADJUSTMENT_TYPES: Array<{
  type: PosInventoryAdjustmentType;
  label: string;
  hint: string;
}> = [
  {
    type: 'CORRECTION',
    label: 'Corrección manual de conteo',
    hint: 'Ajuste por diferencia de conteo físico o error de registro.',
  },
  {
    type: 'DAMAGE',
    label: 'Avería / Producto dañado',
    hint: 'Mercadería golpeada, rota o no apta para la venta.',
  },
  {
    type: 'EXPIRED',
    label: 'Vencimiento / Caducidad',
    hint: 'Retiro de lote vencido de estantería (requiere elegir el lote).',
  },
  {
    type: 'SHRINKAGE',
    label: 'Merma operativa',
    hint: 'Pérdida por consumo interno o manipulación.',
  },
  {
    type: 'THEFT',
    label: 'Pérdida / Faltante no justificado',
    hint: 'Faltante detectado durante revisión de inventario.',
  },
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  product,
  businessTracksBatches = false,
  policies: policiesProp,
  initialType,
  initialBatchId,
  initialBatchNumber,
  initialQty,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((s) => s.user);
  const [policies, setPolicies] = useState<PosPoliciesData | null>(policiesProp ?? null);

  const [adjustmentType, setAdjustmentType] = useState<PosInventoryAdjustmentType>('CORRECTION');
  const [deltaSign, setDeltaSign] = useState<1 | -1>(1);
  const [deltaQtyStr, setDeltaQtyStr] = useState('1');
  const [batchId, setBatchId] = useState('');
  const [batches, setBatches] = useState<PosProductBatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aprobación de encargado cuando el usuario es cajero y la política lo exige
  const [showApprovalStep, setShowApprovalStep] = useState(false);
  const [approverEmail, setApproverEmail] = useState('');
  const [approverPassword, setApproverPassword] = useState('');
  const idempotencyKeyRef = useRef<string>('');

  const isTracked = Boolean(
    (businessTracksBatches || product?.tracksBatches) && product?.tracksBatches,
  );

  useEffect(() => {
    if (!isOpen) return;
    if (policiesProp) {
      setPolicies(policiesProp);
    } else {
      getPosPolicies()
        .then((p) => setPolicies(p))
        .catch(() => {});
    }
  }, [isOpen, policiesProp]);

  useEffect(() => {
    if (!isOpen || !product) return;
    const startType: PosInventoryAdjustmentType = initialType || 'CORRECTION';
    setAdjustmentType(startType);
    setDeltaSign(
      startType === 'EXPIRED' || startType === 'DAMAGE' || startType === 'SHRINKAGE' || startType === 'THEFT'
        ? -1
        : 1,
    );
    setDeltaQtyStr(initialQty !== undefined ? String(Math.abs(initialQty)) : '1');
    setBatchId(initialBatchId || '');
    setReason(
      startType === 'EXPIRED' && (initialBatchNumber || initialBatchId)
        ? `Baja por vencimiento del lote ${initialBatchNumber || initialBatchId}`
        : '',
    );
    setNotes('');
    setError(null);
    setShowApprovalStep(false);
    setApproverEmail('');
    setApproverPassword('');
    idempotencyKeyRef.current = generateIdempotencyKey('adj');

    if (isTracked) {
      setIsLoadingBatches(true);
      getPosProductBatches(product.id)
        .then((res) => {
          setBatches(Array.isArray(res?.batches) ? res.batches : []);
        })
        .catch(() => setBatches([]))
        .finally(() => setIsLoadingBatches(false));
    } else {
      setBatches([]);
    }
  }, [isOpen, product, initialType, initialBatchId, initialBatchNumber, initialQty, isTracked]);

  if (!isOpen || !product) return null;

  const unit = (product.unit || 'UND').toUpperCase();
  const isUnd = unit === 'UND';
  const currentStock = Number(product.stock ?? 0);
  const parsedDelta = parseFloat(deltaQtyStr.replace(',', '.'));
  const absQty = Number.isFinite(parsedDelta) ? Math.abs(parsedDelta) : 0;
  const effectiveDelta = Number((deltaSign * absQty).toFixed(3));
  const resultingStock = Number((currentStock + effectiveDelta).toFixed(3));

  const allowNegativeStock = Boolean(policies?.allowNegativeStock);
  const isCashier = user?.role === 'CAJERO';
  const needsApproval = isCashier && (policies?.inventoryAdjustRequireApproval ?? true);

  const selectedBatch = batches.find((b) => b.id === batchId) || null;
  const currentTypeMeta = ADJUSTMENT_TYPES.find((t) => t.type === adjustmentType);

  const validateBeforeSubmit = (): string | null => {
    if (product.trackStock === false || product.type === 'SERVICE') {
      return 'Este producto o servicio no controla inventario.';
    }
    if (isUnd && (!Number.isInteger(absQty) || absQty <= 0)) {
      return 'Ingresá una cantidad entera mayor a 0.';
    }
    if (!isUnd && (!Number.isFinite(absQty) || absQty <= 0)) {
      return 'Ingresá una cantidad válida mayor a 0.';
    }
    if (!reason.trim()) {
      return 'El motivo del ajuste es obligatorio.';
    }
    if (isTracked && adjustmentType === 'EXPIRED' && !batchId) {
      return 'Para dar de baja por vencimiento debés seleccionar el lote específico.';
    }
    if (selectedBatch && deltaSign < 0 && absQty > Number(selectedBatch.quantity)) {
      return `El lote ${selectedBatch.batchNumber} solo tiene ${formatQuantity(selectedBatch.quantity, unit)} disponibles.`;
    }
    if (!allowNegativeStock && resultingStock < 0) {
      return `El ajuste dejaría existencia negativa (${formatQuantity(resultingStock, unit)}) y la política del negocio no lo permite.`;
    }
    return null;
  };

  const executeAdjustment = async (approvalToken?: string) => {
    setIsSubmitting(true);
    setError(null);
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey('adj');
    }

    try {
      await createPosInventoryAdjustment(
        {
          productId: product.id,
          type: adjustmentType,
          qtyDelta: effectiveDelta,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          batchId: batchId || undefined,
          approvalToken: approvalToken || undefined,
        },
        { 'Idempotency-Key': idempotencyKeyRef.current },
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(extractApiErrorMessage(err, 'No se pudo aplicar el ajuste de inventario.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateBeforeSubmit();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    if (needsApproval && !showApprovalStep) {
      setError(null);
      setShowApprovalStep(true);
      return;
    }

    if (needsApproval && showApprovalStep) {
      if (!approverEmail.trim() || !approverPassword) {
        setError('Ingresá el correo y la contraseña del encargado que autoriza.');
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await createPosApprovalToken({
          action: 'AJUSTE_INVENTARIO',
          approverEmail: approverEmail.trim(),
          approverPassword,
          entityType: 'Product',
          entityId: product.id,
        });
        setApproverPassword('');
        await executeAdjustment(res.token);
      } catch (err: any) {
        setApproverPassword('');
        setIsSubmitting(false);
        setError(extractApiErrorMessage(err, 'No se pudo obtener la aprobación del encargado.'));
      }
      return;
    }

    await executeAdjustment();
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Package size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h2 id="stock-adjustment-title" className="text-sm sm:text-base font-bold text-gray-900">
                Ajustar existencia
              </h2>
              <p className="text-xs text-gray-600 truncate">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
              <WarningCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen Actual -> Nuevo */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-gray-600 block">Existencia actual</span>
              <span className="text-sm font-bold text-gray-900 tabular-nums">
                {formatQuantity(currentStock, unit)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-600 block">Stock resultante</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  resultingStock < 0 ? 'text-red-700' : 'text-purple-700'
                }`}
              >
                {formatQuantity(resultingStock, unit)}
              </span>
            </div>
          </div>

          {/* Tipo de ajuste */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Tipo de ajuste
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => {
                const nextType = e.target.value as PosInventoryAdjustmentType;
                setAdjustmentType(nextType);
                if (
                  nextType === 'EXPIRED' ||
                  nextType === 'DAMAGE' ||
                  nextType === 'SHRINKAGE' ||
                  nextType === 'THEFT'
                ) {
                  setDeltaSign(-1);
                }
              }}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:border-purple-600"
            >
              {ADJUSTMENT_TYPES.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </select>
            {currentTypeMeta && (
              <p className="text-xs text-gray-600 mt-1">{currentTypeMeta.hint}</p>
            )}
          </div>

          {/* Entrada / Salida + Cantidad */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Cantidad a ajustar ({unit})
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="grid grid-cols-2 rounded-xl border border-gray-200 overflow-hidden bg-white shrink-0">
                <button
                  type="button"
                  disabled={adjustmentType === 'EXPIRED'}
                  onClick={() => setDeltaSign(1)}
                  className={`min-h-[44px] px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 ${
                    deltaSign === 1
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Plus size={15} weight="bold" />
                  <span>Entrada (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeltaSign(-1)}
                  className={`min-h-[44px] px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    deltaSign === -1
                      ? 'bg-red-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Minus size={15} weight="bold" />
                  <span>Salida (−)</span>
                </button>
              </div>

              <input
                type="text"
                inputMode={isUnd ? 'numeric' : 'decimal'}
                value={deltaQtyStr}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.');
                  if (isUnd) {
                    if (raw === '' || /^\d*$/.test(raw)) setDeltaQtyStr(raw);
                  } else {
                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) setDeltaQtyStr(raw);
                  }
                }}
                placeholder={isUnd ? 'Ej. 5' : '0.000'}
                className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                required
              />
            </div>
          </div>

          {/* Selector de lote si el producto controla lotes */}
          {isTracked && (
            <div className="p-3.5 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                  <Tag size={14} weight="bold" className="text-purple-700" />
                  <span>
                    Lote {adjustmentType === 'EXPIRED' ? '(obligatorio *)' : '(opcional)'}
                  </span>
                </label>
                {isLoadingBatches && <span className="text-xs text-purple-700">Cargando...</span>}
              </div>

              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required={adjustmentType === 'EXPIRED'}
                className="w-full h-11 px-3 rounded-xl border border-purple-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-purple-600"
              >
                <option value="">
                  {adjustmentType === 'EXPIRED'
                    ? 'Seleccioná el lote vencido...'
                    : deltaSign > 0
                    ? 'Automático (sumar al lote AJUSTE)'
                    : 'Automático (salida FEFO por vencimiento)'}
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} · {formatQuantity(b.quantity, unit)} ·{' '}
                    {b.expiryDate ? `Vence ${formatManaguaDate(b.expiryDate)}` : 'Sin fecha'}
                  </option>
                ))}
              </select>

              {!batchId && deltaSign > 0 && (
                <p className="text-xs text-purple-900">
                  La entrada se registrará en el lote <strong>AJUSTE</strong> (sin fecha). Luego podés editar su código y vencimiento en Lotes.
                </p>
              )}
            </div>
          )}

          {/* Motivo obligatorio */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Motivo del ajuste <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Conteo físico, producto vencido, daño en almacenamiento..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:border-purple-600 resize-none"
              required
            />
          </div>

          {/* Notas opcionales */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referencia, observación o respaldo..."
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Aprobación para CAJERO */}
          {needsApproval && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Autorización de encargado requerida</p>
                  <p className="text-amber-800 mt-0.5">
                    La política del negocio requiere aprobación de un Encargado o Administrador para aplicar este ajuste.
                  </p>
                </div>
              </div>

              {showApprovalStep && (
                <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-amber-950 mb-1">
                      Correo del encargado *
                    </label>
                    <input
                      type="email"
                      value={approverEmail}
                      onChange={(e) => setApproverEmail(e.target.value)}
                      placeholder="encargado@negocio.com"
                      className="w-full h-11 px-3 rounded-xl border border-amber-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-950 mb-1">
                      Contraseña del encargado *
                    </label>
                    <input
                      type="password"
                      value={approverPassword}
                      onChange={(e) => setApproverPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 px-3 rounded-xl border border-amber-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || absQty <= 0 || !reason.trim()}
              className="min-h-[44px] px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting
                ? 'Aplicando...'
                : needsApproval && !showApprovalStep
                ? 'Continuar con autorización'
                : needsApproval && showApprovalStep
                ? 'Autorizar y aplicar'
                : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
