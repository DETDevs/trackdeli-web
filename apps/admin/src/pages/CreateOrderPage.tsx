import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createOrder,
  getMyBusiness,
  getBusinessClients,
  calculateOrderFee,
  searchCustomers,
  createLocationConfirmationLink,
  type CreateOrderDto,
  type DeliveryPaymentStatus,
  type PricingZone,
  type Customer,
} from 'api-client';
import { toast } from 'react-hot-toast';
import {
  ArrowRight,
  CircleNotch,
  MapTrifold,
  Keyboard,
  Calculator,
  Buildings,
  Motorcycle,
  WhatsappLogo,
  MapPin,
  Clock,
  Check,
  ArrowsClockwise,
  PaperPlaneTilt,
  ArrowSquareOut,
  WarningCircle,
} from '@phosphor-icons/react';
import { PinPicker } from 'map';
import { useSocketStore } from '../store/socket.store';
import { calculateFeeClient, getPricingBreakdownClient } from '../lib/pricing';

const SECTION = ({ title }: { title: string }) => (
  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
    {title}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
    {children}
  </div>
);

const inputClass =
  'w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-gray-400 outline-none transition-colors';

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((state) => state.socket);

  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
  });

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    destinationAddress: '',
    destinationLat: '12.1328',
    destinationLng: '-86.2504',
    description: '',
    deliveryPaymentStatus: 'CONTRA_ENTREGA' as DeliveryPaymentStatus,
    deliveryFee: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['business-clients'],
    queryFn: () => getBusinessClients({ isActive: true }),
    enabled: business?.businessType === 'EMPRESA_RIDERS',
  });

  const [originBusinessClientId, setOriginBusinessClientId] = useState('');
  const [originBusinessName, setOriginBusinessName] = useState('');
  const [useManualOriginInput, setUseManualOriginInput] = useState(false);

  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [locationMode, setLocationMode] = useState<'text' | 'map'>('text');

  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [liveLocationConfirmed, setLiveLocationConfirmed] = useState(false);
  const [liveLocationUpdated, setLiveLocationUpdated] = useState(false);
  const [waitingSocket, setWaitingSocket] = useState(false);
  const [autoSendStatus, setAutoSendStatus] = useState<'idle' | 'sent_auto' | 'failed'>('idle');
  const [manualWaUrl, setManualWaUrl] = useState('');

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [calculatedInfo, setCalculatedInfo] = useState<{
    fee: number;
    distanceKm: number;
    breakdown: string;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleLocationConfirmed = (data: {
      customerId?: string;
      phone?: string;
      latitude?: number;
      longitude?: number;
      addressText?: string;
      confirmedAt?: string;
    }) => {
      const currentPhoneDigits = form.customerPhone.replace(/\D/g, '');
      const dataPhoneDigits = (data.phone || '').replace(/\D/g, '');

      const isTarget =
        (customerId && data.customerId === customerId) ||
        (selectedCustomer && data.customerId === selectedCustomer.id) ||
        (currentPhoneDigits && dataPhoneDigits && dataPhoneDigits.includes(currentPhoneDigits));

      if (isTarget) {
        setLiveLocationConfirmed(true);
        setWaitingSocket(false);
        setAutoSendStatus('idle');
        if (data.customerId) {
          setCustomerId(data.customerId);
        }
        if (data.latitude && data.longitude) {
          setForm((prev) => ({
            ...prev,
            destinationLat: data.latitude!.toString(),
            destinationLng: data.longitude!.toString(),
            destinationAddress: data.addressText || prev.destinationAddress,
          }));
        }
        toast.success('Ubicación confirmada por el cliente');
      }
    };

    const handleLocationUpdated = (data: {
      customerId?: string;
      phone?: string;
      latitude?: number;
      longitude?: number;
      addressText?: string;
    }) => {
      const currentPhoneDigits = form.customerPhone.replace(/\D/g, '');
      const dataPhoneDigits = (data.phone || '').replace(/\D/g, '');

      const isTarget =
        (customerId && data.customerId === customerId) ||
        (selectedCustomer && data.customerId === selectedCustomer.id) ||
        (currentPhoneDigits && dataPhoneDigits && dataPhoneDigits.includes(currentPhoneDigits));

      if (isTarget) {
        setLiveLocationUpdated(true);
        setWaitingSocket(false);
        setAutoSendStatus('idle');
        if (data.customerId) {
          setCustomerId(data.customerId);
        }
        if (data.latitude && data.longitude) {
          setForm((prev) => ({
            ...prev,
            destinationLat: data.latitude!.toString(),
            destinationLng: data.longitude!.toString(),
            destinationAddress: data.addressText || prev.destinationAddress,
          }));
        }
        toast.success('Ubicación actualizada por el cliente');
      }
    };

    socket.on('customer_location_confirmed', handleLocationConfirmed);
    socket.on('customer_location_updated', handleLocationUpdated);

    return () => {
      socket.off('customer_location_confirmed', handleLocationConfirmed);
      socket.off('customer_location_updated', handleLocationUpdated);
    };
  }, [socket, customerId, selectedCustomer, form.customerPhone]);

  const handleCustomerSearch = (val: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      setIsSearchingCustomer(false);
      return;
    }

    setIsSearchingCustomer(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCustomers(val, business?.id);
        setSearchResults(results);
        setIsDropdownOpen(results.length > 0);
      } catch {
        setSearchResults([]);
        setIsDropdownOpen(false);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 280);
  };

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerId(cust.id);
    setIsDropdownOpen(false);
    setLiveLocationConfirmed(false);
    setLiveLocationUpdated(false);
    setWaitingSocket(false);
    setAutoSendStatus('idle');
    setManualWaUrl('');

    setForm((prev) => ({
      ...prev,
      customerName: cust.name,
      customerPhone: cust.phone,
      destinationAddress: cust.lastAddressText || prev.destinationAddress,
      destinationLat: cust.lastLatitude ? cust.lastLatitude.toString() : prev.destinationLat,
      destinationLng: cust.lastLongitude ? cust.lastLongitude.toString() : prev.destinationLng,
    }));

    toast.success(`Cliente "${cust.name}" autocompletado`);
  };

  const handleShareLocationConfirmation = async () => {
    const phoneTrimmed = form.customerPhone.trim();
    if (!phoneTrimmed) {
      toast.error('Ingresá el WhatsApp del cliente');
      return;
    }

    const cleanDigits = phoneTrimmed.replace(/\D/g, '');
    if (cleanDigits.length !== 8) {
      toast.error('WhatsApp debe tener 8 dígitos');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const res = await createLocationConfirmationLink({
        customerId: customerId || selectedCustomer?.id || undefined,
        businessId: business?.id,
        phone: phoneTrimmed,
        name: form.customerName.trim() || undefined,
      });

      if (res.customerId) {
        setCustomerId(res.customerId);
      }

      const trackingBaseUrl =
        (import.meta as any).env.VITE_TRACKING_URL || window.location.origin;
      const cleanBase = trackingBaseUrl.replace(/\/+$/, '');
      const confirmationUrl = res.confirmationUrl || `${cleanBase}/confirm-location/${res.token}`;

      const clientName = form.customerName.trim();
      const greeting = clientName ? `¡Hola ${clientName}!` : '¡Hola!';
      const businessDisplay = business?.name ? ` de *${business.name}*` : '';
      const message =
        `${greeting} Para coordinar la entrega de tu pedido${businessDisplay}, ` +
        `por favor confirmá tu ubicación exacta en este enlace:\n\n` +
        `${confirmationUrl}\n\n` +
        `— TrackDeli`;

      const fullPhone = cleanDigits.length === 8 ? `505${cleanDigits}` : cleanDigits;
      const waUrl = res.whatsappUrl || `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

      setManualWaUrl(waUrl);
      setAutoSendStatus('sent_auto');
      setWaitingSocket(true);
      toast.success('Solicitud enviada automáticamente por WhatsApp');
    } catch (err: any) {
      console.warn('Error al enviar automáticamente confirmación de ubicación:', err);
      const trackingBaseUrl =
        (import.meta as any).env.VITE_TRACKING_URL || window.location.origin;
      const cleanBase = trackingBaseUrl.replace(/\/+$/, '');
      const clientName = form.customerName.trim();
      const greeting = clientName ? `¡Hola ${clientName}!` : '¡Hola!';
      const businessDisplay = business?.name ? ` de *${business.name}*` : '';
      const fallbackUrl = `${cleanBase}/confirm-location`;
      const message =
        `${greeting} Para coordinar la entrega de tu pedido${businessDisplay}, ` +
        `por favor confirmá tu ubicación exacta en este enlace:\n\n` +
        `${fallbackUrl}\n\n` +
        `— TrackDeli`;
      const fullPhone = cleanDigits.length === 8 ? `505${cleanDigits}` : cleanDigits;
      const fallbackWaUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

      setManualWaUrl(fallbackWaUrl);
      setAutoSendStatus('failed');
      setWaitingSocket(true);
      toast.error(
        err?.response?.data?.message ||
          'No se pudo enviar automáticamente. Usá el botón de WhatsApp como respaldo.',
        { duration: 5000 }
      );
    } finally {
      setIsGeneratingLink(false);
    }
  };

  useEffect(() => {
    if (!business) return;

    if (business.pricingModel === 'FREE') {
      setCalculatedInfo({
        fee: 0,
        distanceKm: 0,
        breakdown: 'Envío gratis configurado para el negocio',
      });
      setForm((prev) => ({
        ...prev,
        deliveryFee: '0.00',
      }));
      return;
    }

    if (business.pricingModel === 'RIDER_QUOTE') {
      setCalculatedInfo(null);
      setForm((prev) => ({
        ...prev,
        deliveryFee: '0.00',
      }));
      return;
    }

    if (business.pricingModel === 'FIXED') {
      const zones: PricingZone[] = Array.isArray(business.pricingZones)
        ? business.pricingZones
        : [];
      const selectedZone = zones.find((z) => z.id === selectedZoneId);

      if (selectedZone) {
        const fee = Number(selectedZone.price) || 0;
        setCalculatedInfo({
          fee,
          distanceKm: 0,
          breakdown: `Tarifa de zona "${selectedZone.name}"`,
        });
        setForm((prev) => ({
          ...prev,
          deliveryFee: fee.toFixed(2),
        }));
      } else {
        const fee = Number(business.baseRate) || 0;
        setCalculatedInfo({
          fee,
          distanceKm: 0,
          breakdown: zones.length > 0 ? 'Tarifa fija general (sin zona específica)' : `Tarifa fija de C$${fee.toFixed(2)}`,
        });
        setForm((prev) => ({
          ...prev,
          deliveryFee: fee.toFixed(2),
        }));
      }
      return;
    }

    const lat = parseFloat(form.destinationLat);
    const lng = parseFloat(form.destinationLng);

    if (isNaN(lat) || isNaN(lng)) {
      setCalculatedInfo(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsCalculating(true);
      try {
        try {
          const res = await calculateOrderFee(lat, lng);
          setCalculatedInfo({
            fee: res.fee,
            distanceKm: res.distanceKm,
            breakdown: res.breakdown,
          });
          setForm((prev) => ({
            ...prev,
            deliveryFee: res.fee.toFixed(2),
          }));
        } catch {
          let distKm = 0;
          const selectedOrigin = clients.find((c) => c.id === originBusinessClientId);
          const originLat = selectedOrigin?.latitude ? Number(selectedOrigin.latitude) : (business?.latitude ? Number(business.latitude) : null);
          const originLng = selectedOrigin?.longitude ? Number(selectedOrigin.longitude) : (business?.longitude ? Number(business.longitude) : null);
          if (originLat && originLng) {
            const bLat = originLat;
            const bLng = originLng;
            const R = 6371;
            const dLat = ((lat - bLat) * Math.PI) / 180;
            const dLon = ((lng - bLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((bLat * Math.PI) / 180) *
                Math.cos((lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distKm = Number((R * c).toFixed(1));
          }

          const pricingConfig = {
            model: business.pricingModel,
            baseRate: Number(business.baseRate),
            ratePerKm: Number(business.ratePerKm),
            freeZoneKm: Number(business.freeZoneKm),
            minRate: Number(business.minRate),
            maxRate: Number(business.maxRate),
          };

          const calculatedFee = calculateFeeClient(pricingConfig, distKm);
          const breakdown = getPricingBreakdownClient(pricingConfig, distKm);
          setCalculatedInfo({
            fee: calculatedFee,
            distanceKm: distKm,
            breakdown,
          });
          setForm((prev) => ({
            ...prev,
            deliveryFee: calculatedFee.toFixed(2),
          }));
        }
      } catch (err) {
        console.warn('Error calculando tarifa:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form.destinationLat, form.destinationLng, selectedZoneId, business, originBusinessClientId, clients]);

  const handleMapConfirm = (lat: number, lng: number, address?: string) => {
    setForm((prev) => ({
      ...prev,
      destinationLat: lat.toFixed(6),
      destinationLng: lng.toFixed(6),
      destinationAddress: address || prev.destinationAddress,
    }));
    toast.success('Ubicación fijada en el mapa');
  };

  const { mutate, isPending } = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success('Pedido creado');
      navigate('/orders');
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { status?: number; data?: { message?: string } } };
      const msg = errorObj?.response?.data?.message;
      if (errorObj?.response?.status === 402) {
        toast.error(msg || 'Membresía inactiva para crear pedidos');
        setFormError(msg || 'Tu membresía está vencida o requiere pago para crear pedidos. Contacta al soporte para renovarla.');
      } else {
        setFormError(msg ?? 'Ocurrió un error al crear el pedido.');
      }
    },
  });

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'customerName' || field === 'customerPhone') {
      handleCustomerSearch(value);
      if (field === 'customerPhone') {
        setAutoSendStatus('idle');
        setManualWaUrl('');
        setWaitingSocket(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const nameStr = form.customerName.trim();
    if (!nameStr) {
      toast.error('El nombre del cliente es requerido');
      return setFormError('El nombre del cliente es requerido.');
    }

    const phoneDigits = form.customerPhone.trim().replace(/\D/g, '');
    if (phoneDigits.length !== 8) {
      toast.error('WhatsApp debe tener 8 dígitos');
      return setFormError('Número de WhatsApp inválido. Debe tener exactamente 8 dígitos.');
    }

    const addressStr = form.destinationAddress.trim();
    if (!addressStr) {
      toast.error('Dirección de entrega requerida');
      return setFormError('La dirección de entrega es requerida.');
    }

    if (business?.businessType === 'EMPRESA_RIDERS' && !originBusinessClientId && !originBusinessName.trim()) {
      toast.error('Negocio de origen requerido');
      return setFormError('Debes indicar el negocio de origen.');
    }

    const payload: CreateOrderDto = {
      customerId: customerId || undefined,
      customerName: nameStr,
      customerPhone: phoneDigits,
      originBusinessClientId: originBusinessClientId || undefined,
      originBusinessName: originBusinessName.trim() || undefined,
      destinationAddress: addressStr,
      description: form.description.trim() || undefined,
      deliveryPaymentStatus: form.deliveryPaymentStatus,
      deliveryFee:
        business?.pricingModel === 'RIDER_QUOTE'
          ? 0
          : form.deliveryPaymentStatus !== 'GRATIS' && form.deliveryFee
          ? Number(form.deliveryFee)
          : 0,
      destinationLat: form.destinationLat ? Number(form.destinationLat) : undefined,
      destinationLng: form.destinationLng ? Number(form.destinationLng) : undefined,
    };

    mutate(payload);
  };

  const zones: PricingZone[] =
    business?.pricingModel === 'FIXED' && Array.isArray(business.pricingZones)
      ? business.pricingZones
      : [];

  const getConfirmationDays = () => {
    if (!selectedCustomer?.lastConfirmedAt) return null;
    const diffMs = Date.now() - new Date(selectedCustomer.lastConfirmedAt).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const confirmationDays = getConfirmationDays();

  return (
    <div className="max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6"
      >
        {business?.businessType === 'EMPRESA_RIDERS' && (
          <div>
            <SECTION title="Negocio de Origen" />
            <div className="space-y-2">
              {!useManualOriginInput ? (
                <div>
                  <Field label="Negocio que solicita el envío *">
                    <select
                      value={originBusinessClientId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOriginBusinessClientId(val);
                        const selected = clients.find((c) => c.id === val);
                        if (selected) {
                          setOriginBusinessName(selected.name);
                        } else {
                          setOriginBusinessName('');
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">Seleccionar negocio asociado...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.phone ? `(${client.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {(() => {
                    const selected = clients.find((c) => c.id === originBusinessClientId);
                    if (!selected) return null;
                    return (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200/80 rounded-lg text-xs space-y-1">
                        <div className="flex items-start gap-1.5 text-gray-700">
                          <MapPin size={14} className="text-brand-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-900">Origen / Punto de recogida: </span>
                            <span>{selected.address || 'Sin dirección registrada'}</span>
                          </div>
                        </div>
                        {selected.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600 pl-5">
                            <span className="font-medium text-gray-500">Teléfono:</span>
                            <span>{selected.phone}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <p className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                    <span>¿No encontrás el negocio en la lista?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUseManualOriginInput(true);
                        setOriginBusinessClientId('');
                      }}
                      className="text-brand-600 hover:text-brand-700 font-medium underline cursor-pointer"
                    >
                      Escribir manualmente
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <Field label="Nombre del negocio de origen *">
                    <input
                      className={inputClass}
                      type="text"
                      placeholder="Ej. Pollos El Buen Sabor"
                      value={originBusinessName}
                      onChange={(e) => setOriginBusinessName(e.target.value)}
                    />
                  </Field>
                  {clients.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      <button
                        type="button"
                        onClick={() => setUseManualOriginInput(false)}
                        className="text-brand-600 hover:text-brand-700 font-medium underline cursor-pointer"
                      >
                        ← Seleccionar de la lista de clientes
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Cliente Final
            </div>

            {liveLocationConfirmed || liveLocationUpdated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Ubicación confirmada ahora</span>
              </span>
            ) : selectedCustomer?.lastConfirmedAt ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Clock size={12} />
                <span>
                  Confirmada {confirmationDays === 0 ? 'hoy' : `hace ${confirmationDays} días`}
                </span>
              </span>
            ) : selectedCustomer?.lastLatitude ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <MapPin size={12} />
                <span>Ubicación previa guardada</span>
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Nombre del cliente">
              <div className="relative">
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Ej. Rosy o Pedro García"
                  value={form.customerName}
                  onChange={(e) => set('customerName', e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true);
                  }}
                />
                {isSearchingCustomer && (
                  <CircleNotch size={14} className="animate-spin text-gray-400 absolute right-3 top-3" />
                )}
              </div>
            </Field>

            <Field label="WhatsApp del cliente">
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-md text-sm text-gray-500">
                  +505
                </span>
                <input
                  className={`${inputClass} rounded-l-none`}
                  type="tel"
                  placeholder="8888 7777"
                  value={form.customerPhone}
                  onChange={(e) => set('customerPhone', e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true);
                  }}
                />
              </div>
            </Field>
          </div>

          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-30 overflow-hidden divide-y divide-gray-50 max-h-60 overflow-y-auto">
              <div className="p-2 bg-gray-50 text-[11px] font-medium text-gray-500 flex items-center justify-between">
                <span>Clientes recurrentes encontrados</span>
                <span>{searchResults.length} coincidencia{searchResults.length > 1 ? 's' : ''}</span>
              </div>
              {searchResults.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => handleSelectCustomer(cust)}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900 leading-tight">
                        {cust.name}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        {cust.phone} {cust.lastAddressText ? `· ${cust.lastAddressText}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {cust.lastConfirmedAt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Check size={10} weight="bold" /> GPS
                      </span>
                    ) : cust.lastLatitude ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <MapPin size={10} /> Guardada
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Sin GPS</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareLocationConfirmation}
                  disabled={isGeneratingLink || !form.customerPhone.trim()}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingLink ? (
                    <>
                      <CircleNotch size={14} className="animate-spin text-emerald-700" />
                      <span>Enviando solicitud...</span>
                    </>
                  ) : autoSendStatus === 'sent_auto' ? (
                    <>
                      <PaperPlaneTilt size={15} weight="bold" className="text-emerald-700" />
                      <span>Reenviar solicitud automática</span>
                    </>
                  ) : autoSendStatus === 'failed' ? (
                    <>
                      <ArrowsClockwise size={14} weight="bold" className="text-emerald-700" />
                      <span>Reintentar envío automático</span>
                    </>
                  ) : (
                    <>
                      <WhatsappLogo size={16} weight="fill" className="text-emerald-600" />
                      <span>Compartir ubicación con el cliente</span>
                    </>
                  )}
                </button>

                {waitingSocket && autoSendStatus === 'sent_auto' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-medium bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Enviado automático por WhatsApp · Esperando respuesta...</span>
                  </span>
                )}

                {waitingSocket && autoSendStatus === 'failed' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <WarningCircle size={15} weight="bold" className="text-amber-600 shrink-0" />
                    <span>Envío automático falló · Usá el enlace manual de respaldo</span>
                  </span>
                )}

                {/* Respaldo manual si falló el envío automático */}
                {autoSendStatus === 'failed' && manualWaUrl && (
                  <a
                    href={manualWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <WhatsappLogo size={15} weight="fill" />
                    <span>Abrir WhatsApp manual (respaldo)</span>
                    <ArrowSquareOut size={13} weight="bold" />
                  </a>
                )}

                {/* Opción manual discreta si se envió automático pero se desea abrir WhatsApp */}
                {autoSendStatus === 'sent_auto' && manualWaUrl && (
                  <a
                    href={manualWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-700 transition-colors font-medium ml-1 cursor-pointer"
                    title="Abrir WhatsApp manualmente si el cliente no recibió la notificación automática"
                  >
                    <WhatsappLogo size={14} weight="fill" className="text-emerald-600" />
                    <span>¿No le llegó? Abrir manual</span>
                    <ArrowSquareOut size={12} />
                  </a>
                )}
              </div>

              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerId(null);
                    setAutoSendStatus('idle');
                    setManualWaUrl('');
                    setWaitingSocket(false);
                  }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 self-start sm:self-auto cursor-pointer"
                >
                  Desvincular cliente
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Entrega
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLocationMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  locationMode === 'text'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Keyboard size={14} />
                Manual
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  locationMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapTrifold size={14} />
                Mapa
              </button>
            </div>
          </div>

          {locationMode === 'map' ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-2">
                Busca o arrastra el mapa para ubicar el destino exacto.
              </p>
              <PinPicker
                mapboxToken={(import.meta as any).env.VITE_MAPBOX_TOKEN}
                initialLat={Number(form.destinationLat) || 12.1328}
                initialLng={Number(form.destinationLng) || -86.2504}
                onConfirm={handleMapConfirm}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Dirección de entrega">
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Ej. Del semáforo 2 cuadras al norte"
                  value={form.destinationAddress}
                  onChange={(e) => set('destinationAddress', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Field label="Latitud">
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    placeholder="12.1328"
                    value={form.destinationLat}
                    onChange={(e) => set('destinationLat', e.target.value)}
                  />
                </Field>
                <Field label="Longitud">
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    placeholder="-86.2504"
                    value={form.destinationLng}
                    onChange={(e) => set('destinationLng', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {zones.length > 0 && (
            <div className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Buildings size={15} className="text-brand-600" />
                <span>Zona de Entrega</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className={inputClass}
              >
                <option value="">Tarifa general (sin zona fija)</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} — C${Number(zone.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <SECTION title="Tarifa y Cobro" />
          <div className="space-y-4">
            <Field label="Modalidad de cobro del delivery">
              <select
                value={form.deliveryPaymentStatus}
                onChange={(e) => set('deliveryPaymentStatus', e.target.value)}
                className={inputClass}
              >
                <option value="CONTRA_ENTREGA">Cobrar al cliente (Contra Entrega)</option>
                <option value="PAGADO_POR_NEGOCIO">Asumido por el negocio (Pagado)</option>
                <option value="GRATIS">Envío Gratis</option>
              </select>
            </Field>

            {business?.pricingModel === 'RIDER_QUOTE' ? (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2.5 text-xs text-amber-900">
                <Motorcycle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cotización por Repartidor</p>
                  <p className="text-amber-700 text-[11px] mt-0.5">
                    Al crear el pedido, los repartidores disponibles postularán sus ofertas de tarifa. Podrás elegir la mejor opción desde el detalle del pedido.
                  </p>
                </div>
              </div>
            ) : form.deliveryPaymentStatus !== 'GRATIS' ? (
              <div>
                <Field label="Monto de la tarifa (C$)">
                  <div className="relative">
                    <input
                      className={inputClass}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.deliveryFee}
                      onChange={(e) => set('deliveryFee', e.target.value)}
                    />
                    {isCalculating && (
                      <CircleNotch size={16} className="animate-spin text-gray-400 absolute right-3 top-2.5" />
                    )}
                  </div>
                </Field>

                {calculatedInfo && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calculator size={14} className="text-brand-600" />
                      <span>{calculatedInfo.breakdown}</span>
                    </span>
                    {calculatedInfo.distanceKm > 0 && (
                      <span className="font-semibold text-gray-700">
                        {calculatedInfo.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <Field label="Notas / Detalle del pedido (Opcional)">
              <textarea
                className={`${inputClass} h-20 resize-none`}
                placeholder="Ej. 2 Combos familiares + 1 Refresco 2L"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isPending && <CircleNotch size={14} className="animate-spin" />}
            <span>Crear Pedido</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </form>
    </div>
  );
};
