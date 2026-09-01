import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicInviteCode } from 'api-client';
import {
  Motorcycle,
  Copy,
  Check,
  ShieldCheck,
} from '@phosphor-icons/react';

export const JoinInvitePage = () => {
  const { code = '' } = useParams<{ code: string }>();
  const [copied, setCopied] = useState(false);

  const cleanCode = code.toUpperCase();

  const { data: inviteInfo } = useQuery({
    queryKey: ['public-invite-code', cleanCode],
    queryFn: () => getPublicInviteCode(cleanCode),
    enabled: !!cleanCode,
    retry: false,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm">
            TD
          </div>
          <span className="font-semibold text-sm tracking-tight text-gray-200">
            TrackDeli Riders
          </span>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 text-emerald-400 border border-white/10 flex items-center gap-1">
          <ShieldCheck size={13} weight="bold" />
          Invitación Oficial
        </span>
      </header>

      {/* Main Content Card */}
      <main className="max-w-md mx-auto w-full py-8 space-y-6 my-auto">
        {/* Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Motorcycle size={36} weight="bold" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              ¡Sumate al equipo de repartidores!
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              {inviteInfo?.business?.name
                ? `Fuiste invitado a unirte a la flota de ${inviteInfo.business.name}`
                : 'Fuiste invitado a unirte como repartidor a una flota de delivery'}
            </p>
          </div>
        </div>

        {/* Code Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-3 backdrop-blur-md">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Tu Código de Invitación
          </span>

          <div className="flex items-center justify-center gap-3">
            <div className="bg-black/60 border border-white/15 px-5 py-3 rounded-xl font-mono text-2xl font-black text-amber-400 tracking-widest shadow-inner">
              {cleanCode}
            </div>

            <button
              onClick={handleCopy}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
              }`}
              title="Copiar código"
            >
              {copied ? <Check size={22} weight="bold" /> : <Copy size={22} />}
            </button>
          </div>

          {inviteInfo?.description && (
            <p className="text-xs text-gray-400 italic">
              &ldquo;{inviteInfo.description}&rdquo;
            </p>
          )}

          {copied && (
            <p className="text-xs text-emerald-400 font-medium animate-in fade-in duration-150">
              ¡Código copiado al portapapeles!
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3.5">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            ¿Cómo empezar?
          </h3>

          <ol className="space-y-3 text-xs text-gray-300">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <span>
                Descargá o abrí la aplicación móvil <strong>TrackDeli Riders</strong> en tu teléfono.
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <span>
                Tocá en <strong>&quot;Registrarme como Repartidor&quot;</strong> y completá tus datos.
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>
                Ingresá el código <strong className="text-amber-400 font-mono">{cleanCode}</strong> para quedar vinculado automáticamente a la empresa.
              </span>
            </li>
          </ol>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleCopy}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            <Copy size={18} weight="bold" />
            <span>{copied ? '¡Código Copiado!' : 'Copiar Código de Invitación'}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-gray-500 py-4 max-w-md mx-auto w-full border-t border-white/5">
        TrackDeli — Logística y Tracking en Tiempo Real
      </footer>
    </div>
  );
};
