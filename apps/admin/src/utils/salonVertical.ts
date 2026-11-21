export interface SalonBusinessShape {
  posVertical?: string | null;
  salonProfile?: string | null;
  industryCode?: string | null;
  industry?: { code?: string | null } | null;
}

/**
 * Determina si el negocio corresponde a un salón de restaurante (posVertical === 'RESTAURANTE' y no taller).
 */
export function isRestaurantSalonBusiness(
  business?: SalonBusinessShape | null,
  fallbackUserBusiness?: SalonBusinessShape | null,
): boolean {
  const posVertical = String(
    business?.posVertical ?? fallbackUserBusiness?.posVertical ?? '',
  )
    .trim()
    .toUpperCase();
  const salonProfile = String(
    business?.salonProfile ?? fallbackUserBusiness?.salonProfile ?? '',
  )
    .trim()
    .toUpperCase();
  const industryCode = String(
    business?.industry?.code ??
      business?.industryCode ??
      fallbackUserBusiness?.industry?.code ??
      fallbackUserBusiness?.industryCode ??
      '',
  )
    .trim()
    .toLowerCase();

  const isTaller = salonProfile === 'TALLER' || industryCode === 'taller';
  return posVertical === 'RESTAURANTE' && !isTaller;
}
