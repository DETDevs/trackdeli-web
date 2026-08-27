import React from 'react';
import { useAuthStore } from '../../lib/auth';
import { UserCircle } from '@phosphor-icons/react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, actions }) => {
  const { user } = useAuthStore();

  return (
    <header className="h-16 px-8 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-base font-semibold text-gray-900 leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {actions}

        <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
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
