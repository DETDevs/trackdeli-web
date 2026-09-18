import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import {
  UploadSimple,
  X,
  ArrowRight,
  Motorcycle,
  Receipt,
  Wallet,
  CalendarBlank,
  Check,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useCreateMembership,
  PaymentMethod,
} from '../../hooks/useMemberships';
import {
  useBusinessProducts,
  BusinessProductType,
} from '../../hooks/useBusinessProducts';

interface RegisterMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
}

export const RegisterMembershipModal: React.FC<RegisterMembershipModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultEndStr = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  const { data: productsData } = useBusinessProducts(businessId);

  const activeProducts = useMemo(() => {
    if (!productsData?.products) return [];
    const list: Array<{
      id: string;
      productType: BusinessProductType;
      name: string;
      subtitle: string;
      fee: number | null;
      icon: React.ReactNode;
      activeColor: string;
    }> = [];

    if (productsData.products.DELIVERY?.status === 'ACTIVE' && productsData.products.DELIVERY.id) {
      list.push({
        id: productsData.products.DELIVERY.id,
        productType: 'DELIVERY',
        name: 'Delivery',
        subtitle: 'Despacho y reparto',
        fee: null,
        icon: <Motorcycle size={16} weight="duotone" className="text-amber-600 shrink-0" />,
        activeColor: 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/30',
      });
    }

    if (productsData.products.POS?.status === 'ACTIVE' && productsData.products.POS.id) {
      const fee = productsData.products.POS.posMonthlyFee;
      list.push({
        id: productsData.products.POS.id,
        productType: 'POS',
        name: 'Sistema POS',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <Receipt size={16} weight="duotone" className="text-purple-600 shrink-0" />,
        activeColor: 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500/30',
      });
    }

    if (
      productsData.products.CARTERA_COBRO?.status === 'ACTIVE' &&
      productsData.products.CARTERA_COBRO.id
    ) {
      const fee = productsData.products.CARTERA_COBRO.carteraMonthlyFee;
      list.push({
        id: productsData.products.CARTERA_COBRO.id,
        productType: 'CARTERA_COBRO',
        name: 'Cartera de Cobro',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <Wallet size={16} weight="duotone" className="text-emerald-600 shrink-0" />,
        activeColor: 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30',
      });
    }

    if (
      productsData.products.CITAS?.status === 'ACTIVE' &&
      productsData.products.CITAS.id
    ) {
      const fee = productsData.products.CITAS.citasMonthlyFee;
      list.push({
        id: productsData.products.CITAS.id,
        productType: 'CITAS',
        name: 'Citas',
        subtitle: fee ? `$${Number(fee).toFixed(2)}/mes` : 'Sin cuota fija',
        fee: fee ? Number(fee) : null,
        icon: <CalendarBlank size={16} weight="duotone" className="text-sky-600 shrink-0" />,
        activeColor: 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500/30',
      });
    }

    return list;
  }, [productsData]);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paidAt, setPaidAt] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const createMembershipMutation = useCreateMembership();

  const calculateSuggestedAmount = (productIds: string[], curr: string): string => {
    if (curr !== 'USD') return '';
    if (productIds.length === 0) return '';
    const selected = activeProducts.filter((p) => productIds.includes(p.id));
    const sumFees = selected.reduce((acc, p) => acc + (p.fee ? Number(p.fee) : 0), 0);
    if (sumFees > 0) {
      return sumFees.toFixed(2);
    }
    // Si solo seleccionó Delivery (que no tiene cuota fija en el backend, cuota base legacy de $35)
    if (selected.some((p) => p.productType === 'DELIVERY')) {
      return '35.00';
    }
    return '';
  };

  useEffect(() => {
    if (isOpen) {
      setStartDate(todayStr);
      setEndDate(defaultEndStr);
      setCurrency('USD');
      setPaymentMethod('TRANSFERENCIA');
      setPaidAt(todayStr);
      setNotes('');
      setFile(null);
      setPreviewUrl(null);

      // Preseleccionar automáticamente si tiene exactamente 1 producto activo:
      if (activeProducts.length === 1) {
        const initialIds = [activeProducts[0].id];
        setSelectedProductIds(initialIds);
        setAmount(calculateSuggestedAmount(initialIds, 'USD'));
      } else {
        setSelectedProductIds([]);
        setAmount('');
      }
    }
  }, [isOpen, activeProducts]);

  const toggleProduct = (id: string) => {
    const nextSelected = selectedProductIds.includes(id)
      ? selectedProductIds.filter((p) => p !== id)
      : [...selectedProductIds, id];

    setSelectedProductIds(nextSelected);

    if (currency === 'USD') {
      const suggested = calculateSuggestedAmount(nextSelected, 'USD');
      setAmount(suggested);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    if (newCurrency === 'NIO') {
      // Sin tasa de cambio oficial en el sistema, campo vacío para carga manual
      setAmount('');
    } else if (newCurrency === 'USD') {
      const suggested = calculateSuggestedAmount(selectedProductIds, 'USD');
      setAmount(suggested);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        setEndDate(format(addDays(d, 30), 'yyyy-MM-dd'));
      }
    } catch {
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!businessId || !startDate || !endDate || isNaN(numAmount) || numAmount <= 0) return;

    createMembershipMutation.mutate(
      {
        businessId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amount: numAmount,
        currency,
        paymentMethod,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        notes: notes.trim() || undefined,
        file,
        businessProductSubscriptionIds:
          selectedProductIds.length > 0 ? selectedProductIds : undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago de Membresía"
      subtitle={`Negocio: ${businessName}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Período de vigencia
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">Desde</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">Hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Autocompletado a 30 días de cobertura
          </p>
        </div>

        {/* Selector múltiple de productos contratados */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-700">
              Producto(s) cubierto(s) por este pago
            </label>
            {activeProducts.length > 1 && (
              <span className="text-[10px] text-gray-400">
                Selecciona uno o varios
              </span>
            )}
          </div>

          {activeProducts.length === 0 ? (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-500">
              Este negocio no tiene productos contratados activos en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeProducts.map((prod) => {
                const isSelected = selectedProductIds.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleProduct(prod.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? `${prod.activeColor} shadow-2xs`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0">{prod.icon}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 leading-tight">
                          {prod.name}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                          {prod.subtitle}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={11} weight="bold" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Monto pagado
            </label>
            <div className="relative">
              <span
                className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${
                  currency === 'NIO' ? 'text-amber-700' : 'text-gray-400'
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
                required
                className={`w-full h-10 ${
                  currency === 'NIO' ? 'pl-9' : 'pl-7'
                } pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-semibold font-mono`}
              />
            </div>
            {currency === 'USD' ? (
              <p className="text-[11px] text-gray-400 mt-1">
                {selectedProductIds.length > 0
                  ? amount
                    ? `Monto sugerido para los productos seleccionados ($${amount}). Editable si aplica descuento.`
                    : 'Monto sugerido según tarifas activas.'
                  : 'Selecciona producto(s) para sugerir el monto automáticamente.'}
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 mt-1">
                No hay tasa de cambio oficial configurada. Ingrese el monto en Córdobas (C$) manualmente.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Moneda
            </label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-medium cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="NIO">NIO (C$)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            >
              <option value="TRANSFERENCIA">Transferencia bancaria</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="PAYPAL">PayPal</option>
              <option value="BINANCE">Binance</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha en que se recibió
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Comprobante de pago (opcional)
          </label>

          {previewUrl ? (
            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Comprobante"
                  className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                />
                <div>
                  <p className="text-xs font-medium text-gray-900 truncate max-w-[200px]">
                    {file?.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {(file!.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 hover:border-gray-900 rounded-xl cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <UploadSimple size={20} className="text-gray-400 mb-1" />
              <span className="text-xs font-medium text-gray-700">
                📎 Subir foto del comprobante
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                PNG, JPG o WEBP (máx. 5MB)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notas internas (opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Pago de renovación mes de Septiembre vía BAC"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMembershipMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {createMembershipMutation.isPending ? (
              'Guardando...'
            ) : (
              <>
                <span>Guardar pago</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
