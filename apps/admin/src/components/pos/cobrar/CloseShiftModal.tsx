import React, { useState } from 'react';
import {
  X,
  CashRegister,
  Coins,
  Calculator,
  WarningCircle,
  CheckCircle,
  Eye,
  CircleNotch,
  FilePdf,
  Key,
} from '@phosphor-icons/react';
import {
  type CloseCashRegisterDto,
  type DenominationItemDto,
  type CashRegisterTipsSummary,
} from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import { TipsSummaryBlock } from '../TipsSummaryBlock';
import {
  downloadShiftClosePdf,
  type ShiftClosePrintData,
  type ReceiptBusinessInfo,
} from '../../../utils/receiptPdf';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentShift: {
    shiftId: string;
    cashierName?: string | null;
    openedAt: string;
    openingCash?: number;
    expectedCash?: number;
    tipsSummary?: CashRegisterTipsSummary | null;
    [key: string]: any;
  } | null;
  policies: {
    blindCashClose?: boolean;
    cashCloseDiscrepancyPolicy?: 'AUTORIZACION' | 'LIBRE';
    cashCloseTolerance?: number;
    cashCloseMaxRecounts?: number;
    multiCurrencyEnabled?: boolean;
  };
  isSupervisor: boolean; // ENCARGADO or SUPERADMIN
  businessInfo?: ReceiptBusinessInfo;
  onCloseShift: (dto: CloseCashRegisterDto) => Promise<any>;
  isClosing: boolean;
}

const NIO_DENOMINATIONS = [
  { value: 1000, label: 'C$ 1,000' },
  { value: 500, label: 'C$ 500' },
  { value: 200, label: 'C$ 200' },
  { value: 100, label: 'C$ 100' },
  { value: 50, label: 'C$ 50' },
  { value: 20, label: 'C$ 20' },
  { value: 10, label: 'C$ 10' },
  { value: 5, label: 'C$ 5' },
  { value: 1, label: 'C$ 1' },
];

const USD_DENOMINATIONS = [
  { value: 100, label: 'US$ 100' },
  { value: 50, label: 'US$ 50' },
  { value: 20, label: 'US$ 20' },
  { value: 10, label: 'US$ 10' },
  { value: 5, label: 'US$ 5' },
  { value: 1, label: 'US$ 1' },
];

