import React, { useEffect, useRef, useState } from 'react';
import { CapturaAnotada } from './CapturaAnotada';

type RubroId = 'rubro-farmacia' | 'rubro-restaurante' | 'rubro-pulperia';

const RUBRO_TABS: { tabId: string; panelId: RubroId; label: string }[] = [
  { tabId: 'tab-farmacia', panelId: 'rubro-farmacia', label: 'Farmacia' },
  { tabId: 'tab-restaurante', panelId: 'rubro-restaurante', label: 'Restaurante y cafetería' },
  { tabId: 'tab-pulperia', panelId: 'rubro-pulperia', label: 'Pulpería y tienda' },
];

const RUBRO_PANEL_IDS = new Set<string>(RUBRO_TABS.map((t) => t.panelId));

export const RubrosTabs: React.FC = () => {
  const [activeId, setActiveId] = useState<RubroId>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.slice(1);
      if (h.startsWith('rubro-') && RUBRO_PANEL_IDS.has(h)) {
        return h as RubroId;
      }
    }
    return 'rubro-farmacia';
  });

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const syncFromHash = () => {
      const h = window.location.hash.slice(1);
      if (h.startsWith('rubro-') && RUBRO_PANEL_IDS.has(h)) {
        setActiveId(h as RubroId);
        document.getElementById('catalogo-rubro')?.scrollIntoView();
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIdx =
      (idx + (e.key === 'ArrowRight' ? 1 : RUBRO_TABS.length - 1)) % RUBRO_TABS.length;
    const nextTab = RUBRO_TABS[nextIdx];
    tabRefs.current[nextIdx]?.focus();
    setActiveId(nextTab.panelId);
  };

  return (
    <div className="rubros">
      <div className="tabs" role="tablist" aria-label="Tipo de negocio">
        {RUBRO_TABS.map((tab, idx) => {
          const isSelected = activeId === tab.panelId;
          return (
            <button
              key={tab.tabId}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              type="button"
              className="tab"
              role="tab"
              id={tab.tabId}
              aria-controls={tab.panelId}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveId(tab.panelId)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="tabpanel"
        id="rubro-farmacia"
        role="tabpanel"
        aria-labelledby="tab-farmacia"
        hidden={activeId !== 'rubro-farmacia'}
      >
        <CapturaAnotada
          src="catalogo-farmacia-lista.png"
          alt="Catálogo de una farmacia con el botón Lotes y vencimientos, filtros por vencimiento, laboratorio y presentación, y la columna Vence"
          width={1240}
          height={430}
          pins={[
            { n: 1, x: 41.5, y: 6.5, w: 14, h: 8.6, dir: 'right' },
            { n: 2, x: 66.2, y: 34.2, w: 56.4, h: 9.4, dir: 'below' },
            { n: 3, x: 79.9, y: 86.5, w: 11.2, h: 20.4, dir: 'left' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Lotes y vencimientos',
              texto: 'Todos los lotes con su fecha de vencimiento, para ver qué vence pronto.',
            },
            {
              n: 2,
              titulo: 'Filtros de farmacia',
              texto: 'Por vencimiento, laboratorio y presentación.',
            },
            {
              n: 3,
              titulo: 'Vence',
              texto:
                'Fecha del lote más próximo a vencer, cuántos días faltan y el número de lote.',
            },
          ]}
        />
        <div className="duo">
          <CapturaAnotada
            src="catalogo-farmacia-rubro.png"
            alt="Detalles del rubro de farmacia: laboratorio, presentación, principio activo, requiere receta y precio de etiqueta"
            width={768}
            height={370}
          />
          <ul className="points">
            <li>
              <b>Laboratorio, presentación y principio activo</b>
              <span>
                Son obligatorios. Ayudan a buscar y filtrar, por ejemplo todos los productos de un
                laboratorio.
              </span>
            </li>
            <li>
              <b>Requiere receta</b>
              <span>
                Marcá “Venta libre” si no hace falta receta. Los que la piden muestran la etiqueta
                “Receta” al vender.
              </span>
            </li>
            <li>
              <b>Precio de etiqueta</b>
              <span>
                El precio sugerido por el laboratorio. Si vendés más barato, la diferencia aparece
                como descuento en la orden y en el comprobante.
              </span>
            </li>
          </ul>
        </div>
        <div className="duo">
          <CapturaAnotada
            src="catalogo-farmacia-inventario.png"
            alt="Inventario de farmacia: precio por mayor, control de inventario, proveedor obligatorio y control de lotes y vencimiento FEFO"
            width={767}
            height={595}
          />
          <ul className="points">
            <li>
              <b>Proveedor</b>
              <span>En farmacia es obligatorio.</span>
            </li>
            <li>
              <b>Controla lotes y vencimiento (FEFO)</b>
              <span>
                Al registrar una compra pide el lote y la fecha de vencimiento. Al vender, el
                sistema descuenta primero el lote que vence antes.
              </span>
            </li>
            <li>
              <b>Agregar precio por mayor</b>
              <span>
                Un precio más bajo desde cierta cantidad. En el punto de venta aparece como “Mayor ≥
                6”, por ejemplo.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div
        className="tabpanel"
        id="rubro-restaurante"
        role="tabpanel"
        aria-labelledby="tab-restaurante"
        hidden={activeId !== 'rubro-restaurante'}
      >
        <CapturaAnotada
          src="catalogo-restaurante-lista.png"
          alt="Lista de una cafetería con combos marcados Sin costo y stock Sin límite"
          width={1235}
          height={165}
          pins={[
            { n: 1, x: 12.3, y: 44.2, w: 6.6, h: 17, dir: 'right' },
            { n: 2, x: 80.1, y: 49, w: 5.8, h: 15, dir: 'left' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Sin costo',
              texto: 'El producto no tiene costo cargado, así que no se calcula su ganancia.',
            },
            {
              n: 2,
              titulo: 'Sin límite',
              texto: 'No lleva inventario: se puede vender siempre. Es lo normal en platos y combos.',
            },
          ]}
        />
        <div className="duo">
          <CapturaAnotada
            src="catalogo-restaurante-cocina.png"
            alt="Formulario de un restaurante: controlar inventario desmarcado, proveedor opcional y la opción Se prepara en cocina"
            width={767}
            height={400}
          />
          <ul className="points">
            <li>
              <b>Platos y combos</b>
              <span>Desmarcá “Controlar inventario”. Quedan como “Sin límite” y no descuentan stock.</span>
            </li>
            <li>
              <b>Bebidas embotelladas y abarrotes</b>
              <span>Dejá “Controlar inventario” marcado para que el stock baje con cada venta.</span>
            </li>
            <li>
              <b>Se prepara en cocina</b>
              <span>
                Cuando se pide en el Salón, el producto sale en la comanda de cocina. Desmarcalo para
                lo que no pasa por cocina, como una gaseosa.
              </span>
            </li>
            <li>
              <b>Costo y proveedor</b>
              <span>
                Son opcionales en restaurantes. Sin costo, el sistema no calcula la ganancia de ese
                producto.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div
        className="tabpanel"
        id="rubro-pulperia"
        role="tabpanel"
        aria-labelledby="tab-pulperia"
        hidden={activeId !== 'rubro-pulperia'}
      >
        <CapturaAnotada
          src="catalogo-pulperia-lista.png"
          alt="Lista de una pulpería con arroz vendido por libra y stock en LB"
          width={1224}
          height={220}
          pins={[{ n: 1, x: 81, y: 17.7, w: 6, h: 15, dir: 'left' }]}
          leyenda={[
            {
              n: 1,
              titulo: 'Stock por libra',
              texto: 'El arroz se vende por libra, así que su stock se cuenta en LB.',
            },
          ]}
        />
        <div className="duo">
          <CapturaAnotada
            src="catalogo-pulperia-rubro.png"
            alt="Formulario de una pulpería: unidad de medida y detalles del rubro con marca, contenido y unidad"
            width={767}
            height={325}
          />
          <ul className="points">
            <li>
              <b>Unidad de medida</b>
              <span>
                Con UND, el stock y la venta son enteros. Para vender a granel elegí libra, kilo,
                litro o galón.
              </span>
            </li>
            <li>
              <b>Marca, contenido y unidad</b>
              <span>
                Opcionales. Sirven para distinguir presentaciones, como “Aceite vegetal 1/4 de galón”
                y “botella 900 ml”.
              </span>
            </li>
            <li>
              <b>Stock máximo</b>
              <span>Opcional. Te ayuda a no comprar de más.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
