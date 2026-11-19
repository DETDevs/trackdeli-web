import React, { useState, useEffect } from 'react';
import { Motorcycle } from '@phosphor-icons/react';
import { type PosChannelDriver } from 'api-client';

interface DeliveryCheckoutFieldsProps {
  deliveryPhone: string;
  onChangeDeliveryPhone: (phone: string) => void;
  deliveryFee: number;
  onChangeDeliveryFee: (fee: number) => void;
  deliveryAddress: string;
  onChangeDeliveryAddress: (address: string) => void;
  deliveryReference: string;
  onChangeDeliveryReference: (reference: string) => void;
  requireDriver: boolean;
  deliveryDriverId: string;
  onChangeDeliveryDriverId: (driverId: string) => void;
  drivers: PosChannelDriver[];
  isLoadingDrivers: boolean;
}

export const DeliveryCheckoutFields: React.FC<DeliveryCheckoutFieldsProps> = ({
  deliveryPhone,
  onChangeDeliveryPhone,
  deliveryFee,
  onChangeDeliveryFee,
  deliveryAddress,
  onChangeDeliveryAddress,
  deliveryReference,
  onChangeDeliveryReference,
  requireDriver,
  deliveryDriverId,
  onChangeDeliveryDriverId,
  drivers,
  isLoadingDrivers,
}) => {
  const [feeStr, setFeeStr] = useState<string>(() =>
    Number(deliveryFee || 0) > 0 ? String(deliveryFee) : '0',
  );

  useEffect(() => {
    const parsed = parseFloat(feeStr);
    const safeCurrent = isNaN(parsed) ? 0 : parsed;
    if (safeCurrent !== Number(deliveryFee || 0)) {
      setFeeStr(String(Number(deliveryFee || 0)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryFee]);

  const handleFeeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw)) return;
    setFeeStr(raw);
    const n = parseFloat(raw);
    onChangeDeliveryFee(isNaN(n) ? 0 : Math.max(0, n));
  };

  return (
    <div
      data-testid="delivery-checkout-fields"
      className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3 shadow-2xs"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-950">
          <Motorcycle size={20} weight="duotone" className="text-blue-700 shrink-0" />
          <span>Datos de entrega a domicilio</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold">
          A domicilio
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="delivery-phone-input"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Teléfono de contacto <span className="text-red-500">*</span>
          </label>
          <input
            id="delivery-phone-input"
            type="text"
            value={deliveryPhone}
            onChange={(e) => onChangeDeliveryPhone(e.target.value)}
            placeholder="Ej: 8888-8888"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-blue-600 min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor="delivery-fee-input"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Tarifa de envío (C$)
          </label>
          <input
            id="delivery-fee-input"
            type="text"
            inputMode="decimal"
            value={feeStr}
            placeholder="0"
            onFocus={(e) => e.target.select()}
            onChange={handleFeeInputChange}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 tabular-nums focus:outline-hidden focus:border-blue-600 min-h-[44px]"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="delivery-address-input"
            className="block text-xs font-semibold text-gray-700"
          >
            Dirección de entrega <span className="text-red-500">*</span>
          </label>
          {!deliveryAddress.trim() && (
            <span className="text-xs font-bold text-red-600">Obligatorio</span>
          )}
        </div>
        <input
          id="delivery-address-input"
          type="text"
          value={deliveryAddress}
          onChange={(e) => onChangeDeliveryAddress(e.target.value)}
          placeholder="Dirección exacta para el repartidor (calle, número, barrio)"
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-blue-600 min-h-[44px] ${
            !deliveryAddress.trim() ? 'border-red-300 bg-red-50/20' : 'border-gray-300'
          }`}
        />
      </div>

      <div className={`grid grid-cols-1 ${requireDriver ? 'sm:grid-cols-2' : ''} gap-3`}>
        <div>
          <label
            htmlFor="delivery-reference-input"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Punto de referencia
          </label>
          <input
            id="delivery-reference-input"
            type="text"
            value={deliveryReference}
            onChange={(e) => onChangeDeliveryReference(e.target.value)}
            placeholder="Ej: Frente al parque, portón negro"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-blue-600 min-h-[44px]"
          />
        </div>

        {requireDriver && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="delivery-driver-select"
                className="block text-xs font-semibold text-gray-700"
              >
                Repartidor <span className="text-red-500">*</span>
              </label>
              {!deliveryDriverId && (
                <span className="text-xs font-bold text-amber-700">Obligatorio</span>
              )}
            </div>
            <select
              id="delivery-driver-select"
              value={deliveryDriverId}
              onChange={(e) => onChangeDeliveryDriverId(e.target.value)}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-blue-600 min-h-[44px] ${
                !deliveryDriverId ? 'border-amber-300' : 'border-gray-300'
              }`}
            >
              <option value="">
                {isLoadingDrivers ? 'Cargando repartidores...' : 'Seleccioná un repartidor...'}
              </option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.phone ? ` (${d.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
