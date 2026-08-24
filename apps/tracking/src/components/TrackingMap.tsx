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

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // estilo limpio y profesional
      center: [destinationLng, destinationLat],
      zoom: 14,
    });

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

    destinoMarker.current = new mapboxgl.Marker({ element: destinoEl })
      .setLngLat([destinationLng, destinationLat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Tu dirección'))
      .addTo(map.current);

    // Marcador del repartidor (ícono de moto verde)
    if (repartidorLat && repartidorLng) {
      const repartidorEl = document.createElement('div');
      repartidorEl.innerHTML = `
        <div style="
          width: 40px; height: 40px;
          background: #22C55E;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        ">🛵</div>
      `;

      repartidorMarker.current = new mapboxgl.Marker({ element: repartidorEl })
        .setLngLat([repartidorLng, repartidorLat])
        .addTo(map.current);
    }

    if (repartidorLat && repartidorLng) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([destinationLng, destinationLat])
        .extend([repartidorLng, repartidorLat]);
        
      if (businessLat && businessLng) {
        bounds.extend([businessLng, businessLat]);
      }

      map.current.fitBounds(bounds, {
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

      businessMarker.current = new mapboxgl.Marker({ element: bizEl })
        .setLngLat([businessLng, businessLat])
        .addTo(map.current);

      // Obtener ruta
      fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${businessLng},${businessLat};${destinationLng},${destinationLat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            const duration = Math.round(route.duration / 60);
            const distance = (route.distance / 1000).toFixed(1);
            setRouteInfo({ duration, distance: Number(distance) });

            map.current?.on('load', () => {
              if (!map.current) return;
              map.current.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: route.geometry
                }
              });
              
              map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#22C55E',
                  'line-width': 5,
                  'line-opacity': 0.8
                }
              }, 'waterway-label'); // Insertar antes de labels si es posible, o dejar sin segundo param
            });
          }
        })
        .catch(err => console.error("Error fetching directions:", err));
    }

    return () => {
      map.current?.remove();
    };
  }, []); // Solo inicializar una vez

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
    <div className="relative w-full h-[240px]">
      {routeInfo && (
        <div className="absolute top-3 left-3 bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 z-10 text-sm font-medium text-[#0F0F0F]">
          {routeInfo.duration} min · {routeInfo.distance} km
        </div>
      )}
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        className="border border-gray-100"
      />
    </div>
  );
}
