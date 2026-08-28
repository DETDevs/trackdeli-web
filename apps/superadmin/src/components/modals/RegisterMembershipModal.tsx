import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import {
  UploadSimple,
  X,
  ArrowRight,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useCreateMembership,
  PaymentMethod,
} from '../../hooks/useMemberships';

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

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [amount, setAmount] = useState<number>(35.0);
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paidAt, setPaidAt] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const createMembershipMutation = useCreateMembership();

  useEffect(() => {
    if (isOpen) {
      setStartDate(todayStr);
      setEndDate(defaultEndStr);
      setAmount(35.0);
      setCurrency('USD');
      setPaymentMethod('TRANSFERENCIA');
      setPaidAt(todayStr);
      setNotes('');
      setFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        setEndDate(format(addDays(d, 30), 'yyyy-MM-dd'));
      }
    } catch {
      // ignore
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
    if (!businessId || !startDate || !endDate || amount <= 0) return;

    createMembershipMutation.mutate(
      {
        businessId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amount: Number(amount),
        currency,
        paymentMethod,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        notes: notes.trim() || undefined,
        file,
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
        {/* Período */}
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

        {/* Monto y Moneda */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Monto pagado
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-medium"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Moneda
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900 font-medium"
            >
              <option value="USD">USD</option>
              <option value="NIO">NIO (C$)</option>
            </select>
          </div>
        </div>

        {/* Método de Pago y Fecha de Cobro */}
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

        {/* Comprobante de Pago */}
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

        {/* Notas Internas */}
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

        {/* Acciones */}
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
