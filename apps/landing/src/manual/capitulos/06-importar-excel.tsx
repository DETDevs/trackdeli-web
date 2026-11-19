import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';

export const Capitulo06ImportarExcel: React.FC = () => {
  return (
    <>
      <header className="chapter" id="importar">
        <div className="eyebrow">
          <span className="chip">Capítulo 06</span>Catálogo
        </div>
        <h2 className="chap">
          Importar productos <em>desde Excel</em>
        </h2>
        <p className="lede">
          Cargá o actualizá muchos productos de una sola vez con un archivo de Excel, en lugar de
          crearlos uno por uno.
        </p>
        <div className="facts" style={{ maxWidth: 'none' }}>
          <div className="fact">
            <b>Quién puede</b>
            <span>Encargado</span>
          </div>
          <div className="fact">
            <b>Archivos</b>
            <span>Excel (.xlsx) o CSV</span>
          </div>
          <div className="fact">
            <b>Tamaño máximo</b>
            <span>5 MB · unas 5,000 filas</span>
          </div>
          <div className="fact">
            <b>Dónde</b>
            <span>Catálogo → Importar</span>
          </div>
        </div>
      </header>

      <section className="step" id="paso-1">
        <div className="step-head">
          <div className="step-num">1</div>
          <div>
            <h2>Abrí el catálogo y tocá Importar</h2>
            <p>
              En el menú de la izquierda entrá a <span className="ui">Catálogo</span>. Arriba a la
              derecha está el botón <span className="ui">Importar</span>.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="importar-01-catalogo.png"
          alt="Pantalla de Catálogo de productos con el menú lateral y el botón Importar arriba a la derecha"
          width={1907}
          height={913}
          pins={[
            { n: 1, x: 5.6, y: 27.9, w: 10.5, h: 4.8, dir: 'right' },
            { n: 2, x: 69.9, y: 9.8, dir: 'below' },
          ]}
          leyenda={[
            { n: 1, titulo: 'Catálogo', texto: 'Abre la lista de productos del negocio.' },
            { n: 2, titulo: 'Importar', texto: 'Abre el asistente de importación.' },
          ]}
        />
      </section>

      <section className="step" id="paso-2">
        <div className="step-head">
          <div className="step-num">2</div>
          <div>
            <h2>Descargá la plantilla de tu negocio</h2>
            <p>
              La primera vez, bajá la plantilla. Ya trae las columnas correctas para el tipo de
              negocio, así no tenés que adivinar los encabezados.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="importar-02-asistente.png"
          alt="Asistente de importación con el botón Seleccionar archivo, el enlace Descargar plantilla de mi negocio y la ayuda de columnas"
          width={1177}
          height={947}
          pins={[
            { n: 1, x: 28.6, y: 54.3, w: 17.5, h: 3.6, dir: 'right' },
            { n: 2, x: 52, y: 71.8, w: 72, h: 23.5, dir: 'above' },
            { n: 3, x: 52.3, y: 38.4, w: 14.6, h: 4, dir: 'right' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Descargar plantilla de mi negocio',
              texto: 'Baja un Excel con las columnas que usa tu negocio.',
            },
            {
              n: 2,
              titulo: 'Ayuda de columnas',
              texto: (
                <>
                  Explica qué va en cada columna. Las que llevan{' '}
                  <span className="req">*</span> son obligatorias.
                </>
              ),
            },
            {
              n: 3,
              titulo: 'Seleccionar archivo',
              texto: 'Cuando el Excel esté listo, lo subís desde aquí (paso 3).',
            },
          ]}
        />
        <Nota tipo="tip">
          Si tu archivo usa otros encabezados, igual podés subirlo: en el siguiente paso el
          asistente te deja indicar qué columna de tu archivo corresponde a cada dato.
        </Nota>
      </section>

      <section className="step" id="paso-3">
        <div className="step-head">
          <div className="step-num">3</div>
          <div>
            <h2>Llená el archivo y subilo</h2>
            <p>Un producto por fila. La primera fila son los encabezados, no la borrés.</p>
          </div>
        </div>
        <figure>
          <div className="sheet-wrap">
            <div className="sheet-bar">
              <span className="xl">X</span>Ejemplo de cómo debe verse el archivo
            </div>
            <table className="sheet">
              <thead>
                <tr>
                  <th></th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                  <th>D</th>
                  <th>E</th>
                  <th>F</th>
                  <th>G</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hdr">
                  <td className="rn">1</td>
                  <td>
                    Nombre <span className="req">*</span>
                  </td>
                  <td>
                    Precio de venta <span className="req">*</span>
                  </td>
                  <td>Costo</td>
                  <td>Stock</td>
                  <td>Categoría</td>
                  <td>Código de barras / SKU</td>
                  <td>Aplica IVA</td>
                </tr>
                <tr>
                  <td className="rn">2</td>
                  <td>10W30 YEFE 1L</td>
                  <td className="num">302.50</td>
                  <td className="num">192.50</td>
                  <td className="num">12</td>
                  <td>Lubricantes</td>
                  <td>10W-301L</td>
                  <td>SI</td>
                </tr>
                <tr>
                  <td className="rn">3</td>
                  <td>3 IN 1 QUICK DETAILER</td>
                  <td className="num">198.00</td>
                  <td className="num">117.00</td>
                  <td className="num">6</td>
                  <td>Productos automotrices</td>
                  <td>6959375193876</td>
                  <td>SI</td>
                </tr>
                <tr>
                  <td className="rn">4</td>
                  <td>A/C PRO</td>
                  <td className="num">99.00</td>
                  <td className="num">58.50</td>
                  <td className="num">6</td>
                  <td>Productos automotrices</td>
                  <td>6959375194088</td>
                  <td>SI</td>
                </tr>
              </tbody>
            </table>
          </div>
          <figcaption>
            Ejemplo con productos de un taller. Las columnas que veas en tu plantilla pueden variar
            según el tipo de negocio.
          </figcaption>
        </figure>
        <ul className="check">
          <li>
            <span>
              <b>Nombre</b> y <b>precio de venta</b> no pueden quedar vacíos.
            </span>
          </li>
          <li>
            <span>
              Escribí los precios y el costo como números, sin “C$” ni comas de miles:{' '}
              <code>1250.50</code>.
            </span>
          </li>
          <li>
            <span>
              Si la <b>categoría</b> no existe todavía, se crea sola al importar. Escribila siempre
              igual para no terminar con dos (“Lubricantes” y “lubricante”).
            </span>
          </li>
          <li>
            <span>
              Cada <b>código de barras</b> debe ser único: no lo repitás en dos filas ni lo uses
              para un producto distinto del que ya lo tiene.
            </span>
          </li>
          <li>
            <span>
              En <b>Aplica IVA</b> poné <code>SI</code> para productos gravados (15 %) y{' '}
              <code>NO</code> para exentos.
            </span>
          </li>
        </ul>
        <CapturaAnotada
          src="importar-03-archivo.png"
          alt="Archivo de Excel guardado en la carpeta del equipo"
          width={524}
          height={91}
          narrow
          caption={
            <>
              Guardá el archivo en una carpeta que encontrés fácil. Después, en el asistente, tocá{' '}
              <span className="ui">Seleccionar archivo</span> y elegilo.
            </>
          }
          pins={[{ n: 1, x: 30, y: 80, w: 58, h: 34, dir: 'right' }]}
        />
      </section>

      <section className="step" id="paso-4">
        <div className="step-head">
          <div className="step-num">4</div>
          <div>
            <h2>Revisá la vista previa</h2>
            <p>
              Antes de guardar nada, el sistema lee el archivo y te muestra qué va a pasar con cada
              fila. Todavía no se importó nada.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="importar-04-vista-previa-errores.png"
          alt="Vista previa con 78 filas: 14 por crear, 60 por actualizar, 0 advertencias y 4 errores, con la lista de errores por fila"
          width={959}
          height={492}
          pins={[
            { n: 1, x: 33.1, y: 37.6, w: 16.8, h: 13.5, dir: 'above' },
            { n: 2, x: 51.1, y: 37.6, w: 16.8, h: 13.5, dir: 'above' },
            { n: 3, x: 86.9, y: 37.6, w: 16.8, h: 13.5, dir: 'above' },
            { n: 4, x: 50.6, y: 65.5, w: 88.5, h: 19, dir: 'below' },
            { n: 5, x: 67.9, y: 91.5, w: 14.2, h: 7.4, dir: 'above' },
            { n: 6, x: 87.6, y: 91.5, w: 19, h: 7.4, dir: 'above' },
          ]}
          leyenda={[
            { n: 1, titulo: 'Por crear', texto: 'Productos nuevos que no existen en tu catálogo.' },
            {
              n: 2,
              titulo: 'Por actualizar',
              texto: 'Productos que ya existen; se actualizan con los datos del archivo.',
            },
            { n: 3, titulo: 'Errores', texto: 'Filas con un problema. No se importan.' },
            {
              n: 4,
              titulo: 'Lista de errores',
              texto: (
                <>
                  Dice la fila exacta y qué pasa. Mirá cómo resolverlos en{' '}
                  <a href="#errores">Errores frecuentes</a>.
                </>
              ),
            },
            {
              n: 5,
              titulo: 'Descargar errores',
              texto: 'Baja la lista para corregir el archivo con calma.',
            },
            { n: 6, titulo: 'Importar', texto: 'El número del botón es lo que sí se va a guardar.' },
          ]}
        />

        <div className="counters" aria-label="Qué significa cada contador">
          <div className="counter c-total">
            <b>Total filas</b>
            <span>Todas las filas con datos del archivo (sin contar los encabezados).</span>
          </div>
          <div className="counter c-new">
            <b>Por crear</b>
            <span>Se agregan como productos nuevos.</span>
          </div>
          <div className="counter c-upd">
            <b>Por actualizar</b>
            <span>Ya están en tu catálogo y se actualizan.</span>
          </div>
          <div className="counter c-warn">
            <b>Advertencias</b>
            <span>Se importan, pero conviene revisarlas.</span>
          </div>
          <div className="counter c-err">
            <b>Errores</b>
            <span>Se saltan. El resto del archivo sí se importa.</span>
          </div>
        </div>

        <div className="math" aria-label="Cálculo del botón Importar">
          <span className="t">78 filas</span>
          <span className="e">− 4 con error</span>
          <span>=</span>
          <span className="r">74 registros a importar</span>
        </div>

        <Nota tipo="warn">
          Si el número de <b>Por actualizar</b> es más alto de lo que esperabas, tocá{' '}
          <span className="ui">Volver</span> y revisá el archivo: esos productos ya existen y sus
          datos se van a reemplazar con lo que diga el Excel.
        </Nota>
      </section>

      <section className="step" id="errores">
        <div className="step-head">
          <div className="step-num" aria-hidden="true">
            !
          </div>
          <div>
            <h2>Errores frecuentes y cómo resolverlos</h2>
            <p>
              Casi todos los errores vienen del código de barras. El mensaje siempre te dice la
              fila, así la buscás directo en el Excel.
            </p>
          </div>
        </div>

        <div className="errors">
          <article className="err">
            <div className="err-head">
              <span className="tag">Fila 64 · barcode</span>
              <q>Código de barras &apos;6959375194675&apos; duplicado en el archivo (ya aparece en la fila 63).</q>
            </div>
            <div className="err-body">
              <div className="err-ill">
                <div className="sheet-wrap">
                  <div className="sheet-bar">
                    <span className="xl">X</span>Ejemplo: el mismo código en dos filas
                  </div>
                  <table className="sheet">
                    <thead>
                      <tr>
                        <th></th>
                        <th>A · Nombre</th>
                        <th>B · Precio de venta</th>
                        <th>F · Código de barras</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="rn">63</td>
                        <td>SILICONA LÍQUIDA 300 ML</td>
                        <td className="num">145.00</td>
                        <td className="dup">6959375194675</td>
                      </tr>
                      <tr>
                        <td className="rn">64</td>
                        <td>SILICONA LÍQUIDA 500 ML</td>
                        <td className="num">210.00</td>
                        <td className="dup">6959375194675</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="why">
                <h4>Por qué pasa</h4>
                <ul>
                  <li>Se copió una fila y no se cambió el código.</li>
                  <li>Dos presentaciones (300 ml y 500 ml) se cargaron con el mismo código.</li>
                  <li>El producto está repetido dos veces en el archivo.</li>
                </ul>
              </div>
              <div className="fix">
                <h4>Cómo resolverlo</h4>
                <ul>
                  <li>Si es el mismo producto repetido, borrá una de las filas.</li>
                  <li>Si son productos distintos, poné en cada uno el código que trae su empaque.</li>
                  <li>Si uno no tiene código, dejá la celda vacía.</li>
                </ul>
              </div>
            </div>
          </article>

          <article className="err">
            <div className="err-head">
              <span className="tag">Fila 42 · barcode</span>
              <q>El código de barras &apos;6959375193753&apos; ya pertenece al producto &apos;INJECTOR CLEANER&apos;.</q>
            </div>
            <div className="err-body">
              <div className="err-ill">
                <div className="vs">
                  <div className="card-mini">
                    <small>En tu catálogo</small>
                    <b>INJECTOR CLEANER</b>
                    <code>6959375193753</code>
                  </div>
                  <div className="ne" aria-hidden="true">
                    ≠
                  </div>
                  <div className="card-mini bad">
                    <small>En el archivo · fila 42</small>
                    <b>Otro nombre de producto</b>
                    <code>6959375193753</code>
                  </div>
                </div>
              </div>
              <div className="why">
                <h4>Por qué pasa</h4>
                <ul>
                  <li>
                    En el archivo, ese código está en una fila con un nombre distinto al del
                    producto que ya lo tiene en tu catálogo.
                  </li>
                  <li>
                    Se cambió el nombre del producto en el Excel (por ejemplo, abreviado o con otra
                    presentación).
                  </li>
                  <li>Se escribió mal el código y coincidió con el de otro producto.</li>
                </ul>
              </div>
              <div className="fix">
                <h4>Cómo resolverlo</h4>
                <ul>
                  <li>Si es el mismo producto, escribí el nombre igual al del catálogo.</li>
                  <li>Si es otro producto, corregí el código con el del empaque.</li>
                  <li>
                    Buscá el código en <span className="ui">Catálogo</span> para ver a qué producto
                    pertenece.
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>

        <Nota tipo="tip">
          <b>Dos caminos.</b> Podés importar ya lo que está bien (las filas con error se saltan) y
          después subir un archivo solo con las filas corregidas. O podés tocar{' '}
          <span className="ui">Volver</span>, corregir el Excel y subirlo de nuevo antes de
          importar.
        </Nota>
      </section>

      <section className="step" id="paso-5">
        <div className="step-head">
          <div className="step-num">5</div>
          <div>
            <h2>Importá</h2>
            <p>
              Cuando la vista previa esté como querés, tocá el botón verde. Así se ve un archivo sin
              errores, con solo productos nuevos:
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="importar-05-vista-previa-limpia.png"
          alt="Vista previa con 14 filas, 14 por crear, 0 por actualizar, 0 advertencias y 0 errores, y el botón Importar 14 registros"
          width={1275}
          height={655}
          pins={[
            { n: 1, x: 74.4, y: 54.5, w: 13.2, h: 15, dir: 'left' },
            { n: 2, x: 73.6, y: 70.7, w: 15.2, h: 6.5, dir: 'left' },
          ]}
          leyenda={[
            { n: 1, titulo: '0 errores', texto: 'Todas las filas se van a guardar.' },
            {
              n: 2,
              titulo: 'Importar 14 registros',
              texto: 'Guarda los productos. Al terminar aparecen en el catálogo.',
            },
          ]}
        />
        <ul className="check">
          <li>
            <span>Buscá un par de productos en el catálogo y confirmá precio, costo y stock.</span>
          </li>
          <li>
            <span>Revisá que las categorías nuevas hayan quedado bien escritas.</span>
          </li>
        </ul>
      </section>
    </>
  );
};
