import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  MapTrifold,
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

  // Render static/preview map when customer has previous location or after confirming
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
  }, [previewLat, previewLng, isSuccess, showManualPicker]);

  // Handle GPS Request
  const handleRequestGPS = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización GPS.');
      setShowManualPicker(true);
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        let detectedAddress = '';
        if (MAPBOX_TOKEN) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
            );
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              detectedAddress = data.features[0].place_name;
            }
          } catch {
            // Ignorar error de geocodificación inversa
          }
        }

        confirmMutation.mutate({
          latitude: lat,
          longitude: lng,
          addressText: detectedAddress || undefined,
        });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Permiso de ubicación denegado. No te preocupes, podés elegir tu ubicación en el mapa.'
          );
        } else {
          setGeoError(
            'No pudimos obtener tu señal GPS en este momento. Por favor seleccioná tu ubicación en el mapa.'
          );
        }
        setShowManualPicker(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
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

  // Handle Manual Pin Confirm
  const handleManualMapConfirm = (lat: number, lng: number, address: string) => {
    confirmMutation.mutate({
      latitude: lat,
      longitude: lng,
      addressText: address || manualAddress || undefined,
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
        {/* SUCCESS STATE */}
        {isSuccess ? (
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
                ¡Listo! Ubicación guardada
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Tu repartidor se dirigirá exactamente a esta dirección para entregar tu pedido.
              </p>
            </div>

            {/* Read-only Mini Map Preview */}
            {previewLat && previewLng && (
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 space-y-2">
                <div ref={previewMapContainer} className="w-full h-44 rounded-xl" />
                {confirmedCoords?.address && (
                  <p className="text-[11px] text-gray-600 px-3 pb-2 flex items-start justify-center gap-1.5 text-center">
                    <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                    <span className="truncate max-w-xs">{confirmedCoords.address}</span>
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
                onClick={handleRequestGPS}
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
          /* CASO A / FALLBACK MANUAL: Cliente nuevo o sin ubicación guardada */
          <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center mx-auto shadow-xs">
                <MapPin size={24} weight="bold" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Confirmá tu ubicación
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                <span className="font-medium text-gray-800">¡Hola {customer.name}!</span> Compartí tu ubicación para que el repartidor llegue directo a tu puerta sin perderse.
              </p>
            </div>

            {/* Error banner if GPS failed */}
            {geoError && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <WarningCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>{geoError}</p>
              </div>
            )}

            {/* MANUAL MAP PICKER FALLBACK */}
            {showManualPicker ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <MapTrifold size={14} />
                    <span>Elegir punto en el mapa</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestGPS}
                    disabled={isLocating}
                    className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <NavigationArrow size={12} weight="fill" />
                    <span>Usar GPS</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Arrastrá el mapa o buscá tu dirección para fijar el pin exacto de tu casa.
                </p>

                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <PinPicker
                    mapboxToken={MAPBOX_TOKEN}
                    initialLat={customer.lastLatitude ? Number(customer.lastLatitude) : 12.1328}
                    initialLng={customer.lastLongitude ? Number(customer.lastLongitude) : -86.2504}
                    onConfirm={handleManualMapConfirm}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Referencia o punto de entrega (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Casa verde con portón negro"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-gray-900 outline-none"
                  />
                </div>
              </div>
            ) : (
              /* PRIMARY GPS BUTTON FLOW */
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleRequestGPS}
                  disabled={isLocating || confirmMutation.isPending}
                  className="w-full py-4 px-4 bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isLocating || confirmMutation.isPending ? (
                    <>
                      <CircleNotch size={18} className="animate-spin text-white" />
                      <span>Obteniendo ubicación GPS...</span>
                    </>
                  ) : (
                    <>
                      <NavigationArrow size={18} weight="fill" className="text-emerald-400" />
                      <span>Compartir mi ubicación actual</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualPicker(true)}
                  className="w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MapTrifold size={14} />
                  <span>¿Preferís elegir en el mapa? Tocá acá</span>
                </button>
              </div>
            )}
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
