import { PricingModel, PricingZone } from 'api-client';

export interface PricingConfig {
  model?: PricingModel;
  baseRate?: number;
  ratePerKm?: number;
  freeZoneKm?: number;
  minRate?: number;
  maxRate?: number;
  pricingZones?: PricingZone[];
}

export function calculateFeeClient(config: PricingConfig, distanceKm: number): number {
  const model = config.model || 'FIXED';

  if (model === 'FREE') {
    return 0;
  }

  const base = Number(config.baseRate) || 0;

  if (model === 'FIXED') {
    return Number(base.toFixed(2));
  }

  // PER_KM
  const ratePerKm = Number(config.ratePerKm) || 0;
  const freeZoneKm = Number(config.freeZoneKm) || 0;
  const minRate = Number(config.minRate) || 0;
  const maxRate = Number(config.maxRate) || 0;

  const billableDistance = Math.max(0, distanceKm - freeZoneKm);
  let fee = base + billableDistance * ratePerKm;

  if (minRate > 0 && fee < minRate) {
    fee = minRate;
  }

  if (maxRate > 0 && fee > maxRate) {
    fee = maxRate;
  }

  return Number(fee.toFixed(2));
}

export function getPricingBreakdownClient(config: PricingConfig, distanceKm: number): string {
  const model = config.model || 'FIXED';

  if (model === 'FREE') {
    return 'Envío gratis';
  }

  const base = Number(config.baseRate) || 0;

  if (model === 'FIXED') {
    return `Tarifa base C$${base.toFixed(2)}`;
  }

  const ratePerKm = Number(config.ratePerKm) || 0;
  const freeZoneKm = Number(config.freeZoneKm) || 0;
  const billableDistance = Math.max(0, distanceKm - freeZoneKm);

  if (freeZoneKm > 0 && distanceKm <= freeZoneKm) {
    return `C$${base.toFixed(2)} base (dentro de zona gratis de ${freeZoneKm} km)`;
  }

  if (freeZoneKm > 0) {
    return `C$${base.toFixed(2)} base + ${billableDistance.toFixed(1)} km adicionales × C$${ratePerKm.toFixed(2)}`;
  }

  return `C$${base.toFixed(2)} base + ${distanceKm.toFixed(1)} km × C$${ratePerKm.toFixed(2)}`;
}
