import React, { useState, useEffect, useRef } from 'react';
import { DownloadSimple, WhatsappLogo, CheckCircle, WindowsLogo, Info } from '@phosphor-icons/react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import { ReleaseInfo, FALLBACK_RELEASE, WHATSAPP_TEST_URL, WHATSAPP_QUOTE_URL, WHATSAPP_SUPPORT_URL, RubroKey, TICKETS } from './data/constants';
import { SawtoothDivider, TicketReceiptBody } from './components/ui';
import { UnaVentaScenes } from './sections/UnaVentaScenes';
import { RubrosSectionGSAP } from './sections/RubrosSectionGSAP';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const App: React.FC = () => {
  const [selectedRubro, setSelectedRubro] = useState<RubroKey>('ferreteria');
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);
  const [isWindows, setIsWindows] = useState<boolean>(true);
  const [apiError, setApiError] = useState<boolean>(false);
  const [loadingRelease, setLoadingRelease] = useState<boolean>(true);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'started'>('idle');
  const lenisRef = useRef<Lenis | null>(null);

  // Preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  // Pointer device check (fine vs coarse)
  const [isFinePointer, setIsFinePointer] = useState<boolean>(false);

  // Tilt state for thermal receipt
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; glareX: number; glareY: number }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50
  });

  // Section 4 Price element refs for GSAP
  const priceRef = useRef<HTMLDivElement>(null);
  const priceBgRef = useRef<HTMLDivElement>(null);
  const priceNumberRef = useRef<HTMLSpanElement>(null);

  // Hero wordmark refs
  const heroRef = useRef<HTMLElement>(null);
  const wmFixedRef = useRef<HTMLDivElement>(null);
  const wmStaticRef = useRef<HTMLSpanElement>(null);
  const brandWordRef = useRef<HTMLSpanElement>(null);

  // Desktop width (>= 1024px)
  const [isDesktopW, setIsDesktopW] = useState<boolean>(false);
  // Pinned / scroll-driven layout only on desktop with fine pointer and no reduced motion
  const pinned = !prefersReducedMotion && isDesktopW && isFinePointer;

  // Texture Parallax
  const { scrollY } = useScroll();
  const dotParallax = useTransform(scrollY, [0, 3000], [0, 24]);

  // Detect motion preferences & pointer type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(false); // Forzado a false para asegurar que las animaciones siempre corran
      const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      setIsFinePointer(pointerQuery.matches);
      const desktopQuery = window.matchMedia('(min-width: 1024px)');
      setIsDesktopW(desktopQuery.matches);

      const handleMotionChange = () => setPrefersReducedMotion(false); // e.matches
      const handleDesktopChange = (e: MediaQueryListEvent) => setIsDesktopW(e.matches);
      motionQuery.addEventListener('change', handleMotionChange);
      desktopQuery.addEventListener('change', handleDesktopChange);
      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
        desktopQuery.removeEventListener('change', handleDesktopChange);
      };
    }
  }, []);

  // Hero wordmark: desktop = settles into the header logo (scroll 0 -> 400px); mobile = light parallax only
  useGSAP(
    () => {
      if (prefersReducedMotion) return;
      const hero = heroRef.current;
      if (!hero) return;

      if (pinned) {
        const wm = wmFixedRef.current;
        const brand = brandWordRef.current;
        if (!wm || !brand) return;

        const SPAN = 400;
        const ease = gsap.parseEase('power2.inOut');
        const m = { x0: 0, y0: 0, tx: 0, ty: 0, k: 1 };

        const render = () => {
          const s = window.scrollY;
          const p = Math.min(1, Math.max(0, s / SPAN));
          const e = ease(p);
          const yStart = m.y0 - s;
          gsap.set(wm, {
            x: m.x0 + (m.tx - m.x0) * e,
            y: yStart + (m.ty - yStart) * e,
            scale: 1 + (m.k - 1) * e,
            clipPath: `inset(0% 0% ${36 * (1 - e)}% 0%)`,
            zIndex: p >= 0.92 ? 50 : 5
          });
        };

        const measure = () => {
          const w = wm.offsetWidth;
          const h = wm.offsetHeight;
          if (!w || !h) return;
          const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
          const br = brand.getBoundingClientRect();
          m.x0 = (window.innerWidth - w) / 2;
          m.y0 = heroBottom - h * 0.64;
          m.k = br.height / h;
          m.tx = br.left;
          m.ty = br.top;
          gsap.set(wm, { opacity: 1 });
          render();
        };

        measure();
        const st = ScrollTrigger.create({
          start: 0,
          end: SPAN,
          onUpdate: render,
          onLeave: render,
          onLeaveBack: render
        });
        ScrollTrigger.addEventListener('refresh', measure);
        if (typeof document !== 'undefined' && document.fonts) {
          document.fonts.ready.then(measure);
        }
        return () => {
          ScrollTrigger.removeEventListener('refresh', measure);
          st.kill();
        };
      }

      // Celular / tablet: sin acomodo en el logo, solo parallax leve
      const inner = wmStaticRef.current;
      if (inner) {
        gsap.fromTo(
          inner,
          { yPercent: 18 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true }
          }
        );
      }
    },
    { dependencies: [pinned, prefersReducedMotion], revertOnUpdate: true }
  );

  // Smooth scroll via Lenis + ScrollTrigger (official integration pattern)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      window.innerWidth >= 1024;
    if (!isDesktop) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5
    });
    lenisRef.current = lenis;

    // 1. lenis.on('scroll', ScrollTrigger.update)
    lenis.on('scroll', ScrollTrigger.update);

    // 2. gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0)
    const tickerUpdate = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerUpdate);
    gsap.ticker.lagSmoothing(0);

    // 3. ScrollTrigger.refresh() on fonts ready and window resize
    const refreshST = () => {
      ScrollTrigger.refresh();
    };
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(refreshST);
    }
    window.addEventListener('resize', refreshST);

    // Intercept anchor clicks
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (target) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('#') && href.length > 1) {
          const el = document.querySelector(href);
          if (el) {
            e.preventDefault();
            lenis.scrollTo(el as HTMLElement, { offset: -20 });
          }
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    return () => {
      window.removeEventListener('resize', refreshST);
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(tickerUpdate);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  // General Zara-style entrances (section h2s + $45 price block)
  useGSAP(
    () => {
      if (prefersReducedMotion) return;

      // 1. Zara-style masked line entrance for all section h2s once (start: "top 85%")
      const h2Elements = gsap.utils.toArray<HTMLElement>('.zara-reveal-h2');
      h2Elements.forEach((h2) => {
        gsap.from(h2, {
          yPercent: 110,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: h2,
            start: 'top 85%',
            once: true
          }
        });
      });

      // 2. Price block: scale 1.15 -> 1 (700 ms) and count 0 -> 45
      if (priceRef.current && priceNumberRef.current) {
        const priceObj = { val: 0 };
        const priceTl = gsap.timeline({
          scrollTrigger: {
            trigger: priceRef.current,
            start: 'top 85%',
            once: true
          }
        });

        priceTl.fromTo(
          priceNumberRef.current,
          { scale: 1.15 },
          { scale: 1, duration: 0.7, ease: 'power2.out' },
          0
        );

        priceTl.to(
          priceObj,
          {
            val: 45,
            duration: 0.7,
            ease: 'power2.out',
            snap: { val: 1 },
            onUpdate: () => {
              if (priceNumberRef.current) {
                priceNumberRef.current.textContent = `$${Math.round(priceObj.val)}`;
              }
            }
          },
          0
        );

        if (priceBgRef.current) {
          gsap.fromTo(
            priceBgRef.current,
            { y: 70 },
            {
              y: -70,
              ease: 'none',
              scrollTrigger: {
                trigger: priceRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
              }
            }
          );
        }
      }
    },
    { dependencies: [prefersReducedMotion] }
  );

  // Detect OS & fetch release
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isWin = ua.includes('windows') || ua.includes('win32');
      setIsWindows(isWin);
    }

    const fetchLatestRelease = async () => {
      try {
        const res = await fetch(
          'https://api.github.com/repos/edwin08torres/nexol-pos-releases/releases/latest'
        );
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();

        const exeAsset = data.assets?.find(
          (a: any) =>
            typeof a.name === 'string' &&
            a.name.toLowerCase().endsWith('.exe') &&
            !a.name.toLowerCase().endsWith('.blockmap')
        );

        if (exeAsset) {
          const rawVersion = data.tag_name ? data.tag_name.replace(/^v/i, '') : data.name || '1.0.1';
          const sizeMB = exeAsset.size ? Math.round(exeAsset.size / (1024 * 1024)) : 85;
          let pubDate = '';
          if (exeAsset.updated_at || data.published_at) {
            const dateObj = new Date(exeAsset.updated_at || data.published_at);
            pubDate = dateObj.toLocaleDateString('es-NI', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          }

          setRelease({
            version: rawVersion,
            sizeMB,
            downloadUrl: exeAsset.browser_download_url,
            publishedDate: pubDate
          });
        } else {
          setApiError(true);
        }
      } catch {
        setApiError(true);
      } finally {
        setLoadingRelease(false);
      }
    };

    fetchLatestRelease();
  }, []);

  // 3D Tilt handlers
  const handleTicketMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFinePointer || prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 5;
    const rotateX = -((y - centerY) / centerY) * 5;
    setTilt({
      rotateX,
      rotateY,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100
    });
  };

  const handleTicketMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  // Download button handler
  const handleDownloadClick = (e: React.MouseEvent) => {
    if (!isWindows) {
      e.preventDefault();
      alert('Esta descarga es para computadoras con Windows 10 u 11.');
      return;
    }
    setDownloadState('downloading');
    setTimeout(() => {
      setDownloadState('started');
    }, 1200);
  };

  const activeTicket = TICKETS[selectedRubro];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141414] font-sans relative selection:bg-[#8FD14F] selection:text-[#141414]">
      {/* Subtle Dot Texture with Parallax */}
      <motion.div
        style={{ y: prefersReducedMotion ? 0 : dotParallax }}
        className="pointer-events-none fixed inset-0 z-0 bg-dots-pattern opacity-[0.035]"
        aria-hidden="true"
      />

      {/* Giant wordmark (desktop): follows the hero edge, then settles into the header logo */}
      {pinned && (
        <div
          ref={wmFixedRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[5] select-none whitespace-nowrap font-serif text-[28vw] leading-none"
          style={{
            color: '#FFFFFF',
            mixBlendMode: 'difference',
            opacity: 0,
            transformOrigin: '0 0',
            willChange: 'transform'
          }}
        >
          Nexol
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#E8E8E4] bg-[#FAFAF8]/95 backdrop-blur-xs sticky top-0 z-40">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group text-[#141414]">
            <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-serif text-xl leading-none">
              N
            </div>
            <span className="flex items-baseline gap-1.5 text-[#141414]">
              <span
                ref={brandWordRef}
                className={`inline-block font-serif text-2xl leading-none tracking-tight ${pinned ? 'invisible' : ''}`}
              >
                Nexol
              </span>
              <span className="text-xs font-semibold tracking-wide text-[#4A4A4A]">POS</span>
            </span>
          </a>

          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <a
              href="#descargar"
              className="text-[#6B6B6B] hover:text-[#141414] transition-colors py-1.5 font-medium"
            >
              Descargar
            </a>
            <motion.a
              href={WHATSAPP_TEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#141414] text-[#FAFAF8] font-medium text-xs sm:text-sm hover:bg-black transition-all cursor-pointer"
            >
              <WhatsappLogo size={16} weight="fill" />
              <span>Pedir prueba</span>
            </motion.a>
          </nav>
        </div>
      </header>

      <main className="relative">
        {/* 1. Hero Section */}
        <section
          ref={heroRef}
          className="relative pt-12 sm:pt-16 pb-[28vw] sm:pb-[25vw] lg:pb-[16vw] border-b border-[#E8E8E4]"
        >
          {/* Wordmark estático (celular/tablet/reduced motion): recortado a la mitad por el borde inferior */}
          {!pinned && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.64em] overflow-hidden text-[34vw] leading-none select-none"
            >
              <span
                ref={wmStaticRef}
                className="block whitespace-nowrap text-center font-serif leading-none"
                style={{ color: '#FFFFFF', mixBlendMode: 'difference', willChange: 'transform' }}
              >
                Nexol
              </span>
            </div>
          )}
          <div className="relative z-10 max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              {/* Left Column: Line-by-line Masked Title Reveal */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                <h1 className="font-serif text-[36px] sm:text-[44px] md:text-[56px] lg:text-[68px] leading-[1.05] tracking-[-0.01em] text-[#141414] text-left">
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      Cobrás una vez.
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      Tu inventario, tu caja
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.23, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      y tus reportes se enteran.
                    </motion.span>
                  </span>
                </h1>

                {/* Subtitle fading in place */}
                <motion.p
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.36, ease: 'easeOut' }}
                  className="mt-6 text-[18px] leading-[1.6] text-[#6B6B6B] max-w-[70ch] text-left font-sans"
                >
                  Nexol POS es la caja, el inventario y los reportes de tu comercio, restaurante, ferretería, farmacia o taller en Nicaragua.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.45, ease: 'easeOut' }}
                  className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto"
                >
                  {/* WhatsApp button with single discreet pulse */}
                  <motion.a
                    href={WHATSAPP_TEST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.98 }}
                    animate={
                      prefersReducedMotion
                        ? {}
                        : {
                            scale: [1, 1.03, 1]
                          }
                    }
                    transition={{ duration: 0.55, delay: 1.1, ease: 'easeInOut' }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#8FD14F] text-[#141414] font-medium text-base hover:brightness-95 transition-all text-center cursor-pointer shadow-xs"
                  >
                    <WhatsappLogo size={20} weight="fill" />
                    <span>Pedir prueba de 6 horas</span>
                  </motion.a>

                  <motion.a
                    href="#descargar"
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-[#E8E8E4] bg-[#FFFFFF] text-[#141414] font-medium text-base hover:bg-[#F2F2EF] transition-colors text-center cursor-pointer"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    <span>Descargar para Windows</span>
                  </motion.a>
                </motion.div>

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.52 }}
                  className="mt-6 flex items-center gap-2 text-xs text-[#6B6B6B]"
                >
                  <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                  <span>Prueba de 6 horas, sin compromiso</span>
                </motion.div>
              </div>

              {/* Right Column: Thermal Receipt with 3D Tilt & Printer Emerge */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-end w-full">
                <div
                  onMouseMove={handleTicketMouseMove}
                  onMouseLeave={handleTicketMouseLeave}
                  className="w-full max-w-[340px] relative"
                  style={{
                    perspective: isFinePointer && !prefersReducedMotion ? '1000px' : undefined
                  }}
                >
                  {/* Printer Slot */}
                  <div className="w-full h-3.5 bg-[#141414] rounded-t-md shadow-inner flex items-center justify-center px-6 relative z-20">
                    <div className="w-full h-[2px] bg-[#292929]" />
                  </div>

                  {/* Ticket Container with AnimatePresence for tear-off on switch */}
                  <div className="overflow-hidden relative z-10 pt-0.5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedRubro}
                        initial={prefersReducedMotion ? false : { y: -340, opacity: 0 }}
                        animate={{
                          y: 0,
                          opacity: 1,
                          rotateX: isFinePointer && !prefersReducedMotion ? tilt.rotateX : 0,
                          rotateY: isFinePointer && !prefersReducedMotion ? tilt.rotateY : 0
                        }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { y: -340, opacity: 0 }}
                        transition={{
                          y: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: 0.3 },
                          rotateX: { duration: 0.15, ease: 'easeOut' },
                          rotateY: { duration: 0.15, ease: 'easeOut' }
                        }}
                        className="relative"
                      >
                        {/* Thermal Paper Sheen Layer (Desktop only) */}
                        {isFinePointer && !prefersReducedMotion && (
                          <div
                            className="pointer-events-none absolute inset-0 z-30 opacity-15"
                            style={{
                              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.9), transparent 60%)`
                            }}
                            aria-hidden="true"
                          />
                        )}

                        <TicketReceiptBody
                          ticket={activeTicket}
                          rubroKey={selectedRubro}
                          reducedMotion={prefersReducedMotion}
                          activeAnimation={true}
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Sawtooth / Serrated Edge */}
                    <div className="w-full h-3 bg-[#FFFFFF] border-x border-[#E8E8E4] relative overflow-hidden">
                      <svg
                        className="w-full h-full text-[#FAFAF8] fill-current"
                        viewBox="0 0 340 12"
                        preserveAspectRatio="none"
                      >
                        <path d="M0,12 L10,0 L20,12 L30,0 L40,12 L50,0 L60,12 L70,0 L80,12 L90,0 L100,12 L110,0 L120,12 L130,0 L140,12 L150,0 L160,12 L170,0 L180,12 L190,0 L200,12 L210,0 L220,12 L230,0 L240,12 L250,0 L260,12 L270,0 L280,12 L290,0 L300,12 L310,0 L320,12 L330,0 L340,12 L340,12 L0,12 Z" />
                      </svg>
                    </div>
                  </div>

                  {/* Segmented Control Selector */}
                  <div
                    role="group"
                    aria-label="Seleccionar rubro del ticket"
                    className="mt-3 p-1 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4] grid grid-cols-4 gap-1 w-full"
                  >
                    {(['ferreteria', 'restaurante', 'farmacia', 'taller'] as RubroKey[]).map((key) => {
                      const isSelected = selectedRubro === key;
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedRubro(key)}
                          whileTap={{ scale: 0.98 }}
                          className={`py-1.5 px-1 text-[11px] sm:text-xs rounded-lg transition-all font-medium text-center cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#141414] text-[#FAFAF8] shadow-xs font-semibold'
                              : 'text-[#6B6B6B] hover:text-[#141414]'
                          }`}
                        >
                          {TICKETS[key].label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tactile Sawtooth Transition Divider */}
        <SawtoothDivider />

        {/* 2. Section: Una venta, tres cosas (escenas a pantalla completa) */}
        <UnaVentaScenes pinned={pinned} reduced={prefersReducedMotion} />

        {/* 3. Section: Hecho para cómo trabaja tu negocio (GSAP + ScrollTrigger) */}
        <RubrosSectionGSAP
          tickets={TICKETS}
          lenisRef={lenisRef}
          prefersReducedMotion={prefersReducedMotion}
          pinned={pinned}
        />


        {/* 4. Section: Precio ($45 gigante de fondo + contador) */}
        <section className="relative overflow-hidden py-20 sm:py-32 bg-[#FAFAF8]">
          <div
            ref={priceBgRef}
            aria-hidden="true"
            className="pointer-events-none absolute right-[2vw] bottom-[-5vw] will-change-transform"
          >
            <span
              ref={priceNumberRef}
              className="block origin-right font-serif text-[28vw] leading-[0.8] tracking-[-0.04em] text-[#ECEDE5] select-none"
            >
              {prefersReducedMotion ? '$45' : '$0'}
            </span>
          </div>

          <div ref={priceRef} className="relative z-10 w-full px-4 sm:px-6 lg:px-[4vw] text-left">
            <div className="overflow-hidden pb-2">
              <h2 className="zara-reveal-h2 font-serif text-[clamp(40px,7vw,112px)] leading-[1] tracking-[-0.02em] text-[#141414]">
                Precio claro y sin sorpresas
              </h2>
            </div>
            <p className="sr-only">$45 al mes por negocio</p>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
              <div className="lg:col-span-5 space-y-2">
                <div className="font-serif text-[clamp(28px,3vw,44px)] leading-tight text-[#141414]">al mes</div>
                <div className="text-sm font-medium text-[#4A4A4A] max-w-[34ch]">
                  por negocio · facturación mensual en córdobas o dólares
                </div>
              </div>

              <div className="lg:col-span-6 lg:col-start-7 space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-[#4A4A4A]">
                  Tu suscripción incluye
                </div>
                <ul className="space-y-2.5 text-[15px] sm:text-base text-[#141414]">
                  {[
                    'POS en Windows para tu punto de venta',
                    'Backoffice web de consulta y configuración',
                    'Soporte directo por WhatsApp en Nicaragua',
                    'Actualizaciones continuas automáticas'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <CheckCircle size={18} weight="fill" className="text-[#5FA22B] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-[#141414]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-[#4A4A4A] text-left">
                Cartera de cobro, citas y equipo se cotizan aparte.
              </p>

              <motion.a
                href={WHATSAPP_QUOTE_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-[#141414] text-[#FAFAF8] font-medium text-sm hover:bg-black transition-colors self-start sm:self-auto cursor-pointer"
              >
                <WhatsappLogo size={17} weight="fill" />
                <span>Pedir cotización</span>
              </motion.a>
            </div>
          </div>
        </section>

        {/* 5. Section: Descarga */}
        <section id="descargar" className="relative py-20 sm:py-32 bg-[#141414] text-[#FAFAF8] scroll-mt-10">
          <div className="w-full px-4 sm:px-6 lg:px-[4vw] text-left">
            <div className="overflow-hidden pb-2">
              <h2 className="zara-reveal-h2 font-serif text-[clamp(40px,8vw,128px)] leading-[1] tracking-[-0.02em] text-[#FAFAF8]">
                Descargá Nexol POS para Windows
              </h2>
            </div>
            <p className="mt-4 text-[18px] text-[#A3A3A3] max-w-[50ch] font-sans">
              Instalá la aplicación en la computadora de tu negocio y comenzá a facturar.
            </p>

            {/* Mobile / Non-Windows Warning */}
            {!isWindows && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 max-w-xl">
                <Info size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950">
                    Esta descarga es para computadoras con Windows
                  </p>
                  <p className="mt-0.5 text-amber-800">
                    Estás navegando desde un dispositivo no compatible. Abrí esta página desde la computadora de tu negocio para instalar la aplicación.
                  </p>
                </div>
              </div>
            )}

            {/* Big download button with no-layout-shift confirmation */}
            <div className="mt-10 w-full text-left space-y-4">
              <motion.a
                href={isWindows ? release.downloadUrl : undefined}
                download={isWindows ? true : undefined}
                onClick={handleDownloadClick}
                whileTap={isWindows ? { scale: 0.99 } : undefined}
                className={`inline-flex w-full sm:w-auto items-center justify-center sm:justify-start gap-5 px-8 sm:px-14 py-6 sm:py-8 rounded-none font-medium transition-all ${
                  isWindows
                    ? 'bg-[#8FD14F] hover:brightness-95 text-[#141414] cursor-pointer'
                    : 'bg-[#2A2A2A] text-[#A3A3A3] cursor-not-allowed'
                }`}
                aria-disabled={!isWindows}
              >
                <WindowsLogo size={40} weight="fill" className="shrink-0" />
                <div className="text-left">
                  <div className="text-xl sm:text-3xl font-semibold leading-tight">
                    {downloadState === 'downloading'
                      ? 'Iniciando descarga…'
                      : isWindows
                      ? 'Descargar para Windows'
                      : 'Disponible solo para Windows'}
                  </div>
                  <div className="text-sm font-normal mt-1 opacity-80">
                    {loadingRelease ? (
                      'Consultando versión…'
                    ) : (
                      <>
                        Versión {release.version} · {release.sizeMB} MB
                        {release.publishedDate ? ` · ${release.publishedDate}` : ''}
                      </>
                    )}
                  </div>
                </div>
              </motion.a>

              {/* Inline Download Confirmation (No Layout Shift) */}
              <div className="min-h-[44px] flex items-center max-w-2xl">
                {downloadState === 'started' ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start gap-2 w-full"
                  >
                    <CheckCircle size={16} weight="fill" className="text-[#5FA22B] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">¡Descarga iniciada!</span> Recordá: si Windows muestra "Windows protegió su PC", tocá <strong>Más información</strong> y luego <strong>Ejecutar de todos modos</strong>.
                    </div>
                  </motion.div>
                ) : (
                  apiError && (
                    <div className="text-xs text-[#A3A3A3] w-full">
                      Si la descarga no inicia,{' '}
                      <a
                        href={WHATSAPP_SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8FD14F] font-semibold underline underline-offset-2"
                      >
                        escribinos por WhatsApp
                      </a>{' '}
                      y te enviamos el instalador.
                    </div>
                  )
                )}
              </div>

              <div className="pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-[#A3A3A3] max-w-2xl">
                <CheckCircle size={15} weight="fill" className="text-[#8FD14F]" />
                <span>Requisitos: Windows 10 u 11 de 64 bits · internet para iniciar sesión</span>
              </div>
            </div>

            {/* 3 Numbered Steps */}
            <div className="mt-16 space-y-6 max-w-3xl text-left">
              <h3 className="font-serif text-3xl text-[#FAFAF8]">Pasos para instalar</h3>

              <div className="space-y-0">
                <div className="flex items-start gap-4 py-4 border-t border-white/15">
                  <div className="w-7 h-7 rounded-full bg-[#8FD14F] text-[#141414] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-sm leading-[1.6] text-[#FAFAF8]">
                    <strong>Descargá y abrí el instalador</strong> en tu computadora. La instalación se realiza en segundos.
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4 border-t border-white/15">
                  <div className="w-7 h-7 rounded-full bg-[#8FD14F] text-[#141414] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-sm leading-[1.6] text-[#FAFAF8]">
                    Si Windows muestra la pantalla "Windows protegió su PC", tocá <strong>Más información</strong> y luego <strong>Ejecutar de todos modos</strong>. Es una verificación normal de Windows en versiones nuevas de software.
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4 border-t border-white/15">
                  <div className="w-7 h-7 rounded-full bg-[#8FD14F] text-[#141414] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-sm leading-[1.6] text-[#FAFAF8]">
                    <strong>Iniciá sesión</strong> con el usuario y la clave que te dio NEXOL para comenzar a registrar tus ventas e inventario.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Tactile Sawtooth Transition Divider above Footer */}
      <SawtoothDivider />

      {/* Footer */}
      <footer className="py-12 bg-[#FAFAF8] text-left relative z-10">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-[#E8E8E4]">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-serif text-xl leading-none">
                  N
                </div>
                <span className="font-semibold text-base tracking-tight text-[#141414]">
                  Nexol POS
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B]">NEXOL · Managua, Nicaragua</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-xs text-[#6B6B6B]">
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-[#141414] transition-colors"
              >
                <WhatsappLogo size={16} weight="fill" className="text-[#141414]" />
                <span>WhatsApp: +505 8714 0989</span>
              </a>

              <a href="mailto:soporte@nexol.com.ni" className="hover:text-[#141414] transition-colors">
                soporte@nexol.com.ni
              </a>
            </div>
          </div>

          <div className="pt-6 text-xs text-[#6B6B6B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>© {new Date().getFullYear()} NEXOL. Todos los derechos reservados.</div>
            <div>Punto de venta y facturación para negocios locales.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
