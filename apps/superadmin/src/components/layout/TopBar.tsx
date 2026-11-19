import React from "react";
import { useAuthStore } from "../../lib/auth";
import { UserCircle, List } from "@phosphor-icons/react";
import { useSuperadminSidebar } from "./Layout";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, actions }) => {
  const { user } = useAuthStore();
  const { setSidebarOpen } = useSuperadminSidebar();

  return (
    <header className="bg-white border-b border-gray-100 shrink-0 px-4 lg:px-8 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 min-h-[40px]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Abrir menú"
          >
            <List size={20} weight="bold" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:pl-4 sm:border-l sm:border-gray-100 shrink-0 md:order-3">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-medium text-gray-900 leading-tight">
              {user?.name || "Super Admin"}
            </p>
            <p className="text-[10px] text-gray-400">Panel Global</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
            <UserCircle size={22} weight="duotone" />
          </div>
        </div>

        {actions && (
          <div className="w-full md:w-auto flex items-center flex-wrap gap-2 md:order-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
