import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Storefront, WarningCircle, Sparkle } from '@phosphor-icons/react';
import { useWaiters, useLoginWithPin } from '../hooks/useMesero';
import { useWaiterAuth } from '../store/authStore';
import { PinKeypad } from '../components/PinKeypad';
import type { WaiterPublicInfo } from '../types/mesero';
import toast from 'react-hot-toast';

export const WaiterLoginPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { login, session } = useWaiterAuth();

  const businessSlug = slug || '';

  // Si ya tiene sesión activa para este slug, redirigir a mesas
  useEffect(() => {
    if (session && session.slug === businessSlug) {
      navigate(`/mesas/${businessSlug}/tables`, { replace: true });
    }
  }, [session, businessSlug, navigate]);

  const { data, isLoading, error } = useWaiters(businessSlug);
  const loginMutation = useLoginWithPin(businessSlug);

  const [selectedWaiter, setSelectedWaiter] = useState<WaiterPublicInfo | null>(null);
  const [pin, setPin] = useState<string>('');
  const [isPinError, setIsPinError] = useState(false);
  const [search, setSearch] = useState('');

  const waiters = data?.waiters || [];
  const business = data?.business;

  const filteredWaiters = waiters.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleSelectWaiter = (w: WaiterPublicInfo) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    setSelectedWaiter(w);
    setPin('');
    setIsPinError(false);
  };

  const handleBackToWaiters = () => {
    setSelectedWaiter(null);
    setPin('');
    setIsPinError(false);
  };

  const handleSubmitPin = async (completedPin: string) => {
    if (!selectedWaiter || loginMutation.isPending) return;

    try {
      setIsPinError(false);
      const res = await loginMutation.mutateAsync({
        waiterId: selectedWaiter.id,
        pin: completedPin,
      });

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([40, 30, 40]);
        } catch {}
      }

      login(res, businessSlug);
      toast.success(`¡Bienvenido, ${res.waiter.name}!`, { duration: 3000 });
      navigate(`/mesas/${businessSlug}/tables`, { replace: true });
    } catch (err: any) {
      setIsPinError(true);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }
      const msg = err?.response?.data?.message || 'PIN incorrecto. Intenta de nuevo.';
      toast.error(msg, { duration: 3500 });
      setTimeout(() => {
        setPin('');
        setIsPinError(false);
      }, 900);
    }
  };

  if (!businessSlug) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="p-6 rounded-3xl bg-white border border-gray-200 text-center space-y-3 max-w-sm">
          <WarningCircle size={40} className="text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">Enlace incompleto</h2>
          <p className="text-xs text-gray-500">
            Falta el identificador del negocio en la URL (ej. /mesas/nombre-negocio).
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-gray-500">Cargando meseros del negocio...</p>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && waiters.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="p-6 rounded-3xl bg-white border border-gray-200 text-center space-y-3 max-w-sm shadow-xs">
          <Storefront size={40} className="text-gray-400 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">
            {error ? 'No se pudo conectar con el negocio' : 'No hay meseros activos'}
          </h2>
          <p className="text-xs text-gray-500">
            {error
              ? 'Verifica que el negocio tenga el módulo POS activo.'
              : 'El administrador aún no ha configurado meseros en este negocio.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto p-4 sm:p-6">
      {/* Top Business Brand Header */}
      <div className="text-center pt-4 sm:pt-8 pb-4 space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mx-auto shadow-md">
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <Storefront size={28} weight="duotone" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">
            {business?.name || 'Comandero Móvil'}
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Toma de pedidos en sala
          </p>
        </div>
      </div>

      {/* Main Content: Step 1 Selector de Mesero OR Step 2 Ingreso de PIN */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {!selectedWaiter ? (
          /* PASO 1: Selector de Nombres */
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                ¿Quién toma la orden?
              </h2>
              <p className="text-xs text-gray-500">
                Seleccioná tu nombre para ingresar con tu PIN
              </p>
            </div>

            {waiters.length > 6 && (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mesero..."
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 shadow-2xs"
              />
            )}

            <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto no-scrollbar pr-0.5">
              {filteredWaiters.map((w) => {
                const initial = w.name.charAt(0).toUpperCase();
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSelectWaiter(w)}
                    className="p-3.5 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-200 text-left flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer touch-manipulation shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-800 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 block">
                          {w.name}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <Sparkle size={11} weight="fill" />
                          <span>Turno activo</span>
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-gray-400 pr-1">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* PASO 2: Ingreso de PIN (4 dígitos) */
          <div className="space-y-6 animate-fadeIn">
            {/* Mesero seleccionado con opción de volver */}
            <div className="p-3 rounded-2xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {selectedWaiter.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block leading-tight">
                    {selectedWaiter.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    Ingresá tu PIN de 4 dígitos
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToWaiters}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cambiar
              </button>
            </div>

            {/* Teclado PIN */}
            <PinKeypad
              value={pin}
              onChange={setPin}
              onSubmit={handleSubmitPin}
              isError={isPinError}
              disabled={loginMutation.isPending}
            />

            {loginMutation.isPending && (
              <p className="text-xs text-center text-gray-500 font-medium animate-pulse">
                Verificando credenciales...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="text-center pt-4 text-[11px] text-gray-400">
        TrackDeli Comandero • Mobile POS
      </footer>
    </div>
  );
};
