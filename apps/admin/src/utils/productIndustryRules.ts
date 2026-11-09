/**
 * Reglas de campos obligatorios de producto por rubro de negocio.
 * Sincronizado con el backend y el cliente desktop (tickets 233a y 251d).
 */

export interface RequiredFieldRule {
  key: string;
  aliases?: string[];
  label: string;
  source: 'core' | 'attributes';
  type: 'text' | 'number_gt_zero' | 'number_gte_zero' | 'supplier';
  errorMessage: string;
}

export const REQUIRED_PRODUCT_FIELDS_BY_INDUSTRY: Record<string, RequiredFieldRule[]> = {
  farmacia: [
    {
      key: 'name',
      label: 'Nombre del producto',
      source: 'core',
      type: 'text',
      errorMessage: 'El nombre del producto es obligatorio.',
    },
    {
      key: 'laboratorio',
      aliases: ['laboratory'],
      label: 'Laboratorio',
      source: 'attributes',
      type: 'text',
      errorMessage: 'El laboratorio es obligatorio.',
    },
    {
      key: 'presentacion',
      aliases: ['presentation'],
      label: 'Presentación',
      source: 'attributes',
      type: 'text',
      errorMessage: 'La presentación es obligatoria.',
    },
    {
      key: 'principio_activo',
      aliases: ['activeIngredient', 'active_ingredient'],
      label: 'Principio activo',
      source: 'attributes',
      type: 'text',
      errorMessage: 'El principio activo es obligatorio.',
    },
    {
      key: 'listPrice',
      aliases: ['list_price'],
      label: 'Precio de etiqueta',
      source: 'core',
      type: 'number_gt_zero',
      errorMessage: 'El precio de etiqueta debe ser mayor a 0.',
    },
    {
      key: 'cost',
      label: 'Costo',
      source: 'core',
      type: 'number_gt_zero',
      errorMessage: 'El costo debe ser mayor a 0.',
    },
    {
      key: 'price',
      label: 'Precio de venta',
      source: 'core',
      type: 'number_gt_zero',
      errorMessage: 'El precio de venta debe ser mayor a 0.',
    },
    {
      key: 'stock',
      aliases: ['currentStock'],
      label: 'Stock actual',
      source: 'core',
      type: 'number_gte_zero',
      errorMessage: 'El stock actual es obligatorio (puede ser 0).',
    },
    {
      key: 'minStock',
      aliases: ['min_stock'],
      label: 'Stock mínimo',
      source: 'core',
      type: 'number_gte_zero',
      errorMessage: 'El stock mínimo es obligatorio.',
    },
    {
      key: 'supplierId',
      aliases: ['supplier_id'],
      label: 'Proveedor',
      source: 'core',
      type: 'supplier',
      errorMessage: 'Debés seleccionar un proveedor.',
    },
  ],
};

/**
 * Determina si el contexto actual corresponde al rubro farmacia
 */
export function isPharmacyIndustry(
  business?: {
    industry?: { code?: string };
    industryCode?: string;
  } | null,
  productFields?: { key?: string; isActive?: boolean }[] | null,
): boolean {
  if (business?.industry?.code?.toLowerCase() === 'farmacia') return true;
  if (business?.industryCode?.toLowerCase() === 'farmacia') return true;

  if (
    productFields &&
    productFields.some(
      (f) =>
        f.isActive !== false &&
        ['laboratorio', 'principio_activo', 'presentacion'].includes(f.key?.toLowerCase() || ''),
    )
  ) {
    return true;
  }
  return false;
}

export interface ValidationValues {
  name?: string;
  laboratorio?: string;
  presentacion?: string;
  principio_activo?: string;
  listPrice?: string | number | null;
  cost?: string | number | null;
  price?: string | number | null;
  stock?: string | number | null;
  minStock?: string | number | null;
  supplierId?: string | null;
  attributes?: Record<string, any>;
  [key: string]: any;
}

/**
 * Valida un producto según las reglas de su rubro.
 * Retorna errores indexados por campo.
 */
export function validateProductForIndustry(
  industry: string,
  productType: string,
  values: ValidationValues,
): { isValid: boolean; errors: Record<string, string>; firstErrorKey?: string } {
  const normIndustry = (industry || '').trim().toLowerCase();
  const rules = REQUIRED_PRODUCT_FIELDS_BY_INDUSTRY[normIndustry];
  if (!rules || rules.length === 0) {
    return { isValid: true, errors: {} };
  }

  // Servicio no aplica obligatorios de farmacia
  const normType = (productType || 'PRODUCT').trim().toUpperCase();
  if (normType !== 'PRODUCT' && normType !== 'PRODUCTO') {
    return { isValid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  let firstErrorKey: string | undefined;

  for (const rule of rules) {
    let val: any = undefined;

    // Buscar en attributes o en la raíz
    if (rule.source === 'attributes') {
      val = values.attributes?.[rule.key];
      if (val === undefined && rule.aliases) {
        for (const alias of rule.aliases) {
          if (values.attributes?.[alias] !== undefined) {
            val = values.attributes[alias];
            break;
          }
        }
      }
      if (val === undefined) {
        val = values[rule.key];
      }
      if (val === undefined && rule.aliases) {
        for (const alias of rule.aliases) {
          if (values[alias] !== undefined) {
            val = values[alias];
            break;
          }
        }
      }
    } else {
      val = values[rule.key];
      if (val === undefined && rule.aliases) {
        for (const alias of rule.aliases) {
          if (values[alias] !== undefined) {
            val = values[alias];
            break;
          }
        }
      }
    }

    let isValid = false;
    switch (rule.type) {
      case 'text':
        if (typeof val === 'string') isValid = val.trim().length > 0;
        else if (val && typeof val === 'object') isValid = Boolean(val.label || val.name || val.id);
        break;

      case 'number_gt_zero': {
        if (val !== undefined && val !== null && val !== '') {
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          isValid = !isNaN(num) && num > 0;
        }
        break;
      }

      case 'number_gte_zero': {
        if (val !== undefined && val !== null && val !== '') {
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          isValid = !isNaN(num) && num >= 0;
        }
        break;
      }

      case 'supplier': {
        if (val !== undefined && val !== null) {
          isValid = String(val).trim().length > 0;
        }
        break;
      }

      default:
        isValid = true;
    }

    if (!isValid) {
      errors[rule.key] = rule.errorMessage;
      if (!firstErrorKey) {
        firstErrorKey = rule.key;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorKey,
  };
}

