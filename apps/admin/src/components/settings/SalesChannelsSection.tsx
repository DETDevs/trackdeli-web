import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Motorcycle,
  DeviceMobile,
  Calculator,
  Check,
  ArrowsClockwise,
  Sparkle,
} from '@phosphor-icons/react';
import {
  ChannelConfigResponse,
  UpdateChannelConfigDto,
  updateChannelConfig,
} from 'api-client';

interface SalesChannelsSectionProps {
  channelConfig: ChannelConfigResponse;
}

export function calculateLivePedidosYaPrice(
  basePrice: number,
  commPct: number,
  taxPct: number,
  mode: 'MANTENER_GANANCIA' | 'RECARGO' | 'MISMO_PRECIO',
  rounding: 'SIN_REDONDEO' | 'REDONDEO_0_50' | 'REDONDEO_1' | 'REDONDEO_5'
): { rawPrice: number; roundedPrice: number } {
  if (basePrice <= 0) return { rawPrice: 0, roundedPrice: 0 };
  const totalRate = (commPct + taxPct) / 100;
  let rawPrice = basePrice;
  if (mode === 'RECARGO') {
    rawPrice = basePrice * (1 + totalRate);
  } else if (mode === 'MANTENER_GANANCIA') {
    const divisor = 1 - totalRate;
    rawPrice = divisor > 0.0001 ? basePrice / divisor : basePrice;
  } else if (mode === 'MISMO_PRECIO') {
    rawPrice = basePrice;
  }

  let roundedPrice = rawPrice;
  const eps = 0.00001;
  if (rounding === 'SIN_REDONDEO') {
    roundedPrice = Math.round(rawPrice * 100) / 100;
  } else if (rounding === 'REDONDEO_0_50') {
    roundedPrice = Math.ceil((rawPrice - eps) * 2) / 2;
  } else if (rounding === 'REDONDEO_1') {
    roundedPrice = Math.ceil(rawPrice - eps);
  } else if (rounding === 'REDONDEO_5') {
    roundedPrice = Math.ceil((rawPrice - eps) / 5) * 5;
  } else {
    roundedPrice = Math.ceil(rawPrice - eps);
  }

  return {
    rawPrice: Math.round(rawPrice * 100) / 100,
    roundedPrice: Math.round(roundedPrice * 100) / 100,
  };
}

