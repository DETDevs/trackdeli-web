import { NavLink, useNavigate } from 'react-router-dom';
import {
  SquaresFour,
  Storefront,
  Motorcycle,
  ClockCounterClockwise,
  SignOut,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../lib/auth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: SquaresFour },
  { to: '/businesses', label: 'Negocios', icon: Storefront },
  { to: '/riders', label: 'Repartidores', icon: Motorcycle },
  { to: '/logs', label: 'Logs', icon: ClockCounterClockwise },
];

export const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen shrink-0 select-none">
      {/* Header / Brand */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
          TD
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 leading-tight">TrackDeli</h1>
          <p className="text-[11px] text-brand-600 font-medium flex items-center gap-1">
            <ShieldCheck size={12} weight="fill" />
            SuperAdmin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
            SA
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">
              {user?.name || 'Super Admin'}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-danger hover:bg-red-50/50 transition-colors"
        >
          <SignOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
