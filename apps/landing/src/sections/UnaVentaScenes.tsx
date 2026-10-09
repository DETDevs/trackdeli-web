import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MaskLine, ScreenPhoto } from '../components/ui';
import { AVAILABLE_SCREENS, REPORT_BARS, REPORT_MAX, formatCaja, blendStyle } from '../data/constants';

export const UnaVentaScenes: React.FC<{ pinned: boolean; reduced: boolean }> = ({ pinned, reduced }) => {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (reduced || !root) return;

      const ins = (el: Element | null) => (el ? Array.from(el.querySelectorAll<HTMLElement>('[data-in]')) : []);
      const sc0 = root.querySelector<HTMLElement>('.escena-0');
      const sc1 = root.querySelector<HTMLElement>('.escena-1');
      const sc2 = root.querySelector<HTMLElement>('.escena-2');
      const sc3 = root.querySelector<HTMLElement>('.escena-3');
      if (!sc0 || !sc1 || !sc2 || !sc3) return;

      const totalEl = root.querySelector<HTMLElement>('.escena-total');
      const stockEl = root.querySelector<HTMLElement>('.escena-stock');
      const repTotalEl = root.querySelector<HTMLElement>('.rep-total');
      const cajaObj = { v: 8450 };
      const stockObj = { v: 24 };
      const repObj = { v: 0 };
      const writeTotal = () => {
        if (totalEl) totalEl.textContent = formatCaja(cajaObj.v);
      };
      const writeStock = () => {
        if (stockEl) stockEl.textContent = `${Math.round(stockObj.v)} / 30 LT`;
      };
      const writeRep = () => {
        if (repTotalEl) repTotalEl.textContent = formatCaja(repObj.v);
      };
      writeTotal();
      writeStock();

      const labels = Array.from(root.querySelectorAll<HTMLElement>('.rep-label'));
      const bars = Array.from(root.querySelectorAll<HTMLElement>('.rep-bar'));
      const labelObjs = REPORT_BARS.map(() => ({ v: 0 }));
      // En escritorio el scrub controla las cifras desde cero; en celular se quedan en su valor final
      // hasta que arranca la animación (así nunca se quedan pegadas en "C$0")
      if (pinned) {
        writeRep();
        labels.forEach((el) => {
          el.textContent = 'C$0';
        });
      }
      // Al desmontar o cambiar de modo (escritorio ↔ celular) se dejan los valores finales
      const restore = () => {
        if (totalEl) totalEl.textContent = formatCaja(9770);
        if (stockEl) stockEl.textContent = '19 / 30 LT';
        if (repTotalEl) repTotalEl.textContent = formatCaja(9770);
        labels.forEach((el, i) => {
          el.textContent = formatCaja(REPORT_BARS[i].amount);
        });
      };

      // Entrada de la escena 0 (una sola vez): frase y texto suben desde la máscara; la línea del ticket se "escribe"
      gsap.from(ins(sc0), {
        yPercent: 110,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true }
      });
      gsap.fromTo(
        '.una-ticket-in',
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          ease: 'power2.inOut',
          delay: 0.35,
          scrollTrigger: { trigger: root, start: 'top 80%', once: true }
        }
      );

      if (pinned) {
        const dots = Array.from(root.querySelectorAll<HTMLElement>('.escena-dot'));
        const T = [1, 2.9, 4.8];
        let active = -2;
        const setActive = (t: number) => {
          const a = t >= T[2] ? 2 : t >= T[1] ? 1 : t >= T[0] ? 0 : -1;
          if (a === active) return;
          active = a;
          dots.forEach((d, i) =>
            gsap.to(d, { opacity: i === a ? 1 : 0.3, scale: i === a ? 1.8 : 1, duration: 0.25, overwrite: true })
          );
        };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            pin: true,
            start: 'top top',
            end: '+=520%',
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => setActive(self.progress * tl.duration())
          }
        });

        // Escena 0 (salida): la frase crece y sube, la línea del ticket "dispara" y el texto se va
        tl.to('.una-phrase', { scale: 1.35, yPercent: -30, duration: 1.2 }, 0);
        tl.to('.una-ticket', { x: '110vw', ease: 'power2.in', duration: 0.9 }, 0.2);
        tl.to('.una-ticket', { opacity: 0, duration: 0.3 }, 0.8);
        tl.to('.una-cap', { opacity: 0, y: -24, ease: 'power2.in', duration: 0.4 }, 0.3);

        const wipe = (el: Element, from: string, t: number) =>
          tl.fromTo(
            el,
            { clipPath: from },
            { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.8 },
            t
          );
        const rise = (el: Element, t: number) =>
          tl.fromTo(
            ins(el),
            { yPercent: 110 },
            { yPercent: 0, ease: 'power3.out', duration: 0.5, stagger: 0.07 },
            t + 0.4
          );
        const leave = (el: Element, t: number) =>
          tl.to(ins(el), { yPercent: -110, ease: 'power2.in', duration: 0.2, stagger: 0.03 }, t + 1.6);

        // Escena 1: Caja (cortina desde abajo)
        wipe(sc1, 'inset(100% 0% 0% 0%)', T[0]);
        rise(sc1, T[0]);
        tl.fromTo('.escena-1-word', { y: 60 }, { y: -60, duration: 2.2 }, T[0]);
        tl.to(cajaObj, { v: 9770, duration: 0.8, ease: 'power1.out', onUpdate: writeTotal }, T[0] + 0.75);
        leave(sc1, T[0]);

        // Escena 2: Inventario (cortina desde la derecha)
        wipe(sc2, 'inset(0% 0% 0% 100%)', T[1]);
        rise(sc2, T[1]);
        tl.fromTo('.escena-2-word', { y: 60 }, { y: -60, duration: 2.2 }, T[1]);
        tl.fromTo(
          '.inv-bar',
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', duration: 0.5 },
          T[1] + 0.45
        );
        tl.fromTo('.inv-row', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, T[1] + 0.5);
        tl.fromTo('.inv-fill', { scaleX: 24 / 30 }, { scaleX: 19 / 30, duration: 0.5, ease: 'power1.inOut' }, T[1] + 0.85);
        tl.to(stockObj, { v: 19, duration: 0.5, ease: 'power1.inOut', onUpdate: writeStock }, T[1] + 0.85);
        tl.fromTo('.inv-fill-amber', { opacity: 0 }, { opacity: 1, duration: 0.08 }, T[1] + 0.85 + 0.4);
        tl.fromTo('.inv-warn', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2 }, T[1] + 1.3);
        tl.to(['.inv-bar', '.inv-row', '.inv-warn'], { opacity: 0, y: -20, ease: 'power2.in', duration: 0.2 }, T[1] + 1.6);
        leave(sc2, T[1]);

        // Escena 3: Reportes (cortina desde arriba) con barras que crecen, cifras que cuentan y una línea de tendencia
        wipe(sc3, 'inset(0% 0% 100% 0%)', T[2]);
        rise(sc3, T[2]);
        tl.fromTo('.escena-3-word', { y: 60 }, { y: -40, duration: 2 }, T[2]);
        tl.to(repObj, { v: 9770, duration: 1.4, ease: 'power1.out', onUpdate: writeRep }, T[2] + 0.5);
        bars.forEach((bar, i) => {
          const start = T[2] + 0.5 + i * 0.09;
          tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'back.out(1.4)' }, start);
          tl.fromTo(labels[i], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 }, start + 0.35);
          tl.to(
            labelObjs[i],
            {
              v: REPORT_BARS[i].amount,
              duration: 0.5,
              ease: 'power1.out',
              onUpdate: () => {
                labels[i].textContent = formatCaja(labelObjs[i].v);
              }
            },
            start + 0.3
          );
        });
        tl.fromTo(
          '.rep-line',
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.inOut', duration: 0.95 },
          T[2] + 0.6
        );
        tl.fromTo('.rep-bar-lima', { opacity: 0 }, { opacity: 1, duration: 0.2 }, T[2] + 1.55);
        tl.fromTo(
          '.rep-peak-tag',
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
          T[2] + 1.6
        );

        if (root.querySelector('.screen-photo-img')) {
          tl.fromTo('.screen-photo-img', { yPercent: 0 }, { yPercent: -12, duration: tl.duration() }, 0);
        }
        tl.to({}, { duration: 0.35 }, tl.duration());
        return restore;
      }

      // Celular / tablet: sin pin, cada escena se revela con recorte una sola vez
      const once = (el: Element, start = 'top 80%') => ({ trigger: el, start, once: true });
      const invBar = root.querySelector('.inv-bar') ?? sc2;
      const chart = root.querySelector('.rep-chart') ?? sc3;
      [sc0, sc1, sc2, sc3].forEach((scene) => {
        gsap.fromTo(
          scene,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.9,
            ease: 'power3.inOut',
            scrollTrigger: once(scene, 'top 85%')
          }
        );
      });
      [sc1, sc2, sc3].forEach((scene) => {
        gsap.from(ins(scene), {
          yPercent: 110,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          delay: 0.35,
          scrollTrigger: once(scene, 'top 85%')
        });
      });

      gsap.to(cajaObj, { v: 9770, duration: 1.2, ease: 'power1.out', delay: 0.6, onUpdate: writeTotal, scrollTrigger: once(sc1, 'top 70%') });

      // Inventario: arranca cuando la barra entra en pantalla (24 → 19, se pone ámbar al cruzar el mínimo)
      const invTrig = once(invBar, 'top 85%');
      gsap.set('.inv-fill', { scaleX: 24 / 30 });
      gsap.set(['.inv-fill-amber', '.inv-warn'], { opacity: 0 });
      gsap.fromTo('.inv-bar', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, delay: 0.2, scrollTrigger: invTrig });
      gsap.fromTo('.inv-row', { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2, scrollTrigger: invTrig });
      gsap.to('.inv-fill', { scaleX: 19 / 30, duration: 0.9, delay: 0.9, ease: 'power1.inOut', scrollTrigger: invTrig });
      gsap.fromTo(stockObj, { v: 24 }, { v: 19, duration: 0.9, delay: 0.9, ease: 'power1.inOut', immediateRender: false, onUpdate: writeStock, scrollTrigger: invTrig });
      gsap.to('.inv-fill-amber', { opacity: 1, duration: 0.15, delay: 1.65, scrollTrigger: invTrig });
      gsap.to('.inv-warn', { opacity: 1, duration: 0.3, delay: 1.8, scrollTrigger: invTrig });

      // Reportes: las barras crecen desde abajo, así que la animación arranca recién cuando el gráfico
      // entra COMPLETO en pantalla (antes corría con el borde inferior fuera de vista y no se veía).
      // Se repite cada vez que volvés al gráfico y se reinicia cuando sale del todo de la pantalla.
      const repTl = gsap.timeline({ paused: true });
      repTl.fromTo(repObj, { v: 0 }, { v: 9770, duration: 1.9, ease: 'power2.out', onUpdate: writeRep }, 0);
      bars.forEach((bar, i) => {
        const s = 0.1 + i * 0.12;
        repTl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.75, ease: 'back.out(1.4)' }, s);
        repTl.fromTo(labels[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, s + 0.4);
        repTl.fromTo(
          labelObjs[i],
          { v: 0 },
          {
            v: REPORT_BARS[i].amount,
            duration: 0.6,
            ease: 'power1.out',
            onUpdate: () => {
              labels[i].textContent = formatCaja(labelObjs[i].v);
            }
          },
          s + 0.3
        );
      });
      repTl.fromTo('.rep-line', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power1.inOut' }, 0.35);
      repTl.fromTo('.rep-bar-lima', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.3);
      repTl.fromTo('.rep-peak-tag', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, 1.4);
      repTl.progress(0).pause();
      labels.forEach((el) => {
        el.textContent = 'C$0';
      });

      // Gráfico completo a la vista (bajando: su borde inferior llega al fondo; subiendo: su borde superior llega arriba)
      ScrollTrigger.create({
        trigger: chart,
        start: 'bottom bottom',
        end: 'top top',
        onEnter: () => repTl.restart(),
        onEnterBack: () => repTl.restart()
      });
      // Gráfico fuera de la pantalla: se deja en cero para que se vuelva a ver la próxima vez
      ScrollTrigger.create({
        trigger: chart,
        start: 'top bottom',
        end: 'bottom top',
        onLeave: () => repTl.pause(0),
        onLeaveBack: () => repTl.pause(0)
      });

      // En celular no hay Lenis: recalcular posiciones cuando cargan las fuentes (cambian la altura de los títulos)
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
      return restore;
    },
    { scope: rootRef, dependencies: [pinned, reduced], revertOnUpdate: true }
  );

  // Escritorio fijado: posiciones absolutas por escena. Celular/tablet: flujo normal (título → cifra → texto), sin huecos
  const sceneBase = pinned ? 'absolute inset-0' : 'relative flex flex-col gap-8 px-[5vw] pt-16 pb-14 sm:pt-24 sm:pb-20';
  const P = (pinnedCls: string, flowCls = '') => (pinned ? pinnedCls : flowCls);
  const bigWord = 'font-serif leading-[1] tracking-[-0.03em] will-change-transform';

  return (
    <section
      id="una-venta"
      ref={rootRef}
      aria-labelledby="una-venta-titulo"
      className={`relative w-full overflow-hidden bg-[#FAFAF8] ${pinned ? 'h-screen' : ''}`}
    >
      {/* Escena 0: Una venta. */}
      <div className={`escena escena-0 ${sceneBase} overflow-hidden bg-[#FAFAF8] text-[#141414]`}>
        <div className={P('absolute inset-x-0 top-[20vh] px-[4vw]')}>
          <h2
            id="una-venta-titulo"
            className={`una-phrase origin-left ${bigWord} ${P('text-[16vw]', 'text-[clamp(64px,20vw,200px)]')}`}
          >
            <MaskLine>Una venta.</MaskLine>
          </h2>
          <p className="una-ticket mt-[3vh] font-mono text-[clamp(11px,1.25vw,18px)] text-[#141414] will-change-transform">
            <span className="una-ticket-in flex items-start gap-2.5">
              <span className="mt-[0.45em] inline-block h-2 w-2 shrink-0 rounded-full bg-[#5FA22B]" aria-hidden="true" />
              <span>Cobro registrado · Ticket #00428 · +C$1,320.00</span>
            </span>
          </p>
        </div>
        <div className={`una-cap max-w-[34ch] text-sm sm:text-base text-[#4A4A4A] ${P('absolute bottom-[6vh] left-[4vw]')}`}>
          <MaskLine>Una sola venta mueve tu caja, tu inventario y tus reportes.</MaskLine>
        </div>
      </div>

      {/* Escena 1: Caja */}
      <div className={`escena escena-1 ${sceneBase} overflow-hidden bg-[#141414] text-[#FAFAF8]`}>
        <ScreenPhoto
          file={AVAILABLE_SCREENS.caja}
          alt="Pantalla de caja del POS"
          className={P('absolute bottom-[10vh] right-[4vw] h-[32vh] w-[34vw]', 'relative order-last h-[36vh] w-full')}
        />
        <h3
          className={`escena-1-word ${bigWord} ${P('absolute left-[4vw] top-[6vh] text-[20vw]', 'text-[clamp(72px,24vw,220px)]')}`}
          style={blendStyle}
        >
          <MaskLine>Caja</MaskLine>
        </h3>
        <div className={P('absolute right-[4vw] top-[34vh] text-right')}>
          <div className="overflow-hidden">
            <span data-in className="mb-2 block text-xs uppercase tracking-wider text-[#A3A3A3]">
              Total del día en caja
            </span>
          </div>
          <MaskLine
            className={`escena-total font-serif leading-[1] tracking-[-0.03em] text-[#8FD14F] ${P('text-[14vw]', 'text-[clamp(52px,17vw,160px)]')}`}
          >
            C$9,770
          </MaskLine>
        </div>
        <div className={`max-w-[34ch] text-sm sm:text-base text-[#D4D4D0] ${P('absolute bottom-[6vh] left-[4vw]')}`}>
          <MaskLine>Cobrás en córdobas o dólares y el total del día se actualiza.</MaskLine>
        </div>
      </div>

      {/* Escena 2: Inventario */}
      <div className={`escena escena-2 ${sceneBase} overflow-hidden bg-[#FAFAF8] text-[#141414]`}>
        <ScreenPhoto
          file={AVAILABLE_SCREENS.inventario}
          alt="Pantalla de inventario del POS"
          className={P('absolute bottom-[8vh] right-[4vw] h-[26vh] w-[30vw]', 'relative order-last h-[32vh] w-full')}
        />
        <h3
          className={`escena-2-word ${bigWord} ${P('absolute left-[4vw] top-[6vh] text-[19vw]', 'text-[clamp(56px,17.5vw,200px)]')}`}
          style={blendStyle}
        >
          <MaskLine>Inventario</MaskLine>
        </h3>
        <div className={P('', 'flex flex-col')}>
          <div className={`inv-row flex items-baseline justify-between ${P('absolute inset-x-[4vw] top-[50vh]', 'mb-3')}`}>
            <span className="text-sm font-medium">Aceite 15W40</span>
            <span className="escena-stock font-mono text-sm font-bold">19 / 30 LT</span>
          </div>
          <div className={`inv-bar bg-[#E8E8E4] ${P('absolute inset-x-0 top-[56vh] h-[8vh]', 'relative -mx-[5vw] h-14')}`}>
            <div
              className="inv-fill absolute inset-0 origin-left will-change-transform"
              style={{ transform: `scaleX(${19 / 30})` }}
            >
              <div className="absolute inset-0 bg-[#141414]" />
              <div className="inv-fill-amber absolute inset-0 bg-[#F59E0B]" />
            </div>
            <div className="absolute -bottom-2 -top-2 w-0.5 bg-[#141414]" style={{ left: '66.667%' }} aria-hidden="true" />
          </div>
          <p className={`inv-warn text-xs font-semibold text-[#B45309] ${P('absolute left-[4vw] top-[67vh]', 'mt-4')}`}>
            Bajo el mínimo
          </p>
        </div>
        <div className={`max-w-[34ch] text-sm sm:text-base text-[#4A4A4A] ${P('absolute bottom-[6vh] left-[4vw]')}`}>
          <MaskLine>Cada venta descuenta lo que gastó y te avisa antes de quedarte sin stock.</MaskLine>
        </div>
      </div>

      {/* Escena 3: Reportes */}
      <div className={`escena escena-3 ${sceneBase} overflow-hidden bg-[#141414] text-[#FAFAF8] ${P('', '!pb-0')}`}>
        <ScreenPhoto
          file={AVAILABLE_SCREENS.reportes}
          alt="Pantalla del backoffice de reportes"
          className={P('absolute right-[4vw] top-[8vh] h-[24vh] w-[28vw]', 'relative h-[30vh] w-full')}
        />
        <h3
          className={`escena-3-word ${bigWord} ${P('absolute left-[4vw] top-[6vh] text-[19vw]', 'text-[clamp(60px,19vw,200px)]')}`}
          style={blendStyle}
        >
          <MaskLine>Reportes</MaskLine>
        </h3>
        <div className={P('absolute right-[4vw] top-[8vh] text-right', '-mt-4')}>
          <div className="overflow-hidden">
            <span data-in className="block text-xs uppercase tracking-wider text-[#A3A3A3]">
              Ventas de hoy
            </span>
          </div>
          <MaskLine
            className={`rep-total font-serif leading-[1] tracking-[-0.02em] text-[#8FD14F] ${P('text-[clamp(32px,6vw,96px)]', 'text-[clamp(44px,12vw,96px)]')}`}
          >
            C$9,770
          </MaskLine>
        </div>
        <div className={`max-w-[34ch] text-sm sm:text-base text-[#D4D4D0] ${P('absolute bottom-[calc(46vh+9vh)] left-[4vw]')}`}>
          <MaskLine>Mirá cómo va tu negocio desde el celular.</MaskLine>
        </div>

        <div className={P('absolute inset-x-0 bottom-0 h-[46vh]', 'rep-chart relative -mx-[5vw] mt-12 h-[clamp(240px,42svh,420px)]')}>
          <div className={`flex h-full items-end ${P('gap-1', 'gap-[3px]')}`}>
            {REPORT_BARS.map((bar) => (
              <div key={bar.hour} className="relative h-full min-w-0 flex-1">
                <div
                  className="absolute bottom-0 w-full"
                  style={{ height: `${(bar.amount / REPORT_MAX) * 100}%` }}
                >
                  <div className="rep-bar absolute inset-0 origin-bottom will-change-transform">
                    <div className="absolute inset-0 bg-[#FAFAF8]/85" />
                    {bar.peak && <div className="rep-bar-lima absolute inset-0 bg-[#8FD14F]" />}
                  </div>
                  <span
                    className={`rep-label absolute left-0 right-0 whitespace-nowrap text-center font-mono text-[#FAFAF8] ${P(
                      '-top-6 text-[11px]',
                      '-top-5 text-[9px] sm:text-[11px]'
                    )}`}
                  >
                    {formatCaja(bar.amount)}
                  </span>
                  {bar.peak && (
                    <span
                      className={`rep-peak-tag absolute left-0 right-0 text-center font-semibold uppercase tracking-wider ${P(
                        '-top-12 text-[11px] text-[#8FD14F]',
                        'top-2 text-[9px] leading-tight text-[#141414] sm:text-[11px]'
                      )}`}
                    >
                      Hora pico
                    </span>
                  )}
                </div>
                <span className="absolute bottom-2 left-0 right-0 z-10 text-center font-mono text-[10px] text-[#141414] sm:left-2 sm:text-left">
                  {bar.hour}
                </span>
              </div>
            ))}
          </div>
          {/* Línea de tendencia: en pantallas angostas chocaría con las cifras, así que solo va de sm para arriba */}
          <svg
            className={`rep-line pointer-events-none absolute inset-0 h-full w-full ${P('', 'hidden sm:block')}`}
            viewBox="0 -3 700 106"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={REPORT_BARS.map((b, i) => `${(i + 0.5) * 100},${100 - (b.amount / REPORT_MAX) * 100}`).join(' ')}
              fill="none"
              stroke="#8FD14F"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>

      {/* Progreso discreto: tres puntos (sin números) */}
      {pinned && (
        <div
          className="pointer-events-none absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3"
          style={{ mixBlendMode: 'difference' }}
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="escena-dot block h-1.5 w-1.5 rounded-full bg-white" style={{ opacity: 0.3 }} />
          ))}
        </div>
      )}
    </section>
  );
};

