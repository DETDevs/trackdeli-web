import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';

export const Capitulo04HistorialDeVentas: React.FC = () => {
  return (
    <>
      <header className="chapter" id="historial">
        <div className="eyebrow">
          <span className="chip">Capítulo 04</span>Historial ventas
        </div>
        <h2 className="chap">
          Historial de <em>ventas</em>
        </h2>
        <p className="lede">
          Encontrá cualquier venta, volvé a enviar su comprobante y hacé devoluciones o anulaciones.
        </p>
      </header>

      <section className="step" id="historial-lista">
        <div className="step-head">
          <div className="step-num">4.1</div>
          <div>
            <h2>Buscá una venta</h2>
            <p>
              Entrá a <span className="ui">Historial Ventas</span> en el menú. Están todas las
              ventas del negocio, de la más nueva a la más vieja.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="historial-01-ventas.png"
          alt="Historial de ventas y devoluciones con totales del período, buscador, filtros y la lista de comprobantes con sus acciones"
          width={1405}
          height={988}
          pins={[
            { n: 1, x: 55.6, y: 3.8, w: 14, h: 4.2, dir: 'below' },
            { n: 2, x: 17.2, y: 14.6, w: 21.4, h: 12, dir: 'right' },
            { n: 3, x: 50.2, y: 26.3, w: 85, h: 4.6, dir: 'below' },
            { n: 4, x: 40.6, y: 39.6, w: 66, h: 5, dir: 'below' },
            { n: 5, x: 86.6, y: 39.6, w: 13, h: 5, dir: 'below' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Ventas o devoluciones',
              texto: 'Cambia entre la lista de ventas y la de devoluciones.',
            },
            {
              n: 2,
              titulo: 'Resumen del período',
              texto: 'Total vendido; a la derecha, ticket promedio, ventas anuladas y devoluciones.',
            },
            {
              n: 3,
              titulo: 'Buscador y filtros',
              texto:
                'Buscá por número de comprobante o cliente. Filtrá por fecha (hoy, 7 días, este mes o un rango), estado, forma de pago y vendedor.',
            },
            {
              n: 4,
              titulo: 'Venta',
              texto: 'Número, fecha, cliente, forma de pago, cantidad de artículos, total y estado.',
            },
            {
              n: 5,
              titulo: 'Acciones',
              texto:
                'Ver el detalle, comprobante en hoja carta, reimprimir el ticket, compartir, devolver y anular.',
            },
          ]}
        />
      </section>

      <section className="step" id="historial-compartir">
        <div className="step-head">
          <div className="step-num">4.2</div>
          <div>
            <h2>Enviá el comprobante por WhatsApp</h2>
            <p>
              Desde la venta, tocá el ícono de compartir. También aparece en el comprobante al
              terminar de cobrar.
            </p>
          </div>
        </div>
        <div className="duo">
          <CapturaAnotada
            src="historial-02-whatsapp.png"
            alt="Ventana Compartir comprobante con número de WhatsApp, vista previa del mensaje con enlace y botones Copiar texto, Guardar PDF y Enviar enlace por WhatsApp"
            width={512}
            height={527}
          />
          <ul className="points">
            <li>
              <b>Número del cliente</b>
              <span>Opcional. Si lo dejás vacío, WhatsApp te deja elegir el contacto.</span>
            </li>
            <li>
              <b>Con enlace o texto completo</b>
              <span>
                Con enlace, el cliente recibe un link para ver y descargar su comprobante en PDF,
                disponible por 90 días. Con texto completo, el detalle va en el mensaje.
              </span>
            </li>
            <li>
              <b>Copiar texto y Guardar PDF</b>
              <span>Para mandarlo por otro medio o guardarlo.</span>
            </li>
            <li>
              <b>Enviar enlace por WhatsApp</b>
              <span>Abre WhatsApp con el mensaje listo.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="step" id="historial-devolver">
        <div className="step-head">
          <div className="step-num">4.3</div>
          <div>
            <h2>Devolvé o anulá una venta</h2>
            <p>Desde las acciones de la venta. Primero elegí cuál de las dos necesitás:</p>
          </div>
        </div>
        <div className="versus">
          <div className="vcard dev">
            <h4>Devolución</h4>
            <ul>
              <li>
                El cliente regresa <b>uno o varios</b> productos.
              </li>
              <li>Puede ser parcial o de toda la venta.</li>
              <li>La venta original se mantiene.</li>
            </ul>
          </div>
          <div className="vcard anu">
            <h4>Anulación</h4>
            <ul>
              <li>
                La venta <b>completa</b> queda sin efecto.
              </li>
              <li>Por ejemplo, se cobró mal o se registró dos veces.</li>
              <li>Pide autorización con PIN.</li>
            </ul>
          </div>
        </div>
        <div className="pair">
          <CapturaAnotada
            src="historial-03-devolucion.png"
            alt="Ventana Devolución de artículos con productos y cantidades a devolver, método de reembolso, opción de descontar de la caja y motivo"
            width={679}
            height={1015}
            narrow
            caption="Devolución."
            puntos={[
              {
                titulo: 'Productos y cantidades',
                texto: 'Marcá cuántas unidades de cada producto regresan, o tocá “Devolver todo”.',
              },
              {
                titulo: 'Método de reembolso',
                texto: 'Solo los métodos con que se cobró la venta.',
              },
              {
                titulo: 'Descontar de la caja actual',
                texto: 'Si devolvés efectivo, queda registrado como salida en tu turno.',
              },
              {
                titulo: 'Motivo',
                texto:
                  'Obligatorio. El sistema calcula el reembolso con los descuentos e impuestos de la venta original.',
              },
            ]}
          />
          <CapturaAnotada
            src="historial-04-anulacion.png"
            alt="Ventana Anulación de comprobante con total a revertir, motivo de la anulación y opciones de reingreso al inventario e impresión"
            width={554}
            height={997}
            narrow
            caption="Anulación."
            puntos={[
              {
                titulo: 'Motivo',
                texto:
                  'Obligatorio: error de cobro, cancelación del cliente, producto defectuoso, venta duplicada u otro.',
              },
              {
                titulo: 'Reingresar al inventario',
                texto:
                  'Devuelve los productos al stock. En un producto defectuoso no vuelven al stock que se puede vender.',
              },
              {
                titulo: 'Ticket de anulación',
                texto: 'Se imprime para el control y el arqueo.',
              },
              { titulo: 'Confirmar', texto: 'Revierte la venta completa.' },
            ]}
          />
        </div>
        <Nota tipo="warn">
          Para autorizar anulaciones, el encargado tiene que asignar un <b>PIN</b> en Configuración
          → Personal. Lo explicamos en el capítulo 07.
        </Nota>
      </section>

      <section className="step" id="historial-distribuidora">
        <div className="step-head">
          <div className="step-num">4.4</div>
          <div>
            <h2>Para distribuidoras</h2>
            <p>
              <span className="scope">Solo distribuidoras</span> Si despachás pedidos por rutas o
              camiones a otros negocios, usá el comprobante en hoja carta.
            </p>
          </div>
        </div>
        <div className="duo">
          <CapturaAnotada
            src="historial-05-hoja-carta.png"
            alt="Comprobante en hoja carta con datos del cliente, detalle de productos, cláusula de pagaré y firmas de despacho"
            width={1179}
            height={1026}
          />
          <ul className="points">
            <li>
              <b>Comprobante en hoja carta</b>
              <span>
                Un comprobante por hoja, con el detalle completo. Se pagina solo si pasa de 20
                productos.
              </span>
            </li>
            <li>
              <b>Cláusula de pagaré</b>
              <span>
                El cliente reconoce que recibió la mercadería y se compromete a pagarla. Se puede
                quitar.
              </span>
            </li>
            <li>
              <b>Firmas de despacho</b>
              <span>Alistado por, entregado por, transportista y “recibí conforme”.</span>
            </li>
            <li>
              <b>Guardar PDF o imprimir</b>
              <span>En hoja carta, para que el transportista lo lleve firmado.</span>
            </li>
            <li>
              <b>Hoja de ruta</b>
              <span>
                En Historial ventas, el botón “Hoja de ruta” es para organizar las entregas de cada
                ruta.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
};
