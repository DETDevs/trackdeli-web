import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerLocationSession,
  updateCustomerLocationByToken,
} from 'api-client';
import {
  MapPin,
  CheckCircle,
  NavigationArrow,
  CircleNotch,
  WarningCircle,
  Storefront,
  ArrowsClockwise,
  Check,
} from '@phosphor-icons/react';
import { PinPicker } from 'map';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const ConfirmLocationPage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [confirmedCoords, setConfirmedCoords] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Map container ref for returning customer preview & success state
  const previewMapContainer = useRef<HTMLDivElement>(null);
  const previewMap = useRef<mapboxgl.Map | null>(null);
  const previewMarker = useRef<mapboxgl.Marker | null>(null);

  const {
    data: session,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['customer-location-session', token],
    queryFn: () => getCustomerLocationSession(token),
    enabled: !!token,
    retry: false,
  });

  const customer = session?.customer;
  const isAlreadyResponded =
    session?.sessionStatus === 'RESPONDED' ||
    session?.status === 'RESPONDED' ||
    Boolean(session?.respondedAt);

  const shouldShowCompleted = isSuccess || isAlreadyResponded;
  const hasPreviousLocation = Boolean(customer?.lastLatitude && customer?.lastLongitude);

  const confirmMutation = useMutation({
    mutationFn: (data: {
      latitude?: number;
      longitude?: number;
      addressText?: string;
      confirmedOnly?: boolean;
    }) =>
      updateCustomerLocationByToken(token, data, customer?.id),
    onSuccess: (_, variables) => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['customer-location-session', token] });
      if (variables.latitude && variables.longitude) {
        setConfirmedCoords({
          lat: variables.latitude,
          lng: variables.longitude,
          address: variables.addressText || customer?.lastAddressText || undefined,
        });
      } else if (customer?.lastLatitude && customer?.lastLongitude) {
        setConfirmedCoords({
          lat: Number(customer.lastLatitude),
          lng: Number(customer.lastLongitude),
          address: customer.lastAddressText || undefined,
        });
      }
    },
  });

  // Render static/preview map when customer has previous location, already responded, or after confirming
  const previewLat = confirmedCoords?.lat || (customer?.lastLatitude ? Number(customer.lastLatitude) : null);
  const previewLng = confirmedCoords?.lng || (customer?.lastLongitude ? Number(customer.lastLongitude) : null);

  useEffect(() => {
    if (!previewMapContainer.current || !previewLat || !previewLng || !MAPBOX_TOKEN) return;

    if (!previewMap.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const m = new mapboxgl.Map({
        container: previewMapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [previewLng, previewLat],
        zoom: 15,
        interactive: false,
        attributionControl: false,
      });

      const el = document.createElement('div');
      el.className = 'w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white';
      el.innerHTML = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path></svg>';

      previewMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([previewLng, previewLat])
        .addTo(m);

      previewMap.current = m;
    } else {
      previewMap.current.setCenter([previewLng, previewLat]);
      if (previewMarker.current) {
        previewMarker.current.setLngLat([previewLng, previewLat]);
      }
    }
  }, [previewLat, previewLng, shouldShowCompleted, showManualPicker]);

  const [pickerCoords, setPickerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickerAddress, setPickerAddress] = useState<string>('');
  const [gpsFlyToCoords, setGpsFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

  const defaultInitialLat = customer?.lastLatitude
    ? Number(customer.lastLatitude)
    : (customer?.business as any)?.latitude
    ? Number((customer?.business as any).latitude)
    : 12.1328;

  const defaultInitialLng = customer?.lastLongitude
    ? Number(customer.lastLongitude)
    : (customer?.business as any)?.longitude
    ? Number((customer?.business as any).longitude)
    : -86.2504;

  // Handle GPS Request
  const handleRequestGPS = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsFlyToCoords({ lat, lng });
        setPickerCoords({ lat, lng });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        let msg = 'No se pudo obtener tu ubicación GPS automáticamente.';
        if (err.code === 1) {
          msg = 'Permiso de ubicación no concedido. Podés arrastrar el mapa o buscar tu dirección.';
        } else if (err.code === 2) {
          msg = 'Señal GPS no disponible. Podés mover el pin en el mapa.';
        } else if (err.code === 3) {
          msg = 'Tiempo de espera agotado al obtener GPS. Fijá tu ubicación en el mapa.';
        }
        setGeoError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Handle "Sí, sigo acá" (Caso B: confirmar ubicación guardada)
  const handleConfirmExisting = () => {
    if (!customer?.lastLatitude || !customer?.lastLongitude) return;
    confirmMutation.mutate({
      latitude: Number(customer.lastLatitude),
      longitude: Number(customer.lastLongitude),
      addressText: customer.lastAddressText || undefined,
      confirmedOnly: true,
    });
  };

  // Handle Confirm Location from PinPicker
  const handleConfirmLocation = () => {
    const lat = pickerCoords?.lat ?? defaultInitialLat;
    const lng = pickerCoords?.lng ?? defaultInitialLng;
    const finalAddress = manualAddress?.trim()
      ? (pickerAddress ? `${pickerAddress} (${manualAddress.trim()})` : manualAddress.trim())
      : (pickerAddress || customer?.lastAddressText || 'Ubicación confirmada');

    confirmMutation.mutate({
      latitude: lat,
      longitude: lng,
      addressText: finalAddress,
    });
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-base mb-4 shadow-sm">
          TD
        </div>
        <CircleNotch size={32} className="animate-spin text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 font-medium">Cargando datos de entrega...</p>
      </div>
    );
  }

  // 2. Error / Expired Session State
  if (isError || !session || !customer) {
    if (isError && error) {
      console.error('TrackDeli Error - Location Session Fetch Failed:', error);
      console.error('Status:', (error as any)?.response?.status);
      console.error('Data:', (error as any)?.response?.data);
    }

    const status = (error as any)?.response?.status;
    const isNetworkError = error && !status; // e.g. CORS or no internet
    const isServerError = status >= 500;

    if (isNetworkError || isServerError) {
      return (
        <div className="min-h-screen bg-[#FBFBFB] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <div className="max-w-sm w-full bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <WarningCircle size={28} weight="fill" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Problema de conexión</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                No pudimos cargar tu enlace en este momento. Por favor, revisá tu conexión a internet e intentá de nuevo.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 bg-gray-900 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <ArrowsClockwise size={18} weight="bold" />
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FBFBFB] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-sm w-full bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <WarningCircle size={28} weight="fill" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-gray-900">Enlace no disponible</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Este enlace de confirmación de ubicación ya fue utilizado o ha expirado. Si necesitás asistencia, comunicate con el negocio que envió tu pedido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const businessName = customer.business?.name || 'el negocio';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 flex flex-col justify-between p-4 sm:p-6 font-sans select-none">
      {/* Top Header */}
      <header className="max-w-md mx-auto w-full pt-2 pb-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            TD
          </div>
          <span className="font-semibold text-xs text-gray-900 tracking-tight">TrackDeli</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-white border border-gray-200/80 px-2.5 py-1 rounded-full shadow-2xs">
          <Storefront size={13} className="text-gray-500" />
          <span className="truncate max-w-[140px]">{businessName}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full py-4 space-y-4 my-auto">
        {/* SUCCESS / ALREADY RESPONDED STATE */}
        {shouldShowCompleted ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle size={32} weight="fill" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                <Check size={12} weight="bold" />
                Ubicación confirmada
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {isAlreadyResponded && !isSuccess
                  ? '¡Ya confirmaste tu ubicación!'
                  : '¡Listo! Ubicación guardada'}
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                {isAlreadyResponded && !isSuccess
                  ? 'Tu ubicación de entrega ya fue guardada con éxito para este pedido. ¡Muchas gracias!'
                  : 'Tu repartidor se dirigirá exactamente a esta dirección para entregar tu pedido.'}
              </p>
            </div>

            {/* Read-only Mini Map Preview */}
            {previewLat && previewLng && (
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 space-y-2">
                <div ref={previewMapContainer} className="w-full h-44 rounded-xl" />
                {(confirmedCoords?.address || customer?.lastAddressText) && (
                  <p className="text-[11px] text-gray-600 px-3 pb-2 flex items-start justify-center gap-1.5 text-center">
                    <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                    <span className="truncate max-w-xs">{confirmedCoords?.address || customer?.lastAddressText}</span>
                  </p>
                )}
              </div>
            )}

            <div className="p-3.5 bg-gray-50 rounded-xl text-left border border-gray-100 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-900">¿Qué sigue?</p>
              <p className="text-[11px] text-gray-500">
                Recibirás un mensaje de WhatsApp con el enlace de seguimiento en vivo en cuanto el repartidor esté en camino con tu pedido.
              </p>
            </div>
          </div>
        ) : hasPreviousLocation && !showManualPicker ? (
          /* CASO B: Cliente recurrente con ubicación previa guardada */
          <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                ¿Estás en tu dirección habitual?
              </h2>
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-800">{customer.name}</span>, verificá si tu pedido debe entregarse acá:
              </p>
            </div>

            {/* Map Preview */}
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-100 shadow-2xs relative">
              <div ref={previewMapContainer} className="w-full h-48" />
              {customer.lastAddressText && (
                <div className="p-2.5 bg-white border-t border-gray-100 flex items-start gap-1.5 text-xs text-gray-700">
                  <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                  <span className="truncate">{customer.lastAddressText}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: 2 large touch-friendly buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleConfirmExisting}
                disabled={confirmMutation.isPending}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {confirmMutation.isPending ? (
                  <CircleNotch size={18} className="animate-spin" />
                ) : (
                  <Check size={18} weight="bold" />
                )}
                <span>Sí, sigo acá (Confirmar)</span>
              </button>

              <button
                onClick={() => {
                  setShowManualPicker(true);
                  handleRequestGPS();
                }}
                disabled={isLocating || confirmMutation.isPending}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLocating ? (
                  <CircleNotch size={16} className="animate-spin" />
                ) : (
                  <ArrowsClockwise size={16} weight="bold" />
                )}
                <span>No, actualizar mi ubicación</span>
              </button>
            </div>

            {geoError && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <WarningCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>{geoError}</p>
              </div>
            )}
          </div>
        ) : (
          /* CASO A / MAP PICKER: Cliente nuevo o actualización de ubicación */
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            {/* Header with Title and "Usar GPS" Button */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Confirmá tu ubicación
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Arrastrá el mapa o buscá tu dirección para fijar el pin exacto
                </p>
              </div>

              <button
                type="button"
                onClick={handleRequestGPS}
                disabled={isLocating}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-60"
              >
                {isLocating ? (
                  <CircleNotch size={14} className="animate-spin text-emerald-600" />
                ) : (
                  <NavigationArrow size={14} weight="fill" className="text-emerald-600" />
                )}
                <span>{isLocating ? 'Obteniendo GPS...' : 'Usar GPS'}</span>
              </button>
            </div>

            {/* Error banner if GPS failed */}
            {geoError && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <WarningCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>{geoError}</p>
              </div>
            )}

            {/* Interactive Mapbox PinPicker */}
            <div className="w-full">
              <PinPicker
                mapboxToken={MAPBOX_TOKEN}
                initialLat={defaultInitialLat}
                initialLng={defaultInitialLng}
                flyToCoords={gpsFlyToCoords}
                height="360px"
                hideConfirmButton={true}
                onLocationChange={(lat, lng, address) => {
                  setPickerCoords({ lat, lng });
                  setPickerAddress(address);
                }}
              />
            </div>

            {/* Clear Selected Address Indicator below the map */}
            {pickerAddress && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
                <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Punto de entrega fijado
                  </p>
                  <p className="text-xs font-semibold text-gray-900 leading-snug mt-0.5">
                    {pickerAddress}
                  </p>
                </div>
              </div>
            )}

            {/* Reference field */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Referencia o punto de entrega (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Casa verde con portón negro, timbre blanco"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none transition-all"
              />
            </div>

            {/* Fixed Confirm Button Below the Map */}
            <button
              type="button"
              onClick={handleConfirmLocation}
              disabled={confirmMutation.isPending}
              className="w-full py-3.5 px-4 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {confirmMutation.isPending ? (
                <>
                  <CircleNotch size={18} className="animate-spin text-white" />
                  <span>Guardando ubicación...</span>
                </>
              ) : (
                <>
                  <Check size={18} weight="bold" />
                  <span>Confirmar ubicación</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-gray-400 py-3 max-w-md mx-auto w-full border-t border-gray-100">
        TrackDeli — Entrega y seguimiento en tiempo real
      </footer>
    </div>
  );
};
