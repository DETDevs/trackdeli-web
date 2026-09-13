import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  createRiderMarker,
  createBusinessMarker,
  createDestinationMarker,
  calculateHeading,
  updateRiderMarkerHeading,
} from '../lib/mapMarkers';
import {
  findClosestPointOnRoute,
  interpolateAngle,
  trimRouteCoordinates,
  calculateDistanceMeters,
} from '../lib/trackingAnimation';
import { NavigationArrow } from '@phosphor-icons/react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface TrackingMapProps {
  destinationLat: number | string;
  destinationLng: number | string;
  repartidorLat?: number | string;
  repartidorLng?: number | string;
  vehicleType?: string;
  businessLat?: number | string;
  businessLng?: number | string;
  businessName?: string;
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

export default function TrackingMap({
  destinationLat,
  destinationLng,
  repartidorLat,
  repartidorLng,
  vehicleType,
  businessLat,
  businessLng,
  businessName,
  orderStatus,
}: TrackingMapProps) {
  const destLat = Number(destinationLat);
  const destLng = Number(destinationLng);
  const bizLat = businessLat !== undefined && businessLat !== null ? Number(businessLat) : undefined;
  const bizLng = businessLng !== undefined && businessLng !== null ? Number(businessLng) : undefined;
  const repLat = repartidorLat !== undefined && repartidorLat !== null ? Number(repartidorLat) : undefined;
  const repLng = repartidorLng !== undefined && repartidorLng !== null ? Number(repartidorLng) : undefined;

  const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const repartidorMarker = useRef<mapboxgl.Marker | null>(null);
  const destinoMarker = useRef<mapboxgl.Marker | null>(null);
  const businessMarker = useRef<mapboxgl.Marker | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const currentAnimatedLngLat = useRef<[number, number] | null>(null);
  const currentAnimatedHeading = useRef<number>(0);
  const prevUpdateTimestamp = useRef<number | null>(null);

  const fullRouteCoords = useRef<[number, number][]>([]);
  const currentClosestSegmentIndex = useRef<number>(0);
  const consecutiveDeviations = useRef<number>(0);
  const isFetchingRoute = useRef<boolean>(false);
  const lastRerouteTimestamp = useRef<number>(0);

  const hasFittedInitialBounds = useRef<boolean>(false);

  const fitMapBounds = useCallback(
    (animate = true) => {
      if (!map.current) return;
      const bounds = new mapboxgl.LngLatBounds();

      if (!isNaN(destLng) && !isNaN(destLat)) {
        bounds.extend([destLng, destLat]);
      }
      if (repLng !== undefined && repLat !== undefined && !isNaN(repLng) && !isNaN(repLat)) {
        bounds.extend([repLng, repLat]);
      }
      if (bizLng !== undefined && bizLat !== undefined && !isNaN(bizLng) && !isNaN(bizLat)) {
        bounds.extend([bizLng, bizLat]);
      }

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 90, left: 50, right: 50 },
          maxZoom: 16,
          duration: animate ? 1200 : 0,
        });
      }
    },
    [destLat, destLng, repLat, repLng, bizLat, bizLng]
  );

  const getActiveTargetCoordinates = useCallback((): [number, number] | null => {
    if (orderStatus === 'EN_CAMINO_AL_NEGOCIO' && bizLng !== undefined && bizLat !== undefined) {
      return [bizLng, bizLat];
    }
    if (!isNaN(destLng) && !isNaN(destLat)) {
      return [destLng, destLat];
    }
    return null;
  }, [orderStatus, bizLng, bizLat, destLng, destLat]);

  const updateRouteLineSync = useCallback((riderLngLat: [number, number]) => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource | undefined;
    if (!source || fullRouteCoords.current.length === 0) return;

    const { segmentIndex } = findClosestPointOnRoute(
      riderLngLat[0],
      riderLngLat[1],
      fullRouteCoords.current
    );

    if (segmentIndex >= currentClosestSegmentIndex.current) {
      currentClosestSegmentIndex.current = segmentIndex;
    }

    const trimmed = trimRouteCoordinates(
      riderLngLat,
      fullRouteCoords.current,
      currentClosestSegmentIndex.current
    );

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: trimmed,
      },
    });
  }, []);

  const fetchAndApplyRoute = useCallback(
    async (origin: [number, number], destination: [number, number], isRecalculation = false) => {
      if (!mapboxgl.accessToken || isFetchingRoute.current) return;
      isFetchingRoute.current = true;

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates as [number, number][];

          fullRouteCoords.current = coords;
          currentClosestSegmentIndex.current = 0;

          const durationMin = Math.round(route.duration / 60);
          const distanceKm = Number((route.distance / 1000).toFixed(1));
          setRouteInfo({ duration: durationMin, distance: distanceKm });

          if (map.current && map.current.isStyleLoaded()) {
            const m = map.current;
            let source = m.getSource('route') as mapboxgl.GeoJSONSource | undefined;

            if (!source) {
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
                  id: 'route-casing',
                  type: 'line',
                  source: 'route',
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: {
                    'line-color': '#15803D',
                    'line-width': 7,
                    'line-opacity': 0.35,
                  },
                },
                'waterway-label'
              );

              m.addLayer(
                {
                  id: 'route',
                  type: 'line',
                  source: 'route',
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: {
                    'line-color': '#22C55E',
                    'line-width': 5,
                    'line-opacity': 0.9,
                  },
                },
                'waterway-label'
              );
            } else {
              if (currentAnimatedLngLat.current) {
                updateRouteLineSync(currentAnimatedLngLat.current);
              } else {
                source.setData({
                  type: 'Feature',
                  properties: {},
                  geometry: route.geometry,
                });
              }
            }
          }

          if (isRecalculation) {
            console.log('[TrackingMap] Ruta recalculada exitosamente tras desvío.');
          }
        }
      } catch (err) {
        console.error('[TrackingMap] Error consultando Mapbox Directions:', err);
      } finally {
        isFetchingRoute.current = false;
        lastRerouteTimestamp.current = performance.now();
      }
    },
    [updateRouteLineSync]
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [destLng, destLat],
      zoom: 14,
      attributionControl: false,
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

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    if (!destinoMarker.current && !isNaN(destLat) && !isNaN(destLng)) {
      const destinoEl = createDestinationMarker({ label: 'Destino' });
      destinoMarker.current = new mapboxgl.Marker({ element: destinoEl })
        .setLngLat([destLng, destLat])
        .addTo(m);
    }

    if (bizLat !== undefined && bizLng !== undefined && !isNaN(bizLat) && !isNaN(bizLng)) {
      if (!businessMarker.current) {
        const bizEl = createBusinessMarker({ name: businessName || 'Negocio' });
        businessMarker.current = new mapboxgl.Marker({ element: bizEl })
          .setLngLat([bizLng, bizLat])
          .addTo(m);
      }
    }

    const target = getActiveTargetCoordinates();
    if (target && fullRouteCoords.current.length === 0) {
      const startOrigin: [number, number] =
        repLng !== undefined && repLat !== undefined && !isNaN(repLng) && !isNaN(repLat)
          ? [repLng, repLat]
          : bizLng !== undefined && bizLat !== undefined
          ? [bizLng, bizLat]
          : target;

      if (startOrigin[0] !== target[0] || startOrigin[1] !== target[1]) {
        fetchAndApplyRoute(startOrigin, target, false);
      }
    }

    if (!hasFittedInitialBounds.current) {
      fitMapBounds(false);
      hasFittedInitialBounds.current = true;
    }
  }, [
    mapLoaded,
    destLat,
    destLng,
    bizLat,
    bizLng,
    businessName,
    repLat,
    repLng,
    getActiveTargetCoordinates,
    fetchAndApplyRoute,
    fitMapBounds,
  ]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    const shouldShow = shouldShowRiderMarker(orderStatus);

    if (
      !shouldShow ||
      repLat === undefined ||
      repLng === undefined ||
      isNaN(repLat) ||
      isNaN(repLng)
    ) {
      if (repartidorMarker.current) {
        repartidorMarker.current.remove();
        repartidorMarker.current = null;
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const targetPos: [number, number] = [repLng, repLat];

    if (!repartidorMarker.current) {
      const el = createRiderMarker({ vehicleType, isLive: true });
      repartidorMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat(targetPos)
        .addTo(m);

      currentAnimatedLngLat.current = targetPos;
      currentAnimatedHeading.current = 0;
      prevUpdateTimestamp.current = performance.now();

      if (!hasFittedInitialBounds.current) {
        fitMapBounds(true);
        hasFittedInitialBounds.current = true;
      }

      updateRouteLineSync(targetPos);
      return;
    }

    const startPos: [number, number] = currentAnimatedLngLat.current || [
      repartidorMarker.current.getLngLat().lng,
      repartidorMarker.current.getLngLat().lat,
    ];

    const distanceMoved = calculateDistanceMeters(
      startPos[0],
      startPos[1],
      targetPos[0],
      targetPos[1]
    );

    if (distanceMoved > 5000) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      repartidorMarker.current.setLngLat(targetPos);
      currentAnimatedLngLat.current = targetPos;
      updateRouteLineSync(targetPos);
      fitMapBounds(true);
      return;
    }

    if (fullRouteCoords.current.length > 0) {
      const { minDistance } = findClosestPointOnRoute(
        targetPos[0],
        targetPos[1],
        fullRouteCoords.current
      );

      if (minDistance > 40) {
        consecutiveDeviations.current += 1;
        if (
          consecutiveDeviations.current >= 3 &&
          !isFetchingRoute.current &&
          performance.now() - lastRerouteTimestamp.current > 8000
        ) {
          const activeTarget = getActiveTargetCoordinates();
          if (activeTarget) {
            fetchAndApplyRoute(targetPos, activeTarget, true);
          }
          consecutiveDeviations.current = 0;
        }
      } else {
        consecutiveDeviations.current = 0;
      }
    }

    const now = performance.now();
    const elapsedSinceLast = prevUpdateTimestamp.current
      ? now - prevUpdateTimestamp.current
      : 3000;
    prevUpdateTimestamp.current = now;

    const animDuration = Math.max(1500, Math.min(elapsedSinceLast, 5000));

    let targetHeading = currentAnimatedHeading.current;
    if (distanceMoved >= 2) {
      targetHeading = calculateHeading(startPos[0], startPos[1], targetPos[0], targetPos[1]);
    }
    const startHeading = currentAnimatedHeading.current;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    const animStartTime = performance.now();

    const stepAnimation = (timestamp: number) => {
      const elapsed = timestamp - animStartTime;
      const progress = Math.min(elapsed / animDuration, 1);

      const curLng = startPos[0] + (targetPos[0] - startPos[0]) * progress;
      const curLat = startPos[1] + (targetPos[1] - startPos[1]) * progress;
      const currentPos: [number, number] = [curLng, curLat];

      currentAnimatedLngLat.current = currentPos;

      if (repartidorMarker.current) {
        repartidorMarker.current.setLngLat(currentPos);

        const curHeading = interpolateAngle(startHeading, targetHeading, progress);
        currentAnimatedHeading.current = curHeading;
        updateRiderMarkerHeading(repartidorMarker.current.getElement(), curHeading);
      }

      updateRouteLineSync(currentPos);

      if (m && !m.isMoving() && !m.isEasing()) {
        const bounds = m.getBounds();
        if (bounds) {
          const padLng = (bounds.getEast() - bounds.getWest()) * 0.12;
          const padLat = (bounds.getNorth() - bounds.getSouth()) * 0.12;
          const isNearEdge =
            curLng < bounds.getWest() + padLng ||
            curLng > bounds.getEast() - padLng ||
            curLat < bounds.getSouth() + padLat ||
            curLat > bounds.getNorth() - padLat;

          if (isNearEdge) {
            m.easeTo({
              center: [curLng, curLat],
              duration: 1500,
            });
          }
        }
      }

      if (progress < 1) {
        animationFrameId.current = requestAnimationFrame(stepAnimation);
      }
    };

    animationFrameId.current = requestAnimationFrame(stepAnimation);
  }, [
    mapLoaded,
    repLat,
    repLng,
    orderStatus,
    vehicleType,
    updateRouteLineSync,
    fetchAndApplyRoute,
    getActiveTargetCoordinates,
    fitMapBounds,
  ]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      {routeInfo && (
        <div className="absolute top-20 left-4 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-md px-3.5 py-2 z-10 text-sm font-semibold text-gray-900 flex items-center gap-2 animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
          <span>{routeInfo.duration} min</span>
          <span className="text-gray-400 font-normal">· {routeInfo.distance} km</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => fitMapBounds(true)}
        className="absolute bottom-6 right-4 z-10 w-10 h-10 bg-white/95 backdrop-blur-md text-gray-700 rounded-xl shadow-md border border-gray-200/80 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
        title="Centrar ruta"
      >
        <NavigationArrow size={18} weight="bold" className="text-gray-800 rotate-45" />
      </button>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} className="w-full h-full" />
    </div>
  );
}
