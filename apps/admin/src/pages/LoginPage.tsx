import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Button, Input } from 'ui';
import { CheckCircle } from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, ingresa tu email y contraseña.');
      return;
    }

    try {
      await login(email, password);
      toast.success('¡Bienvenido de vuelta!');
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      {/* Left Panel */}
      <div className="bg-gray-900 text-white p-12 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="w-10 h-10 bg-white text-gray-900 rounded-lg flex items-center justify-center font-bold text-lg mb-2">
            TD
          </div>
          <div className="font-semibold text-lg">TrackDeli</div>
        </div>

        <div>
          <h2 className="text-3xl font-display font-medium leading-tight mb-8">
            Cada entrega, <br />
            en tiempo real.
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle size={20} weight="fill" className="text-brand-500" />
              <span>Panel de control</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle size={20} weight="fill" className="text-brand-500" />
              <span>Tracking en vivo</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle size={20} weight="fill" className="text-brand-500" />
              <span>Gestión de repartidores</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="bg-white p-8 md:p-12 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Bienvenido</h1>
            <p className="text-sm text-gray-400">Ingresa a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Email"
              type="email" 
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
            />
            
            <Input 
              label="Contraseña"
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full mt-2" 
              disabled={isLoading}
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            ¿No tenés cuenta?{' '}
            <a href="#" className="text-gray-900 font-medium hover:underline">
              Contactar soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
