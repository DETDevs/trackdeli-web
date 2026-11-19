import React from 'react';

export interface PinMarca {
  n: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  dir: 'above' | 'below' | 'left' | 'right';
}

export interface LeyendaItem {
  n: number;
  titulo: string;
  texto: React.ReactNode;
}

export interface PuntoItem {
  titulo: string;
  texto: React.ReactNode;
}

export interface CapturaAnotadaProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  narrow?: boolean;
  maxWidth?: number;
  caption?: React.ReactNode;
  pins?: PinMarca[];
  leyenda?: LeyendaItem[];
  puntos?: PuntoItem[];
}

export const CapturaAnotada: React.FC<CapturaAnotadaProps> = ({
  src,
  alt,
  width,
  height,
  narrow = false,
  maxWidth,
  caption,
  pins,
  leyenda,
  puntos,
}) => {
  const imgSrc = src.startsWith('/') ? src : `/img/manual/${src}`;
  const shotClass = narrow ? 'shot narrow' : 'shot';
  const shotStyle: React.CSSProperties | undefined =
    maxWidth !== undefined ? { maxWidth: `${maxWidth}px` } : undefined;

  return (
    <figure>
      <div className={shotClass} style={shotStyle}>
        <img src={imgSrc} alt={alt} width={width} height={height} />
        {pins?.map((pin) => {
          const isBox = pin.w !== undefined && pin.h !== undefined;
          const pinStyle = {
            '--x': `${pin.x}%`,
            '--y': `${pin.y}%`,
            ...(isBox ? { '--w': `${pin.w}%`, '--h': `${pin.h}%` } : {}),
          } as React.CSSProperties;

          return (
            <span
              key={pin.n}
              className={isBox ? 'pin box' : 'pin'}
              data-dir={pin.dir}
              style={pinStyle}
            >
              <span className="ring" />
              <span className="lead">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path className="halo" d="M12 22V4M5 11l7-7 7 7" />
                  <path className="stem" d="M12 22V4M5 11l7-7 7 7" />
                </svg>
                <span className="badge">{pin.n}</span>
              </span>
            </span>
          );
        })}
      </div>
      {caption !== undefined && <figcaption>{caption}</figcaption>}
      {leyenda !== undefined && leyenda.length > 0 && (
        <ol className="legend">
          {leyenda.map((item) => (
            <li key={item.n}>
              <span className="badge">{item.n}</span>
              <div>
                <b>{item.titulo}</b>
                <span>{item.texto}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
      {puntos !== undefined && puntos.length > 0 && (
        <ul className="points">
          {puntos.map((item) => (
            <li key={item.titulo}>
              <b>{item.titulo}</b>
              <span>{item.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
};
