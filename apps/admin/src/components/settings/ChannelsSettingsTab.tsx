import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getMyBusiness,
  updateMyBusiness,
  getChannelConfig,
  type PricingModel,
} from 'api-client';
import {
  Motorcycle,
  Calculator,
  MapPin,
  Plus,
  Trash,
  CheckCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { calculateFeeClient, getPricingBreakdownClient } from '../../lib/pricing';
import { SalesChannelsSection } from './SalesChannelsSection';

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
  if (model === 'RIDER_QUOTE') return null;

  const distances = [1, 2, 3, 5, 8, 10];

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calculator size={14} className="text-gray-700" />
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
                    <span className="text-emerald-600 font-medium">Gratis</span>
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

interface ChannelsSettingsTabProps {
  isReadOnly?: boolean;
}

export const ChannelsSettingsTab: React.FC<ChannelsSettingsTabProps> = ({ isReadOnly = false }) => {
  const queryClient = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const { data: channelConfig } = useQuery({
    queryKey: ['pos', 'channels-config'],
    queryFn: () => getChannelConfig(),
    retry: false,
  });

  const [pricingModel, setPricingModel] = useState<PricingModel>('FIXED');
  const [baseRate, setBaseRate] = useState<string>('50.00');
  const [ratePerKm, setRatePerKm] = useState<string>('5.00');
  const [freeZoneKm, setFreeZoneKm] = useState<string>('0');
  const [minRate, setMinRate] = useState<string>('0');
  const [maxRate, setMaxRate] = useState<string>('0');
  const [pricingZones, setPricingZones] = useState<PricingZoneFormItem[]>([]);

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
    }
  }, [business]);

  const pricingMutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Tarifas de envío guardadas');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar tarifas de envío';
      toast.error(msg);
    },
  });

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

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    pricingMutation.mutate({
      pricingModel,
      baseRate: parseFloat(baseRate) || 0,
      ratePerKm: parseFloat(ratePerKm) || 0,
      freeZoneKm: parseFloat(freeZoneKm) || 0,
      minRate: parseFloat(minRate) || 0,
      maxRate: parseFloat(maxRate) || 0,
      pricingZones: pricingZones.map((z) => ({
        id: z.id,
        name: z.name.trim(),
        price: parseFloat(String(z.price)) || 0,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Canales de venta</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Configura canales de entrega propia a domicilio, PedidosYa y tarifas de envío.
        </p>
      </div>

      {/* 1. Canales POS y PedidosYa */}
      {channelConfig && <SalesChannelsSection channelConfig={channelConfig} />}

      {/* 2. Tarifas de Entrega Propia (Delivery) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Motorcycle size={20} className="text-gray-700" />
          <div>
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Tarifas de entrega propia (Delivery)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Define el cálculo del costo de envío para pedidos a domicilio.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePricing} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Modelo de cobro de envío
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { id: 'FIXED', label: 'Fijo / Zonas', desc: 'Tarifa fija o según zona' },
                { id: 'PER_KM', label: 'Por kilómetro', desc: 'Cálculo por distancia real' },
                { id: 'FREE', label: 'Gratis', desc: 'Envío sin costo para el cliente' },
                { id: 'RIDER_QUOTE', label: 'Cotizado por repartidor', desc: 'Acordado por viaje' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  disabled={isReadOnly}
                  onClick={() => setPricingModel(m.id as PricingModel)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    pricingModel === m.id
                      ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      pricingModel === m.id ? 'text-gray-300' : 'text-gray-400'
                    }`}
                  >
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {pricingModel === 'FIXED' && (
            <div className="space-y-4 pt-2">
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarifa base general (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isReadOnly}
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 font-mono"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Zonas con precio fijo específico</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddZone}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={13} />
                      <span>Agregar zona</span>
                    </button>
                  )}
                </div>

                {pricingZones.map((z) => (
                  <div key={z.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="Nombre de la zona (ej. Villa Fontana)"
                      value={z.name}
                      onChange={(e) => handleUpdateZone(z.id, 'name', e.target.value)}
                      className="flex-1 text-xs py-2 px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-mono">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly}
                        placeholder="0.00"
                        value={z.price}
                        onChange={(e) => handleUpdateZone(z.id, 'price', e.target.value)}
                        className="w-full text-xs py-2 pl-8 pr-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 font-mono"
                      />
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveZone(z.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      >
                        <Trash size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pricingModel === 'PER_KM' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarifa base (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isReadOnly}
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarifa por kilómetro (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isReadOnly}
                  value={ratePerKm}
                  onChange={(e) => setRatePerKm(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarifa mínima (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isReadOnly}
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarifa máxima (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isReadOnly}
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-gray-200 rounded-xl font-mono"
                />
              </div>
            </div>
          )}

          <PricingPreview
            model={pricingModel}
            baseRate={parseFloat(baseRate) || 0}
            ratePerKm={parseFloat(ratePerKm) || 0}
            freeZoneKm={parseFloat(freeZoneKm) || 0}
            minRate={parseFloat(minRate) || 0}
            maxRate={parseFloat(maxRate) || 0}
            pricingZones={pricingZones}
          />

          {!isReadOnly && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={pricingMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {pricingMutation.isPending ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                <span>Guardar tarifas de envío</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
