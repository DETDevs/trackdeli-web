import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createOrder,
  getMyBusiness,
  calculateOrderFee,
  type CreateOrderDto,
  type DeliveryPaymentStatus,
  type PricingZone,
} from 'api-client';
import { toast } from 'react-hot-toast';
import {
  ArrowRight,
  CircleNotch,
  MapTrifold,
  Keyboard,
  Calculator,
  Buildings,
} from '@phosphor-icons/react';
import { PinPicker } from 'map';
import { calculateFeeClient, getPricingBreakdownClient } from '../lib/pricing';

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

const inputClass =
  'w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-gray-400 outline-none transition-colors';

export const CreateOrderPage = () => {
  const navigate = useNavigate();

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

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

  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [locationMode, setLocationMode] = useState<'text' | 'map'>('text');

  // Fee calculation state
  const [calculatedInfo, setCalculatedInfo] = useState<{
    fee: number;
    distanceKm: number;
    breakdown: string;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fee calculation when destination coordinates or model change
  useEffect(() => {
    if (!business) return;

    if (business.pricingModel === 'FREE') {
      setCalculatedInfo({
        fee: 0,
        distanceKm: 0,
        breakdown: 'Envío gratis configurado para el negocio',
      });
      setForm((prev) => ({
        ...prev,
        deliveryFee: '0.00',
      }));
      return;
    }

    if (business.pricingModel === 'FIXED') {
      const zones: PricingZone[] = Array.isArray(business.pricingZones)
        ? business.pricingZones
        : [];
      const selectedZone = zones.find((z) => z.id === selectedZoneId);

      if (selectedZone) {
        const fee = Number(selectedZone.price) || 0;
        setCalculatedInfo({
          fee,
          distanceKm: 0,
          breakdown: `Tarifa de zona "${selectedZone.name}"`,
        });
        setForm((prev) => ({
          ...prev,
          deliveryFee: fee.toFixed(2),
        }));
      } else {
        const fee = Number(business.baseRate) || 0;
        setCalculatedInfo({
          fee,
          distanceKm: 0,
          breakdown: zones.length > 0 ? 'Tarifa fija general (sin zona específica)' : `Tarifa fija de C$${fee.toFixed(2)}`,
        });
        setForm((prev) => ({
          ...prev,
          deliveryFee: fee.toFixed(2),
        }));
      }
      return;
    }

    // PER_KM
    const lat = parseFloat(form.destinationLat);
    const lng = parseFloat(form.destinationLng);

    if (isNaN(lat) || isNaN(lng)) {
      setCalculatedInfo(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsCalculating(true);
      try {
        try {
          const res = await calculateOrderFee(lat, lng);
          setCalculatedInfo({
            fee: res.fee,
            distanceKm: res.distanceKm,
            breakdown: res.breakdown,
          });
          setForm((prev) => ({
            ...prev,
            deliveryFee: res.fee.toFixed(2),
          }));
        } catch {
          // Fallback al cálculo del cliente
          if (business.latitude && business.longitude) {
            const R = 6371; // km
            const dLat = ((lat - business.latitude) * Math.PI) / 180;
            const dLon = ((lng - business.longitude) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((business.latitude * Math.PI) / 180) *
                Math.cos((lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = Number((R * c).toFixed(1));

            const fee = calculateFeeClient(
              {
                model: business.pricingModel,
                baseRate: business.baseRate,
                ratePerKm: business.ratePerKm,
                freeZoneKm: business.freeZoneKm,
                minRate: business.minRate,
                maxRate: business.maxRate,
              },
              dist
            );

            const breakdown = getPricingBreakdownClient(
              {
                model: business.pricingModel,
                baseRate: business.baseRate,
                ratePerKm: business.ratePerKm,
                freeZoneKm: business.freeZoneKm,
                minRate: business.minRate,
                maxRate: business.maxRate,
              },
              dist
            );

            setCalculatedInfo({
              fee,
              distanceKm: dist,
              breakdown,
            });
            setForm((prev) => ({
              ...prev,
              deliveryFee: fee.toFixed(2),
            }));
          }
        }
      } finally {
        setIsCalculating(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form.destinationLat, form.destinationLng, business, selectedZoneId]);

  const handleMapConfirm = (lat: number, lng: number, address: string) => {
    setForm((prev) => ({
      ...prev,
      destinationLat: lat.toString(),
      destinationLng: lng.toString(),
      destinationAddress: address,
    }));
    setLocationMode('text');
    toast.success('Ubicación capturada en el mapa');
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateOrderDto) => createOrder(data),
    onSuccess: () => {
      toast.success('Pedido creado exitosamente');
      navigate('/orders');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message;
      setFormError(msg ?? 'Ocurrió un error al crear el pedido.');
    },
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
      deliveryFee:
        form.deliveryPaymentStatus !== 'GRATIS' && form.deliveryFee
          ? Number(form.deliveryFee)
          : 0,
      destinationLat: form.destinationLat ? Number(form.destinationLat) : undefined,
      destinationLng: form.destinationLng ? Number(form.destinationLng) : undefined,
    };

    mutate(payload);
  };

  const zones: PricingZone[] =
    business?.pricingModel === 'FIXED' && Array.isArray(business.pricingZones)
      ? business.pricingZones
      : [];

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
                onChange={(e) => set('customerName', e.target.value)}
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
                  onChange={(e) => set('customerPhone', e.target.value)}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  locationMode === 'text'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Keyboard size={14} />
                Manual
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  locationMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapTrifold size={14} />
                Mapa
              </button>
            </div>
          </div>

          {/* Selector de Zona para Negocios con Tarifas por Zonas */}
          {zones.length > 0 && (
            <div className="mb-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Buildings size={15} className="text-brand-600" />
                <span>Zona de Entrega</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900 focus:outline-none focus:border-gray-900"
              >
                <option value="">
                  -- Tarifa general por defecto (C$ {Number(business?.baseRate || 0).toFixed(2)}) --
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — C$ {Number(z.price).toFixed(2)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">
                Selecciona la zona correspondiente para autocompletar la tarifa de envío.
              </p>
            </div>
          )}

          {locationMode === 'map' ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Busca o arrastra el mapa para ubicar el destino exacto.
              </p>
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
                  onChange={(e) => set('destinationAddress', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitud">
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    placeholder="12.1328"
                    value={form.destinationLat}
                    onChange={(e) => set('destinationLat', e.target.value)}
                  />
                </Field>
                <Field label="Longitud">
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    placeholder="-86.2504"
                    value={form.destinationLng}
                    onChange={(e) => set('destinationLng', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Tarjeta de Costo de Envío Calculado */}
          {calculatedInfo && (
            <div className="mt-4 p-4 bg-brand-50/40 rounded-xl border border-brand-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-brand-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator size={15} />
                  <span>Costo de envío calculado</span>
                </span>
                {isCalculating && (
                  <span className="text-[10px] text-gray-400 animate-pulse">
                    Recalculando...
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  {calculatedInfo.distanceKm > 0 && (
                    <p className="text-xs text-gray-600">
                      Distancia estimada:{' '}
                      <span className="font-semibold text-gray-900">
                        {calculatedInfo.distanceKm} km
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Desglose: {calculatedInfo.breakdown}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900 font-mono">
                    {calculatedInfo.fee === 0 ? 'Gratis' : `C$ ${calculatedInfo.fee.toFixed(2)}`}
                  </span>
                </div>
              </div>
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
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estado de pago">
                <select
                  className={inputClass}
                  value={form.deliveryPaymentStatus}
                  onChange={(e) => set('deliveryPaymentStatus', e.target.value)}
                >
                  <option value="CONTRA_ENTREGA">Contra entrega</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="GRATIS">Gratis</option>
                </select>
              </Field>
              {form.deliveryPaymentStatus !== 'GRATIS' && (
                <Field label="Monto de envío (C$)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      C$
                    </span>
                    <input
                      className={`${inputClass} pl-8 font-mono font-medium`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.deliveryFee}
                      onChange={(e) => set('deliveryFee', e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Calculado automáticamente. Puedes modificarlo si es necesario.
                  </p>
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

      {/* Tailwind JIT force generation */}
      <div className="hidden absolute top-3 left-3 right-3 z-10 relative w-full h-[450px] rounded-xl overflow-hidden border border-gray-200 flex flex-col bg-gray-50 mt-4 shadow-sm bg-white border-gray-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow text-[#EF4444] pointer-events-none drop-shadow-md -translate-y-full hover:bg-gray-50 max-h-48 overflow-y-auto top-1/2 left-1/2 -translate-x-1/2 border-t shrink-0 flex-1 border-b last:border-0 truncate px-4 py-3" />
    </div>
  );
};
