import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  createRiderMarker,
  createBusinessMarker,
  createDestinationMarker,
  calculateHeading,
  updateRiderMarkerHeading,
} from '../lib/mapMarkers';

mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN;

interface Repartidor {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  orderId: string;
  customerName: string;
  status: string;
  vehicleType?: string;
  destinationType?: 'to_business' | 'to_customer';
}

interface OrderMapData {
  id: string;
  status: string;
  destinationLat: number;
  destinationLng: number;
  customerName?: string;
  destinationType?: 'to_business' | 'to_customer';
}

interface LiveMapProps {
  repartidores: Repartidor[];
  activeOrders: OrderMapData[];
  centerLat?: number;
  centerLng?: number;
  businessLocation?: { lat: number; lng: number };
  businessName?: string;
  focusedOrderId?: string | null;
  onMarkerClick?: (orderId: string) => void;
}

export default function LiveMap({
  repartidores,
  activeOrders,
  centerLat = 12.1364,
  centerLng = -86.2504,
  businessLocation,
  businessName = 'Tu Negocio',
  focusedOrderId,
  onMarkerClick,
}: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const destMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const businessMarkerRef = useRef<mapboxgl.Marker | null>(null);
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

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
      driverMarkers.current.clear();
      destMarkers.current.clear();
      routesCache.current.clear();
      businessMarkerRef.current = null;
    };
  }, []);

  // Business Marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (businessLocation) {
      if (!businessMarkerRef.current) {
        const el = createBusinessMarker({ name: businessName });
        businessMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([businessLocation.lng, businessLocation.lat])
          .addTo(map.current);
      } else {
        businessMarkerRef.current.setLngLat([businessLocation.lng, businessLocation.lat]);
      }
    } else if (businessMarkerRef.current) {
      businessMarkerRef.current.remove();
      businessMarkerRef.current = null;
    }
  }, [businessLocation, businessName, mapLoaded]);

  // Drivers Markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    repartidores.forEach((rep) => {
      if (isNaN(rep.lat) || isNaN(rep.lng)) return;

      const isToBusiness =
        rep.destinationType === 'to_business' ||
        ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO'].includes(rep.status);
      const variant = isToBusiness ? 'to_business' : 'to_customer';
      const badgeText = isToBusiness ? 'Al negocio' : (rep.customerName ? rep.customerName.split(' ')[0] : 'Al cliente');

      const popupHtml = `
        <div style="font-family: Inter, system-ui, sans-serif; padding: 6px 8px; min-width: 150px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 13px; color: #0F0F0F;">${rep.name}</span>
            <span style="font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; ${
              isToBusiness
                ? 'background: #E0F2FE; color: #0369A1;'
                : 'background: #DCFCE7; color: #15803D;'
            }">
              ${isToBusiness ? 'Hacia negocio' : 'Hacia cliente'}
            </span>
          </div>
          <p style="color: #64748B; margin: 0; font-size: 11px;">
            ${isToBusiness ? 'Recogiendo para:' : 'Entregando a:'} <b style="color: #1E293B;">${rep.customerName || 'Cliente'}</b>
          </p>
        </div>
      `;

      if (driverMarkers.current.has(rep.userId)) {
        const marker = driverMarkers.current.get(rep.userId)!;
        const startPos = marker.getLngLat();
        const endPos = new mapboxgl.LngLat(rep.lng, rep.lat);

        // Actualizar variante de estilo (azul / verde) y badge si cambió de estado
        const el = marker.getElement();
        const targetClass = isToBusiness ? 'marker-rider--to-business' : 'marker-rider--to-customer';
        const otherClass = isToBusiness ? 'marker-rider--to-customer' : 'marker-rider--to-business';
        if (!el.classList.contains(targetClass)) {
          el.classList.remove(otherClass);
          el.classList.add(targetClass);
        }
        const badgeEl = el.querySelector('.marker-rider__badge');
        if (badgeEl && badgeEl.textContent !== badgeText) {
          badgeEl.textContent = badgeText;
        }

        // Actualizar contenido del Popup
        const popup = marker.getPopup();
        if (popup) {
          popup.setHTML(popupHtml);
        }

        // Rotar según dirección de movimiento
        if (startPos.lng !== endPos.lng || startPos.lat !== endPos.lat) {
          const heading = calculateHeading(startPos.lng, startPos.lat, endPos.lng, endPos.lat);
          updateRiderMarkerHeading(marker.getElement(), heading);
        }

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
        const el = createRiderMarker({
          vehicleType: rep.vehicleType || 'MOTO',
          isLive: true,
          variant,
          label: badgeText,
        });

        el.addEventListener('click', () => {
          onMarkerClick?.(rep.orderId);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([rep.lng, rep.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupHtml)
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

  // Destination Markers (Solo para entregas a clientes)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    activeOrders.forEach(order => {
      if (isNaN(order.destinationLat) || isNaN(order.destinationLng)) return;

      const isToBusiness =
        order.destinationType === 'to_business' ||
        ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO'].includes(order.status);

      // Si va al negocio, el destino es la tienda (ya identificada con su propio pin)
      if (isToBusiness) {
        if (destMarkers.current.has(order.id)) {
          destMarkers.current.get(order.id)?.remove();
          destMarkers.current.delete(order.id);
        }
        return;
      }

      if (!destMarkers.current.has(order.id)) {
        const el = createDestinationMarker({ label: order.customerName ? order.customerName.split(' ')[0] : 'Destino' });
        
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
      const order = activeOrders.find(o => o.id === orderId);
      const isToBusiness = order && (order.destinationType === 'to_business' ||
        ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO'].includes(order.status));
      if (!order || isToBusiness) {
        marker.remove();
        destMarkers.current.delete(orderId);
      }
    });
  }, [activeOrders, onMarkerClick, mapLoaded]);

  // Fetch routes con origen y destino según fase (hacia negocio vs hacia cliente)
  useEffect(() => {
    if (!map.current || !mapLoaded || !businessLocation) return;

    activeOrders.forEach(async (order) => {
      const routeId = order.id;
      const isToBusiness =
        order.destinationType === 'to_business' ||
        ['ACEPTADO', 'EN_CAMINO_AL_NEGOCIO', 'EN_EL_NEGOCIO'].includes(order.status);

      const rider = repartidores.find(r => r.orderId === order.id);

      let originLngLat: [number, number] | null = null;
      let destLngLat: [number, number] | null = null;

      if (isToBusiness) {
        // Hacia negocio: Desde el rider hacia la tienda
        if (rider && !isNaN(rider.lat) && !isNaN(rider.lng)) {
          originLngLat = [rider.lng, rider.lat];
        }
        destLngLat = [businessLocation.lng, businessLocation.lat];
      } else {
        // Hacia cliente: Desde el rider (o negocio) hacia la casa del cliente
        if (rider && !isNaN(rider.lat) && !isNaN(rider.lng)) {
          originLngLat = [rider.lng, rider.lat];
        } else {
          originLngLat = [businessLocation.lng, businessLocation.lat];
        }
        destLngLat = [order.destinationLng, order.destinationLat];
      }

      if (!originLngLat || !destLngLat) return;
      if (originLngLat[0] === destLngLat[0] && originLngLat[1] === destLngLat[1]) return;

      const cacheKey = `${routeId}-${isToBusiness ? 'biz' : 'cust'}`;
      if (!routesCache.current.has(cacheKey)) {
        const originStr = `${originLngLat[0]},${originLngLat[1]}`;
        const destStr = `${destLngLat[0]},${destLngLat[1]}`;

        try {
          const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${originStr};${destStr}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const geometry = data.routes[0].geometry;
            routesCache.current.set(cacheKey, {
              type: 'Feature',
              properties: { 
                orderId: routeId,
                duration: data.routes[0].duration,
                distance: data.routes[0].distance,
                isToBusiness,
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
  }, [activeOrders, repartidores, businessLocation, mapLoaded]);

  // Render routes con colores diferenciados (azul = negocio, verde = cliente)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    if (!m.isStyleLoaded()) return;

    try {
      routesCache.current.forEach((feature, routeKey) => {
        const sourceId = `route-source-${routeKey}`;
        const layerId = `route-layer-${routeKey}`;
        const routeOrderId = (feature.properties as any)?.orderId;
        const isToBusiness = (feature.properties as any)?.isToBusiness;

        const baseColor = isToBusiness ? '#0284C7' : '#16A34A';
        const focusColor = isToBusiness ? '#0369A1' : '#15803D';
        
        let opacity = 0.75;
        let width = 3.5;
        let color = baseColor;
        
        if (focusedOrderId) {
          if (focusedOrderId === routeOrderId) {
            opacity = 1.0;
            width = 5.5;
            color = focusColor;
          } else {
            opacity = 0.2;
            width = 2;
            color = '#94A3B8'; // Gray for unfocused
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
        if (focusedOrderId === routeOrderId && m.getLayer(layerId)) {
          m.moveLayer(layerId);
        }
      });

      const activeRouteKeys = new Set(activeOrders.flatMap(o => [`${o.id}-biz`, `${o.id}-cust`]));
      routesCache.current.forEach((_, routeKey) => {
        if (!activeRouteKeys.has(routeKey)) {
          if (m.getLayer(`route-layer-${routeKey}`)) m.removeLayer(`route-layer-${routeKey}`);
          if (m.getSource(`route-source-${routeKey}`)) m.removeSource(`route-source-${routeKey}`);
          routesCache.current.delete(routeKey);
        }
      });
    } catch (e) {
      console.warn('[LiveMap] Route render skipped (style not ready):', e);
    }

  }, [activeOrders, focusedOrderId, mapLoaded, routesVersion]);

  const focusedRoute = focusedOrderId
    ? (routesCache.current.get(`${focusedOrderId}-biz`) || routesCache.current.get(`${focusedOrderId}-cust`))
    : null;

  return (
    <div className="relative w-full h-[250px] sm:h-[350px] lg:h-[420px]">
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        className="border border-gray-100"
      />

      {/* Legend Top Left */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-100/80 shadow-xs flex items-center gap-3 text-[11px] font-medium text-gray-600 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#0284C7]"></span>
          <span>Hacia negocio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
          <span>Hacia cliente</span>
        </div>
      </div>
      
      {/* ETA Box */}
      {focusedRoute && focusedRoute.properties?.duration && focusedRoute.properties?.distance && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-100/70 flex items-center gap-2 pointer-events-none z-10 animate-fade-in-up">
          <div className={`w-2.5 h-2.5 rounded-full ${
            focusedRoute.properties?.isToBusiness ? 'bg-[#0284C7]' : 'bg-[#16A34A]'
          }`} />
          <p className="text-xs font-semibold text-gray-900 tracking-tight">
            {focusedRoute.properties?.isToBusiness ? 'Llegada al negocio: ' : 'Llegada al cliente: '}
            <span className="text-gray-900">{Math.round(focusedRoute.properties.duration / 60)} min</span>{' '}
            <span className="text-gray-400 font-normal">
              ({(focusedRoute.properties.distance / 1000).toFixed(1)} km)
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