export const SalesChannelsSection: React.FC<SalesChannelsSectionProps> = ({
  channelConfig,
}) => {
  const queryClient = useQueryClient();

  const isDeliveryEnabled = Boolean(channelConfig.delivery?.enabled);
  const isPedidosYaEnabled = Boolean(channelConfig.pedidosYa?.enabled);

  // Form State: Domicilio
  const [deliveryDefaultFee, setDeliveryDefaultFee] = useState<string>('0');
  const [deliveryTaxable, setDeliveryTaxable] = useState<boolean>(false);
  const [deliveryRequireDriver, setDeliveryRequireDriver] = useState<boolean>(false);

  // Form State: PedidosYa
  const [pedidosYaCommissionPct, setPedidosYaCommissionPct] = useState<string>('27');
  const [pedidosYaTaxPct, setPedidosYaTaxPct] = useState<string>('7');
  const [pedidosYaPriceMode, setPedidosYaPriceMode] = useState<
    'MANTENER_GANANCIA' | 'RECARGO' | 'MISMO_PRECIO'
  >('MANTENER_GANANCIA');
  const [pedidosYaRounding, setPedidosYaRounding] = useState<
    'SIN_REDONDEO' | 'REDONDEO_0_50' | 'REDONDEO_1' | 'REDONDEO_5'
  >('REDONDEO_1');
  const [pedidosYaCapAtListPrice, setPedidosYaCapAtListPrice] = useState<boolean>(false);
  const [pedidosYaRequireOrderNumber, setPedidosYaRequireOrderNumber] =
    useState<boolean>(true);

  // Ejemplo interactivo
  const [sampleBasePrice, setSampleBasePrice] = useState<number>(120);

  useEffect(() => {
    if (channelConfig.delivery) {
      setDeliveryDefaultFee(String(channelConfig.delivery.defaultFee ?? 0));
      setDeliveryTaxable(Boolean(channelConfig.delivery.taxable));
      setDeliveryRequireDriver(Boolean(channelConfig.delivery.requireDriver));
    }
    if (channelConfig.pedidosYa) {
      setPedidosYaCommissionPct(String(channelConfig.pedidosYa.commissionPct ?? 27));
      setPedidosYaTaxPct(String(channelConfig.pedidosYa.taxPct ?? 7));
      setPedidosYaPriceMode(
        channelConfig.pedidosYa.priceMode || 'MANTENER_GANANCIA'
      );
      setPedidosYaRounding(channelConfig.pedidosYa.rounding || 'REDONDEO_1');
      setPedidosYaCapAtListPrice(Boolean(channelConfig.pedidosYa.capAtListPrice));
      setPedidosYaRequireOrderNumber(
        channelConfig.pedidosYa.requireOrderNumber !== false
      );
    }
  }, [channelConfig]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateChannelConfigDto) => updateChannelConfig(dto),
    onSuccess: () => {
      toast.success('Configuración de canales guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['pos', 'channels', 'config'] });
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err.message || 'Error al guardar configuración';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dto: UpdateChannelConfigDto = {};

    if (isDeliveryEnabled) {
      dto.delivery = {
        defaultFee: Math.max(0, parseFloat(deliveryDefaultFee) || 0),
        taxable: deliveryTaxable,
        requireDriver: deliveryRequireDriver,
      };
    }

    if (isPedidosYaEnabled) {
      dto.pedidosYa = {
        commissionPct: Math.min(100, Math.max(0, parseFloat(pedidosYaCommissionPct) || 0)),
        taxPct: Math.min(100, Math.max(0, parseFloat(pedidosYaTaxPct) || 0)),
        priceMode: pedidosYaPriceMode,
        rounding: pedidosYaRounding,
        capAtListPrice: pedidosYaCapAtListPrice,
        requireOrderNumber: pedidosYaRequireOrderNumber,
      };
    }

    updateMutation.mutate(dto);
  };

  const commNum = parseFloat(pedidosYaCommissionPct) || 0;
  const taxNum = parseFloat(pedidosYaTaxPct) || 0;
  const totalRetentionPct = commNum + taxNum;

  // Cálculos para el ejemplo interactivo
  const calculationExamples = useMemo(() => {
    const base = Number(sampleBasePrice) || 0;
    const mantener = calculateLivePedidosYaPrice(base, commNum, taxNum, 'MANTENER_GANANCIA', pedidosYaRounding);
    const recargo = calculateLivePedidosYaPrice(base, commNum, taxNum, 'RECARGO', pedidosYaRounding);
    const mismo = calculateLivePedidosYaPrice(base, commNum, taxNum, 'MISMO_PRECIO', pedidosYaRounding);
    const activeCalc = calculateLivePedidosYaPrice(base, commNum, taxNum, pedidosYaPriceMode, pedidosYaRounding);

    return {
      mantener,
      recargo,
      mismo,
      activeCalc,
    };
  }, [sampleBasePrice, commNum, taxNum, pedidosYaPriceMode, pedidosYaRounding]);

  if (!isDeliveryEnabled && !isPedidosYaEnabled) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <span>Canales de Venta</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Activo
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configura tarifas de envío, comisiones e integración de precios para los canales habilitados por Superadmin.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CANAL 1: A DOMICILIO */}
        {isDeliveryEnabled && (
          <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/60 space-y-4">
            <div className="flex items-center gap-2 text-indigo-900">
              <Motorcycle size={20} weight="duotone" className="text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Venta a Domicilio (Entregas Propias)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tarifa de envío por defecto */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarifa de envío por defecto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    C$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryDefaultFee}
                    onChange={(e) => setDeliveryDefaultFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Se sugiere al crear un comprobante a domicilio.
                </p>
              </div>

              {/* IVA al costo de envío */}
              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={deliveryTaxable}
                    onChange={(e) => setDeliveryTaxable(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-800">
                    Aplicar IVA al envío
                  </span>
                </label>
                <p className="text-[10px] text-gray-400 ml-6 mt-0.5">
                  Si se activa, el envío causa el IVA general configurado en el negocio.
                </p>
              </div>

              {/* Exigir repartidor */}
              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={deliveryRequireDriver}
                    onChange={(e) => setDeliveryRequireDriver(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-800">
                    Exigir repartidor
                  </span>
                </label>
                <p className="text-[10px] text-gray-400 ml-6 mt-0.5">
                  Obliga a seleccionar un repartidor antes de despachar o cobrar la orden.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CANAL 2: PEDIDOSYA */}
        {isPedidosYaEnabled && (
          <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900">
                <DeviceMobile size={20} weight="duotone" className="text-rose-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Canal de Venta PedidosYa
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200">
                Retención total: {totalRetentionPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda: Parámetros */}
              <div className="space-y-4">
                {/* Comisiones e Impuestos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Comisión PedidosYa (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={pedidosYaCommissionPct}
                        onChange={(e) => setPedidosYaCommissionPct(e.target.value)}
                        className="w-full h-9 pl-3 pr-7 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-rose-600"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        %
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Porcentaje acordado en contrato (def: 27%).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Impuesto (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={pedidosYaTaxPct}
                        onChange={(e) => setPedidosYaTaxPct(e.target.value)}
                        className="w-full h-9 pl-3 pr-7 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 font-mono font-medium focus:outline-none focus:border-rose-600"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                        %
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Se calcula sobre el total de la venta, igual que la comisión.
                    </p>
                  </div>
                </div>

                {/* Modo de Precio */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-800">
                    Modo de cálculo de precio en PedidosYa
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        pedidosYaPriceMode === 'MANTENER_GANANCIA'
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/30'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pedidosYaPriceMode"
                        value="MANTENER_GANANCIA"
                        checked={pedidosYaPriceMode === 'MANTENER_GANANCIA'}
                        onChange={() => setPedidosYaPriceMode('MANTENER_GANANCIA')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">
                            Mantener ganancia (Recomendado)
                          </span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                            Por defecto
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                          El precio en la app cubre la comisión y su impuesto para que te quede íntegro el precio base de mostrador. Fórmula: <code>precio ÷ (1 − tasa)</code>.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        pedidosYaPriceMode === 'RECARGO'
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/30'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pedidosYaPriceMode"
                        value="RECARGO"
                        checked={pedidosYaPriceMode === 'RECARGO'}
                        onChange={() => setPedidosYaPriceMode('RECARGO')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900">
                          Recargo directo
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                          Aplica un recargo simple equivalente a la suma de la comisión e impuesto. Fórmula: <code>precio × (1 + tasa)</code>.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        pedidosYaPriceMode === 'MISMO_PRECIO'
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/30'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pedidosYaPriceMode"
                        value="MISMO_PRECIO"
                        checked={pedidosYaPriceMode === 'MISMO_PRECIO'}
                        onChange={() => setPedidosYaPriceMode('MISMO_PRECIO')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900">
                          Mismo precio de mostrador
                        </span>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                          El producto se vende en la app al mismo precio que en caja; el negocio absorbe la comisión.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Redondeo de Precios */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Regla de redondeo de precios en app
                  </label>
                  <select
                    value={pedidosYaRounding}
                    onChange={(e: any) => setPedidosYaRounding(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 font-medium focus:outline-none focus:border-rose-600"
                  >
                    <option value="REDONDEO_1">Redondear al córdoba superior (C$ 1.00) — Por defecto</option>
                    <option value="REDONDEO_0_50">Redondear a 50 centavos (C$ 0.50)</option>
                    <option value="REDONDEO_5">Redondear a múltiplos de 5 córdobas (C$ 5.00)</option>
                    <option value="SIN_REDONDEO">Sin redondeo (2 decimales exactos)</option>
                  </select>
                </div>

                {/* Checks adicionales */}
                <div className="space-y-2 pt-1 border-t border-rose-200/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pedidosYaCapAtListPrice}
                      onChange={(e) => setPedidosYaCapAtListPrice(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-gray-800">
                      No superar precio de etiqueta o lista
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pedidosYaRequireOrderNumber}
                      onChange={(e) => setPedidosYaRequireOrderNumber(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-gray-800">
                      N.º de pedido de PedidosYa obligatorio
                    </span>
                  </label>
                </div>
              </div>

              {/* Columna Derecha: Ejemplo en Vivo */}
              <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Calculator size={16} className="text-rose-600" weight="bold" />
                      <span>Simulador y Ejemplo en Vivo</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {commNum}% + {taxNum}% = {totalRetentionPct}%
                    </span>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Precio base de prueba (mostrador):
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        C$
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={sampleBasePrice}
                        onChange={(e) => setSampleBasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-rose-600"
                      />
                    </div>
                  </div>

                  {/* Comparación de los 3 Modos */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        pedidosYaPriceMode === 'MANTENER_GANANCIA'
                          ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-gray-500 block leading-tight">
                        Mantener ganancia
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-gray-900 mt-1 block font-mono">
                        C${calculationExamples.mantener.rawPrice.toFixed(2)}
                      </strong>
                      {pedidosYaRounding !== 'SIN_REDONDEO' && (
                        <span className="text-[9px] text-rose-700 font-bold block mt-0.5 font-mono">
                          → C${calculationExamples.mantener.roundedPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1 font-mono">
                        Recibe: C${(calculationExamples.mantener.rawPrice * (1 - (commNum + taxNum) / 100)).toFixed(2)}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        pedidosYaPriceMode === 'RECARGO'
                          ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-gray-500 block leading-tight">
                        Recargo directo
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-gray-900 mt-1 block font-mono">
                        C${calculationExamples.recargo.rawPrice.toFixed(2)}
                      </strong>
                      {pedidosYaRounding !== 'SIN_REDONDEO' && (
                        <span className="text-[9px] text-rose-700 font-bold block mt-0.5 font-mono">
                          → C${calculationExamples.recargo.roundedPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1 font-mono">
                        Recibe: C${(calculationExamples.recargo.rawPrice * (1 - (commNum + taxNum) / 100)).toFixed(2)}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        pedidosYaPriceMode === 'MISMO_PRECIO'
                          ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-gray-500 block leading-tight">
                        Mismo precio
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-gray-900 mt-1 block font-mono">
                        C${calculationExamples.mismo.rawPrice.toFixed(2)}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1 font-mono">
                        Recibe: C${(calculationExamples.mismo.rawPrice * (1 - (commNum + taxNum) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Explicación del modo activo */}
                  {(() => {
                    const activeRawPrice =
                      pedidosYaPriceMode === 'MANTENER_GANANCIA'
                        ? calculationExamples.mantener.rawPrice
                        : pedidosYaPriceMode === 'RECARGO'
                        ? calculationExamples.recargo.rawPrice
                        : calculationExamples.mismo.rawPrice;
                    const commAmount = (activeRawPrice * commNum) / 100;
                    const taxAmount = (activeRawPrice * taxNum) / 100;
                    const netReceived = activeRawPrice - commAmount - taxAmount;

                    return (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] space-y-2 text-gray-600">
                        <div className="font-semibold text-gray-800 flex items-center gap-1">
                          <Sparkle size={13} className="text-rose-600" />
                          <span>
                            Cálculo activo:{' '}
                            {pedidosYaPriceMode === 'MANTENER_GANANCIA'
                              ? 'Mantener ganancia'
                              : pedidosYaPriceMode === 'RECARGO'
                              ? 'Recargo directo'
                              : 'Mismo precio'}
                          </span>
                        </div>
                        {pedidosYaPriceMode === 'MANTENER_GANANCIA' && (
                          <p>
                            C${sampleBasePrice} ÷ (1 − {totalRetentionPct / 100}) ={' '}
                            <strong>C${calculationExamples.mantener.rawPrice.toFixed(2)}</strong>
                            {pedidosYaRounding !== 'SIN_REDONDEO' &&
                              ` (redondeado: C$${calculationExamples.mantener.roundedPrice.toFixed(2)})`}
                            .
                          </p>
                        )}
                        {pedidosYaPriceMode === 'RECARGO' && (
                          <p>
                            C${sampleBasePrice} × (1 + {totalRetentionPct / 100}) ={' '}
                            <strong>C${calculationExamples.recargo.rawPrice.toFixed(2)}</strong>
                            {pedidosYaRounding !== 'SIN_REDONDEO' &&
                              ` (redondeado: C$${calculationExamples.recargo.roundedPrice.toFixed(2)})`}
                            .
                          </p>
                        )}
                        {pedidosYaPriceMode === 'MISMO_PRECIO' && (
                          <p>
                            Precio en app = <strong>C${sampleBasePrice.toFixed(2)}</strong>.
                          </p>
                        )}

                        <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between text-xs bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                          <div className="text-emerald-900 font-semibold">
                            <span>El negocio recibe:</span>
                            <span className="text-[10px] text-emerald-700 font-normal block">
                              (C${activeRawPrice.toFixed(2)} − comisión {commNum}% [C${commAmount.toFixed(2)}] − impuesto {taxNum}% [C${taxAmount.toFixed(2)}])
                            </span>
                          </div>
                          <span className="font-mono text-base font-bold text-emerald-800">
                            C$ {netReceived.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="text-[10px] text-gray-400 italic">
                  * Este precio sugerido se asigna automáticamente al atributo <code>pedidosYaPrice</code> de tus productos.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <>
                <ArrowsClockwise size={16} className="animate-spin" />
                <span>Guardando canales...</span>
              </>
            ) : (
              <>
                <Check size={16} weight="bold" />
                <span>Guardar configuración de canales</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
