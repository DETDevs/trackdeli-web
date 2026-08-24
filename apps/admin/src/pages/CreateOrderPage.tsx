import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createOrder, type CreateOrderDto, type DeliveryPaymentStatus } from 'api-client';
import { toast } from 'react-hot-toast';
import { ArrowRight, CircleNotch, MapTrifold, Keyboard } from '@phosphor-icons/react';
import { PinPicker } from 'map';

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
  const [locationMode, setLocationMode] = useState<'text' | 'map'>('text');

  const handleMapConfirm = (lat: number, lng: number, address: string) => {
    setForm(prev => ({
      ...prev,
      destinationLat: lat.toString(),
      destinationLng: lng.toString(),
      destinationAddress: address,
    }));
    setLocationMode('text');
    toast.success('Ubicación capturada. Puedes agregar detalles si deseas.');
  };

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

    const nameStr = form.customerName.trim();
    if (!nameStr) {
      toast.error('El nombre del cliente es requerido.');
      return setFormError('El nombre del cliente es requerido.');
    }

    const phoneDigits = form.customerPhone.trim().replace(/\D/g, '');
    if (phoneDigits.length !== 8) {
      toast.error('Número de WhatsApp inválido. Debe tener exactamente 8 dígitos.');
      return setFormError('Número de WhatsApp inválido. Debe tener exactamente 8 dígitos.');
    }

    const addressStr = form.destinationAddress.trim();
    if (!addressStr) {
      toast.error('La dirección de entrega es requerida.');
      return setFormError('La dirección de entrega es requerida.');
    }

    const payload: CreateOrderDto = {
      customerName: nameStr,
      customerPhone: phoneDigits,
      destinationAddress: addressStr,
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
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Entrega
            </div>
            {/* Toggle Modo */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLocationMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${locationMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Keyboard size={14} />
                Manual
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${locationMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <MapTrifold size={14} />
                Mapa
              </button>
            </div>
          </div>

          {locationMode === 'map' ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">Busca o arrastra el mapa para ubicar el destino exacto.</p>
              <PinPicker
                mapboxToken={(import.meta as any).env.VITE_MAPBOX_TOKEN}
                initialLat={Number(form.destinationLat) || 12.1328}
                initialLng={Number(form.destinationLng) || -86.2504}
                onConfirm={handleMapConfirm}
              />
            </div>
          ) : (
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
          )}
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
      
      {/* Tailwind JIT force generation for PinPicker classes */}
      <div className="hidden absolute top-3 left-3 right-3 z-10 relative w-full h-[450px] rounded-xl overflow-hidden border border-gray-200 flex flex-col bg-gray-50 mt-4 shadow-sm bg-white border-gray-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow text-[#EF4444] pointer-events-none drop-shadow-md -translate-y-full hover:bg-gray-50 max-h-48 overflow-y-auto top-1/2 left-1/2 -translate-x-1/2 border-t shrink-0 flex-1 border-b last:border-0 truncate px-4 py-3" />
    </div>
  );
};
