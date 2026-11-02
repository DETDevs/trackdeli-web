import { useState, useEffect, useCallback } from 'react';
import { registerWebDevice } from 'api-client';
import { useAuthStore } from '../store/auth.store';

export interface DeviceErrorInfo {
  code: string;
  message: string;
}

export const getDeviceStorageKeys = (bizId?: string | null) => {
  if (!bizId) {
    return {
      idKey: 'trackdeli_pos_device_id',
      secretKey: 'trackdeli_pos_device_secret',
    };
  }
  return {
    idKey: `trackdeli_pos_device_id_${bizId}`,
    secretKey: `trackdeli_pos_device_secret_${bizId}`,
  };
};

export function usePosWebDevice(enabled: boolean = true) {
  const businessId = useAuthStore((s) => s.user?.businessId);

  // Migración automática de claves legacy al primer arranque con negocio activo
  const getInitialDeviceCredentials = () => {
    if (typeof window === 'undefined') return { id: null, secret: null };
    const { idKey, secretKey } = getDeviceStorageKeys(businessId);

    // Si no existen las claves de este negocio pero existen las legacy, migrar
    if (businessId && !localStorage.getItem(idKey)) {
      const legacyId = localStorage.getItem('trackdeli_pos_device_id');
      const legacySecret = localStorage.getItem('trackdeli_pos_device_secret');
      if (legacyId && legacySecret) {
        localStorage.setItem(idKey, legacyId);
        localStorage.setItem(secretKey, legacySecret);
        localStorage.removeItem('trackdeli_pos_device_id');
        localStorage.removeItem('trackdeli_pos_device_secret');
      }
    }

    return {
      id: localStorage.getItem(idKey),
      secret: localStorage.getItem(secretKey),
    };
  };

  const [deviceId, setDeviceId] = useState<string | null>(() => getInitialDeviceCredentials().id);
  const [deviceSecret, setDeviceSecret] = useState<string | null>(() => getInitialDeviceCredentials().secret);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceError, setDeviceError] = useState<DeviceErrorInfo | null>(null);

  // Sincronizar credenciales si el negocio cambia (switch de sucursal)
  useEffect(() => {
    const creds = getInitialDeviceCredentials();
    setDeviceId(creds.id);
    setDeviceSecret(creds.secret);
    setDeviceError(null);
  }, [businessId]);

  // Limpiar credenciales inválidas o revocadas de la sucursal activa
  const clearDevice = useCallback(() => {
    const { idKey, secretKey } = getDeviceStorageKeys(businessId);
    localStorage.removeItem(idKey);
    localStorage.removeItem(secretKey);
    setDeviceId(null);
    setDeviceSecret(null);
  }, [businessId]);

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
        message: 'El cobro y emisión de comprobantes web no está habilitado para este negocio.',
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

  // Registro automático al entrar a Cobrar si no hay dispositivo guardado para esta sucursal
  useEffect(() => {
    if (!enabled) return;

    const { idKey, secretKey } = getDeviceStorageKeys(businessId);
    const savedId = localStorage.getItem(idKey);
    const savedSecret = localStorage.getItem(secretKey);

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

        localStorage.setItem(idKey, newDeviceId);
        localStorage.setItem(secretKey, res.secret);

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
        } else if (code === 'WEB_BILLING_DISABLED') {
          setDeviceError({
            code: 'WEB_BILLING_DISABLED',
            message: 'El cobro y emisión de comprobantes web no está habilitado para este negocio.',
          });
        } else {
          setDeviceError({
            code: 'REGISTRATION_ERROR',
            message: err?.response?.data?.message || 'No se pudo registrar el dispositivo para emitir comprobantes.',
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
  }, [enabled, deviceError, businessId, clearDevice]);

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
