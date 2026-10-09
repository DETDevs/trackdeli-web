import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { MaskLine, RubroTicket } from '../components/ui';
import { RubroKey, TicketRubro, RUBROS_DATA, RUBRO_DIRS, blendStyle, fmtStock } from '../data/constants';

export const RubrosSectionGSAP: React.FC<{
  tickets: Record<RubroKey, TicketRubro>;
  lenisRef: React.MutableRefObject<Lenis | null>;
  prefersReducedMotion: boolean;
  pinned: boolean;
}> = ({ tickets, lenisRef, prefersReducedMotion, pinned }) => {
  const rootRef = useRef<HTMLElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = prefersReducedMotion;
  const STEP = 1.7;

  const scrollToRubro = (idx: number) => {
    const tl = tlRef.current;
    const st = tl?.scrollTrigger;
    if (!tl || !st) return;
    const progress = (1 + idx * STEP + 1.1) / tl.duration();
    const y = st.start + Math.min(1, progress) * (st.end - st.start);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  useGSAP(
    () => {
      const root = rootRef.current;
      if (reduced || !root) return;

      const intro = root.querySelector<HTMLElement>('.rubro-intro');
      const scenes = Array.from(root.querySelectorAll<HTMLElement>('.rubro-scene'));
      if (!intro || scenes.length !== RUBROS_DATA.length) return;
      const ins = (el: Element) => Array.from(el.querySelectorAll<HTMLElement>('[data-in]'));
      const stocksOf = (scene: HTMLElement) => Array.from(scene.querySelectorAll<HTMLElement>('.rubro-stock'));

      // Valores iniciales de existencia (cuentan hacia atrás hasta el nuevo valor)
      scenes.forEach((scene, i) => {
        const inv = tickets[RUBROS_DATA[i].id].inventory;
        stocksOf(scene).forEach((el, k) => {
          el.textContent = fmtStock(inv[k], inv[k].fromStock);
        });
      });

      // Entrada del título de la sección (una sola vez)
      gsap.from(ins(intro), {
        yPercent: 110,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.09,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true }
      });

      if (pinned) {
        const dots = Array.from(root.querySelectorAll<HTMLElement>('.rubro-dot'));
        let active = -2;
        const setActive = (t: number) => {
          const a = t < 0.9 ? -1 : Math.min(RUBROS_DATA.length - 1, Math.floor((t - 0.9) / STEP));
          if (a === active) return;
          active = a;
          dots.forEach((d, i) => {
            d.setAttribute('aria-current', i === a ? 'true' : 'false');
            gsap.to(d.firstElementChild, { opacity: i === a ? 1 : 0.3, scale: i === a ? 1.8 : 1, duration: 0.25, overwrite: true });
          });
        };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            pin: true,
            start: 'top top',
            end: '+=700%',
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => setActive(self.progress * tl.duration())
          }
        });
        tlRef.current = tl;

        tl.fromTo('.rubro-progress', { scaleX: 0 }, { scaleX: 1, duration: 7.4 }, 0);
        tl.to('.intro-block', { yPercent: -20, opacity: 0, ease: 'power2.in', duration: 0.35 }, 0.6);

        scenes.forEach((scene, i) => {
          const t = 1 + i * STEP;
          const lines = ins(scene);
          const print = scene.querySelector<HTMLElement>('.rubro-ticket-print');
          const wrap = scene.querySelector<HTMLElement>('.rubro-ticket-wrap');
          const title = scene.querySelector<HTMLElement>('.rubro-title');
          const stamp = scene.querySelector<HTMLElement>('.rubro-stamp');

          tl.fromTo(
            scene,
            { clipPath: RUBRO_DIRS[i % RUBRO_DIRS.length] },
            { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.8 },
            t
          );
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, ease: 'power3.out', duration: 0.5, stagger: 0.06 }, t + 0.4);
          // Parallax: el texto se mueve un poco más rápido (1.1x) que el ticket (0.85x)
          if (title) tl.fromTo(title, { y: 44 }, { y: -44, duration: STEP + 0.3 }, t);
          if (wrap) tl.fromTo(wrap, { y: 34 }, { y: -34, duration: STEP + 0.3 }, t);
          if (print) {
            tl.fromTo(
              print,
              { y: 160, clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 },
              { y: 0, clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, ease: 'power2.out', duration: 0.6 },
              t + 0.4
            );
          }
          const invData = tickets[RUBROS_DATA[i].id].inventory;
          stocksOf(scene).forEach((el, k) => {
            const obj = { v: invData[k].fromStock };
            tl.to(
              obj,
              {
                v: invData[k].toStock,
                duration: 0.4,
                ease: 'power1.out',
                snap: { v: invData[k].decimals ? 0.01 : 1 },
                onUpdate: () => {
                  el.textContent = fmtStock(invData[k], obj.v);
                }
              },
              t + 0.75
            );
          });
          if (stamp) {
            tl.fromTo(
              stamp,
              { scale: 0, rotation: -12, opacity: 0 },
              { scale: 1, rotation: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
              t + 0.95
            );
          }
          // Salida (menos la última): el texto sube y se esconde, el ticket sube y se inclina
          if (i < scenes.length - 1) {
            tl.to(lines, { yPercent: -110, ease: 'power2.in', duration: 0.2, stagger: 0.02 }, t + 1.4);
            if (print) tl.to(print, { y: -160, rotation: -2.5, opacity: 0, ease: 'power2.in', duration: 0.2 }, t + 1.4);
          }
        });

        tl.to({}, { duration: 0.35 }, tl.duration());
        return;
      }

      // Celular / tablet: sin pin ni parallax; cada bloque se revela una sola vez
      const once = (el: Element) => ({ trigger: el, start: 'top 80%', once: true });
      [intro, ...scenes].forEach((scene) => {
        gsap.fromTo(
          scene,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.inOut', scrollTrigger: once(scene) }
        );
      });
      scenes.forEach((scene, i) => {
        const trig = once(scene);
        gsap.from(ins(scene), { yPercent: 110, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.35, scrollTrigger: trig });
        const print = scene.querySelector<HTMLElement>('.rubro-ticket-print');
        const stamp = scene.querySelector<HTMLElement>('.rubro-stamp');
        if (print) {
          gsap.fromTo(
            print,
            { y: 80, clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 },
            { y: 0, clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.8, delay: 0.5, ease: 'power2.out', scrollTrigger: trig }
          );
        }
        const inv = tickets[RUBROS_DATA[i].id].inventory;
        stocksOf(scene).forEach((el, k) => {
          const obj = { v: inv[k].fromStock };
          gsap.to(obj, {
            v: inv[k].toStock,
            duration: 0.6,
            delay: 1.1,
            ease: 'power1.out',
            snap: { v: inv[k].decimals ? 0.01 : 1 },
            onUpdate: () => {
              el.textContent = fmtStock(inv[k], obj.v);
            },
            scrollTrigger: trig
          });
        });
        if (stamp) {
          gsap.fromTo(
            stamp,
            { scale: 0, rotation: -12, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.4, delay: 1.4, ease: 'back.out(1.7)', scrollTrigger: trig }
          );
        }
      });
    },
    { scope: rootRef, dependencies: [pinned, reduced, tickets], revertOnUpdate: true }
  );

  const base = pinned ? 'absolute inset-0' : 'relative';
  const stackedCol = pinned ? '' : 'flex flex-col gap-8 px-[5vw] pt-16 pb-16 sm:pt-24 sm:pb-24';

  return (
    <section
      id="rubros-showcase"
      ref={rootRef}
      aria-labelledby="rubros-titulo"
      className={`relative w-full overflow-hidden bg-[#FAFAF8] ${pinned ? 'h-screen' : ''}`}
    >
      {/* Intro: título de la sección */}
      <div className={`rubro-intro ${base} ${stackedCol} overflow-hidden bg-[#FAFAF8] text-[#141414]`}>
        <div className={`intro-block ${pinned ? 'absolute inset-x-0 top-[16vh] px-[4vw]' : ''}`}>
          <h2
            id="rubros-titulo"
            className="font-serif text-[clamp(44px,9.5vw,180px)] leading-[1] tracking-[-0.03em]"
          >
            <MaskLine>Hecho para</MaskLine>
            <MaskLine>cómo trabaja</MaskLine>
            <MaskLine>tu negocio</MaskLine>
          </h2>
          <div className="mt-6 max-w-[40ch] text-sm sm:text-base text-[#4A4A4A]">
            <MaskLine>Adaptado a la dinámica real de tu mostrador, mesa o taller en Nicaragua.</MaskLine>
          </div>
        </div>
      </div>

      {/* Escenas por rubro */}
      {RUBROS_DATA.map((rubro, i) => {
        const dark = i % 2 === 0;
        const ticket = tickets[rubro.id];
        return (
          <div
            key={rubro.id}
            className={`rubro-scene ${base} ${stackedCol} overflow-hidden ${
              dark ? 'bg-[#141414] text-[#FAFAF8]' : 'bg-[#FAFAF8] text-[#141414]'
            }`}
          >
            <h3
              className={`rubro-title font-serif text-[clamp(44px,8.4vw,160px)] leading-[1] tracking-[-0.03em] will-change-transform ${
                pinned ? 'absolute left-[4vw] top-[10vh]' : ''
              }`}
              style={blendStyle}
            >
              {rubro.titleLines.map((line) => (
                <MaskLine key={line}>{line}</MaskLine>
              ))}
            </h3>

            <div
              className={`max-w-[40ch] text-sm sm:text-base ${dark ? 'text-[#D4D4D0]' : 'text-[#4A4A4A]'} ${
                pinned ? 'absolute bottom-[8vh] left-[4vw]' : ''
              }`}
            >
              <MaskLine>{rubro.fullDesc}</MaskLine>
            </div>

            <div className={pinned ? 'absolute right-[6vw] top-1/2 w-full max-w-[340px] -translate-y-1/2' : 'w-full max-w-[340px]'}>
              <RubroTicket ticket={ticket} edgeColor={dark ? '#141414' : '#FAFAF8'} />
            </div>
          </div>
        );
      })}

      {pinned && (
        <>
          <div className="rubro-progress absolute inset-x-0 bottom-0 z-20 h-[3px] origin-left bg-[#8FD14F]" style={{ transform: 'scaleX(0)' }} />
          <div
            className="pointer-events-none absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1"
            style={{ mixBlendMode: 'difference' }}
          >
            {RUBROS_DATA.map((rubro, i) => (
              <button
                key={rubro.id}
                type="button"
                onClick={() => scrollToRubro(i)}
                aria-label={`Ir a ${rubro.name}`}
                aria-current="false"
                className="rubro-dot pointer-events-auto flex h-5 w-5 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-white"
              >
                <span className="block h-1.5 w-1.5 rounded-full bg-white" style={{ opacity: 0.3 }} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

