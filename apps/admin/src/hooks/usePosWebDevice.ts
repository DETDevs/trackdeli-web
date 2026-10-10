import { useState, useEffect, useCallback } from 'react';
import { registerWebDevice } from 'api-client';

const DEVICE_ID_KEY = 'trackdeli_pos_device_id';
const DEVICE_SECRET_KEY = 'trackdeli_pos_device_secret';

export interface DeviceErrorInfo {
  code: string;
  message: string;
}

export function usePosWebDevice(enabled: boolean = true) {
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    return localStorage.getItem(DEVICE_ID_KEY);
  });
  const [deviceSecret, setDeviceSecret] = useState<string | null>(() => {
    return localStorage.getItem(DEVICE_SECRET_KEY);
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceError, setDeviceError] = useState<DeviceErrorInfo | null>(null);

  // Limpiar credenciales inválidas o revocadas
  const clearDevice = useCallback(() => {
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(DEVICE_SECRET_KEY);
    setDeviceId(null);
    setDeviceSecret(null);
  }, []);

  // Manejar errores de dispositivo provenientes de peticiones de venta o caja
  const handleDeviceApiError = useCallback((err: any) => {
    const code = err?.response?.data?.code || '';
    if (code === 'DEVICE_REVOKED') {
      clearDevice();
      setDeviceError({
        code: 'DEVICE_REVOKED',
        message: 'Este dispositivo ha sido revocado. Contacta al administrador para reactivarlo.',
      });
      return true;
    }
    if (code === 'DEVICE_INVALID') {
      clearDevice();
      setDeviceError({
        code: 'DEVICE_INVALID',
        message: 'Las credenciales del dispositivo no son válidas. Vuelve a registrarlo.',
      });
      return true;
    }
    if (code === 'WEB_BILLING_DISABLED') {
      setDeviceError({
        code: 'WEB_BILLING_DISABLED',
        message: 'La facturación web no está habilitada para este negocio.',
      });
      return true;
    }
    if (code === 'WEB_DEVICE_LIMIT_REACHED') {
      setDeviceError({
        code: 'WEB_DEVICE_LIMIT_REACHED',
        message: 'El negocio alcanzó el máximo de dispositivos web. Pedile al encargado que libere uno.',
      });
      return true;
    }
    return false;
  }, [clearDevice]);

  // Registro automático al entrar a Cobrar si no hay dispositivo guardado
  useEffect(() => {
    if (!enabled) return;

    const savedId = localStorage.getItem(DEVICE_ID_KEY);
    const savedSecret = localStorage.getItem(DEVICE_SECRET_KEY);

    if (savedId && savedSecret) {
      setDeviceId(savedId);
      setDeviceSecret(savedSecret);
      return;
    }

    // Si ya falló previamente, no reintentar en bucle
    if (deviceError) return;

    let isMounted = true;
    const register = async () => {
      setIsRegistering(true);
      setDeviceError(null);

      try {
        const newDeviceId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768;
        const deviceName = isNarrow ? 'Móvil Web' : 'Navegador Web';

        const res = await registerWebDevice({
          deviceId: newDeviceId,
          name: deviceName,
        });

        if (!isMounted) return;

        localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
        localStorage.setItem(DEVICE_SECRET_KEY, res.secret);

        setDeviceId(newDeviceId);
        setDeviceSecret(res.secret);
      } catch (err: any) {
        if (!isMounted) return;
        const code = err?.response?.data?.code || '';
        if (code === 'WEB_DEVICE_LIMIT_REACHED') {
          setDeviceError({
            code: 'WEB_DEVICE_LIMIT_REACHED',
            message: 'El negocio alcanzó el máximo de dispositivos web. Pedile al encargado que libere uno.',
          });
        } else if (code === 'DEVICE_REVOKED') {
          clearDevice();
          setDeviceError({
            code: 'DEVICE_REVOKED',
            message: 'Este dispositivo ha sido revocado. Contacta al administrador para reactivarlo.',
          });
        } else if (code === 'DEVICE_INVALID') {
          clearDevice();
          setDeviceError({
            code: 'DEVICE_INVALID',
            message: 'Credenciales del dispositivo inválidas.',
          });
        } else if (code === 'WEB_BILLING_DISABLED') {
          setDeviceError({
            code: 'WEB_BILLING_DISABLED',
            message: 'La facturación web no está habilitada para este negocio.',
          });
        } else {
          setDeviceError({
            code: 'REGISTRATION_ERROR',
            message: err?.response?.data?.message || 'No se pudo registrar el dispositivo para facturar.',
          });
        }
      } finally {
        if (isMounted) {
          setIsRegistering(false);
        }
      }
    };

    register();

    return () => {
      isMounted = false;
    };
  }, [enabled, deviceError, clearDevice]);

  const deviceHeaders = deviceId && deviceSecret
    ? {
        'X-Device-Id': deviceId,
        'X-Device-Secret': deviceSecret,
      }
    : undefined;

  return {
    deviceId,
    deviceSecret,
    deviceHeaders,
    isReady: Boolean(deviceId && deviceSecret && !deviceError),
    isRegistering,
    deviceError,
    clearDevice,
    handleDeviceApiError,
    retryRegistration: () => setDeviceError(null),
  };
}