const DISCREPANCY_REASONS = [
  { value: 'FALTANTE_CONTEO', label: 'Faltante en conteo' },
  { value: 'SOBRANTE_CAMBIO', label: 'Sobrante por cambio no reclamado' },
  { value: 'ERROR_DE_COBRO', label: 'Error de cobro' },
  { value: 'VUELTO_INCORRECTO', label: 'Vuelto incorrecto' },
  { value: 'GASTO_NO_REGISTRADO', label: 'Gasto no registrado' },
  { value: 'RETIRO_NO_REGISTRADO', label: 'Retiro no registrado' },
  { value: 'OTRO', label: 'Otro motivo (requiere detalle)' },
];

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentShift,
  policies,
  isSupervisor,
  businessInfo,
  onCloseShift,
  isClosing,
}) => {
  const [countingMode, setCountingMode] = useState<'DENOMINATIONS' | 'DIRECT'>('DENOMINATIONS');

  // Cantidades de denominaciones NIO
  const [denomsNio, setDenomsNio] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  // Cantidades de denominaciones USD (si multi-currency)
  const [denomsUsd, setDenomsUsd] = useState<Record<number, number>>({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  // Monto directo alternativo
  const [directAmountNioStr, setDirectAmountNioStr] = useState('');
  const [directAmountUsdStr, setDirectAmountUsdStr] = useState('');

  // Cierre ciego: si policy está activa y no es supervisor que reveló
  const [revealExpected, setRevealExpected] = useState(false);
  const isBlind = Boolean(policies.blindCashClose) && (!isSupervisor || !revealExpected);

  // Estados de autorización por descuadre
  const [showAuthFields, setShowAuthFields] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState('FALTANTE_CONTEO');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [authorizerPin, setAuthorizerPin] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closedResultData, setClosedResultData] = useState<ShiftClosePrintData | null>(null);

  if (!isOpen) return null;

  // Totales contados
  const totalNioFromDenoms = Object.entries(denomsNio).reduce(
    (sum, [val, qty]) => sum + Number(val) * (Number(qty) || 0),
    0,
  );
  const totalUsdFromDenoms = Object.entries(denomsUsd).reduce(
    (sum, [val, qty]) => sum + Number(val) * (Number(qty) || 0),
    0,
  );

  const effectiveClosingCash =
    countingMode === 'DENOMINATIONS'
      ? totalNioFromDenoms
      : parseFloat(directAmountNioStr) || 0;

  const effectiveClosingCashUsd =
    countingMode === 'DENOMINATIONS'
      ? totalUsdFromDenoms
      : parseFloat(directAmountUsdStr) || 0;

  const expectedCash = currentShift?.expectedCash ?? currentShift?.openingCash ?? 0;
  const difference = effectiveClosingCash - expectedCash;
  const tolerance = policies.cashCloseTolerance || 0;
  const hasDiscrepancy = Math.abs(difference) > tolerance;

  const handleDenomNioChange = (val: number, qtyStr: string) => {
    const qty = Math.max(0, parseInt(qtyStr, 10) || 0);
    setDenomsNio((prev) => ({ ...prev, [val]: qty }));
  };

  const handleDenomUsdChange = (val: number, qtyStr: string) => {
    const qty = Math.max(0, parseInt(qtyStr, 10) || 0);
    setDenomsUsd((prev) => ({ ...prev, [val]: qty }));
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Si hay descuadre y es 'OTRO', exige al menos 10 caracteres
    if (hasDiscrepancy && discrepancyReason === 'OTRO' && discrepancyNote.trim().length < 10) {
      setErrorMessage('Para el motivo "Otro motivo", la nota debe tener al menos 10 caracteres explicativos.');
      return;
    }

    // Si es cajero y requiere autorización y hay descuadre, pedir PIN
    if (
      hasDiscrepancy &&
      policies.cashCloseDiscrepancyPolicy === 'AUTORIZACION' &&
      !isSupervisor &&
      !authorizerPin.trim()
    ) {
      setShowAuthFields(true);
      setErrorMessage('El conteo presenta un descuadre. Ingresá el motivo y el PIN del encargado para autorizar el cierre.');
      return;
    }

    try {
      const denominationsNioPayload: DenominationItemDto[] =
        countingMode === 'DENOMINATIONS'
          ? Object.entries(denomsNio)
              .filter(([_, qty]) => Number(qty) > 0)
              .map(([val, qty]) => ({ value: Number(val), qty: Number(qty) }))
          : [];

      const payload: CloseCashRegisterDto = {
        closingCash: effectiveClosingCash,
        closingCashUsd: policies.multiCurrencyEnabled ? effectiveClosingCashUsd : undefined,
        denominations: denominationsNioPayload.length > 0 ? denominationsNioPayload : undefined,
        countMode: countingMode === 'DENOMINATIONS' ? 'DENOMINATIONS' : 'TOTAL',
        notes: notes.trim() || undefined,
        discrepancyReason: hasDiscrepancy ? discrepancyReason : undefined,
        discrepancyNote: hasDiscrepancy ? discrepancyNote.trim() : undefined,
        authorizerPin: hasDiscrepancy && authorizerPin.trim() ? authorizerPin.trim() : undefined,
      };

      const result = await onCloseShift(payload);

      const closedTipsSummary: CashRegisterTipsSummary | null =
        result?.closingBreakdown && 'tipsSummary' in result.closingBreakdown
          ? result.closingBreakdown.tipsSummary ?? null
          : result && 'tipsSummary' in result
            ? result.tipsSummary ?? null
            : !isBlind
              ? currentShift?.tipsSummary ?? null
              : null;

      // Preparar datos para reporte PDF
      const printData: ShiftClosePrintData = {
        shiftId: currentShift?.shiftId || currentShift?.id || 'TURNO',
        cashierName: currentShift?.cashierName || currentShift?.openedBy?.name || 'Cajero',
        openedAt: currentShift?.openedAt || new Date().toISOString(),
        closedAt: new Date().toISOString(),
        openingCash: Number(currentShift?.openingCash || 0),
        expectedCash: result?.expectedCash ?? expectedCash,
        closingCash: effectiveClosingCash,
        difference: result?.difference ?? difference,
        closingCashUsd: policies.multiCurrencyEnabled ? effectiveClosingCashUsd : undefined,
        tipsSummary: closedTipsSummary,
        notes: notes.trim() || null,
        discrepancyReason: hasDiscrepancy ? discrepancyReason : null,
        discrepancyNote: hasDiscrepancy ? discrepancyNote.trim() : null,
        authorizedByName: result?.discrepancyAuthorizer?.name || (authorizerPin ? 'Encargado (PIN)' : null),
      };

      setClosedResultData(printData);
      onSuccess?.();
    } catch (err: any) {
      const code = err?.response?.data?.code || '';
      const msg = err?.response?.data?.message || '';

      if (code === 'CASH_CLOSE_AUTH_REQUIRED') {
        setShowAuthFields(true);
        setErrorMessage(msg || 'Se requiere autorización del encargado (PIN) para cerrar la caja con descuadre.');
      } else if (code === 'CASH_CLOSE_COUNT_MISMATCH') {
        setErrorMessage(msg || 'El conteo no coincide con lo registrado. Revisá el efectivo y volvé a contar.');
      } else if (code === 'CASH_CLOSE_PIN_LOCKED') {
        setErrorMessage(msg || 'Demasiados intentos con el PIN. Esperá unos minutos o pedile al encargado que cierre el turno.');
      } else {
        setErrorMessage(msg || 'Ocurrió un error al cerrar el turno de caja.');
      }
    }
  };

  // Pantalla de cierre exitoso con descarga de comprobante
  if (closedResultData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6 text-center space-y-5 shadow-2xl border border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle size={36} weight="duotone" />
          </div>

          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide mb-1.5">
              Turno cerrado
            </span>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              Cierre de caja completado
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              El turno ha sido cerrado y auditado correctamente.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Efectivo esperado:</span>
              <span className="font-mono font-bold text-gray-800">
                {formatCurrency(closedResultData.expectedCash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Efectivo contado:</span>
              <span className="font-mono font-bold text-gray-900">
                {formatCurrency(closedResultData.closingCash)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200 font-semibold">
              <span className="text-gray-700">Diferencia:</span>
              <span
                className={`font-mono ${
                  Math.abs(closedResultData.difference) < 0.01
                    ? 'text-emerald-700'
                    : closedResultData.difference < 0
                    ? 'text-red-700'
                    : 'text-blue-700'
                }`}
              >
                {formatCurrency(closedResultData.difference)}
              </span>
            </div>
          </div>

          {closedResultData.tipsSummary != null && (
            <TipsSummaryBlock tipsSummary={closedResultData.tipsSummary} compact />
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => downloadShiftClosePdf(closedResultData, businessInfo)}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <FilePdf size={18} />
              <span>Descargar comprobante en PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 text-gray-600 hover:text-gray-900 text-xs font-semibold rounded-xl transition-colors min-h-[44px] cursor-pointer"
            >
              Finalizar y salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <CashRegister size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Cerrar turno de caja</h3>
              <p className="text-xs text-gray-500">Realizá el arqueo y conteo final de efectivo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isClosing}
            className="w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCloseSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Banner de información de cierre ciego vs supervisor */}
          {isBlind ? (
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <span className="font-medium">
                Arqueo ciego activo: contá el dinero sin ver el monto esperado del sistema.
              </span>
              {isSupervisor && (
                <button
                  type="button"
                  onClick={() => setRevealExpected(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 ml-2 cursor-pointer shrink-0"
                >
                  <Eye size={14} />
                  <span>Revelar</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-700">
                <span className="text-gray-500">Efectivo esperado según ventas:</span>
                <span className="font-mono font-bold text-gray-900">
                  {formatCurrency(expectedCash)}
                </span>
              </div>
              {currentShift?.tipsSummary != null && (
                <TipsSummaryBlock tipsSummary={currentShift.tipsSummary} compact />
              )}
            </div>
          )}

          {/* Selector de modo de conteo */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setCountingMode('DENOMINATIONS')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                countingMode === 'DENOMINATIONS'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Coins size={16} />
              <span>Por denominaciones</span>
            </button>
            <button
              type="button"
              onClick={() => setCountingMode('DIRECT')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                countingMode === 'DIRECT'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calculator size={16} />
              <span>Monto directo</span>
            </button>
          </div>

          {/* Conteo de Billetes y Monedas */}
          {countingMode === 'DENOMINATIONS' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 px-1">
                <span>Billetes y monedas (Córdobas C$)</span>
                <span>Cantidad</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {NIO_DENOMINATIONS.map((d) => (
                  <div
                    key={d.value}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <span className="text-xs font-bold text-gray-800">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={denomsNio[d.value] || ''}
                      onChange={(e) => handleDenomNioChange(d.value, e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-center text-gray-900 focus:border-gray-900 focus:outline-hidden min-h-[44px]"
                    />
                  </div>
                ))}
              </div>

              {/* Si multimoneda está activa, conteo en USD */}
              {policies.multiCurrencyEnabled && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <span className="text-xs font-semibold text-gray-700 block">
                    Billetes en Dólares (US$)
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {USD_DENOMINATIONS.map((d) => (
                      <div
                        key={d.value}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <span className="text-xs font-bold text-gray-800">{d.label}</span>
                        <input
                          type="number"
                          min="0"
                          value={denomsUsd[d.value] || ''}
                          onChange={(e) => handleDenomUsdChange(d.value, e.target.value)}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-center text-gray-900 focus:border-gray-900 focus:outline-hidden min-h-[44px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Efectivo total contado (C$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    C$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={directAmountNioStr}
                    onChange={(e) => setDirectAmountNioStr(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-11 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
                  />
                </div>
              </div>

              {policies.multiCurrencyEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Efectivo contado en Dólares (US$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={directAmountUsdStr}
                      onChange={(e) => setDirectAmountUsdStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen del conteo antes de enviar */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Total contado:</span>
              <span className="font-mono font-bold text-gray-900 text-sm">
                {formatCurrency(effectiveClosingCash)}
              </span>
            </div>
            {!isBlind && (
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-500">Diferencia:</span>
                <span
                  className={`font-mono font-bold ${
                    Math.abs(difference) <= tolerance
                      ? 'text-emerald-700'
                      : difference < 0
                      ? 'text-red-700'
                      : 'text-blue-700'
                  }`}
                >
                  {formatCurrency(difference)}
                </span>
              </div>
            )}
          </div>

          {/* Campos de autorización por descuadre (si se detectó o si el API lo exigió) */}
          {(showAuthFields || (!isBlind && hasDiscrepancy)) && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                <WarningCircle size={18} />
                <span>Descuadre fuera de tolerancia detectado</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motivo del descuadre (obligatorio)
                </label>
                <select
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden min-h-[44px] cursor-pointer"
                >
                  {DISCREPANCY_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nota explicativa {discrepancyReason === 'OTRO' ? '(mínimo 10 caracteres)' : '(obligatoria)'}
                </label>
                <input
                  type="text"
                  value={discrepancyNote}
                  onChange={(e) => setDiscrepancyNote(e.target.value)}
                  placeholder="Detalle o justificación de la diferencia"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden min-h-[44px]"
                />
              </div>

              {/* PIN de autorización si no es supervisor */}
              {!isSupervisor && policies.cashCloseDiscrepancyPolicy === 'AUTORIZACION' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    PIN del encargado (obligatorio)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Key size={16} />
                    </span>
                    <input
                      type="password"
                      maxLength={6}
                      value={authorizerPin}
                      onChange={(e) => setAuthorizerPin(e.target.value)}
                      placeholder="PIN de autorización"
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:outline-hidden min-h-[44px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notas generales opcionales */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Observaciones adicionales (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas generales del turno"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden min-h-[44px]"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isClosing}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              {isClosing ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Procesando cierre de caja...</span>
                </>
              ) : (
                <span>Confirmar y cerrar turno de caja</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
