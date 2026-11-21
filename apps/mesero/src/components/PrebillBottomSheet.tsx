import React, { useRef } from 'react';
import { X, Printer, Receipt } from '@phosphor-icons/react';
import type { PosTableBill, ReceiptSettings } from '../types/mesero';

interface PrebillBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bill: PosTableBill | null;
  receiptSettings?: ReceiptSettings;
  tableDisplayName?: string;
}

export const PrebillBottomSheet: React.FC<PrebillBottomSheetProps> = ({
  isOpen,
  onClose,
  bill,
  receiptSettings,
  tableDisplayName,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !bill) return null;

  const snap = bill.snapshot;
  const businessName = snap.businessName || receiptSettings?.businessName || 'Trackdeli';
  const taxId = snap.businessTaxId || receiptSettings?.taxId;
  const address = snap.businessAddress || receiptSettings?.address;
  const phone = snap.businessPhone || receiptSettings?.phone;

  const lines = snap.lines || snap.items || [];
  const isReprint = Boolean(bill.isReprint || snap.isReprint || snap.sequence > 1);

  const formattedDate = snap.requestedAt
    ? new Date(snap.requestedAt).toLocaleString('es-NI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('es-NI');

  const handlePrint = () => {
    window.print();
  };

  const hasTip = Boolean(snap.tipAmount && snap.tipAmount > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-2xs p-0 sm:p-4 animate-fadeIn">
      {/* Estilos dedicados para impresión térmica en papel angosto */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-prebill, #printable-prebill * {
            visibility: visible !important;
          }
          #printable-prebill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-gray-100 overflow-hidden">
        {/* Encabezado del modal */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
              <Receipt size={20} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-gray-900">Cuenta de la mesa</h3>
                {isReprint && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Reimpresión #{snap.sequence}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {snap.tableLabel || tableDisplayName || `Mesa ${snap.tableNumber}`}
                {snap.subAccountLabel && ` · ${snap.subAccountLabel}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer touch-manipulation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Vista del ticket tipo recibo */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/60">
          <div
            id="printable-prebill"
            ref={printRef}
            className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 font-sans text-xs text-gray-900"
          >
            {/* Encabezado del negocio */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-300">
              <h2 className="text-base font-black tracking-tight text-gray-950 uppercase">
                {businessName}
              </h2>
              {taxId && <p className="text-xs text-gray-600">RUC: {taxId}</p>}
              {address && <p className="text-xs text-gray-500 leading-tight">{address}</p>}
              {phone && <p className="text-xs text-gray-500">Tel: {phone}</p>}
            </div>

            {/* Metadatos de la cuenta */}
            <div className="text-xs space-y-1 py-1 border-b border-dashed border-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Mesa:</span>
                <span className="font-extrabold text-gray-900">
                  {snap.tableLabel || tableDisplayName || `Mesa ${snap.tableNumber}`}
                  {snap.zoneName && ` (${snap.zoneName})`}
                </span>
              </div>
              {snap.subAccountLabel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Subcuenta:</span>
                  <span className="font-extrabold text-indigo-700">{snap.subAccountLabel}</span>
                </div>
              )}
              {snap.waiterName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Mesero:</span>
                  <span className="font-semibold text-gray-800">{snap.waiterName}</span>
                </div>
              )}
              {snap.customerName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-semibold text-gray-800">{snap.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha y hora:</span>
                <span className="font-mono text-gray-700">{formattedDate}</span>
              </div>
              {isReprint && (
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Emisión:</span>
                  <span>Reimpresión #{snap.sequence}</span>
                </div>
              )}
            </div>

            {/* Encabezado de la tabla de renglones */}
            <div className="pt-1">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider pb-1.5 border-b border-gray-200">
                <span>Descripción</span>
                <span className="text-right">Total</span>
              </div>

              {/* Renglones */}
              <div className="divide-y divide-gray-100 py-1">
                {lines.map((item, idx) => (
                  <div key={item.id || item.itemId || idx} className="py-2 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-xs leading-snug">
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {item.quantity} × C$ {Number(item.unitPrice).toFixed(2)}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-400 italic">"{item.notes}"</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-xs text-gray-950 shrink-0">
                        C$ {Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose de totales */}
            <div className="pt-2 border-t border-dashed border-gray-300 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-mono font-bold text-gray-900">
                  C$ {Number(snap.subtotal).toFixed(2)}
                </span>
              </div>

              {snap.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Descuento</span>
                  <span className="font-mono font-bold">
                    - C$ {Number(snap.discountTotal).toFixed(2)}
                  </span>
                </div>
              )}

              {snap.taxEnabled && snap.taxTotal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>IVA ({snap.taxRate || 15} %)</span>
                  <span className="font-mono font-bold text-gray-900">
                    C$ {Number(snap.taxTotal).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total a pagar */}
              <div className="flex justify-between pt-1.5 border-t border-gray-200 text-sm font-black text-gray-950">
                <span>Total a pagar</span>
                <span className="font-mono text-base">
                  C$ {Number(snap.total).toFixed(2)}
                </span>
              </div>

              {/* Propina voluntaria si aplica */}
              {hasTip && (
                <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
                  <div className="flex justify-between text-xs text-indigo-950">
                    <span className="font-semibold">
                      Propina voluntaria {snap.tipPercent ? `(${snap.tipPercent} %)` : ''}
                    </span>
                    <span className="font-mono font-bold">
                      C$ {Number(snap.tipAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-indigo-950 pt-1 border-t border-indigo-200">
                    <span>Total con propina</span>
                    <span className="font-mono text-sm">
                      C$ {Number(snap.totalWithTip || (snap.total + snap.tipAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Leyenda exacta obligatoria */}
            <div className="pt-4 pb-2 text-center border-t border-dashed border-gray-300">
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300">
                <p className="text-xs font-black uppercase tracking-wide text-gray-900">
                  Cuenta. No es un comprobante de pago.
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Gracias por su visita
              </p>
            </div>
          </div>
        </div>

        {/* Acciones inferiores del modal */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-xs font-extrabold transition-colors cursor-pointer touch-manipulation"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
          >
            <Printer size={18} weight="bold" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
