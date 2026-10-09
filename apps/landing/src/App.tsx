import React, { useState, useEffect } from 'react';
import {
  DownloadSimple,
  WhatsappLogo,
  CheckCircle,
  WindowsLogo,
  Info
} from '@phosphor-icons/react';

interface ReleaseInfo {
  version: string;
  sizeMB: number;
  downloadUrl: string;
  publishedDate: string;
}

const FALLBACK_RELEASE: ReleaseInfo = {
  version: '1.0.1',
  sizeMB: 90,
  downloadUrl: 'https://github.com/edwin08torres/nexol-pos-releases/releases/latest',
  publishedDate: 'octubre 2026'
};

const WHATSAPP_PHONE = '50587140989';
const WHATSAPP_TEST_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, quiero probar TrackDeli POS'
)}`;
const WHATSAPP_QUOTE_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, quiero cotizar TrackDeli POS para mi negocio'
)}`;
const WHATSAPP_SUPPORT_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  'Hola, tengo una consulta sobre TrackDeli POS'
)}`;

export const App: React.FC = () => {
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);
  const [isWindows, setIsWindows] = useState<boolean>(true);
  const [apiError, setApiError] = useState<boolean>(false);
  const [loadingRelease, setLoadingRelease] = useState<boolean>(true);

  useEffect(() => {
    // Detect OS
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isWin = ua.includes('windows') || ua.includes('win32');
      setIsWindows(isWin);
    }

    // Fetch latest release client-side
    const fetchLatestRelease = async () => {
      try {
        const res = await fetch(
          'https://api.github.com/repos/edwin08torres/nexol-pos-releases/releases/latest'
        );
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();

        // Find .exe asset (exclude .blockmap and other non-installer files)
        const exeAsset = data.assets?.find(
          (a: any) =>
            typeof a.name === 'string' &&
            a.name.toLowerCase().endsWith('.exe') &&
            !a.name.toLowerCase().endsWith('.blockmap')
        );

        if (exeAsset) {
          const rawVersion = data.tag_name ? data.tag_name.replace(/^v/i, '') : data.name || '1.0.1';
          const sizeMB = exeAsset.size ? Math.round(exeAsset.size / (1024 * 1024)) : 90;
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

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#E8E8E4] bg-[#FAFAF8] sticky top-0 z-40">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <a href="#" className="flex items-center gap-3 group text-[#141414]">
            <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-bold text-xs tracking-tight">
              TD
            </div>
            <span className="font-semibold text-base tracking-tight text-[#141414]">
              TrackDeli POS
            </span>
          </a>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <a
              href="#descargar"
              className="text-[#6B6B6B] hover:text-[#141414] transition-colors py-1.5 font-medium"
            >
              Descargar
            </a>
            <a
              href={WHATSAPP_TEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#8FD14F] text-[#141414] font-medium text-xs sm:text-sm hover:brightness-95 transition-all"
            >
              <WhatsappLogo size={16} weight="fill" />
              <span>Pedir prueba</span>
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              {/* Left Column: Headline and Actions */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                <h1 className="font-serif text-[36px] sm:text-[44px] md:text-[56px] lg:text-[68px] leading-[1.05] tracking-[-0.01em] text-[#141414] text-left">
                  Vendés un cambio de aceite. El inventario descuenta 4 litros y un filtro.
                </h1>

                <p className="mt-6 text-[18px] leading-[1.6] text-[#6B6B6B] max-w-[70ch] text-left font-sans">
                  TrackDeli POS es la caja, el inventario y los reportes de tu comercio, restaurante o taller en Nicaragua.
                </p>

                {/* CTAs */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                  <a
                    href={WHATSAPP_TEST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#8FD14F] text-[#141414] font-medium text-base hover:brightness-95 transition-all text-center"
                  >
                    <WhatsappLogo size={20} weight="fill" />
                    <span>Pedir prueba de 6 horas</span>
                  </a>

                  <a
                    href="#descargar"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-[#E8E8E4] bg-[#FFFFFF] text-[#141414] font-medium text-base hover:bg-[#F2F2EF] transition-colors text-center"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    <span>Descargar para Windows</span>
                  </a>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-[#6B6B6B]">
                  <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                  <span>Prueba completa sin costo ni tarjeta de crédito</span>
                </div>
              </div>

              {/* Right Column: Thermal Receipt */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-end w-full">
                <div className="w-full max-w-[340px]">
                  {/* Printer Slot */}
                  <div className="w-full h-3.5 bg-[#141414] rounded-t-md shadow-inner flex items-center justify-center px-6 relative z-20">
                    <div className="w-full h-[2px] bg-[#292929]" />
                  </div>

                  {/* Ticket Container with overflow hidden to emerge from slot */}
                  <div className="overflow-hidden relative z-10 pt-0.5">
                    <div className="ticket-print-animation bg-[#FFFFFF] border-x border-[#E8E8E4] text-[#141414] font-mono text-xs p-5 shadow-sm space-y-3 select-none">
                      {/* Ticket Header */}
                      <div className="text-center space-y-0.5 border-b border-dashed border-[#141414]/30 pb-3">
                        <div className="font-bold text-sm tracking-tight text-[#141414]">
                          TALLER LOS PINOS
                        </div>
                        <div className="text-[11px] text-[#6B6B6B]">
                          Managua, Nicaragua
                        </div>
                        <div className="text-[11px] text-[#6B6B6B]">
                          08/10/2026 · 10:45 AM
                        </div>
                        <div className="text-[11px] font-semibold text-[#141414] pt-1">
                          Ticket #00428
                        </div>
                      </div>

                      {/* Ticket Metadata */}
                      <div className="space-y-1 text-[11px] border-b border-dashed border-[#141414]/30 pb-3">
                        <div className="flex justify-between">
                          <span className="text-[#6B6B6B]">Cliente:</span>
                          <span className="font-semibold text-[#141414]">Carlos Mendoza</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B6B6B]">Vehículo:</span>
                          <span className="font-semibold text-[#141414]">M123456 · Toyota Hilux</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B6B6B]">Técnico:</span>
                          <span className="font-semibold text-[#141414]">Roberto Gómez</span>
                        </div>
                      </div>

                      {/* Ticket Items */}
                      <div className="space-y-1.5 py-1 text-[11px]">
                        <div className="flex justify-between items-start">
                          <span className="text-[#141414]">Cambio de aceite</span>
                          <span className="font-semibold text-[#141414]">C$1,100.00</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-[#141414]">Aceite extra 1 LT</span>
                          <span className="font-semibold text-[#141414]">C$220.00</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="border-t-2 border-[#141414] pt-2 flex justify-between items-baseline">
                        <span className="font-bold text-xs uppercase tracking-wider text-[#141414]">
                          TOTAL
                        </span>
                        <span className="font-bold text-sm text-[#141414]">
                          C$1,320.00
                        </span>
                      </div>

                      {/* Inventory Deduction Block */}
                      <div className="mt-4 pt-3 border-t border-dashed border-[#141414]/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#141414] uppercase tracking-wide">
                            Inventario
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8FD14F] text-[#141414] uppercase tracking-wider">
                            descontado
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-[#141414]">
                            <span>Aceite 15W40</span>
                            <span className="font-bold">−5 LT</span>
                          </div>
                          <div className="flex justify-between text-[#141414]">
                            <span>Filtro de aceite</span>
                            <span className="font-bold">−1 UND</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center pt-3 text-[10px] text-[#6B6B6B]">
                        Gracias por su preferencia
                      </div>
                    </div>

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
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Una venta, tres cosas que se actualizan */}
        <section className="py-16 sm:py-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <h2 className="font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
              Una venta, tres cosas que se actualizan
            </h2>
            <p className="mt-3 text-[18px] text-[#6B6B6B] max-w-[70ch] text-left font-sans">
              El sistema vincula cada cobro con tus existencias y los números del día en una sola acción.
            </p>

            {/* Asymmetric blocks on #F2F2EF surface */}
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Block 1: Caja (5 cols) */}
              <div className="lg:col-span-5 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#141414]">
                    Caja
                  </h3>
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#6B6B6B]">
                    Cobro ágil en córdobas o dólares con cálculo de vuelto al instante. Aceptá efectivo, transferencias y tarjetas. Al terminar el turno, realizá el arqueo con cierre ciego para evitar descuadres.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E8E8E4] flex items-center gap-2 text-xs font-medium text-[#141414]">
                  <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                  <span>Córdobas y dólares simultáneos</span>
                </div>
              </div>

              {/* Block 2: Inventario (4 cols) */}
              <div className="lg:col-span-4 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#141414]">
                    Inventario
                  </h3>
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#6B6B6B]">
                    Manejo exacto de decimales para libras, litros y metros. Configurá servicios y platos con receta que descuentan repuestos o ingredientes al vender. Alertas antes de quedarte sin stock.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E8E8E4] flex items-center gap-2 text-xs font-medium text-[#141414]">
                  <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                  <span>Recetas con descuento de insumos</span>
                </div>
              </div>

              {/* Block 3: Reportes (3 cols) */}
              <div className="lg:col-span-3 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl text-[#141414]">
                    Reportes
                  </h3>
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#6B6B6B]">
                    Ventas del día, productos con mayor rotación y totales en vivo. Consultá el estado de tu negocio desde tu celular en modo solo lectura sin interrumpir a los cajeros.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E8E8E4] flex items-center gap-2 text-xs font-medium text-[#141414]">
                  <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                  <span>Consulta remota en celular</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Hecho para cómo trabaja tu negocio */}
        <section className="py-16 sm:py-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <h2 className="font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
              Hecho para cómo trabaja tu negocio
            </h2>
            <p className="mt-3 text-[18px] text-[#6B6B6B] max-w-[70ch] text-left font-sans">
              Adaptado a la dinámica real de tu mostrador, mesa o taller en Nicaragua.
            </p>

            {/* List with four rows separated by lines (no cards) */}
            <div className="mt-12 divide-y divide-[#E8E8E4] border-y border-[#E8E8E4]">
              {/* Row 1 */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline text-left">
                <div className="md:col-span-5 font-serif text-2xl sm:text-[26px] text-[#141414]">
                  Comercios y ferreterías
                </div>
                <div className="md:col-span-7 text-[16px] sm:text-[17px] leading-[1.6] text-[#6B6B6B]">
                  Venta rápida con lector de código de barras, cobro fraccionado, control de inventario por unidad o medida y alertas oportunas de existencias bajas.
                </div>
              </div>

              {/* Row 2 */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline text-left">
                <div className="md:col-span-5 font-serif text-2xl sm:text-[26px] text-[#141414]">
                  Restaurantes y cafeterías
                </div>
                <div className="md:col-span-7 text-[16px] sm:text-[17px] leading-[1.6] text-[#6B6B6B]">
                  Salón con mapa de mesas en tiempo real, comandas enviadas directo a cocina o barra, división de cuentas y pedidos para llevar.
                </div>
              </div>

              {/* Row 3 */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline text-left">
                <div className="md:col-span-5 font-serif text-2xl sm:text-[26px] text-[#141414]">
                  Talleres
                </div>
                <div className="md:col-span-7 text-[16px] sm:text-[17px] leading-[1.6] text-[#6B6B6B]">
                  Recepción de vehículos por placa y cliente, seguimiento por áreas de trabajo, técnicos asignados y servicios que descuentan repuestos del inventario.
                </div>
              </div>

              {/* Row 4 */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline text-left">
                <div className="md:col-span-5 font-serif text-2xl sm:text-[26px] text-[#141414]">
                  Farmacias
                </div>
                <div className="md:col-span-7 text-[16px] sm:text-[17px] leading-[1.6] text-[#6B6B6B]">
                  Búsqueda inmediata por nombre comercial o principio activo, control de lotes y fechas de vencimiento, y facturación ágil de mostrador.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Precio */}
        <section className="py-16 sm:py-24 border-b border-[#E8E8E4]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <h2 className="font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
              Precio claro y sin sorpresas
            </h2>

            <div className="mt-10 bg-[#F2F2EF] border border-[#E8E8E4] rounded-2xl p-8 sm:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left: Price in big serif */}
                <div className="lg:col-span-5 space-y-2 text-left">
                  <div className="font-serif text-[44px] sm:text-[56px] leading-[1.05] text-[#141414] tracking-tight">
                    $45 al mes
                  </div>
                  <div className="text-sm font-medium text-[#6B6B6B]">
                    por negocio · facturación mensual en córdobas o dólares
                  </div>
                </div>

                {/* Right: What is included */}
                <div className="lg:col-span-7 space-y-3.5 text-left">
                  <div className="text-xs uppercase tracking-wider font-semibold text-[#6B6B6B]">
                    Tu suscripción incluye
                  </div>

                  <ul className="space-y-2.5 text-[15px] sm:text-base text-[#141414]">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle size={18} weight="fill" className="text-[#5FA22B] shrink-0" />
                      <span>POS en Windows para tu punto de venta</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle size={18} weight="fill" className="text-[#5FA22B] shrink-0" />
                      <span>Backoffice web de consulta y configuración</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle size={18} weight="fill" className="text-[#5FA22B] shrink-0" />
                      <span>Soporte directo por WhatsApp en Nicaragua</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle size={18} weight="fill" className="text-[#5FA22B] shrink-0" />
                      <span>Actualizaciones continuas automáticas</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom line and button */}
              <div className="mt-8 pt-6 border-t border-[#E8E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-[#6B6B6B] text-left">
                  Cartera de cobro, citas y equipo se cotizan aparte.
                </p>

                <a
                  href={WHATSAPP_QUOTE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#141414] text-[#FAFAF8] font-medium text-sm hover:bg-black transition-colors self-start sm:self-auto"
                >
                  <WhatsappLogo size={17} weight="fill" />
                  <span>Pedir cotización</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Descarga */}
        <section id="descargar" className="py-16 sm:py-24 border-b border-[#E8E8E4] scroll-mt-10">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <h2 className="font-serif text-[32px] sm:text-[40px] leading-[1.1] text-[#141414] text-left">
              Descargá TrackDeli POS para Windows
            </h2>
            <p className="mt-3 text-[18px] text-[#6B6B6B] max-w-[70ch] text-left font-sans">
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

            {/* Download Card */}
            <div className="mt-8 p-6 sm:p-8 bg-[#FFFFFF] border border-[#E8E8E4] rounded-2xl max-w-xl text-left space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#141414]">
                    <WindowsLogo size={18} weight="fill" className="text-[#141414]" />
                    <span>Instalador oficial para Windows</span>
                  </div>
                  <div className="text-xs text-[#6B6B6B] mt-1">
                    {loadingRelease ? (
                      'Consultando última versión...'
                    ) : (
                      <>
                        Versión {release.version} · {release.sizeMB} MB
                        {release.publishedDate ? ` · ${release.publishedDate}` : ''}
                      </>
                    )}
                  </div>
                </div>

                <a
                  href={isWindows ? release.downloadUrl : undefined}
                  download={isWindows ? true : undefined}
                  onClick={(e) => {
                    if (!isWindows) {
                      e.preventDefault();
                      alert('Esta descarga es exclusivamente para computadoras con Windows 10 u 11.');
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm transition-all ${
                    isWindows
                      ? 'bg-[#141414] hover:bg-black text-[#FAFAF8] cursor-pointer shadow-sm active:scale-98'
                      : 'bg-[#E8E8E4] text-[#6B6B6B] cursor-not-allowed opacity-75'
                  }`}
                  aria-disabled={!isWindows}
                >
                  <DownloadSimple size={18} weight="bold" />
                  <span>
                    {isWindows ? 'Descargar instalador (.exe)' : 'Disponible solo para Windows'}
                  </span>
                </a>
              </div>

              {/* Fallback info */}
              {apiError && (
                <div className="text-xs text-[#6B6B6B] pt-2 border-t border-[#E8E8E4]">
                  Si la descarga no inicia,{' '}
                  <a
                    href={WHATSAPP_SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5FA22B] font-semibold underline underline-offset-2"
                  >
                    escribinos por WhatsApp
                  </a>{' '}
                  y te enviamos el archivo de inmediato.
                </div>
              )}

              <div className="pt-3 border-t border-[#E8E8E4] flex items-center gap-2 text-xs text-[#6B6B6B]">
                <CheckCircle size={15} weight="fill" className="text-[#5FA22B]" />
                <span>Requisitos: Windows 10 u 11 de 64 bits · internet para iniciar sesión</span>
              </div>
            </div>

            {/* 3 Numbered Steps (The only place with numbering) */}
            <div className="mt-14 space-y-6 max-w-2xl text-left">
              <h3 className="font-serif text-2xl text-[#141414]">
                Pasos para instalar
              </h3>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4]">
                  <div className="w-7 h-7 rounded-full bg-[#141414] text-[#FAFAF8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-sm leading-[1.6] text-[#141414]">
                    <strong>Descargá y abrí el instalador</strong> en tu computadora. La instalación se realiza en segundos.
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4]">
                  <div className="w-7 h-7 rounded-full bg-[#141414] text-[#FAFAF8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-sm leading-[1.6] text-[#141414]">
                    Si Windows muestra la pantalla "Windows protegió su PC", tocá <strong>Más información</strong> y luego <strong>Ejecutar de todos modos</strong>. Es una verificación normal de Windows en versiones nuevas de software.
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F2F2EF] border border-[#E8E8E4]">
                  <div className="w-7 h-7 rounded-full bg-[#141414] text-[#FAFAF8] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-sm leading-[1.6] text-[#141414]">
                    <strong>Iniciá sesión</strong> con el usuario y la clave que te dio NEXOL para comenzar a registrar tus ventas e inventario.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-[#FAFAF8] text-left">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-[#E8E8E4]">
            {/* Brand and Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#141414] text-[#FAFAF8] flex items-center justify-center font-bold text-xs">
                  TD
                </div>
                <span className="font-semibold text-base tracking-tight text-[#141414]">
                  TrackDeli POS
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B]">
                NEXOL · Managua, Nicaragua
              </p>
            </div>

            {/* Direct Contact */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 text-xs text-[#6B6B6B]">
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-[#141414] transition-colors"
              >
                <WhatsappLogo size={16} weight="fill" className="text-[#5FA22B]" />
                <span>WhatsApp: +505 8714 0989</span>
              </a>

              <a
                href="mailto:soporte@nexol.com.ni"
                className="hover:text-[#141414] transition-colors"
              >
                soporte@nexol.com.ni
              </a>
            </div>
          </div>

          <div className="pt-6 text-xs text-[#6B6B6B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              © {new Date().getFullYear()} NEXOL. Todos los derechos reservados.
            </div>
            <div>
              Punto de venta y facturación para negocios locales.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
