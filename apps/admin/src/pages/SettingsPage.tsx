import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getMyBusiness,
  updateMyBusiness,
  type PricingModel,
} from 'api-client';
import { PinPicker } from 'map';
import {
  CurrencyDollar,
  MapPin,
  Calculator,
  Check,
  Plus,
  Trash,
  Buildings,
  WhatsappLogo,
  CheckCircle,
  Gift,
  Tag,
  NavigationArrow,
  Motorcycle,
  Info,
  Lightbulb,
} from '@phosphor-icons/react';
import { calculateFeeClient, getPricingBreakdownClient } from '../lib/pricing';

const mapboxToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

interface PricingZoneFormItem {
  id: string;
  name: string;
  price: string | number;
}

interface PricingPreviewProps {
  model: PricingModel;
  baseRate: number;
  ratePerKm: number;
  freeZoneKm: number;
  minRate: number;
  maxRate: number;
  pricingZones: PricingZoneFormItem[];
}

const PricingPreview: React.FC<PricingPreviewProps> = ({
  model,
  baseRate,
  ratePerKm,
  freeZoneKm,
  minRate,
  maxRate,
  pricingZones,
}) => {
  if (model === 'RIDER_QUOTE') {
    return null;
  }

  const distances = [1, 2, 3, 5, 8, 10];

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calculator size={14} className="text-brand-600" />
          <span>Vista previa de tarifas</span>
        </p>
        <span className="text-[11px] text-gray-400">
          {model === 'FREE'
            ? 'Gratis'
            : model === 'FIXED'
            ? pricingZones.length > 0
              ? 'Fijo con zonas'
              : 'Fijo único'
            : 'Por distancia'}
        </span>
      </div>

      {model === 'FIXED' && pricingZones.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pricingZones.map((z) => (
              <div
                key={z.id}
                className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center justify-between text-xs"
              >
                <span className="text-gray-700 font-medium truncate pr-2 flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span>{z.name || 'Sin nombre'}</span>
                </span>
                <span className="font-semibold text-gray-900 font-mono shrink-0">
                  C$ {Number(z.price || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 text-[11px] text-gray-500 flex justify-between">
            <span>Tarifa general (otras zonas):</span>
            <span className="font-semibold text-gray-900 font-mono">
              C$ {baseRate.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {distances.map((km) => {
            const fee = calculateFeeClient(
              { model, baseRate, ratePerKm, freeZoneKm, minRate, maxRate },
              km
            );
            return (
              <div
                key={km}
                className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center justify-between text-xs"
              >
                <span className="text-gray-500 font-medium">A {km} km</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {fee === 0 ? (
                    <span className="text-brand-600 font-medium">Gratis</span>
                  ) : (
                    `C$ ${fee.toFixed(2)}`
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {model === 'PER_KM' && (
        <div className="mt-3 pt-2.5 border-t border-gray-200/60 text-[11px] text-gray-500 flex items-center gap-1.5">
          <MapPin size={13} className="text-gray-400 shrink-0" />
          <span>Ejemplo a 3.5 km:</span>
          <span className="font-semibold text-gray-900">
            C$
            {calculateFeeClient(
              { model, baseRate, ratePerKm, freeZoneKm, minRate, maxRate },
              3.5
            ).toFixed(2)}
          </span>
          <span className="text-gray-400">
            (
            {getPricingBreakdownClient(
              { model, baseRate, ratePerKm, freeZoneKm, minRate, maxRate },
              3.5
            )}
            )
          </span>
        </div>
      )}
    </div>
  );
};

export const SettingsPage = () => {
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  // State para tarifas
  const [pricingModel, setPricingModel] = useState<PricingModel>('FIXED');
  const [baseRate, setBaseRate] = useState<string>('50.00');
  const [ratePerKm, setRatePerKm] = useState<string>('5.00');
  const [freeZoneKm, setFreeZoneKm] = useState<string>('0');
  const [minRate, setMinRate] = useState<string>('0');
  const [maxRate, setMaxRate] = useState<string>('0');

  // State para lista de zonas de precio fijo
  const [pricingZones, setPricingZones] = useState<PricingZoneFormItem[]>([]);

  // State para WhatsApp
  const [whatsappDigits, setWhatsappDigits] = useState<string>('');

  useEffect(() => {
    if (business) {
      setPricingModel(business.pricingModel || 'FIXED');
      setBaseRate(business.baseRate !== undefined ? String(business.baseRate) : '50.00');
      setRatePerKm(business.ratePerKm !== undefined ? String(business.ratePerKm) : '5.00');
      setFreeZoneKm(business.freeZoneKm !== undefined ? String(business.freeZoneKm) : '0');
      setMinRate(business.minRate !== undefined ? String(business.minRate) : '0');
      setMaxRate(business.maxRate !== undefined ? String(business.maxRate) : '0');
      setPricingZones(
        Array.isArray(business.pricingZones)
          ? business.pricingZones.map((z) => ({
              id: z.id || Date.now().toString() + Math.random(),
              name: z.name || '',
              price: z.price !== undefined ? String(z.price) : '',
            }))
          : []
      );

      // Cargar número de WhatsApp existente
      if (business.whatsappNumber) {
        const raw = business.whatsappNumber.replace(/\D/g, '');
        if (raw.startsWith('505') && raw.length > 3) {
          setWhatsappDigits(raw.slice(3));
        } else {
          setWhatsappDigits(raw);
        }
      } else {
        setWhatsappDigits('');
      }
    }
  }, [business]);

  // Mutation para actualizar ubicación
  const locationMutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Ubicación del negocio guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 402) {
        toast.error(msg || 'Tu membresía está inactiva o requiere pago para actualizar la ubicación.', { duration: 5000 });
      } else {
        toast.error(msg || 'Error al guardar la ubicación');
      }
    },
  });

  // Mutation para actualizar WhatsApp
  const whatsappMutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Número de WhatsApp guardado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 402) {
        toast.error(msg || 'Tu membresía está inactiva o requiere pago para guardar WhatsApp.', { duration: 5000 });
      } else {
        toast.error(msg || 'Error al guardar el número de WhatsApp');
      }
    },
  });

  // Mutation para actualizar tarifas
  const pricingMutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Configuración de precios guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 402) {
        toast.error(msg || 'Tu membresía está inactiva o requiere pago para guardar tarifas.', { duration: 5000 });
      } else {
        toast.error(msg || 'Error al guardar la configuración de precios');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
        <div className="h-8 bg-gray-100 rounded w-1/4"></div>
        <div className="h-64 bg-gray-100 rounded w-full"></div>
        <div className="h-64 bg-gray-100 rounded w-full"></div>
      </div>
    );
  }

  const handleConfirmLocation = (lat: number, lng: number) => {
    locationMutation.mutate({ latitude: lat, longitude: lng });
  };

  const handleAddZone = () => {
    const newZone: PricingZoneFormItem = {
      id: Date.now().toString(),
      name: '',
      price: '',
    };
    setPricingZones((prev) => [...prev, newZone]);
  };

  const handleUpdateZone = (id: string, field: 'name' | 'price', value: string) => {
    setPricingZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, [field]: value } : z))
    );
  };

  const handleRemoveZone = (id: string) => {
    setPricingZones((prev) => prev.filter((z) => z.id !== id));
  };

  const handleSaveWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = whatsappDigits.trim().replace(/\D/g, '');
    if (!clean) {
      whatsappMutation.mutate({
        whatsappNumber: undefined,
        whatsappDisplay: undefined,
      });
      return;
    }

    const fullNumber = clean.startsWith('505') ? clean : `505${clean}`;
    const localDigits = clean.startsWith('505') ? clean.slice(3) : clean;
    const formatted =
      localDigits.length >= 4
        ? `+505 ${localDigits.slice(0, 4)}-${localDigits.slice(4)}`
        : `+505 ${localDigits}`;

    whatsappMutation.mutate({
      whatsappNumber: fullNumber,
      whatsappDisplay: formatted,
    });
  };

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar zonas con nombres vacíos
    const filteredZones = pricingZones
      .filter((z) => z.name.trim() !== '')
      .map((z) => ({
        id: z.id,
        name: z.name.trim(),
        price: z.price === '' ? 0 : parseFloat(String(z.price)) || 0,
      }));

    pricingMutation.mutate({
      pricingModel,
      baseRate: parseFloat(baseRate) || 0,
      ratePerKm: parseFloat(ratePerKm) || 0,
      freeZoneKm: parseFloat(freeZoneKm) || 0,
      minRate: parseFloat(minRate) || 0,
      maxRate: parseFloat(maxRate) || 0,
      pricingZones: filteredZones,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Configuración del Negocio</h2>
        <p className="text-sm text-gray-500">
          Personaliza la ubicación geográfica, contacto y la política de tarifas de entrega de{' '}
          <strong className="font-semibold text-gray-900">{business?.name}</strong>.
        </p>
      </div>

      {/* 1. Ubicación Principal */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-gray-700" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Ubicación principal
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Este será el punto de partida (Origen) para trazar las rutas y calcular la distancia de entrega al cliente.
        </p>

        <PinPicker
          initialLat={business?.latitude || 12.1328}
          initialLng={business?.longitude || -86.2504}
          mapboxToken={mapboxToken}
          onConfirm={handleConfirmLocation}
        />

        {business?.latitude && business?.longitude && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="text-xs">Ubicación actual guardada:</span>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-900">
              {business.latitude.toFixed(6)}, {business.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Contacto del Negocio */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <WhatsappLogo size={20} className="text-emerald-600" weight="fill" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Contacto del Negocio
          </h3>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-900">WhatsApp de atención al cliente</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Este número recibirá confirmaciones cuando los clientes quieran contactar al negocio.
          </p>
        </div>

        <form onSubmit={handleSaveWhatsapp} className="space-y-4 max-w-md pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Código de país + número (sin espacios ni símbolos)
            </label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 transition-all bg-white">
              <span className="inline-flex items-center px-3.5 bg-gray-50 text-xs font-semibold text-gray-600 border-r border-gray-200 select-none">
                +505
              </span>
              <input
                type="tel"
                value={whatsappDigits}
                onChange={(e) => setWhatsappDigits(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="88068133"
                className="w-full h-10 px-3 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
              <Lightbulb size={14} className="text-amber-500 shrink-0" weight="fill" />
              <span>
                Ejemplo: Para +505 8806-8133 escribí: <strong>88068133</strong>
              </span>
            </p>
          </div>

          {/* Mostrar número guardado actualmente */}
          {business?.whatsappDisplay && (
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={15} className="text-emerald-600 shrink-0" weight="fill" />
                <span>
                  Número guardado:{' '}
                  <strong className="font-semibold font-mono">{business.whatsappDisplay}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-start pt-1">
            <button
              type="submit"
              disabled={whatsappMutation.isPending}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
            >
              {whatsappMutation.isPending ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>Guardar número de WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Configuración de Tarifas de Entrega */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <CurrencyDollar size={20} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Configuración de Entrega y Tarifas
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Define cómo se calculará el cobro de envío para tus clientes en cada pedido.
        </p>

        <form onSubmit={handleSavePricing} className="space-y-6">
          {/* Opciones de Modelo de Precios */}
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-3">
              Modelo de precios
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  value: 'FREE' as const,
                  label: 'Envío gratis',
                  description: 'Todos tus envíos son gratuitos para el cliente',
                  icon: <Gift size={18} className="text-emerald-600 shrink-0" weight="duotone" />,
                },
                {
                  value: 'FIXED' as const,
                  label: 'Precio fijo',
                  description: 'Siempre cobrás el mismo monto sin importar la distancia',
                  icon: <Tag size={18} className="text-indigo-600 shrink-0" weight="duotone" />,
                },
                {
                  value: 'PER_KM' as const,
                  label: 'Por distancia',
                  description: 'El precio varía según los kilómetros al cliente',
                  icon: <NavigationArrow size={18} className="text-amber-600 shrink-0" weight="duotone" />,
                },
                {
                  value: 'RIDER_QUOTE' as const,
                  label: 'Rider pone el precio',
                  description: 'Cada repartidor propone su tarifa y vos elegís la mejor oferta',
                  icon: <Motorcycle size={18} className="text-blue-600 shrink-0" weight="duotone" />,
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pricingModel === opt.value
                      ? 'border-brand-500 bg-brand-50/20 shadow-xs ring-1 ring-brand-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="pricingModel"
                    value={opt.value}
                    checked={pricingModel === opt.value}
                    onChange={() => setPricingModel(opt.value)}
                    className="mt-1 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Info Box para RIDER_QUOTE */}
          {pricingModel === 'RIDER_QUOTE' && (
            <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                <Info size={20} className="text-blue-600 shrink-0 mt-0.5" weight="fill" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Con esta opción, cuando creés un pedido los repartidores cercanos verán el pedido y podrán enviarte su precio. Vos elegís la mejor oferta antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {/* Campos para PRECIO FIJO / POR ZONAS */}
          {pricingModel === 'FIXED' && (
            <div className="pt-4 border-t border-gray-100 space-y-5 animate-in fade-in duration-150">
              {/* Tarifa General Base */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Tarifa fija general (por defecto)
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                    C$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    required
                    placeholder="50.00"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-gray-900"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Se aplica cuando una entrega no corresponde a ninguna zona específica.
                </p>
              </div>

              {/* Lista de Zonas */}
              <div className="pt-3 border-t border-gray-100/80">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                      <Buildings size={15} className="text-brand-600" />
                      <span>Tarifas personalizadas por Zona / Barrio</span>
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Agrega las zonas de tu ciudad con su precio de envío correspondiente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddZone}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
                  >
                    <Plus size={13} weight="bold" />
                    <span>Agregar zona</span>
                  </button>
                </div>

                {pricingZones.length === 0 ? (
                  <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-400">
                    No tienes zonas específicas creadas. Se cobrará la tarifa fija general de C${' '}
                    {parseFloat(baseRate || '0').toFixed(2)}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-gray-400 uppercase tracking-wider px-1">
                      <div className="col-span-7">Nombre de la Zona / Sector</div>
                      <div className="col-span-4">Precio (C$)</div>
                      <div className="col-span-1 text-center"></div>
                    </div>

                    {pricingZones.map((zone, idx) => (
                      <div
                        key={zone.id || idx}
                        className="grid grid-cols-12 gap-2 items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100"
                      >
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={zone.name}
                            onChange={(e) => handleUpdateZone(zone.id, 'name', e.target.value)}
                            placeholder="Ej. Centro, Altamira, Bello Horizonte"
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                          />
                        </div>
                        <div className="col-span-4 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                            C$
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={zone.price}
                            onChange={(e) =>
                              handleUpdateZone(
                                zone.id,
                                'price',
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-gray-900"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveZone(zone.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Eliminar zona"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Campos para POR DISTANCIA */}
          {pricingModel === 'PER_KM' && (
            <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Tarifa base
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      C$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                      required
                      placeholder="20.00"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Precio por km adicional
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      C$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ratePerKm}
                      onChange={(e) => setRatePerKm(e.target.value)}
                      required
                      placeholder="5.00"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Zona gratis hasta (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={freeZoneKm}
                    onChange={(e) => setFreeZoneKm(e.target.value)}
                    placeholder="1.0"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono focus:outline-none focus:border-gray-900"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">0 = sin zona gratis</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Tarifa mínima (C$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      C$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minRate}
                      onChange={(e) => setMinRate(e.target.value)}
                      placeholder="15.00"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono focus:outline-none focus:border-gray-900"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">0 = sin mínimo</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Tarifa máxima (C$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      C$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxRate}
                      onChange={(e) => setMaxRate(e.target.value)}
                      placeholder="100.00"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 font-mono focus:outline-none focus:border-gray-900"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">0 = sin tope máx</span>
                </div>
              </div>
            </div>
          )}

          {/* Vista Previa de Precios */}
          <PricingPreview
            model={pricingModel}
            baseRate={parseFloat(baseRate) || 0}
            ratePerKm={parseFloat(ratePerKm) || 0}
            freeZoneKm={parseFloat(freeZoneKm) || 0}
            minRate={parseFloat(minRate) || 0}
            maxRate={parseFloat(maxRate) || 0}
            pricingZones={pricingZones}
          />

          {/* Botón Guardar */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={pricingMutation.isPending}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
            >
              {pricingMutation.isPending ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Guardar configuración de precios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
