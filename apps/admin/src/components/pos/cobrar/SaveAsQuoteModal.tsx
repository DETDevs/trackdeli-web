import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  MagnifyingGlass,
  CircleNotch,
  WarningCircle,
  CheckCircle,
  FloppyDisk,
  PaperPlaneTilt,
  Printer,
  CaretDown,
  CaretUp,
  Car,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import {
  canPrintQuote,
  createPosQuote,
  formatQuoteApiError,
  generateQuoteRequestId,
  searchPosCustomers,
  type PosCustomer,
  type PosQuote,
} from 'api-client';
import type { CartItem } from '../../../store/posCart.store';
import { formatQuoteMoney } from '../../../utils/quoteReceiptHtml';
import { ManagerApprovalModal } from './ManagerApprovalModal';

interface SaveAsQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  discountAmount: number;
  estimatedTotal: number;
  currency?: string;
  isTaller: boolean;
  userRole?: string;
  onClearCart: () => void;
  onOpenPrint: (quote: PosQuote) => void;
  onGoToQuotes: () => void;
}

export const SaveAsQuoteModal: React.FC<SaveAsQuoteModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  discountAmount,
  estimatedTotal,
  currency = 'NIO',
  isTaller,
  userRole,
  onClearCart,
  onOpenPrint,
  onGoToQuotes,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerRuc, setCustomerRuc] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [validityDays, setValidityDays] = useState('15');
  const [showOptionalNotes, setShowOptionalNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState('');

  const [savingTarget, setSavingTarget] = useState<'DRAFT' | 'SENT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedQuote, setSavedQuote] = useState<PosQuote | null>(null);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalDescription, setApprovalDescription] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'DRAFT' | 'SENT' | null>(null);
  const requestIdRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setCustomerSearch('');
    setCustomerResults([]);
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerRuc('');
    setCustomerAddress('');
    setVehicleInfo('');
    setValidityDays('15');
    setShowOptionalNotes(false);
    setNotes('');
    setConditions('');
    setSavingTarget(null);
    setError(null);
    setSavedQuote(null);
    setApprovalOpen(false);
    setPendingStatus(null);
    requestIdRef.current = generateQuoteRequestId('quote-cobrar');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || savedQuote) return;
    const trimmed = customerSearch.trim();
    if (trimmed.length < 2) {
      setCustomerResults([]);
      setSearchingCustomers(false);
      return;
    }

    let cancelled = false;
    setSearchingCustomers(true);
    const timer = setTimeout(() => {
      searchPosCustomers(trimmed)
        .then((list) => {
          if (!cancelled) setCustomerResults(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!cancelled) setCustomerResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingCustomers(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearch, isOpen, savedQuote]);

  if (!isOpen) return null;

  const handleSelectCustomer = (c: PosCustomer) => {
    setCustomerId(c.id);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerRuc(c.ruc || '');
    setCustomerAddress(c.lastAddressText || '');
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const handleSave = async (status: 'DRAFT' | 'SENT', approvalToken?: string) => {
    if (cartItems.length === 0 || savingTarget) return;

    setSavingTarget(status);
    setError(null);
    const parsedValidity = Math.min(90, Math.max(1, Math.round(Number(validityDays) || 15)));

    try {
      const created = await createPosQuote({
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          taxable: Boolean(item.taxable),
        })),
        customerId: customerId || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerRuc: customerRuc.trim() || null,
        customerAddress: customerAddress.trim() || null,
        vehicleInfo: isTaller ? vehicleInfo.trim() || null : undefined,
        validityDays: parsedValidity,
        discountAmount: userRole === 'VENDEDOR' ? 0 : Math.max(0, Number(discountAmount || 0)),
        approvalToken,
        notes: notes.trim() || null,
        conditions: conditions.trim() || null,
        status,
        clientRequestId: requestIdRef.current,
      });

      setSavedQuote(created);
    } catch (err) {
      const parsed = formatQuoteApiError(err, 'No se pudo guardar la proforma.');
      if (parsed.code === 'DISCOUNT_LIMIT_EXCEEDED' && userRole === 'CAJERO') {
        setPendingStatus(status);
        setApprovalDescription(parsed.message);
        setApprovalOpen(true);
      } else {
        setError(parsed.message);
      }
    } finally {
      setSavingTarget(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900">
                {savedQuote ? `Proforma ${savedQuote.quoteNumber}` : 'Guardar como proforma'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {savedQuote
                  ? 'Documento generado sin afectar inventario ni caja'
                  : 'Generá una cotización con los productos del carrito actual'}
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(savingTarget)}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          {savedQuote ? (
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                <CheckCircle size={24} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-bold text-emerald-950">
                    {savedQuote.status === 'SENT'
                      ? `Proforma ${savedQuote.quoteNumber} emitida`
                      : `Borrador ${savedQuote.quoteNumber} guardado`}
                  </p>
                  <p className="text-xs text-emerald-800">
                    Total oficial:{' '}
                    <strong className="whitespace-nowrap">
                      {formatQuoteMoney(savedQuote.total, savedQuote.currency)}
                    </strong>{' '}
                    · Válida hasta {savedQuote.validUntilLabel}
                  </p>
                  {savedQuote.customerName && (
                    <p className="text-xs text-emerald-800">Cliente: {savedQuote.customerName}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {canPrintQuote(savedQuote.status) && (
                  <button
                    type="button"
                    onClick={() => onOpenPrint(savedQuote)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer size={16} />
                    Imprimir o guardar PDF
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClearCart();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Vaciar carrito y volver al POS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearCart();
                    onClose();
                    onGoToQuotes();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowSquareOut size={15} />
                  Vaciar carrito e ir a Proformas
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cerrar y mantener carrito
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600">
                  {cartItems.length}{' '}
                  {cartItems.length === 1 ? 'producto en carrito' : 'productos en carrito'} · Sin
                  mover stock ni caja
                </span>
                <span className="font-bold text-slate-900 whitespace-nowrap">
                  {formatQuoteMoney(estimatedTotal, currency)}
                </span>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 flex items-start gap-2">
                  <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
                  <span>{error}</span>
                </div>
              )}

              {/* Buscar cliente o ingresar libre */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Cliente (opcional)
                  </label>
                  {(customerId || customerName || customerPhone || customerRuc) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerId(null);
                        setCustomerName('');
                        setCustomerPhone('');
                        setCustomerRuc('');
                        setCustomerAddress('');
                      }}
                      className="text-xs font-semibold text-rose-600 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="relative">
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Buscá un cliente por nombre o teléfono..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                  />
                  {searchingCustomers && (
                    <CircleNotch
                      size={15}
                      className="animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"
                    />
                  )}
                  {customerResults.length > 0 && (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50 cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">
                            {[c.phone, c.ruc].filter(Boolean).join(' · ') || 'Sin datos extras'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    maxLength={120}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre completo o negocio"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    type="text"
                    maxLength={40}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Teléfono (opcional)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    type="text"
                    maxLength={40}
                    value={customerRuc}
                    onChange={(e) => setCustomerRuc(e.target.value)}
                    placeholder="RUC / Cédula (opcional)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    placeholder="Vigencia en días (15)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    aria-label="Vigencia en días"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Vigencia por defecto: {Math.min(90, Math.max(1, Number(validityDays) || 15))} días
                  calendario.
                </p>
              </div>

              {isTaller && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Car size={14} />
                    Vehículo (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    placeholder="Ej.: Kia Rio 2019 · Placa M-45120"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => setShowOptionalNotes((v) => !v)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  {showOptionalNotes ? <CaretUp size={14} /> : <CaretDown size={14} />}
                  Notas y condiciones (opcional)
                </button>

                {showOptionalNotes && (
                  <div className="mt-2.5 space-y-2.5">
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas para el cliente..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 resize-none"
                    />
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      placeholder="Condiciones comerciales..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={cartItems.length === 0 || Boolean(savingTarget)}
                  onClick={() => handleSave('DRAFT')}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingTarget === 'DRAFT' ? (
                    <CircleNotch size={15} className="animate-spin" />
                  ) : (
                    <FloppyDisk size={15} />
                  )}
                  Guardar borrador
                </button>
                <button
                  type="button"
                  disabled={cartItems.length === 0 || Boolean(savingTarget)}
                  onClick={() => handleSave('SENT')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingTarget === 'SENT' ? (
                    <CircleNotch size={15} className="animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={15} />
                  )}
                  Emitir proforma
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ManagerApprovalModal
        isOpen={approvalOpen}
        onClose={() => {
          setApprovalOpen(false);
          setPendingStatus(null);
        }}
        actionTitle="Autorizar descuento en proforma"
        actionDescription={
          approvalDescription ||
          'El descuento del carrito supera el máximo permitido para cajeros.'
        }
        actionCode="APLICAR_DESCUENTO"
        entityType="PosQuote"
        onApproved={(token) => {
          const target = pendingStatus || 'DRAFT';
          setPendingStatus(null);
          void handleSave(target, token);
        }}
      />
    </>
  );
};

