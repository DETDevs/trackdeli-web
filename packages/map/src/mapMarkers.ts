export interface RiderMarkerOptions {
  vehicleType?: string | null;
  isLive?: boolean;
}

export function createRiderMarker({
  vehicleType = 'MOTO',
  isLive = true,
}: RiderMarkerOptions = {}): HTMLElement {
  const normalizedType = (vehicleType || 'MOTO').toUpperCase();
  const icons: Record<string, string> = {
    MOTO: '🛵',
    BICICLETA: '🚲',
    CARRO: '🚗',
    A_PIE: '🚶',
  };
  const icon = icons[normalizedType] || '🛵';

  const el = document.createElement('div');
  el.className = 'marker-rider';
  el.innerHTML = `
    <div class="marker-rider__container">
      ${isLive ? '<div class="marker-rider__pulse"></div>' : ''}
      <div class="marker-rider__circle">
        <span class="marker-rider__icon">${icon}</span>
      </div>
    </div>
  `;

  return el;
}

export interface BusinessMarkerOptions {
  name?: string;
}

export function createBusinessMarker({
  name = '',
}: BusinessMarkerOptions = {}): HTMLElement {
  const el = document.createElement('div');
  el.className = 'marker-business';
  el.innerHTML = `
    <div class="marker-business__container">
      ${name ? `<div class="marker-business__label">${name}</div>` : ''}
      <div class="marker-business__circle">
        <span>🏪</span>
      </div>
      <div class="marker-business__pointer"></div>
    </div>
  `;
  return el;
}

export interface DestinationMarkerOptions {
  label?: string;
}

export function createDestinationMarker({
  label = 'Destino',
}: DestinationMarkerOptions = {}): HTMLElement {
  const el = document.createElement('div');
  el.className = 'marker-destination';
  el.innerHTML = `
    <div class="marker-destination__container">
      ${label ? `<div class="marker-destination__label">${label}</div>` : ''}
      <div class="marker-destination__circle">
        <span>🏠</span>
      </div>
      <div class="marker-destination__pointer"></div>
    </div>
  `;
  return el;
}

/**
 * Calcular heading (ángulo de rotación en grados de 0 a 360) entre dos posiciones
 */
export function calculateHeading(
  prevLng: number,
  prevLat: number,
  currLng: number,
  currLat: number
): number {
  const dLng = currLng - prevLng;
  const dLat = currLat - prevLat;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
  return (angle + 360) % 360;
}

/**
 * Aplica rotación a la moto/vehículo del marcador de repartidor
 */
export function updateRiderMarkerHeading(markerElement: HTMLElement, heading: number) {
  const circle = markerElement.querySelector('.marker-rider__circle') as HTMLElement | null;
  if (circle) {
    circle.style.transform = `rotate(${heading}deg)`;
  }
}
