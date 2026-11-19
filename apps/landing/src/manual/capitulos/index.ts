import type { CapituloManual } from './types';
import { Capitulo01PrimerosPasos } from './01-primeros-pasos';
import { Capitulo02HacerUnaVenta } from './02-hacer-una-venta';
import { Capitulo03CajaYTurnos } from './03-caja-y-turnos';
import { Capitulo04HistorialDeVentas } from './04-historial-de-ventas';
import { Capitulo05TusProductos } from './05-tus-productos';
import { Capitulo06ImportarExcel } from './06-importar-excel';
import { Capitulo07Usuarios } from './07-usuarios';

export const CAPITULOS: CapituloManual[] = [
  {
    numero: '01',
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    secciones: [
      { id: 'entrar', titulo: 'Entrar al sistema' },
      { id: 'pantalla', titulo: 'La pantalla principal' },
    ],
    Component: Capitulo01PrimerosPasos,
  },
  {
    numero: '02',
    id: 'vender',
    titulo: 'Hacer una venta',
    secciones: [
      { id: 'venta-orden', titulo: 'Agregar productos' },
      { id: 'venta-cobrar', titulo: 'Cobrar' },
      { id: 'venta-comprobante', titulo: 'Comprobante' },
    ],
    Component: Capitulo02HacerUnaVenta,
  },
  {
    numero: '03',
    id: 'caja',
    titulo: 'Caja y turnos',
    secciones: [
      { id: 'caja-turno', titulo: 'Tu turno de caja' },
      { id: 'caja-contar', titulo: 'Contar el efectivo' },
      { id: 'caja-resultado', titulo: 'Resultado del cierre' },
    ],
    Component: Capitulo03CajaYTurnos,
  },
  {
    numero: '04',
    id: 'historial',
    titulo: 'Historial de ventas',
    secciones: [
      { id: 'historial-lista', titulo: 'Buscar una venta' },
      { id: 'historial-compartir', titulo: 'Enviar por WhatsApp' },
      { id: 'historial-devolver', titulo: 'Devolver o anular' },
      { id: 'historial-distribuidora', titulo: 'Distribuidoras' },
    ],
    Component: Capitulo04HistorialDeVentas,
  },
  {
    numero: '05',
    id: 'catalogo',
    titulo: 'Tus productos',
    secciones: [
      { id: 'catalogo-pantalla', titulo: 'La pantalla de catálogo' },
      { id: 'catalogo-nuevo', titulo: 'Crear un producto' },
      { id: 'catalogo-rubro', titulo: 'Según tu negocio' },
    ],
    Component: Capitulo05TusProductos,
  },
  {
    numero: '06',
    id: 'importar',
    titulo: 'Importar productos desde Excel',
    secciones: [
      { id: 'paso-1', titulo: 'Abrir el importador' },
      { id: 'paso-2', titulo: 'Descargar la plantilla' },
      { id: 'paso-3', titulo: 'Llenar el archivo' },
      { id: 'paso-4', titulo: 'Revisar la vista previa' },
      { id: 'errores', titulo: 'Errores frecuentes' },
      { id: 'paso-5', titulo: 'Importar' },
    ],
    Component: Capitulo06ImportarExcel,
  },
  {
    numero: '07',
    id: 'usuarios',
    titulo: 'Usuarios del negocio',
    secciones: [
      { id: 'usuarios-lista', titulo: 'Tu personal' },
      { id: 'usuarios-crear', titulo: 'Crear un usuario' },
    ],
    Component: Capitulo07Usuarios,
  },
];
