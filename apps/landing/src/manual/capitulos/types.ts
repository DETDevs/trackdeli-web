import type React from 'react';

export interface SeccionIndice {
  id: string;
  titulo: string;
}

export interface CapituloManual {
  numero: string;
  id: string;
  titulo: string;
  secciones: SeccionIndice[];
  Component: React.FC;
}
