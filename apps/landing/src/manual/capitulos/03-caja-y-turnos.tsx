import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';

export const Capitulo03CajaYTurnos: React.FC = () => {
  return (
    <>
      <header className="chapter" id="caja">
        <div className="eyebrow">
          <span className="chip">Capítulo 03</span>Caja y turnos
        </div>
        <h2 className="chap">
          Caja y <em>turnos</em>
        </h2>
        <p className="lede">
          Cómo ver el dinero de tu turno y cómo cerrarlo con el arqueo al final del día.
        </p>
      </header>

      <section className="step" id="caja-turno">
        <div className="step-head">
          <div className="step-num">3.1</div>
          <div>
            <h2>Tu turno de caja</h2>
            <p>
              Entrá a <span className="ui">Caja y Turnos</span> en el menú. Ahí ves todo lo que
              entró y salió de tu caja en el turno.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="caja-01-turno.png"
          alt="Pantalla Control de caja y turnos con el turno activo, saldo teórico en efectivo, ventas por método de pago y cajas abiertas"
          width={1248}
          height={876}
          pins={[
            { n: 1, x: 65.8, y: 4.1, w: 9.6, h: 5, dir: 'below' },
            { n: 2, x: 77.7, y: 4.1, w: 14, h: 5, dir: 'below' },
            { n: 3, x: 92.3, y: 4.1, w: 15.2, h: 5, dir: 'below' },
            { n: 4, x: 32.6, y: 15.3, w: 30, h: 4.2, dir: 'below' },
            { n: 5, x: 86.4, y: 31.5, w: 23.6, h: 10.4, dir: 'left' },
            { n: 6, x: 50.2, y: 45.3, w: 96, h: 8.2, dir: 'below' },
            { n: 7, x: 15.5, y: 56.8, w: 27.4, h: 4.6, dir: 'right' },
            { n: 8, x: 17.9, y: 88.1, w: 32, h: 19.8, dir: 'right' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Abrir cajón',
              texto: 'Abre la gaveta de dinero sin hacer una venta.',
            },
            {
              n: 2,
              titulo: 'Registrar movimiento',
              texto:
                'Entradas o salidas de efectivo que no son ventas, por ejemplo agregar sencillo o pagar un mandado.',
            },
            {
              n: 3,
              titulo: 'Cerrar turno (arqueo)',
              texto: 'Empieza el cierre del turno.',
            },
            {
              n: 4,
              titulo: 'Estado del turno',
              texto: '“En operación”, cuánto tiempo lleva abierto y si el cierre es ciego.',
            },
            {
              n: 5,
              titulo: 'Saldo teórico esperado',
              texto:
                'Lo que debería haber en la gaveta: monto inicial, más ventas en efectivo, más o menos los movimientos.',
            },
            {
              n: 6,
              titulo: 'Otras formas de pago',
              texto:
                'Ventas con tarjeta y transferencia, total vendido y cuántas ventas lleva el turno.',
            },
            {
              n: 7,
              titulo: 'Movimientos y ventas del turno',
              texto: 'El detalle de cada movimiento de efectivo y de cada venta.',
            },
            {
              n: 8,
              titulo: 'Cajas abiertas ahora',
              texto:
                'Todas las cajas abiertas del negocio. Con “Cerrar esta caja” se cierra desde aquí.',
            },
          ]}
        />
        <div className="prose">
          <p>
            <b>Cuánto debería haber en la gaveta:</b>
          </p>
        </div>
        <div className="formula">
          <span>Monto inicial</span>
          <span className="eq">+</span>
          <span>Ventas en efectivo</span>
          <span className="eq">±</span>
          <span>Movimientos</span>
          <span className="eq">=</span>
          <span className="res">Saldo esperado</span>
        </div>
        <Nota tipo="warn">
          <b>Cerrá el turno al terminar cada día.</b> Un turno abierto varios días, como el del
          ejemplo (25 días), mezcla ventas de días distintos y el arqueo pierde sentido.
        </Nota>
      </section>

      <section className="step" id="caja-contar">
        <div className="step-head">
          <div className="step-num">3.2</div>
          <div>
            <h2>Contá el efectivo y cerrá</h2>
            <p>
              Tocá <span className="ui">Cerrar Turno (Arqueo)</span>. Contá lo que hay en la gaveta
              y escribilo.
            </p>
          </div>
        </div>
        <Nota tipo="tip">
          <b>Cierre ciego:</b> el cajero no ve cuánto espera el sistema. Cuenta y declara lo que
          tiene; así el conteo es honesto. Solo un supervisor puede revelar el monto esperado.
        </Nota>
        <div className="pair">
          <CapturaAnotada
            src="caja-02-cierre-billetes.png"
            alt="Cierre ciego contando por billetes y monedas, con vouchers y comprobantes por banco"
            width={735}
            height={1027}
            narrow
            caption="Contando billete por billete."
            pins={[
              { n: 1, x: 73.5, y: 5.2, w: 31, h: 4, dir: 'below' },
              { n: 2, x: 76.6, y: 18.2, w: 32, h: 5, dir: 'left' },
              { n: 3, x: 50.1, y: 34, w: 81, h: 22.4, dir: 'left' },
              { n: 4, x: 50.1, y: 48, w: 81, h: 3.6, dir: 'left' },
              { n: 5, x: 50.1, y: 77.6, w: 81, h: 33.4, dir: 'left' },
            ]}
            leyenda={[
              {
                n: 1,
                titulo: 'Revelar esperado',
                texto: 'Solo para el supervisor: muestra cuánto debería haber.',
              },
              {
                n: 2,
                titulo: 'Cómo contar',
                texto: 'Por billetes y monedas, o el monto total directo.',
              },
              {
                n: 3,
                titulo: 'Billetes y monedas',
                texto: 'Cuántos tenés de cada uno; el sistema suma.',
              },
              { n: 4, titulo: 'Total contado', texto: 'La suma de lo que contaste.' },
              {
                n: 5,
                titulo: 'Vouchers y comprobantes',
                texto: 'Lo que tenés en papel de tarjeta y transferencia, por banco.',
              },
            ]}
          />
          <CapturaAnotada
            src="caja-03-cierre-directo.png"
            alt="Cierre ciego con el monto directo de efectivo, vouchers en total, observaciones y botón Confirmar cierre ciego"
            width={740}
            height={761}
            narrow
            caption="O escribiendo el total directo."
            pins={[
              { n: 1, x: 51.1, y: 40.3, w: 81, h: 6.8, dir: 'left' },
              { n: 2, x: 51.1, y: 64.2, w: 81.4, h: 9.4, dir: 'left' },
              { n: 3, x: 52.7, y: 76.2, w: 89, h: 7.8, dir: 'left' },
              { n: 4, x: 33.3, y: 92, w: 50, h: 5.6, dir: 'above' },
              { n: 5, x: 83.2, y: 91.1, w: 21.4, h: 7.4, dir: 'above' },
            ]}
            leyenda={[
              {
                n: 1,
                titulo: 'Efectivo contado',
                texto: 'El total de billetes y monedas que contaste.',
              },
              {
                n: 2,
                titulo: 'Vouchers y comprobantes',
                texto: 'Opcional: el total de tarjeta y de transferencia.',
              },
              {
                n: 3,
                titulo: 'Observaciones',
                texto: 'Opcional: billetes rotos, entregas, cualquier incidente.',
              },
              {
                n: 4,
                titulo: 'Lo que declarás',
                texto: 'Resumen de lo que contaste. No es el total del sistema.',
              },
              {
                n: 5,
                titulo: 'Confirmar cierre ciego',
                texto: 'Cierra el turno con lo que declaraste.',
              },
            ]}
          />
        </div>
      </section>

      <section className="step" id="caja-resultado">
        <div className="step-head">
          <div className="step-num">3.3</div>
          <div>
            <h2>Revisá el resultado</h2>
            <p>
              Al confirmar, el sistema compara lo que contaste con lo que esperaba y te da el ticket
              de cierre.
            </p>
          </div>
        </div>
        <div className="pair">
          <CapturaAnotada
            src="caja-04-resultado.png"
            alt="Turno cerrado correctamente con sistema esperado, efectivo contado, diferencia y desglose por banco"
            width={620}
            height={920}
            narrow
            pins={[
              { n: 1, x: 53.4, y: 27, w: 74.4, h: 22.4, dir: 'left' },
              { n: 2, x: 53.2, y: 60.4, w: 74.6, h: 42.4, dir: 'left' },
              { n: 3, x: 53.2, y: 85.1, w: 74.6, h: 5.4, dir: 'left' },
              { n: 4, x: 27.3, y: 92.9, w: 23.2, h: 4.2, dir: 'above' },
              { n: 5, x: 80, y: 92.9, w: 22.2, h: 4.2, dir: 'above' },
            ]}
            leyenda={[
              {
                n: 1,
                titulo: 'Físico vs sistema',
                texto: 'Lo que contaste contra lo que esperaba el sistema. “Exacto” es sin diferencia.',
              },
              {
                n: 2,
                titulo: 'Desglose por banco',
                texto:
                  'Tarjeta y transferencia: lo esperado, lo reportado y la diferencia de cada banco.',
              },
              { n: 3, titulo: 'Resultado', texto: 'Si cuadra, “Arqueo exacto sin diferencia”.' },
              {
                n: 4,
                titulo: 'Imprimir ticket',
                texto: 'El ticket de cierre en la impresora de recibos.',
              },
              { n: 5, titulo: 'Finalizar y salir', texto: 'Termina el cierre.' },
            ]}
          />
          <CapturaAnotada
            src="caja-05-ticket.png"
            alt="Ticket de cierre de turno de 80 mm con resumen de ventas, arqueo de efectivo y vouchers"
            width={572}
            height={1010}
            narrow
            pins={[
              { n: 1, x: 51.6, y: 12, w: 57, h: 5, dir: 'left' },
              { n: 2, x: 50.1, y: 50.1, w: 57, h: 12.4, dir: 'left' },
              { n: 3, x: 79.2, y: 95.8, w: 28, h: 3.8, dir: 'above' },
            ]}
            leyenda={[
              {
                n: 1,
                titulo: 'Sin impresora',
                texto: 'Si no hay impresora configurada, el ticket se ve en pantalla.',
              },
              {
                n: 2,
                titulo: 'Arqueo de efectivo',
                texto: 'Monto inicial, ventas en efectivo, esperado, contado y diferencia.',
              },
              {
                n: 3,
                titulo: 'Imprimir ticket',
                texto: 'Lo imprime en la impresora de 80 mm.',
              },
            ]}
          />
        </div>
        <ul className="check">
          <li>
            <span>
              <b>Exacto:</b> lo contado es igual a lo esperado.
            </span>
          </li>
          <li>
            <span>
              <b>Sobrante o faltante:</b> hay diferencia. Revisá movimientos sin registrar o vueltos
              mal dados, y anotalo en Observaciones.
            </span>
          </li>
        </ul>
      </section>
    </>
  );
};
