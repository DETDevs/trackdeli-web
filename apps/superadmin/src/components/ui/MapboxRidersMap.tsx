import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ActiveRiderItem } from '../../hooks/useRiders';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapboxRidersMapProps {
  riders: ActiveRiderItem[];
  centerLat?: number;
  centerLng?: number;
  height?: string;
}

export const MapboxRidersMap = ({
  riders,
  centerLat = 12.1364,
  centerLng = -86.2504,
  height = 'h-80',
}: MapboxRidersMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [centerLng, centerLat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when riders change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (riders.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoords = false;

    riders.forEach((rider) => {
      if (!rider.currentLatitude || !rider.currentLongitude) return;

      hasValidCoords = true;
      bounds.extend([rider.currentLongitude, rider.currentLatitude]);

      const el = document.createElement('div');
      el.className = 'rider-map-marker';
      el.innerHTML = `
        <div class="rider-map-dot">
          <div class="rider-map-pulse"></div>
        </div>
      `;

      const vehicleEmoji =
        rider.vehicleType === 'MOTO'
          ? '🛵'
          : rider.vehicleType === 'BICICLETA'
          ? '🚲'
          : rider.vehicleType === 'CARRO'
          ? '🚗'
          : '🚶';

      const popupContent = `
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <p style="font-weight: 600; font-size: 13px; margin: 0 0 2px 0; color: #0F0F0F;">
            ${vehicleEmoji} ${rider.name}
          </p>
          <p style="font-size: 11px; margin: 0; color: #5C5C5C;">
            ${
              rider.currentOrder
                ? `En entrega: ${rider.currentOrder.businessName} (${rider.currentOrder.status})`
                : 'Disponible para pedidos'
            }
          </p>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
        popupContent
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([rider.currentLongitude, rider.currentLatitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    if (hasValidCoords && riders.length > 1) {
      map.current.fitBounds(bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 15,
      });
    } else if (hasValidCoords && riders.length === 1) {
      map.current.flyTo({
        center: [riders[0].currentLongitude!, riders[0].currentLatitude!],
        zoom: 14,
      });
    }
  }, [riders]);

  return (
    <div className={`w-full ${height} rounded-xl overflow-hidden relative border border-gray-100`}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
