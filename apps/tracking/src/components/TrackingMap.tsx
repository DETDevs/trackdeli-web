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
  vehicleType?: string;
  businessLat?: number;
  businessLng?: number;
  orderStatus?: string;
}

const shouldShowRiderMarker = (status?: string) => {
  if (!status) return false;
  return [
    'EN_CAMINO_AL_NEGOCIO',
    'EN_EL_NEGOCIO',
    'EN_CAMINO',
    'CERCA_DEL_DESTINO',
    'VERIFICANDO_ENTREGA',
  ].includes(status);
};

const createRiderMarkerElement = (vehicleType?: string) => {
  const el = document.createElement('div');
  el.className = 'rider-marker';

  const icons: Record<string, string> = {
    MOTO: '🛵',
    BICICLETA: '🚲',
    CARRO: '🚗',
    A_PIE: '🚶',
  };
  const icon = (vehicleType && icons[vehicleType.toUpperCase()]) || '🛵';

  el.innerHTML = `
    <div class="rider-marker-inner">
      <span class="rider-icon">${icon}</span>
      <div class="rider-pulse"></div>
    </div>
  `;

  return el;
};

export default function TrackingMap({
  destinationLat,
  destinationLng,
  repartidorLat,
  repartidorLng,
  vehicleType,
  businessLat,
  businessLng,
  orderStatus,
}: TrackingMapProps) {
  const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const repartidorMarker = useRef<mapboxgl.Marker | null>(null);
  const destinoMarker = useRef<mapboxgl.Marker | null>(null);
  const businessMarker = useRef<mapboxgl.Marker | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [destinationLng, destinationLat],
      zoom: 14,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
      destinoMarker.current = null;
      repartidorMarker.current = null;
      businessMarker.current = null;
    };
  }, []);

  // Render static markers and route
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Marcador de destino (pin fijo rojo)
    if (!destinoMarker.current) {
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
        .addTo(m);
    }

    // Dibujar ruta si hay negocio
    if (businessLat && businessLng) {
      if (!businessMarker.current) {
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
          .addTo(m);
      }

      // Obtener ruta estática negocio -> destino
      fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${businessLng},${businessLat};${destinationLng},${destinationLat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
      )
        .then((res) => res.json())
        .then((data) => {
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
                    geometry: route.geometry,
                  },
                });

                m.addLayer(
                  {
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                      'line-color': '#22C55E',
                      'line-width': 5,
                      'line-opacity': 0.8,
                    },
                  },
                  'waterway-label'
                );
              } catch (e) {
                console.warn('[TrackingMap] Route render skipped:', e);
              }
            }
          }
        })
        .catch((err) => console.error('Error fetching directions:', err));
    }
  }, [mapLoaded, destinationLat, destinationLng, businessLat, businessLng]);

  // Manejar el marcador del repartidor en tiempo real
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    const shouldShow = shouldShowRiderMarker(orderStatus);

    // Si el estado no permite mostrar el repartidor o no hay coordenadas, remover el marcador si existía
    if (!shouldShow || !repartidorLat || !repartidorLng) {
      if (repartidorMarker.current) {
        repartidorMarker.current.remove();
        repartidorMarker.current = null;
      }
      return;
    }

    const targetPos = new mapboxgl.LngLat(repartidorLng, repartidorLat);

    // Si aún no existe el marcador, crearlo con el ícono correspondiente al vehículo
    if (!repartidorMarker.current) {
      const el = createRiderMarkerElement(vehicleType);
      repartidorMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat(targetPos)
        .addTo(m);

      // Ajustar bounds iniciales para abarcar repartidor y destino
      const bounds = new mapboxgl.LngLatBounds()
        .extend([destinationLng, destinationLat])
        .extend([repartidorLng, repartidorLat]);

      if (businessLat && businessLng) {
        bounds.extend([businessLng, businessLat]);
      }

      m.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 40, right: 40 },
        maxZoom: 16,
      });
      return;
    }

    // Si ya existe, animar suavemente la posición
    const startPos = repartidorMarker.current.getLngLat();

    // Si la distancia es muy grande (ej. primera ubicación o salto), mover directo
    if (Math.abs(targetPos.lng - startPos.lng) > 0.05 || Math.abs(targetPos.lat - startPos.lat) > 0.05) {
      repartidorMarker.current.setLngLat(targetPos);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      let startTimestamp: number | null = null;
      const duration = 1200; // Transición suave de 1.2 segundos

      const animateMarker = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentLng = startPos.lng + (targetPos.lng - startPos.lng) * easeProgress;
        const currentLat = startPos.lat + (targetPos.lat - startPos.lat) * easeProgress;

        if (repartidorMarker.current) {
          repartidorMarker.current.setLngLat([currentLng, currentLat]);
        }

        if (progress < 1) {
          animationFrameId.current = requestAnimationFrame(animateMarker);
        }
      };

      animationFrameId.current = requestAnimationFrame(animateMarker);
    }

    // Ajustar la vista si es necesario para mantener ambos puntos visibles
    const bounds = new mapboxgl.LngLatBounds()
      .extend([destinationLng, destinationLat])
      .extend([repartidorLng, repartidorLat]);

    m.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 40, right: 40 },
      maxZoom: 16,
    });
  }, [mapLoaded, repartidorLat, repartidorLng, orderStatus, vehicleType, destinationLat, destinationLng, businessLat, businessLng]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      {routeInfo && (
        <div className="absolute top-20 left-4 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-lg px-4 py-2.5 z-10 text-sm font-semibold text-gray-900 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          {routeInfo.duration} min
          <span className="text-gray-400 font-medium ml-1">· {routeInfo.distance} km</span>
        </div>
      )}
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%' }}
        className="w-full h-full"
      />
    </div>
  );
}
