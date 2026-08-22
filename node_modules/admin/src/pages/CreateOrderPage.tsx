import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createOrder, type CreateOrderDto, type DeliveryPaymentStatus } from 'api-client';
import { toast } from 'react-hot-toast';
import { ArrowRight, CircleNotch } from '@phosphor-icons/react';

const SECTION = ({ title }: { title: string }) => (
  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
    {title}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
    {children}
  </div>
);

const inputClass = 'w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-gray-400 outline-none transition-colors';

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    destinationAddress: '',
    destinationLat: '12.1328',
    destinationLng: '-86.2504',
    description: '',
    deliveryPaymentStatus: 'CONTRA_ENTREGA' as DeliveryPaymentStatus,
    deliveryFee: '',
  });
  const [formError, setFormError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateOrderDto) => createOrder(data),
    onSuccess: () => {
      toast.success('Pedido creado exitosamente');
      navigate('/orders');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Ocurrió un error al crear el pedido.');
    },
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.customerName.trim()) return setFormError('El nombre del cliente es requerido.');
    if (!form.customerPhone.trim()) return setFormError('El WhatsApp del cliente es requerido.');
    if (!form.destinationAddress.trim()) return setFormError('La dirección de entrega es requerida.');

    const payload: CreateOrderDto = {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      destinationAddress: form.destinationAddress.trim(),
      description: form.description.trim() || undefined,
      deliveryPaymentStatus: form.deliveryPaymentStatus,
      deliveryFee: form.deliveryPaymentStatus !== 'GRATIS' && form.deliveryFee ? Number(form.deliveryFee) : 0,
      destinationLat: form.destinationLat ? Number(form.destinationLat) : undefined,
      destinationLng: form.destinationLng ? Number(form.destinationLng) : undefined,
    };

    mutate(payload);
  };

  return (
    <div className="max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6"
      >
        {/* Cliente */}
        <div>
          <SECTION title="Cliente" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del cliente">
              <input
                className={inputClass}
                type="text"
                placeholder="Ej. Pedro García"
                value={form.customerName}
                onChange={e => set('customerName', e.target.value)}
              />
            </Field>
            <Field label="WhatsApp del cliente">
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-md text-sm text-gray-500">
                  +505
                </span>
                <input
                  className={`${inputClass} rounded-l-none`}
                  type="tel"
                  placeholder="8888 7777"
                  value={form.customerPhone}
                  onChange={e => set('customerPhone', e.target.value)}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Entrega */}
        <div>
          <SECTION title="Entrega" />
          <div className="space-y-4">
            <Field label="Dirección de entrega">
              <input
                className={inputClass}
                type="text"
                placeholder="Ej. Del semáforo 2 cuadras al norte"
                value={form.destinationAddress}
                onChange={e => set('destinationAddress', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitud (opcional)">
                <input
                  className={inputClass}
                  type="number"
                  step="any"
                  placeholder="12.1328"
                  value={form.destinationLat}
                  onChange={e => set('destinationLat', e.target.value)}
                />
              </Field>
              <Field label="Longitud (opcional)">
                <input
                  className={inputClass}
                  type="number"
                  step="any"
                  placeholder="-86.2504"
                  value={form.destinationLng}
                  onChange={e => set('destinationLng', e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Coordenadas por defecto: Managua. Ajustar si la entrega es fuera de la ciudad.
            </p>
          </div>
        </div>

        {/* Pedido */}
        <div>
          <SECTION title="Pedido" />
          <div className="space-y-4">
            <Field label="Descripción del pedido">
              <textarea
                className={`${inputClass} h-24 resize-none`}
                placeholder="Descripción del contenido del paquete..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estado de pago">
                <select
                  className={inputClass}
                  value={form.deliveryPaymentStatus}
                  onChange={e => set('deliveryPaymentStatus', e.target.value)}
                >
                  <option value="CONTRA_ENTREGA">Contra entrega</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="GRATIS">Gratis</option>
                </select>
              </Field>
              {form.deliveryPaymentStatus !== 'GRATIS' && (
                <Field label="Monto de envío (C$)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.deliveryFee}
                    onChange={e => set('deliveryFee', e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {formError && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="bg-gray-900 text-white hover:bg-gray-800 rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <>
                <CircleNotch size={16} className="animate-spin" />
                Creando...
              </>
            ) : (
              <>
                Crear pedido
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
