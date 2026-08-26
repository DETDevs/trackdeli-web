import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import { Storefront } from '@phosphor-icons/react';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface TrackingMapProps {
  destinationLat: number;
  destinationLng: number;
  repartidorLat?: number;
  repartidorLng?: number;
  businessLat?: number;
  businessLng?: number;
}

export default function TrackingMap({
  destinationLat,
  destinationLng,
  repartidorLat,
  repartidorLng,
  businessLat,
  businessLng,
}: TrackingMapProps) {
  const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const repartidorMarker = useRef<mapboxgl.Marker | null>(null);
  const destinoMarker = useRef<mapboxgl.Marker | null>(null);
  const businessMarker = useRef<mapboxgl.Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // estilo limpio y profesional
      center: [destinationLng, destinationLat],
      zoom: 14,
    });
    
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
      destinoMarker.current = null;
      repartidorMarker.current = null;
      businessMarker.current = null;
    };
  }, []); // Solo inicializar una vez

  // Render initial static markers and fetch route
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Marcador de destino (pin fijo rojo)
    const destinoEl = document.createElement('div');
    destinoEl.innerHTML = `
      <div style="
        width: 32px; height: 32px;
        background: #EF4444;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `;

    if (!destinoMarker.current) {
      destinoMarker.current = new mapboxgl.Marker({ element: destinoEl })
        .setLngLat([destinationLng, destinationLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Tu dirección'))
        .addTo(m);
    }

    // Marcador del repartidor (ícono de moto verde)
    if (repartidorLat && repartidorLng) {
      const repartidorEl = document.createElement('div');
      repartidorEl.innerHTML = `
        <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: #22C55E; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 2;">
          🛵
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background: #22C55E; animation: mapbox-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; z-index: -1;"></div>
        </div>
        <style>
          @keyframes mapbox-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: .5; transform: scale(1.3); }
          }
        </style>
      `;

      if (!repartidorMarker.current) {
        repartidorMarker.current = new mapboxgl.Marker({ element: repartidorEl })
          .setLngLat([repartidorLng, repartidorLat])
          .addTo(m);
      }
    }

    if (repartidorLat && repartidorLng) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([destinationLng, destinationLat])
        .extend([repartidorLng, repartidorLat]);
        
      if (businessLat && businessLng) {
        bounds.extend([businessLng, businessLat]);
      }

      m.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 40, right: 40 },
      });
    }

    // Dibujar ruta si hay negocio
    if (businessLat && businessLng) {
      // Marcador del negocio
      const bizEl = document.createElement('div');
      bizEl.style.backgroundColor = '#0F0F0F';
      bizEl.style.color = '#FFFFFF';
      bizEl.style.borderRadius = '10px';
      bizEl.style.padding = '8px';
      bizEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      bizEl.style.display = 'flex';
      bizEl.style.alignItems = 'center';
      bizEl.style.justifyContent = 'center';
      bizEl.style.border = '2px solid white';
      
      const root = createRoot(bizEl);
      root.render(<Storefront size={16} weight="fill" />);

      if (!businessMarker.current) {
        businessMarker.current = new mapboxgl.Marker({ element: bizEl })
          .setLngLat([businessLng, businessLat])
          .addTo(m);
      }

      // Obtener ruta
      fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${businessLng},${businessLat};${destinationLng},${destinationLat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            const duration = Math.round(route.duration / 60);
            const distance = (route.distance / 1000).toFixed(1);
            setRouteInfo({ duration, distance: Number(distance) });

            if (!m.getSource('route') && m.isStyleLoaded()) {
              try {
                m.addSource('route', {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry: route.geometry
                  }
                });
                
                m.addLayer({
                  id: 'route',
                  type: 'line',
                  source: 'route',
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: {
                    'line-color': '#22C55E',
                    'line-width': 5,
                    'line-opacity': 0.8
                  }
                }, 'waterway-label');
              } catch (e) {
                console.warn('[TrackingMap] Route render skipped:', e);
              }
            }
          }
        })
        .catch(err => console.error("Error fetching directions:", err));
    }
  }, [mapLoaded, destinationLat, destinationLng, businessLat, businessLng]);

  // Actualizar posición del repartidor cuando cambia (WebSocket)
  useEffect(() => {
    if (!repartidorMarker.current || !repartidorLat || !repartidorLng) return;

    const endPos = new mapboxgl.LngLat(repartidorLng, repartidorLat);
    const startPos = repartidorMarker.current.getLngLat();
    
    // Si la distancia es muy grande (ej. primera carga), saltar directo
    if (Math.abs(endPos.lng - startPos.lng) > 0.05 || Math.abs(endPos.lat - startPos.lat) > 0.05) {
      repartidorMarker.current.setLngLat(endPos);
    } else {
      // Animar el marcador suavemente a la nueva posición
      let startTimestamp: number | null = null;
      const duration = 1000; // 1 segundo de transición

      const animateMarker = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Ease out quad
        const easeProgress = progress * (2 - progress);

        const currentLng = startPos.lng + (endPos.lng - startPos.lng) * easeProgress;
        const currentLat = startPos.lat + (endPos.lat - startPos.lat) * easeProgress;

        repartidorMarker.current!.setLngLat([currentLng, currentLat]);

        if (progress < 1) {
          requestAnimationFrame(animateMarker);
        }
      };
      
      requestAnimationFrame(animateMarker);
    }

    // Si el mapa existe, ajustar la vista para incluir ambos puntos
    if (map.current) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([destinationLng, destinationLat])
        .extend([repartidorLng, repartidorLat]);

      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 40, right: 40 },
        maxZoom: 16,
      });
    }
  }, [repartidorLat, repartidorLng]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      {routeInfo && (
        <div className="absolute top-20 left-4 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-lg px-4 py-2.5 z-10 text-sm font-semibold text-gray-900 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          {routeInfo.duration} min
          <span className="text-gray-400 font-medium ml-1">· {(routeInfo.distance).toFixed(1)} km</span>
        </div>
      )}
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%' }}
        className=""
      />
    </div>
  );
}
