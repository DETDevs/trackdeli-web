import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MagnifyingGlass, MapPin, Check, CircleNotch } from '@phosphor-icons/react';

export interface PinPickerProps {
  initialLat?: number;
  initialLng?: number;
  mapboxToken?: string;
  onConfirm?: (lat: number, lng: number, address: string) => void;
  onLocationChange?: (lat: number, lng: number, address: string) => void;
  hideConfirmButton?: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
  height?: string;
  flyToCoords?: { lat: number; lng: number } | null;
  className?: string;
}

export const PinPicker: React.FC<PinPickerProps> = ({
  initialLat = 12.1328,
  initialLng = -86.2504,
  mapboxToken,
  onConfirm,
  onLocationChange,
  hideConfirmButton = false,
  onMapReady,
  height = '420px',
  flyToCoords,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [currentAddress, setCurrentAddress] = useState('Obteniendo dirección...');
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const effectiveToken =
    mapboxToken ||
    (import.meta as any).env?.VITE_MAPBOX_TOKEN ||
    'pk.eyJ1IjoiZWR3aW50b3JyZXMyMSIsImEiOiJjbXQ2bWwzYjkyMHRkMnlvaHY1ZnIwdGR3In0.yQ7e5NbovzVMQ4eeW9Pw3w';

  // Inicializar Mapbox Map
  useEffect(() => {
    if (!mapContainer.current || !effectiveToken) return;

    mapboxgl.accessToken = effectiveToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [initialLng, initialLat],
      zoom: 15,
      attributionControl: false,
    });
    
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      onMapReady?.(map);
    });

    // Múltiples resizes para evitar pantalla gris en montado condicional o flex
    const timer1 = setTimeout(() => map.resize(), 100);
    const timer2 = setTimeout(() => map.resize(), 300);
    const timer3 = setTimeout(() => map.resize(), 600);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainer.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainer.current);
    }

    map.on('move', () => {
      const center = map.getCenter();
      setCurrentLat(center.lat);
      setCurrentLng(center.lng);
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      setCurrentLat(center.lat);
      setCurrentLng(center.lng);
      fetchReverseGeocode(center.lng, center.lat);
    });

    fetchReverseGeocode(initialLng, initialLat);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [effectiveToken]);

  // Manejar flyTo externo cuando cambian coordenadas GPS
  useEffect(() => {
    if (!mapRef.current || !flyToCoords) return;
    if (isNaN(flyToCoords.lat) || isNaN(flyToCoords.lng)) return;

    mapRef.current.flyTo({
      center: [flyToCoords.lng, flyToCoords.lat],
      zoom: 16,
      essential: true,
    });
    setCurrentLat(flyToCoords.lat);
    setCurrentLng(flyToCoords.lng);
    fetchReverseGeocode(flyToCoords.lng, flyToCoords.lat);
  }, [flyToCoords]);

  // Notificar cambios de ubicación al padre
  useEffect(() => {
    onLocationChange?.(currentLat, currentLng, currentAddress);
  }, [currentLat, currentLng, currentAddress, onLocationChange]);

  const fetchReverseGeocode = async (lng: number, lat: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${effectiveToken}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setCurrentAddress(data.features[0].place_name);
      } else {
        setCurrentAddress('Ubicación seleccionada');
      }
    } catch {
      setCurrentAddress('Ubicación seleccionada');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${effectiveToken}&country=ni`
      );
      const data = await res.json();
      setSearchResults(data.features || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (feature: any) => {
    const [lng, lat] = feature.center;
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
    }
    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentAddress(feature.place_name || feature.text);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-gray-200/90 flex flex-col bg-gray-100 shadow-xs ${className}`}
      style={{ height }}
    >
      {/* Search Bar Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20">
        <div className="relative shadow-md rounded-xl">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            className="w-full bg-white border border-gray-200/80 rounded-xl pl-9 pr-8 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-all shadow-2xs"
            placeholder="Buscar calle, barrio o lugar..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {isSearching && (
            <CircleNotch
              size={14}
              className="animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
            />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-gray-50">
            {searchResults.map((res) => (
              <button
                key={res.id}
                type="button"
                className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                onClick={() => selectResult(res)}
              >
                <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" weight="fill" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-gray-900 truncate">{res.text}</p>
                  <p className="text-[11px] text-gray-500 truncate">{res.place_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="flex-1 w-full h-full relative"
        style={{ minHeight: '260px' }}
      >
        {/* Fixed Center Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none select-none">
          <div className="relative flex flex-col items-center animate-bounce-subtle">
            <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-red-500/20">
              <MapPin size={20} weight="fill" />
            </div>
            {/* Pointer / ground dot */}
            <div className="w-1.5 h-1.5 bg-red-700 rounded-full -mt-0.5 ring-2 ring-white" />
            <div className="w-3.5 h-1 bg-black/25 rounded-full blur-[0.6px] mt-0.5" />
          </div>
        </div>
      </div>

      {/* Address Bar Pill (Inside Map) */}
      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xs border border-gray-200/80 rounded-xl px-3 py-2 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[11px] text-gray-700 truncate font-medium flex-1">
            {isGeocoding ? 'Actualizando dirección...' : currentAddress}
          </p>
        </div>
      </div>

      {/* Bottom Action Bar (if not hidden) */}
      {!hideConfirmButton && (
        <div className="bg-white border-t border-gray-100 p-3.5 shrink-0 z-10">
          <button
            type="button"
            onClick={() => onConfirm?.(currentLat, currentLng, currentAddress)}
            className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.99] text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Check size={16} weight="bold" />
            Confirmar ubicación
          </button>
        </div>
      )}
    </div>
  );
};
