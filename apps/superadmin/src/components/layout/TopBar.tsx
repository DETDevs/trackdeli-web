import React from 'react';
import { useAuthStore } from '../../lib/auth';
import { UserCircle, List } from '@phosphor-icons/react';
import { useSuperadminSidebar } from './Layout';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, actions }) => {
  const { user } = useAuthStore();
  const { setSidebarOpen } = useSuperadminSidebar();

  return (
    <header className="h-16 px-4 lg:px-8 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Abrir menú"
        >
          <List size={20} weight="bold" />
        </button>
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {actions}

        <div className="flex items-center gap-2 pl-3 sm:pl-4 border-l border-gray-100">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-gray-900 leading-tight">
              {user?.name || 'Super Admin'}
            </p>
            <p className="text-[10px] text-gray-400">Panel Global</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
            <UserCircle size={22} weight="duotone" />
          </div>
        </div>
      </div>
    </header>
  );
};
