import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';
import { RubrosTabs } from '../components/RubrosTabs';

export const Capitulo05TusProductos: React.FC = () => {
  return (
    <>
      <header className="chapter" id="catalogo">
        <div className="eyebrow">
          <span className="chip">Capítulo 05</span>Catálogo
        </div>
        <h2 className="chap">
          Tus <em>productos</em>
        </h2>
        <p className="lede">
          Dónde ver tus productos, cómo crear uno nuevo y qué cambia según tu tipo de negocio.
        </p>
      </header>

      <section className="step" id="catalogo-pantalla">
        <div className="step-head">
          <div className="step-num">5.1</div>
          <div>
            <h2>La pantalla de catálogo</h2>
            <p>
              Entrá a <span className="ui">Catálogo</span> en el menú. Ahí está la lista de todos
              tus productos.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="catalogo-01-lista.png"
          alt="Catálogo de productos con botones Importar, Exportar y Nuevo producto, accesos a categorías, proveedores y conteo físico, buscador, filtros y la lista de productos"
          width={1285}
          height={720}
          caption="Ejemplo de una pulpería."
          pins={[
            { n: 1, x: 75.3, y: 5.3, w: 15.6, h: 5.8, dir: 'below' },
            { n: 2, x: 90.4, y: 5.3, w: 14.4, h: 5.8, dir: 'below' },
            { n: 3, x: 17.7, y: 14.9, w: 32.8, h: 5.8, dir: 'right' },
            { n: 4, x: 49.5, y: 28.5, w: 93.8, h: 11.6, dir: 'below' },
            { n: 5, x: 92.1, y: 47.6, w: 8.4, h: 4.8, dir: 'left' },
            { n: 6, x: 41.6, y: 61.7, w: 80.4, h: 10.4, dir: 'below' },
            { n: 7, x: 91.2, y: 61.7, w: 10, h: 4.8, dir: 'below' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Importar y Exportar',
              texto:
                'Importar sube muchos productos desde Excel (capítulo 06). Exportar descarga tu catálogo en un archivo.',
            },
            {
              n: 2,
              titulo: 'Nuevo producto',
              texto: 'Abre el formulario para crear un producto. Atajo: F3.',
            },
            {
              n: 3,
              titulo: 'Categorías, proveedores y conteo físico',
              texto:
                'Administrá tus categorías y proveedores, y contá el inventario real de la tienda.',
            },
            {
              n: 4,
              titulo: 'Buscador y filtros',
              texto:
                'Buscá por nombre, código de barras o SKU (F2). Filtrá por categoría, tipo, stock, estado e IVA.',
            },
            { n: 5, titulo: 'Columnas', texto: 'Elegí qué columnas ver en la lista.' },
            {
              n: 6,
              titulo: 'Producto',
              texto: 'Nombre, descripción, SKU, categoría, precio, costo y stock.',
            },
            {
              n: 7,
              titulo: 'Acciones',
              texto: 'Ajustar stock, ver el historial de movimientos, editar y eliminar.',
            },
          ]}
        />
      </section>

      <section className="step" id="catalogo-nuevo">
        <div className="step-head">
          <div className="step-num">5.2</div>
          <div>
            <h2>Creá un producto</h2>
            <p>
              Tocá <span className="ui">Nuevo Producto</span> o presioná <kbd>F3</kbd>. Los campos
              con <span className="req">*</span> son obligatorios.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="catalogo-02-nuevo-producto-1.png"
          alt="Formulario Nuevo producto: tipo, nombre, categoría, código de barras, SKU, unidad de medida, detalles del rubro y precio"
          width={873}
          height={1024}
          caption="Primera parte del formulario."
          pins={[
            { n: 1, x: 27.3, y: 17.3, w: 35, h: 4.8, dir: 'right' },
            { n: 2, x: 50.9, y: 28.5, w: 82, h: 4.4, dir: 'left' },
            { n: 3, x: 29.9, y: 35.4, w: 40.2, h: 6.8, dir: 'left' },
            { n: 4, x: 71.7, y: 35.4, w: 40.4, h: 6.8, dir: 'right' },
            { n: 5, x: 29.9, y: 45, w: 40.2, h: 6.4, dir: 'left' },
            { n: 6, x: 71.7, y: 45.8, w: 40.4, h: 7, dir: 'right' },
            { n: 7, x: 50.9, y: 63.1, w: 82, h: 18.4, dir: 'left' },
            { n: 8, x: 50.9, y: 81.4, w: 82, h: 9.8, dir: 'left' },
            { n: 9, x: 63.6, y: 93.5, w: 58, h: 4.8, dir: 'above' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Tipo',
              texto:
                '“Producto” se compra, se vende y lleva inventario. “Servicio / Combo” es para servicios, platos o combos.',
            },
            {
              n: 2,
              titulo: 'Nombre',
              texto: 'Obligatorio. Escribilo como lo buscás al vender.',
            },
            {
              n: 3,
              titulo: 'Categoría',
              texto:
                'Si no elegís ninguna, se guarda en “Otros”. Con “+ Nueva” creás una sin salir del formulario.',
            },
            {
              n: 4,
              titulo: 'Código de barras',
              texto: 'Opcional. Pasalo con la pistola USB o tocá “Escanear” para usar la cámara.',
            },
            {
              n: 5,
              titulo: 'SKU / Código interno',
              texto: 'Se llena solo; podés cambiarlo. “Auto” genera otro.',
            },
            {
              n: 6,
              titulo: 'Unidad de medida',
              texto: 'Unidades, libras, kilos, litros o galones, según cómo vendés el producto.',
            },
            {
              n: 7,
              titulo: 'Detalles del rubro',
              texto: 'Campos propios de tu tipo de negocio. Mirá “Según tu negocio”, más abajo.',
            },
            {
              n: 8,
              titulo: 'Precio',
              texto:
                'Escribí el costo y el margen, y el sistema calcula el precio de venta. También podés escribir el precio directo.',
            },
            {
              n: 9,
              titulo: 'Guardar',
              texto:
                '“Crear producto” (F12) guarda y cierra. “Crear y agregar otro” guarda y deja el formulario listo para el siguiente.',
            },
          ]}
        />
        <CapturaAnotada
          src="catalogo-03-nuevo-producto-2.png"
          alt="Segunda parte del formulario: IVA, control de inventario, stock actual, mínimo y máximo, proveedor y producto activo"
          width={1053}
          height={1026}
          caption="Bajá en el formulario para ver el IVA y el inventario."
          pins={[
            { n: 1, x: 49.4, y: 45.4, w: 68.2, h: 6.8, dir: 'left' },
            { n: 2, x: 49.4, y: 59.6, w: 68.2, h: 6.8, dir: 'left' },
            { n: 3, x: 49.4, y: 67.7, w: 68.2, h: 6, dir: 'left' },
            { n: 4, x: 49.4, y: 75.5, w: 68.2, h: 6, dir: 'left' },
            { n: 5, x: 49.4, y: 83.6, w: 68.2, h: 6.6, dir: 'left' },
            { n: 6, x: 75.1, y: 92.7, w: 17.8, h: 4.2, dir: 'above' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Aplica IVA (15 %)',
              texto:
                'Marcalo si el producto está gravado. El 15 % se suma al precio de venta al cobrar.',
            },
            {
              n: 2,
              titulo: 'Controlar inventario',
              texto:
                'El stock baja solo con cada venta. Desmarcalo para productos sin stock, como platos preparados.',
            },
            {
              n: 3,
              titulo: 'Stock actual, mínimo y máximo',
              texto:
                'Con cuántas unidades empezás. Cuando el stock llega al mínimo, el producto se marca como “Bajo”.',
            },
            {
              n: 4,
              titulo: 'Proveedor',
              texto: 'A quién se lo comprás. Si no existe, lo creás escribiendo su nombre.',
            },
            {
              n: 5,
              titulo: 'Producto activo',
              texto: 'Si lo desactivás, no aparece al cobrar, pero no se borra.',
            },
            {
              n: 6,
              titulo: 'Crear producto',
              texto: 'Guarda el producto. Atajo: F12.',
            },
          ]}
        />
        <Nota tipo="tip">
          Para cargar muchos productos de una vez, usá{' '}
          <a href="#importar">Importar desde Excel</a>.
        </Nota>
      </section>

      <section className="step" id="catalogo-rubro">
        <div className="step-head">
          <div className="step-num">5.3</div>
          <div>
            <h2>Según tu negocio</h2>
            <p>El formulario y la lista cambian según el tipo de negocio. Elegí el tuyo.</p>
          </div>
        </div>
        <RubrosTabs />
      </section>
    </>
  );
};
