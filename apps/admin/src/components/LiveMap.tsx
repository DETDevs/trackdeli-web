import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Storefront } from '@phosphor-icons/react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

interface Repartidor {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  orderId: string;
  customerName: string;
  status: string;
}

interface OrderMapData {
  id: string;
  status: string;
  destinationLat: number;
  destinationLng: number;
}

interface LiveMapProps {
  repartidores: Repartidor[];
  activeOrders: OrderMapData[];
  centerLat?: number;
  centerLng?: number;
  businessLocation?: { lat: number; lng: number };
  focusedOrderId?: string | null;
  onMarkerClick?: (orderId: string) => void;
}

export default function LiveMap({
  repartidores,
  activeOrders,
  centerLat = 12.1364,
  centerLng = -86.2504,
  businessLocation,
  focusedOrderId,
  onMarkerClick,
}: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const destMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const routesCache = useRef<Map<string, GeoJSON.Feature<GeoJSON.LineString>>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routesVersion, setRoutesVersion] = useState(0);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [centerLng, centerLat],
      zoom: 12,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (businessLocation) {
      map.current.on('load', () => {
        if (!map.current) return;
        const el = document.createElement('div');
        el.style.backgroundColor = '#0F0F0F';
        el.style.color = '#FFFFFF';
        el.style.borderRadius = '10px';
        el.style.padding = '8px';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.border = '2px solid white';
        
        const root = createRoot(el);
        root.render(<Storefront size={20} weight="fill" />);

        new mapboxgl.Marker({ element: el })
          .setLngLat([businessLocation.lng, businessLocation.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Tu negocio'))
          .addTo(map.current);
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
      driverMarkers.current.clear();
      destMarkers.current.clear();
      routesCache.current.clear();
    };
  }, []);

  // Drivers Markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    repartidores.forEach((rep) => {
      if (isNaN(rep.lat) || isNaN(rep.lng)) return;
      if (driverMarkers.current.has(rep.userId)) {
        const marker = driverMarkers.current.get(rep.userId)!;
        const startPos = marker.getLngLat();
        const endPos = new mapboxgl.LngLat(rep.lng, rep.lat);

        if (Math.abs(endPos.lng - startPos.lng) > 0.05 || Math.abs(endPos.lat - startPos.lat) > 0.05) {
          marker.setLngLat(endPos);
        } else {
          let startTimestamp: number | null = null;
          const duration = 1000;
          
          const animateMarker = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = progress * (2 - progress);
            
            const currentLng = startPos.lng + (endPos.lng - startPos.lng) * easeProgress;
            const currentLat = startPos.lat + (endPos.lat - startPos.lat) * easeProgress;
            
            marker.setLngLat([currentLng, currentLat]);
            
            if (progress < 1) {
              requestAnimationFrame(animateMarker);
            }
          };
          requestAnimationFrame(animateMarker);
        }
      } else {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="
            background: #22C55E;
            color: white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            cursor: pointer;
          ">🛵</div>
        `;

        el.addEventListener('click', () => {
          onMarkerClick?.(rep.orderId);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([rep.lng, rep.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div style="font-family: Inter, sans-serif; padding: 4px;">
                <p style="font-weight: 600; margin: 0; font-size: 13px;">${rep.name}</p>
                <p style="color: #5C5C5C; margin: 2px 0 0; font-size: 12px;">${rep.customerName}</p>
              </div>
            `)
          )
          .addTo(map.current!);

        driverMarkers.current.set(rep.userId, marker);
      }
    });

    driverMarkers.current.forEach((marker, userId) => {
      if (!repartidores.find(r => r.userId === userId)) {
        marker.remove();
        driverMarkers.current.delete(userId);
      }
    });
  }, [repartidores, onMarkerClick, mapLoaded]);

  // Destination Markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    activeOrders.forEach(order => {
      if (isNaN(order.destinationLat) || isNaN(order.destinationLng)) return;
      if (!destMarkers.current.has(order.id)) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="
            width: 24px; height: 24px;
            background: #EF4444;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          "></div>
        `;
        el.addEventListener('click', () => {
          onMarkerClick?.(order.id);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([order.destinationLng, order.destinationLat])
          .addTo(map.current!);
          
        destMarkers.current.set(order.id, marker);
      }
    });

    destMarkers.current.forEach((marker, orderId) => {
      if (!activeOrders.find(o => o.id === orderId)) {
        marker.remove();
        destMarkers.current.delete(orderId);
      }
    });
  }, [activeOrders, onMarkerClick, mapLoaded]);

  // Fetch routes
  useEffect(() => {
    if (!map.current || !mapLoaded || !businessLocation) return;

    activeOrders.forEach(async (order) => {
      const routeId = order.id;
      
      if (!routesCache.current.has(routeId)) {
        const origin = `${businessLocation.lng},${businessLocation.lat}`;
        const dest = `${order.destinationLng},${order.destinationLat}`;
        try {
          const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${dest}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const geometry = data.routes[0].geometry;
            routesCache.current.set(routeId, {
              type: 'Feature',
              properties: { 
                orderId: routeId,
                duration: data.routes[0].duration,
                distance: data.routes[0].distance
              },
              geometry
            });
            setRoutesVersion(v => v + 1);
          }
        } catch (e) {
          console.error("Error fetching route", e);
        }
      }
    });
  }, [activeOrders, businessLocation, mapLoaded]);

  // Render routes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    if (!m.isStyleLoaded()) return;

    try {
      routesCache.current.forEach((feature, routeId) => {
        const sourceId = `route-source-${routeId}`;
        const layerId = `route-layer-${routeId}`;
        
        let opacity = 0.8;
        let width = 4;
        let color = '#22C55E';
        
        if (focusedOrderId) {
          if (focusedOrderId === routeId) {
            opacity = 1.0;
            width = 6;
            color = '#16A34A'; // Darker green for focus
          } else {
            opacity = 0.3;
            width = 2;
            color = '#9CA3AF'; // Gray for unfocused
          }
        }

        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, { type: 'geojson', data: feature });
          m.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': color,
              'line-width': width,
              'line-opacity': opacity
            }
          });
        } else {
          m.setPaintProperty(layerId, 'line-color', color);
          m.setPaintProperty(layerId, 'line-opacity', opacity);
          m.setPaintProperty(layerId, 'line-width', width);
        }
        
        // Move focused route to top
        if (focusedOrderId === routeId && m.getLayer(layerId)) {
          m.moveLayer(layerId); // Moving without a second parameter puts it at the top
        }
      });

      const activeRouteIds = new Set(activeOrders.map(o => o.id));
      routesCache.current.forEach((_, routeId) => {
        if (!activeRouteIds.has(routeId)) {
          if (m.getLayer(`route-layer-${routeId}`)) m.removeLayer(`route-layer-${routeId}`);
          if (m.getSource(`route-source-${routeId}`)) m.removeSource(`route-source-${routeId}`);
          routesCache.current.delete(routeId);
        }
      });
    } catch (e) {
      console.warn('[LiveMap] Route render skipped (style not ready):', e);
    }

  }, [activeOrders, focusedOrderId, mapLoaded, routesVersion]);

  const focusedRoute = focusedOrderId ? routesCache.current.get(focusedOrderId) : null;

  return (
    <div className="relative w-full" style={{ height: '400px' }}>
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        className="border border-gray-100"
      />
      
      {/* ETA Box */}
      {focusedRoute && focusedRoute.properties?.duration && focusedRoute.properties?.distance && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-5 py-3 rounded-xl shadow-lg border border-gray-100/50 flex items-center gap-2 pointer-events-none z-10 animate-fade-in-up">
          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <p className="text-[15px] font-semibold text-gray-900 tracking-tight">
            {Math.round(focusedRoute.properties.duration / 60)} min{' '}
            <span className="text-gray-400 font-medium ml-1">
              ({(focusedRoute.properties.distance / 1000).toFixed(1)} km)
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
