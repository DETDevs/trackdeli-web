import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getChannelConfig,
  getPosPolicies,
  type PosPoliciesData,
} from 'api-client';
import {
  GearSix,
  ShareNetwork,
  ShieldCheck,
  Receipt,
  FileText,
  Package,
  Users,
  CurrencyCircleDollar,
  LockKey,
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { useMyProducts } from '../hooks/useMyProducts';
import { GeneralSettingsTab } from '../components/settings/GeneralSettingsTab';
import { ChannelsSettingsTab } from '../components/settings/ChannelsSettingsTab';
import { PoliciesSettingsTab } from '../components/settings/PoliciesSettingsTab';
import { ExchangeRateSettingsTab } from '../components/settings/ExchangeRateSettingsTab';
import { InvoiceSettingsTab } from '../components/settings/InvoiceSettingsTab';
import { ReceiptDesignSettingsTab } from '../components/settings/ReceiptDesignSettingsTab';
import { CatalogSettingsTab } from '../components/settings/CatalogSettingsTab';
import { StaffSettingsTab } from '../components/settings/StaffSettingsTab';

export type SettingsTabId =
  | 'general'
  | 'channels'
  | 'policies'
  | 'exchange-rate'
  | 'invoice'
  | 'receipt-design'
  | 'catalog'
  | 'staff';

export const SettingsPage = () => {
  const user = useAuthStore((s) => s.user);
  const { data: productsData } = useMyProducts();

  const isPosActive = productsData
    ? productsData.products?.POS?.status === 'ACTIVE'
    : true;
  const isDeliveryActive = productsData
    ? productsData.products?.DELIVERY?.status === 'ACTIVE'
    : true;

  const role = user?.role || '';
  const isCajero = role === 'CAJERO';
  const isManagerOrAdmin =
    role === 'ADMIN' || role === 'ENCARGADO' || role === 'SUPERADMIN' || role === 'OWNER';

  const { data: channelConfig } = useQuery({
    queryKey: ['pos', 'channels-config'],
    queryFn: () => getChannelConfig(),
    enabled: isPosActive && isManagerOrAdmin,
    retry: false,
  });

  const { data: policies } = useQuery<PosPoliciesData>({
    queryKey: ['pos', 'policies'],
    queryFn: () => getPosPolicies(),
    enabled: isPosActive,
    retry: false,
  });

  const isMultiCurrency = Boolean(policies?.multiCurrencyEnabled);
  const channelsActive = Boolean(
    isDeliveryActive || channelConfig?.delivery?.enabled || channelConfig?.pedidosYa?.enabled
  );

  // Tab definitions matching desktop POS
  const tabs: { id: SettingsTabId; label: string; icon: any; visible: boolean }[] = [
    { id: 'general', label: 'General', icon: GearSix, visible: true },
    {
      id: 'channels',
      label: 'Canales de venta',
      icon: ShareNetwork,
      visible: isManagerOrAdmin && channelsActive,
    },
    { id: 'policies', label: 'Políticas', icon: ShieldCheck, visible: isManagerOrAdmin },
    {
      id: 'exchange-rate',
      label: 'Tasa de Cambio',
      icon: CurrencyCircleDollar,
      visible: isManagerOrAdmin && isMultiCurrency,
    },
    {
      id: 'invoice',
      label: 'Comprobantes e impuestos',
      icon: Receipt,
      visible: !isCajero,
    },
    {
      id: 'receipt-design',
      label: 'Diseño del ticket',
      icon: FileText,
      visible: isManagerOrAdmin,
    },
    { id: 'catalog', label: 'Catálogo', icon: Package, visible: !isCajero },
    { id: 'staff', label: 'Personal', icon: Users, visible: !isCajero },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    const saved = localStorage.getItem('web_settings_last_tab') as SettingsTabId;
    return saved && tabs.some((t) => t.id === saved && t.visible) ? saved : 'general';
  });

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab('general');
    }
  }, [visibleTabs, activeTab]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    localStorage.setItem('web_settings_last_tab', tabId);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Configuración</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Administrá las opciones de tu punto de venta y reglas del negocio.
        </p>
      </div>

      {/* Aviso de rol para Cajeros */}
      {isCajero && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
          <LockKey size={18} className="text-amber-600 shrink-0 mt-0.5" weight="fill" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Acceso restringido para rol Cajero</span>
            <p className="text-amber-700 leading-relaxed">
              Tu rol de Cajero no tiene permisos para modificar la configuración del negocio ni políticas de caja. Solo podés consultar los datos generales en modo lectura.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Pestañas con estilo idéntico al desktop */}
      <div className="border-b border-gray-200 flex space-x-2 sm:space-x-6 overflow-x-auto scrollbar-none pb-px">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? 'border-gray-900 text-gray-900 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} weight={isActive ? 'bold' : 'regular'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="pt-1">
        {activeTab === 'general' && <GeneralSettingsTab isReadOnly={isCajero} />}
        {activeTab === 'channels' && <ChannelsSettingsTab isReadOnly={isCajero} />}
        {activeTab === 'policies' && <PoliciesSettingsTab isReadOnly={isCajero} />}
        {activeTab === 'exchange-rate' && <ExchangeRateSettingsTab isReadOnly={isCajero} />}
        {activeTab === 'invoice' && (
          <InvoiceSettingsTab
            isReadOnly={isCajero}
            onNavigateToReceiptDesign={() => handleTabChange('receipt-design')}
          />
        )}
        {activeTab === 'receipt-design' && (
          <ReceiptDesignSettingsTab isReadOnly={isCajero} />
        )}
        {activeTab === 'catalog' && <CatalogSettingsTab isReadOnly={isCajero} />}
        {activeTab === 'staff' && <StaffSettingsTab isReadOnly={isCajero} />}
      </div>
    </div>
  );
};
