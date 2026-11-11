import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getMyBusiness,
  updateMyBusiness,
  getPosWholesaleSettings,
  updatePosWholesaleSettings,
  type UpdateWholesaleSettingsDto,
} from 'api-client';
import { PinPicker } from 'map';
import {
  Storefront,
  Tag,
  MapPin,
  WhatsappLogo,
  CheckCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../store/auth.store';

const VERTICAL_LABELS: Record<string, { label: string; desc: string }> = {
  RETAIL: {
    label: 'Comercio / Retail',
    desc: 'Venta por menor y mayor de productos físicos, control de inventario y códigos de barra.',
  },
  FARMACIA: {
    label: 'Farmacia',
    desc: 'Control de lotes, vencimientos, laboratorios, presentaciones y principios activos.',
  },
  RESTAURANTE: {
    label: 'Restaurante / Comidería',
    desc: 'Mesas, comandas de cocina y salón con meseros.',
  },
  FERRETERIA: {
    label: 'Ferretería y Materiales',
    desc: 'Venta por unidades, fracciones, mayoreo y control de inventario.',
  },
  TALLER: {
    label: 'Taller / Servicios',
    desc: 'Órdenes de servicio técnico, reparaciones y repuestos.',
  },
  SERVICIOS: {
    label: 'Servicios Profesionales',
    desc: 'Facturación de servicios por hora, sesión o proyecto.',
  },
};

interface GeneralSettingsTabProps {
  isReadOnly?: boolean;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ isReadOnly = false }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: business, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const { data: wholesaleSettings, isLoading: isLoadingWholesale } = useQuery({
    queryKey: ['pos', 'wholesale-settings'],
    queryFn: () => getPosWholesaleSettings(),
    retry: false,
  });

  const vertical = (business as any)?.tracksBatches
    ? 'FARMACIA'
    : String(
        (business as any)?.posVertical || (user as any)?.business?.posVertical || 'RETAIL'
      ).toUpperCase();
  const verticalInfo = VERTICAL_LABELS[vertical] || {
    label: vertical,
    desc: 'Modalidad configurada para tu negocio.',
  };

  const isWholesaleHidden = vertical === 'RESTAURANTE' || vertical === 'TALLER';

  const [whatsappDigits, setWhatsappDigits] = useState<string>('');

  useEffect(() => {
    if (business?.whatsappNumber) {
      const raw = business.whatsappNumber.replace(/\D/g, '');
      if (raw.startsWith('505') && raw.length > 3) {
        setWhatsappDigits(raw.slice(3));
      } else {
        setWhatsappDigits(raw);
      }
    } else {
      setWhatsappDigits('');
    }
  }, [business?.whatsappNumber]);

  const wholesaleMutation = useMutation({
    mutationFn: (dto: UpdateWholesaleSettingsDto) => updatePosWholesaleSettings(dto),
    onSuccess: (res) => {
      toast.success(
        res.wholesale_enabled
          ? 'Venta por mayor activada'
          : 'Venta por mayor desactivada'
      );
      queryClient.invalidateQueries({ queryKey: ['pos', 'wholesale-settings'] });
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al actualizar configuración de venta por mayor';
      toast.error(msg);
    },
  });

  const locationMutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Ubicación principal guardada');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar la ubicación';
      toast.error(msg);
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: updateMyBusiness,
    onSuccess: () => {
      toast.success('Número de WhatsApp guardado');
      queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al guardar el número de WhatsApp';
      toast.error(msg);
    },
  });

  const handleConfirmLocation = (lat: number, lng: number) => {
    if (isReadOnly) return;
    locationMutation.mutate({ latitude: lat, longitude: lng });
  };

  const handleSaveWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const clean = whatsappDigits.trim().replace(/\D/g, '');
    if (!clean) {
      whatsappMutation.mutate({ whatsappNumber: null } as any);
      return;
    }
    const full = clean.startsWith('505') ? clean : `505${clean}`;
    whatsappMutation.mutate({ whatsappNumber: `+${full}` });
  };

  if (isLoadingBusiness) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-gray-100 rounded-2xl" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Configuración general</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Modalidad de negocio, venta por mayor, ubicación de tu local y contacto oficial.
        </p>
      </div>

      {/* 1. Modalidad del Negocio (Solo lectura, asignada al crear negocio) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Storefront size={20} className="text-gray-700" />
            <div>
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Modalidad del Negocio (Rubro)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Define las funciones activas y los campos personalizados del catálogo.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {vertical}
          </span>
        </div>

        <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{verticalInfo.label}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Activa
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{verticalInfo.desc}</p>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          La modalidad del negocio fue asignada al crearse la cuenta. Para modificarla, contactá al soporte técnico.
        </p>
      </div>

      {/* 2. Venta por mayor (Oculta en Restaurante y Taller) */}
      {!isWholesaleHidden && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-gray-700" />
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Venta por mayor
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Habilita precios especiales a partir de una cantidad mínima en productos.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={isReadOnly || wholesaleMutation.isPending || isLoadingWholesale}
                checked={Boolean(wholesaleSettings?.wholesale_enabled)}
                onChange={(e) =>
                  wholesaleMutation.mutate({ wholesale_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Al activar esta opción, podés definir un precio por mayor y una cantidad mínima en cada producto. En el cobro del punto de venta se aplicará automáticamente cuando el cliente alcance la cantidad indicada.
          </p>
        </div>
      )}

      {/* 3. Contacto del Negocio (WhatsApp) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <WhatsappLogo size={20} className="text-emerald-600" weight="fill" />
          <div>
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Contacto del negocio (WhatsApp)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Número utilizado para notificaciones a clientes y comprobantes digitales.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWhatsapp} className="space-y-4">
          <div className="max-w-md">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Número de teléfono (Nicaragua)
            </label>
            <div className="relative flex rounded-xl shadow-xs">
              <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-xs font-mono">
                +505
              </span>
              <input
                type="text"
                disabled={isReadOnly}
                value={whatsappDigits}
                onChange={(e) => setWhatsappDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="88888888"
                maxLength={8}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-900 text-xs font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Ingresá los 8 dígitos de tu número móvil.
            </p>
          </div>

          {!isReadOnly && (
            <button
              type="submit"
              disabled={whatsappMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {whatsappMutation.isPending ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              <span>Guardar WhatsApp</span>
            </button>
          )}
        </form>
      </div>

      {/* 4. Ubicación Principal del Negocio (Mapa) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <MapPin size={20} className="text-gray-700" />
          <div>
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Ubicación principal del negocio
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Punto de referencia geográfico de tu local para cálculo de entregas y órdenes.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Mové el pin en el mapa para fijar la ubicación exacta de tu negocio.
          </p>

          <div className="rounded-xl overflow-hidden border border-gray-200">
            <PinPicker
              initialLat={business?.latitude || 12.1364}
              initialLng={business?.longitude || -86.2514}
              onConfirm={handleConfirmLocation}
            />
          </div>

          {business?.latitude && business?.longitude && (
            <p className="text-[11px] text-gray-500 font-mono">
              Coordenadas actuales: {Number(business.latitude).toFixed(6)}, {Number(business.longitude).toFixed(6)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
