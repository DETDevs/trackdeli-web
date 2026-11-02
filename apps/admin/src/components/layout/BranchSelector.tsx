import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CaretDown, Check, Storefront, CircleNotch } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuthStore, type Branch } from '../../store/auth.store';
import { usePosCartStore } from '../../store/posCart.store';

interface BranchSelectorProps {
  isMobile?: boolean;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, branches, switchBranch } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Solo debe mostrarse si hay más de una sucursal
  if (!branches || branches.length <= 1) {
    return null;
  }

  const activeBranch = branches.find((b) => b.id === user?.businessId) || branches[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectBranch = async (targetBranch: Branch) => {
    if (targetBranch.id === user?.businessId || isSwitching) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setIsOpen(false);

    try {
      await switchBranch(targetBranch.id);

      // Limpiar datos de la sucursal anterior
      queryClient.clear();
      usePosCartStore.getState().clearCart();

      // Redirigir al inicio del admin
      navigate('/');
      toast.success(`Estás en la sucursal ${targetBranch.name}`, {
        duration: 3500,
        position: 'top-center',
      });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      if (status === 403 || code === 'BRANCH_ACCESS_DENIED') {
        toast.error('Acceso denegado a esta sucursal. Tu usuario no tiene permisos asignados.');
      } else {
        toast.error(err?.response?.data?.message || 'Error al cambiar de sucursal. Intenta nuevamente.');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={isSwitching}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer border select-none ${
          isMobile
            ? 'px-2 py-1 text-xs bg-gray-50 border-gray-200 text-gray-800 max-w-[150px]'
            : 'px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200/80 border-gray-200/80 text-gray-800 max-w-[200px]'
        }`}
        title={`Sucursal activa: ${activeBranch.name}`}
      >
        <Storefront size={14} className="text-gray-500 shrink-0" />
        <span className="truncate">{activeBranch.name}</span>
        {isSwitching ? (
          <CircleNotch size={12} className="animate-spin text-gray-500 shrink-0" />
        ) : (
          <CaretDown size={12} className={`text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl bg-white shadow-lg border border-gray-200 py-1.5 z-50 text-xs focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Sucursales disponibles
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {branches.map((b) => {
              const isSelected = b.id === user?.businessId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBranch(b)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isSelected ? 'font-semibold text-gray-900 bg-gray-50/60' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Storefront size={15} className={isSelected ? 'text-gray-900 shrink-0' : 'text-gray-400 shrink-0'} />
                    <span className="truncate">{b.name}</span>
                    {b.isPrimary && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-200/70 text-gray-600 shrink-0">
                        Principal
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} weight="bold" className="text-gray-900 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

