export interface GridOccupiedItem {
  id?: string;
  zoneId?: string | null;
  gridX?: number | null;
  gridY?: number | null;
  number?: string;
}

/**
 * Encuentra la siguiente celda libre (gridX, gridY) dentro de la grilla de una zona.
 * Si toda la grilla configurada está ocupada, devuelve null.
 */
export function findNextFreeGridPosition(
  tablesInZone: GridOccupiedItem[],
  gridColumns: number = 10,
  gridRows: number = 10,
  excludeTableId?: string,
): { gridX: number; gridY: number } | null {
  const cols = Math.max(1, Number(gridColumns) || 10);
  const rows = Math.max(1, Number(gridRows) || 10);

  const occupied = new Set<string>();
  for (const table of tablesInZone) {
    if (excludeTableId && table.id === excludeTableId) continue;
    if (table.gridX !== null && table.gridX !== undefined && table.gridY !== null && table.gridY !== undefined) {
      occupied.add(`${table.gridX}:${table.gridY}`);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x}:${y}`)) {
        return { gridX: x, gridY: y };
      }
    }
  }

  return null;
}

/**
 * Genera identificadores correlativos únicos para mesas dentro del negocio.
 */
export function generateNextTableNumbers(
  existingTables: Array<{ number: string }>,
  count: number,
  preferredStart?: string,
): string[] {
  const used = new Set(
    existingTables.map((t) => String(t.number || '').trim().toLowerCase()).filter(Boolean),
  );

  const trimmedStart = String(preferredStart || '').trim();
  let nextNum = 1;

  if (trimmedStart && /^\d+$/.test(trimmedStart)) {
    nextNum = Math.max(1, parseInt(trimmedStart, 10));
  } else if (!trimmedStart) {
    let maxNumeric = 0;
    for (const t of existingTables) {
      const m = String(t.number || '').trim().match(/^(\d+)$/);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > maxNumeric) maxNumeric = val;
      }
    }
    nextNum = maxNumeric + 1;
  }

  const results: string[] = [];
  if (trimmedStart && !/^\d+$/.test(trimmedStart)) {
    // Si el usuario ingresó un prefijo alfanumérico (ej. "VIP"), generar "VIP 1", "VIP 2" o usar exacto si count === 1
    if (count === 1 && !used.has(trimmedStart.toLowerCase())) {
      return [trimmedStart];
    }
    let idx = 1;
    while (results.length < count) {
      const candidate = count === 1 && idx === 1 ? trimmedStart : `${trimmedStart} ${idx}`;
      if (!used.has(candidate.toLowerCase())) {
        used.add(candidate.toLowerCase());
        results.push(candidate);
      }
      idx++;
    }
    return results;
  }

  while (results.length < count) {
    const candidate = String(nextNum);
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      results.push(candidate);
    }
    nextNum++;
  }

  return results;
}
