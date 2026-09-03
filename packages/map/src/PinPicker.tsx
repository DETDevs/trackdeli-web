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
  height = '380px',
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

    // Múltiples resizes para evitar canvas gris
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

  // Notificar cambios de ubicación al componente padre
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
      className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-xs flex flex-col ${className}`}
      style={{ height, position: 'relative' }}
    >
      {/* 1. MAP CANVAS (Sibling - NO react children inside to prevent Mapbox DOM overwrite) */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* 2. SEARCH BAR OVERLAY (Top) */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          zIndex: 40,
        }}
      >
        <div className="relative shadow-md rounded-xl bg-white border border-gray-200/90 flex items-center">
          <MagnifyingGlass
            size={16}
            className="text-gray-400 pointer-events-none shrink-0"
            style={{ position: 'absolute', left: '12px' }}
          />
          <input
            type="text"
            className="w-full bg-transparent rounded-xl pl-9 pr-8 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/15 transition-all"
            placeholder="Buscar calle, barrio o lugar..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {isSearching && (
            <CircleNotch
              size={14}
              className="animate-spin text-gray-400 shrink-0"
              style={{ position: 'absolute', right: '12px' }}
            />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div
            className="mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-50"
            style={{ position: 'relative', zIndex: 50 }}
          >
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

      {/* 3. PROMINENT FIXED CENTER PIN (Center of Map) */}
      <div
        className="pointer-events-none select-none flex flex-col items-center justify-center"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -100%)',
          zIndex: 35,
        }}
      >
        <div className="relative flex flex-col items-center">
          {/* Tag tooltip */}
          <div className="bg-gray-950/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md mb-1 whitespace-nowrap tracking-wide flex items-center gap-1 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>Fijar acá</span>
          </div>

          {/* Large, high-visibility Pin Icon */}
          <div className="relative">
            <MapPin
              size={46}
              weight="fill"
              className="text-rose-600 drop-shadow-[0_6px_10px_rgba(225,29,72,0.5)]"
            />
          </div>

          {/* Ground anchor pulse dot right under the pin point */}
          <div className="relative flex items-center justify-center -mt-1">
            <span
              className="w-4 h-4 rounded-full bg-rose-500/35 ring-2 ring-rose-500 animate-ping"
              style={{ position: 'absolute' }}
            />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-white shadow-xs" />
          </div>
        </div>
      </div>

      {/* 4. ADDRESS BAR PILL (Bottom of Map) */}
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          zIndex: 30,
        }}
      >
        <div className="bg-white/95 backdrop-blur-xs border border-gray-200/90 rounded-xl px-3.5 py-2 shadow-md flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100" />
          <p className="text-[11px] text-gray-800 truncate font-semibold flex-1">
            {isGeocoding ? 'Obteniendo dirección del mapa...' : currentAddress}
          </p>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BAR (if not hidden by parent) */}
      {!hideConfirmButton && (
        <div
          className="bg-white border-t border-gray-100 p-3.5 shrink-0"
          style={{ position: 'relative', zIndex: 30 }}
        >
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
