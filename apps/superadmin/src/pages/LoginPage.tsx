import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeSlash, ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { useAuthStore } from '../lib/auth';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Por favor completá todos los campos');
      return;
    }

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-25 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm">
            TD
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 mb-1">
            <ShieldCheck size={16} weight="fill" />
            <span>ACCESO EXCLUSIVO</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">TrackDeli SuperAdmin</h1>
          <p className="text-xs text-gray-500 mt-1">
            Panel de control global y administración
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@trackdeli.com"
              required
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 rounded-xl bg-gray-900 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Ingresar</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            TrackDeli Global Management System · 2026
          </p>
        </div>
      </div>
    </div>
  );
};
