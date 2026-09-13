
const DEG2RAD = Math.PI / 180;
const METERS_PER_DEG_LAT = 111132;

export function pointToSegmentDistanceMeters(
  pLng: number,
  pLat: number,
  aLng: number,
  aLat: number,
  bLng: number,
  bLat: number
): { distance: number; projection: [number, number]; t: number } {
  const midLat = (aLat + bLat) / 2;
  const cosLat = Math.cos(midLat * DEG2RAD);
  const mPerDegLng = METERS_PER_DEG_LAT * cosLat;

  const ax = aLng * mPerDegLng;
  const ay = aLat * METERS_PER_DEG_LAT;
  const bx = bLng * mPerDegLng;
  const by = bLat * METERS_PER_DEG_LAT;
  const px = pLng * mPerDegLng;
  const py = pLat * METERS_PER_DEG_LAT;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const d = Math.hypot(px - ax, py - ay);
    return { distance: d, projection: [aLng, aLat], t: 0 };
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const distance = Math.hypot(px - projX, py - projY);

  const projLng = projX / mPerDegLng;
  const projLat = projY / METERS_PER_DEG_LAT;

  return { distance, projection: [projLng, projLat], t };
}

export function calculateDistanceMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const midLat = (lat1 + lat2) / 2;
  const cosLat = Math.cos(midLat * DEG2RAD);
  const dx = (lng2 - lng1) * METERS_PER_DEG_LAT * cosLat;
  const dy = (lat2 - lat1) * METERS_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

export function findClosestPointOnRoute(
  pLng: number,
  pLat: number,
  coords: [number, number][]
): { minDistance: number; segmentIndex: number; projectedPoint: [number, number] } {
  if (!coords || coords.length === 0) {
    return { minDistance: Infinity, segmentIndex: 0, projectedPoint: [pLng, pLat] };
  }
  if (coords.length === 1) {
    const dist = calculateDistanceMeters(pLng, pLat, coords[0][0], coords[0][1]);
    return { minDistance: dist, segmentIndex: 0, projectedPoint: coords[0] };
  }

  let minDistance = Infinity;
  let segmentIndex = 0;
  let projectedPoint: [number, number] = coords[0];

  for (let i = 0; i < coords.length - 1; i++) {
    const [aLng, aLat] = coords[i];
    const [bLng, bLat] = coords[i + 1];
    const { distance, projection } = pointToSegmentDistanceMeters(
      pLng,
      pLat,
      aLng,
      aLat,
      bLng,
      bLat
    );
    if (distance < minDistance) {
      minDistance = distance;
      segmentIndex = i;
      projectedPoint = projection;
    }
  }

  return { minDistance, segmentIndex, projectedPoint };
}

export function interpolateAngle(fromAngle: number, toAngle: number, t: number): number {
  let diff = (toAngle - fromAngle) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return (fromAngle + diff * t + 360) % 360;
}

export function trimRouteCoordinates(
  riderPos: [number, number],
  coords: [number, number][],
  closestSegmentIndex: number
): [number, number][] {
  if (!coords || coords.length === 0) return [riderPos];
  if (closestSegmentIndex >= coords.length - 1) {
    return [riderPos, coords[coords.length - 1]];
  }
  return [riderPos, ...coords.slice(closestSegmentIndex + 1)];
}
