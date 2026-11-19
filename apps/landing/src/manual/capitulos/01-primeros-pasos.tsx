import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';

export const Capitulo01PrimerosPasos: React.FC = () => {
  return (
    <>
      <header className="chapter" id="primeros-pasos">
        <div className="eyebrow">
          <span className="chip">Capítulo 01</span>Inicio
        </div>
        <h2 className="chap">
          Primeros <em>pasos</em>
        </h2>
        <p className="lede">
          Cómo entrar al sistema y qué es cada parte de la pantalla de venta.
        </p>
      </header>

      <section className="step" id="entrar">
        <div className="step-head">
          <div className="step-num">1.1</div>
          <div>
            <h2>Entrá al sistema</h2>
            <p>
              Abrí NEXOL POS en la computadora. Escribí tu correo y tu contraseña, y tocá{' '}
              <span className="ui">Ingresar al Sistema POS</span>.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="inicio-01-login.png"
          alt="Pantalla de inicio de sesión de NEXOL POS con correo, contraseña y botón para ingresar"
          width={550}
          height={510}
          narrow
          pins={[
            { n: 1, x: 49.6, y: 44.7, w: 71, h: 8.6, dir: 'left' },
            { n: 2, x: 49.6, y: 59.6, w: 71, h: 8.6, dir: 'left' },
            { n: 3, x: 49.6, y: 70, w: 71, h: 8, dir: 'left' },
            { n: 4, x: 49.6, y: 84.9, w: 35, h: 9, dir: 'left' },
          ]}
          leyenda={[
            { n: 1, titulo: 'Correo electrónico', texto: 'El correo de tu usuario.' },
            { n: 2, titulo: 'Contraseña', texto: 'La que te dio el encargado.' },
            { n: 3, titulo: 'Ingresar al Sistema POS', texto: 'Entra al punto de venta.' },
            {
              n: 4,
              titulo: 'Conexión y versión',
              texto:
                'Indica que está conectado al servidor y qué versión tenés. Si llamás a soporte, decí la versión.',
            },
          ]}
        />
        <Nota tipo="tip">
          Cada persona entra con su propio usuario. Así las ventas y los cierres de caja quedan a
          nombre de quien los hizo. Los usuarios los crea el encargado del negocio.
        </Nota>
      </section>

      <section className="step" id="pantalla">
        <div className="step-head">
          <div className="step-num">1.2</div>
          <div>
            <h2>Conocé la pantalla principal</h2>
            <p>
              Al entrar se abre el <span className="ui">Punto de Venta</span>. Arriba está la
              información del negocio y del turno; abajo, todo lo que usás para vender.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="inicio-03-barra-superior.png"
          alt="Barra superior del punto de venta: negocio, estado de la caja, conexión, notificaciones, usuario y aviso de membresía"
          width={1919}
          height={260}
          caption="La barra de arriba."
          pins={[
            { n: 1, x: 4.95, y: 9.2, w: 8.6, h: 14.5, dir: 'below' },
            { n: 2, x: 20.2, y: 9.2, w: 6, h: 11.5, dir: 'below' },
            { n: 3, x: 81.8, y: 9.2, w: 3.8, h: 11.5, dir: 'below' },
            { n: 4, x: 86, y: 9.2, w: 3.4, h: 14, dir: 'below' },
            { n: 5, x: 91.6, y: 9.2, w: 5.6, h: 16, dir: 'below' },
            { n: 6, x: 50, y: 26.2, w: 98.5, h: 15, dir: 'below' },
          ]}
          leyenda={[
            { n: 1, titulo: 'Negocio', texto: 'El negocio en el que estás trabajando.' },
            {
              n: 2,
              titulo: 'Estado de la caja',
              texto: '“Caja abierta” o “Caja cerrada”. Para vender, la caja tiene que estar abierta.',
            },
            {
              n: 3,
              titulo: 'En línea',
              texto: 'Indica si la computadora está conectada a internet.',
            },
            {
              n: 4,
              titulo: 'Notificaciones',
              texto: 'Avisos del sistema; el número dice cuántos tenés sin ver.',
            },
            {
              n: 5,
              titulo: 'Usuario y rol',
              texto: 'Quién está usando el sistema y su rol (por ejemplo, Encargado).',
            },
            {
              n: 6,
              titulo: 'Aviso de membresía',
              texto:
                'Cuántos días faltan para renovar. “Ver detalle” muestra el pago y “Ocultar por hoy” lo esconde hasta mañana.',
            },
          ]}
        />
        <CapturaAnotada
          src="inicio-02-punto-de-venta.png"
          alt="Punto de venta con menú lateral, buscador, productos y panel de la orden actual"
          width={1919}
          height={1079}
          caption="Lo que usás para vender."
          pins={[
            { n: 1, x: 5.8, y: 29.7, w: 11.2, h: 40.8, dir: 'right' },
            { n: 2, x: 34.7, y: 11.4, w: 44.6, h: 3.6, dir: 'below' },
            { n: 3, x: 59.7, y: 11.4, w: 4.8, h: 3.6, dir: 'below' },
            { n: 4, x: 67.9, y: 11.4, w: 11, h: 3.8, dir: 'below' },
            { n: 5, x: 76.7, y: 11.4, w: 5.6, h: 3.2, dir: 'below' },
            { n: 6, x: 41.2, y: 27.8, w: 7, h: 15, dir: 'right' },
            { n: 7, x: 90.2, y: 17.6, w: 18.6, h: 6.8, dir: 'left' },
            { n: 8, x: 90.2, y: 87.9, w: 18.6, h: 11.8, dir: 'left' },
            { n: 9, x: 90.2, y: 96.6, w: 18.6, h: 3.8, dir: 'left' },
            { n: 10, x: 5.8, y: 95.4, w: 11.2, h: 8.2, dir: 'right' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Menú',
              texto:
                'Todos los módulos: caja, catálogo, compras, historial, proformas, finanzas, clientes, reportes y configuración.',
            },
            {
              n: 2,
              titulo: 'Buscador',
              texto: 'Buscá por nombre, código o SKU. Debajo están las categorías para filtrar.',
            },
            { n: 3, titulo: 'Atajos', texto: 'Lista de teclas rápidas.' },
            {
              n: 4,
              titulo: 'Tickets por cobrar',
              texto: 'Pedidos que quedaron listos para cobrar en caja.',
            },
            {
              n: 5,
              titulo: 'Lector listo',
              texto: 'El sistema está listo para recibir códigos del lector de barras.',
            },
            {
              n: 6,
              titulo: 'Producto',
              texto: 'Precio, stock y etiquetas. Tocá el producto o el “+” para agregarlo a la orden.',
            },
            {
              n: 7,
              titulo: 'Tipo de pedido y cliente',
              texto: 'Mostrador o a domicilio. El cliente se elige al cobrar.',
            },
            {
              n: 8,
              titulo: 'Total y Cobrar',
              texto: 'El total de la orden y el botón para cobrar.',
            },
            {
              n: 9,
              titulo: 'Guardar como proforma',
              texto: 'Guarda la orden como cotización sin cobrarla.',
            },
            {
              n: 10,
              titulo: 'Colapsar y Cerrar sesión',
              texto: 'Achica el menú o sale del sistema.',
            },
          ]}
        />

        <div className="prose">
          <p>
            <b>Las etiquetas de los productos</b> te avisan algo antes de venderlo:
          </p>
        </div>
        <div className="tags">
          <div className="tagcard">
            <span className="pt lotes">Lotes</span>
            <span>El producto se controla por lote y fecha de vencimiento.</span>
          </div>
          <div className="tagcard">
            <span className="pt receta">Receta</span>
            <span>Se vende con receta médica.</span>
          </div>
          <div className="tagcard">
            <span className="pt mayor">Mayor ≥ 6</span>
            <span>Tiene precio por mayor desde esa cantidad.</span>
          </div>
          <div className="tagcard">
            <span className="pt bajo">Stock: 6 UND (Bajo)</span>
            <span>Quedan pocas unidades.</span>
          </div>
        </div>
        <figcaption>
          Las etiquetas que ves dependen del tipo de negocio y de cómo está configurado cada
          producto. El ejemplo es de una farmacia.
        </figcaption>

        <div className="prose">
          <p>
            <b>Teclas rápidas</b> para vender sin soltar el teclado. Todas las ves en{' '}
            <span className="ui">Atajos</span>.
          </p>
        </div>
        <div className="keys">
          <div>
            <kbd>F2</kbd>Buscar producto
          </div>
          <div>
            <kbd>F1</kbd>Cobrar
          </div>
          <div>
            <kbd>F7</kbd>Tickets por cobrar
          </div>
        </div>
      </section>
    </>
  );
};
