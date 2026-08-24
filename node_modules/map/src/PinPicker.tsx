import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MagnifyingGlass, MapPin, Check } from '@phosphor-icons/react';

interface PinPickerProps {
  initialLat?: number;
  initialLng?: number;
  mapboxToken: string;
  onConfirm: (lat: number, lng: number, address: string) => void;
}

export const PinPicker: React.FC<PinPickerProps> = ({
  initialLat = 12.1328,
  initialLng = -86.2504,
  mapboxToken,
  onConfirm,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [currentAddress, setCurrentAddress] = useState('Buscando ubicación...');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [initialLng, initialLat],
      zoom: 15,
    });
    
    mapRef.current = map;

    map.on('moveend', () => {
      const center = map.getCenter();
      setCurrentLat(center.lat);
      setCurrentLng(center.lng);
      fetchReverseGeocode(center.lng, center.lat);
    });

    fetchReverseGeocode(initialLng, initialLat);

    return () => map.remove();
  }, [mapboxToken]); // Solo recrear si cambia el token

  const fetchReverseGeocode = async (lng: number, lat: number) => {
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setCurrentAddress(data.features[0].place_name);
      } else {
        setCurrentAddress('Ubicación desconocida');
      }
    } catch (e) {
      setCurrentAddress('Ubicación desconocida');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=ni`);
      const data = await res.json();
      setSearchResults(data.features || []);
    } catch (e) {
      setSearchResults([]);
    }
  };

  const selectResult = (feature: any) => {
    const [lng, lat] = feature.center;
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 16 });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-gray-200 flex flex-col bg-gray-50 mt-4 shadow-sm">
      {/* Search Bar Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full bg-white shadow-sm border border-gray-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-shadow"
            placeholder="Buscar una dirección o lugar..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map(res => (
              <button
                key={res.id}
                type="button"
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                onClick={() => selectResult(res)}
              >
                <p className="font-medium text-gray-900 truncate">{res.text}</p>
                <p className="text-xs text-gray-500 truncate">{res.place_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div ref={mapContainer} className="flex-1 w-full relative">
        {/* Fixed Center Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-md">
           <MapPin size={36} weight="fill" className="text-[#EF4444]" />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white border-t border-gray-100 p-4 shrink-0">
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Dirección aproximada</p>
          <p className="text-sm text-gray-900 line-clamp-1">{currentAddress}</p>
        </div>
        <button
          type="button"
          onClick={() => onConfirm(currentLat, currentLng, currentAddress)}
          className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Check size={18} />
          Confirmar ubicación
        </button>
      </div>
    </div>
  );
};
