import React, { useState } from 'react';
import {
  CreditCard,
  Receipt,
  ChartBar,
  Wallet,
  ShieldCheck,
  Lock,
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';
import { useMyProducts } from '../hooks/useMyProducts';
import { usePosWebAccess } from '../hooks/usePosWebAccess';
import { PayablesTab } from '../components/finances/PayablesTab';
import { ExpensesTab } from '../components/finances/ExpensesTab';
import { IncomeStatementTab } from '../components/finances/IncomeStatementTab';
import { ReceivablesNotice } from '../components/finances/ReceivablesNotice';

export type FinanceTabKey = 'payables' | 'expenses' | 'income-statement' | 'receivables';

export const FinancesPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAllowedRole = isSuperAdmin || user?.role === 'ENCARGADO';

  const [activeTab, setActiveTab] = useState<FinanceTabKey>('payables');

  // Negocio y moneda
  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    staleTime: 60000,
  });

  const currency = (business as any)?.currency || 'NIO';

  // Productos y control de acceso web (Ticket 166)
  const { data: productsData, isLoading: isLoadingProducts } = useMyProducts(!isSuperAdmin);
  const { webAdminEnabled } = usePosWebAccess();

  const hasCarteraCobro =
    isSuperAdmin ||
    productsData?.products?.CARTERA_COBRO?.status === 'ACTIVE' ||
    (business as any)?.hasCarteraCobro === true;

  // Validación de permiso de usuario por rol (Ticket 166 / Fase 1)
  if (!isAllowedRole) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 max-w-lg mx-auto text-center space-y-3 mt-12 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldCheck size={26} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Acceso restringido</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          No tienes permisos para acceder al módulo de Finanzas. Esta sección es exclusiva
          para el Encargado o Administrador del negocio.
        </p>
      </div>
    );
  }

  // Validación de acceso web básico (Ticket 166)
  if (!isSuperAdmin && !webAdminEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 max-w-lg mx-auto text-center space-y-3 mt-12 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center mx-auto">
          <Lock size={26} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Acceso Web deshabilitado</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          El acceso administrativo web está inactivo para este negocio. Consulta con el soporte para habilitarlo.
        </p>
      </div>
    );
  }

  // Validación de contratación del add-on Finanzas (CARTERA_COBRO)
  if (!isLoadingProducts && !hasCarteraCobro) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 max-w-lg mx-auto text-center space-y-3 mt-12 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto">
          <Lock size={26} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Módulo Finanzas no contratado</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Tu negocio no tiene activo el módulo de Finanzas (Cuentas por pagar, Gastos, Estado de resultados y Cartera). Contacta a soporte para activarlo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Header de la página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Finanzas</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cuentas por pagar a proveedores, registro de gastos y estado de resultados
          </p>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="border-b border-gray-200 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 min-w-max">
          {[
            {
              id: 'payables' as const,
              label: 'Por pagar',
              icon: <CreditCard size={16} weight="regular" />,
            },
            {
              id: 'expenses' as const,
              label: 'Gastos',
              icon: <Receipt size={16} weight="regular" />,
            },
            {
              id: 'income-statement' as const,
              label: 'Estado de resultados',
              icon: <ChartBar size={16} weight="regular" />,
            },
            {
              id: 'receivables' as const,
              label: 'Por cobrar',
              icon: <Wallet size={16} weight="regular" />,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div>
        {activeTab === 'payables' && <PayablesTab currency={currency} />}
        {activeTab === 'expenses' && <ExpensesTab currency={currency} />}
        {activeTab === 'income-statement' && <IncomeStatementTab currency={currency} />}
        {activeTab === 'receivables' && <ReceivablesNotice currency={currency} />}
      </div>
    </div>
  );
};
