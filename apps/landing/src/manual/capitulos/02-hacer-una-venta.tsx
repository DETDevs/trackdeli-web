import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';

export const Capitulo02HacerUnaVenta: React.FC = () => {
  return (
    <>
      <header className="chapter" id="vender">
        <div className="eyebrow">
          <span className="chip">Capítulo 02</span>Punto de venta
        </div>
        <h2 className="chap">
          Hacer una <em>venta</em>
        </h2>
        <p className="lede">
          Una venta en efectivo de principio a fin: armar la orden, cobrar y entregar el
          comprobante.
        </p>
      </header>

      <section className="step" id="venta-orden">
        <div className="step-head">
          <div className="step-num">2.1</div>
          <div>
            <h2>Agregá los productos a la orden</h2>
            <p>
              Tocá cada producto, buscalo con <kbd>F2</kbd> o pasá el código por el lector. La orden
              se arma a la derecha.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="vender-01-orden.png"
          alt="Punto de venta con cinco productos marcados y la orden actual con cantidades, totales y botón Cobrar"
          width={1919}
          height={1079}
          pins={[
            { n: 1, x: 16.4, y: 24, w: 8.2, h: 15.6, dir: 'below' },
            { n: 2, x: 90.2, y: 22.1, w: 18.4, h: 6.2, dir: 'left' },
            { n: 3, x: 92.4, y: 28, w: 6.2, h: 3.6, dir: 'below' },
            { n: 4, x: 82.2, y: 29, w: 1.6, h: 2.4, dir: 'left' },
            { n: 5, x: 97.4, y: 7, w: 4, h: 3.4, dir: 'left' },
            { n: 6, x: 90.2, y: 79.9, w: 18.6, h: 8.8, dir: 'left' },
            { n: 7, x: 90.2, y: 91.5, w: 18.6, h: 5, dir: 'left' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Producto agregado',
              texto:
                'Se marca en verde y muestra cuántas unidades lleva la orden. Tocalo otra vez para sumar una más.',
            },
            {
              n: 2,
              titulo: 'Orden actual',
              texto: 'Cada producto con su precio por unidad y el total de la línea.',
            },
            {
              n: 3,
              titulo: 'Cantidad',
              texto: 'Usá − y + o escribí la cantidad. El basurero quita el producto.',
            },
            { n: 4, titulo: 'G', texto: 'El producto está gravado con IVA (15 %).' },
            { n: 5, titulo: 'Vaciar', texto: 'Quita todos los productos de la orden.' },
            {
              n: 6,
              titulo: 'Totales',
              texto: 'Precio, descuento, subtotal antes de IVA e IVA.',
            },
            { n: 7, titulo: 'Cobrar', texto: 'Muestra el total a pagar. Tocalo o presioná F1.' },
          ]}
        />
        <Nota tipo="tip">
          <b>Descuento:</b> en el ejemplo, dos productos tienen un precio de etiqueta mayor que su
          precio de venta. En los totales, “Precio” suma los precios de etiqueta y la diferencia con
          el precio de venta aparece como “Descuento”. El comprobante lo muestra igual, así el
          cliente ve cuánto ahorró.
        </Nota>
      </section>

      <section className="step" id="venta-cobrar">
        <div className="step-head">
          <div className="step-num">2.2</div>
          <div>
            <h2>Cobrá</h2>
            <p>
              Tocá <span className="ui">Cobrar</span> o presioná <kbd>F1</kbd>. Se abre la ventana
              de cobro.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="vender-02-cobrar.png"
          alt="Ventana Cobrar venta con tipo de venta, cliente, vendedor, métodos de pago, monto que entrega el cliente y botón Confirmar cobro"
          width={1284}
          height={1011}
          pins={[
            { n: 1, x: 38.4, y: 18.9, w: 50, h: 5.4, dir: 'left' },
            { n: 2, x: 38.4, y: 31.8, w: 50, h: 17, dir: 'left' },
            { n: 3, x: 38.4, y: 45, w: 50, h: 6, dir: 'left' },
            { n: 4, x: 38.4, y: 61.6, w: 50, h: 15.2, dir: 'left' },
            { n: 5, x: 38.4, y: 77.2, w: 50, h: 13.4, dir: 'left' },
            { n: 6, x: 38.4, y: 89.4, w: 50, h: 5.2, dir: 'left' },
            { n: 7, x: 78.3, y: 27.2, w: 23.2, h: 21.4, dir: 'below' },
            { n: 8, x: 78.3, y: 86.4, w: 23.2, h: 10.2, dir: 'above' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Tipo de venta',
              texto: 'Mostrador o a domicilio, según lo que elegiste en la orden.',
            },
            {
              n: 2,
              titulo: '¿A nombre de quién?',
              texto:
                'Dejá “Cliente general” o buscá un cliente por nombre, cédula o teléfono. “Empleado empresa” es para cargar la venta a la cuenta de un empleado con convenio.',
            },
            {
              n: 3,
              titulo: 'Vendedor / Ruta',
              texto:
                'Opcional. Asigna la venta a un vendedor; si no elegís, queda a nombre del cajero.',
            },
            {
              n: 4,
              titulo: '¿Cómo paga el cliente?',
              texto:
                'Efectivo, tarjeta, transferencia, crédito u otro. Las teclas F1 a F4 eligen el método.',
            },
            {
              n: 5,
              titulo: 'El cliente entrega',
              texto:
                'Escribí con cuánto paga o tocá un monto rápido, y el sistema calcula el vuelto. “Exacto” es el monto justo.',
            },
            {
              n: 6,
              titulo: 'Pagar con más de un método',
              texto: 'Para dividir el pago, por ejemplo una parte en efectivo y otra con tarjeta.',
            },
            {
              n: 7,
              titulo: 'Resumen',
              texto: 'Total a pagar con IVA y su detalle, y cómo se está pagando.',
            },
            {
              n: 8,
              titulo: 'Confirmar cobro',
              texto: 'Registra la venta (F12). “Cancelar” (Esc) vuelve a la orden sin cobrar.',
            },
          ]}
        />
        <div className="prose">
          <p>
            <b>Venta en efectivo con el teclado,</b> sin tocar el mouse:
          </p>
        </div>
        <div className="keys">
          <div>
            <kbd>F1</kbd>Abrir cobro
          </div>
          <div>
            <kbd>F1</kbd>Efectivo
          </div>
          <div>Escribí cuánto entrega</div>
          <div>
            <kbd>F12</kbd>Confirmar cobro
          </div>
        </div>
      </section>

      <section className="step" id="venta-comprobante">
        <div className="step-head">
          <div className="step-num">2.3</div>
          <div>
            <h2>Entregá el comprobante</h2>
            <p>
              Al confirmar, la venta queda registrada y aparece el comprobante. Desde aquí lo
              imprimís, lo mandás por WhatsApp o empezás la siguiente venta.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="vender-03-comprobante.png"
          alt="Comprobante de venta finalizada con el detalle de productos, totales y botones Nueva venta, Carta, WhatsApp y Reimprimir ticket"
          width={563}
          height={993}
          narrow
          maxWidth={440}
          caption="El encabezado del ticket (logo, nombre, dirección, RUC y mensaje final) se configura para cada negocio."
          pins={[
            { n: 1, x: 32.6, y: 32.3, w: 24, h: 2.6, dir: 'left' },
            { n: 2, x: 46.4, y: 61.3, w: 50, h: 8.2, dir: 'left' },
            { n: 3, x: 47.9, y: 84.8, w: 58, h: 4.6, dir: 'right' },
            { n: 4, x: 20.4, y: 93.3, w: 19.4, h: 4.4, dir: 'above' },
            { n: 5, x: 40.5, y: 93.3, w: 14, h: 4.4, dir: 'above' },
            { n: 6, x: 52, y: 93.3, w: 7, h: 4.4, dir: 'above' },
            { n: 7, x: 70.7, y: 93.3, w: 28.6, h: 4.4, dir: 'above' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Número de comprobante',
              texto: 'Identifica la venta. Con este número la encontrás en Historial ventas.',
            },
            {
              n: 2,
              titulo: 'Totales y forma de pago',
              texto: 'El mismo detalle de la pantalla de cobro.',
            },
            {
              n: 3,
              titulo: 'Historial de impresiones',
              texto: 'Cuántas veces se imprimió el comprobante.',
            },
            {
              n: 4,
              titulo: 'Nueva venta',
              texto: 'Cierra el comprobante y deja la orden lista para el siguiente cliente.',
            },
            {
              n: 5,
              titulo: 'Carta',
              texto:
                'El comprobante en hoja carta, para imprimir o guardar en PDF. Lo usan sobre todo las distribuidoras (mirá el capítulo 04).',
            },
            {
              n: 6,
              titulo: 'WhatsApp',
              texto: 'Para enviarle el comprobante al cliente por WhatsApp.',
            },
            {
              n: 7,
              titulo: 'Reimprimir ticket',
              texto: 'Vuelve a imprimir el ticket en la impresora de recibos.',
            },
          ]}
        />
      </section>
    </>
  );
};
