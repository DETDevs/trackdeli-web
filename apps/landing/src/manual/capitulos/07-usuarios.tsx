import React from 'react';
import { CapturaAnotada } from '../components/CapturaAnotada';
import { Nota } from '../components/Nota';

export const Capitulo07Usuarios: React.FC = () => {
  return (
    <>
      <header className="chapter" id="usuarios">
        <div className="eyebrow">
          <span className="chip">Capítulo 07</span>Configuración
        </div>
        <h2 className="chap">
          Usuarios del <em>negocio</em>
        </h2>
        <p className="lede">Cómo crear los usuarios de tu personal. Solo lo hace el encargado.</p>
      </header>

      <section className="step" id="usuarios-lista">
        <div className="step-head">
          <div className="step-num">7.1</div>
          <div>
            <h2>Tu personal</h2>
            <p>
              Entrá a <span className="ui">Configuración</span> y abrí la pestaña{' '}
              <span className="ui">Personal</span>.
            </p>
          </div>
        </div>
        <CapturaAnotada
          src="usuarios-01-personal.png"
          alt="Configuración, pestaña Personal: usuarios del negocio con su rol, PIN y estado, y botones Agregar cajero y Agregar vendedor"
          width={976}
          height={550}
          pins={[
            { n: 1, x: 82.8, y: 21.5, w: 30.4, h: 6.6, dir: 'below' },
            { n: 2, x: 20.1, y: 57.8, w: 37, h: 7.6, dir: 'right' },
            { n: 3, x: 62.8, y: 80, w: 30.6, h: 31, dir: 'left' },
            { n: 4, x: 91.5, y: 83.6, w: 10.4, h: 19.4, dir: 'above' },
          ]}
          leyenda={[
            {
              n: 1,
              titulo: 'Agregar cajero o vendedor',
              texto: 'Crea un usuario nuevo para tu personal.',
            },
            {
              n: 2,
              titulo: 'PIN para autorizar',
              texto: 'Asigná un PIN a quien pueda autorizar anulaciones.',
            },
            {
              n: 3,
              titulo: 'Rol, PIN y estado',
              texto: 'Qué hace cada usuario, si tiene PIN y si está activo.',
            },
            {
              n: 4,
              titulo: 'Acciones',
              texto: 'Cambiar contraseña, editar y activar o desactivar el usuario.',
            },
          ]}
        />
        <div className="roles">
          <div className="role">
            <span className="tag">ENCARGADO</span>
            <b>El dueño o administrador</b>
            <span>Ve todo, configura el negocio y crea usuarios.</span>
          </div>
          <div className="role">
            <span className="tag">CAJERO</span>
            <b>Opera la caja</b>
            <span>Abre y cierra caja, y cobra las ventas.</span>
          </div>
          <div className="role">
            <span className="tag">VENDEDOR</span>
            <b>Atiende y prepara</b>
            <span>Arma tickets de preventa que después cobra el cajero.</span>
          </div>
        </div>
      </section>

      <section className="step" id="usuarios-crear">
        <div className="step-head">
          <div className="step-num">7.2</div>
          <div>
            <h2>Creá un usuario</h2>
            <p>
              Tocá <span className="ui">Agregar Cajero</span> o{' '}
              <span className="ui">Agregar Vendedor</span>.
            </p>
          </div>
        </div>
        <div className="pair">
          <CapturaAnotada
            src="usuarios-02-cajero.png"
            alt="Formulario Nuevo cajero con rol, nombre, correo, teléfono y PIN de autorización"
            width={448}
            height={682}
            narrow
            caption="Nuevo cajero."
            puntos={[
              {
                titulo: 'Nombre y correo',
                texto: 'Obligatorios. Con el correo entra al sistema.',
              },
              {
                titulo: 'PIN de autorización',
                texto:
                  'Opcional, de 4 a 6 números. Sirve para autorizar acciones, como quitar productos ya enviados a cocina.',
              },
            ]}
          />
          <CapturaAnotada
            src="usuarios-03-vendedor.png"
            alt="Formulario Nuevo vendedor con rol, nombre, correo opcional, teléfono y PIN"
            width={448}
            height={642}
            narrow
            caption="Nuevo vendedor."
            puntos={[
              {
                titulo: 'Correo opcional',
                texto: 'Si lo dejás vacío, el sistema crea uno de acceso automáticamente.',
              },
              {
                titulo: 'En caja',
                texto:
                  'Al cobrar, el cajero puede asignar la venta a este vendedor o ruta, y después filtrar sus reportes.',
              },
            ]}
          />
        </div>
        <Nota tipo="tip">
          Al crear el usuario, el sistema muestra una <b>contraseña temporal</b>. Anotala y dásela
          a la persona para que entre por primera vez.
        </Nota>
      </section>
    </>
  );
};
