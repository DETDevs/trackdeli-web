import React, { useState, useEffect } from 'react';
import { Trash, Warning, ShieldWarning, WarningCircle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { useBusinessDeletionPreview, useDeleteBusiness } from '../../hooks/useBusinesses';

interface DeleteBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onSuccess?: () => void;
}

const formatEntityCount = (table: string, count: number): string => {
  const t = table.toLowerCase().trim();
  const map: Record<string, { s: string; p: string }> = {
    users: { s: 'usuario', p: 'usuarios' },
    sales: { s: 'venta', p: 'ventas' },
    pos_sales: { s: 'venta', p: 'ventas' },
    products: { s: 'producto', p: 'productos' },
    pos_products: { s: 'producto', p: 'productos' },
    orders: { s: 'pedido', p: 'pedidos' },
    customers: { s: 'cliente', p: 'clientes' },
    business_clients: { s: 'cliente registrado', p: 'clientes registrados' },
    categories: { s: 'categoría', p: 'categorías' },
    pos_categories: { s: 'categoría', p: 'categorías' },
    suppliers: { s: 'proveedor', p: 'proveedores' },
    pos_suppliers: { s: 'proveedor', p: 'proveedores' },
    cash_registers: { s: 'turno de caja', p: 'turnos de caja' },
    cash_movements: { s: 'movimiento de caja', p: 'movimientos de caja' },
    memberships: { s: 'pago de membresía', p: 'pagos de membresía' },
    pos_devices: { s: 'dispositivo registrado', p: 'dispositivos registrados' },
    restaurant_tables: { s: 'mesa', p: 'mesas' },
    table_orders: { s: 'comanda de mesa', p: 'comandas de mesa' },
    salon_zones: { s: 'área de salón', p: 'áreas de salón' },
    waiters: { s: 'mesero', p: 'meseros' },
    pos_terminals: { s: 'terminal POS', p: 'terminales POS' },
    services: { s: 'servicio', p: 'servicios' },
    appointments: { s: 'cita', p: 'citas' },
    credit_accounts: { s: 'cuenta de crédito', p: 'cuentas de crédito' },
    inventory_adjustments: { s: 'ajuste de inventario', p: 'ajustes de inventario' },
    purchases: { s: 'compra', p: 'compras' },
    pos_purchases: { s: 'compra', p: 'compras' },
    sale_returns: { s: 'devolución', p: 'devoluciones' },
    pos_sale_returns: { s: 'devolución', p: 'devoluciones' },
  };

  const entry = map[t];
  if (entry) {
    return `${count} ${count === 1 ? entry.s : entry.p}`;
  }

  const cleanName = t.replace(/^pos_/, '').replace(/_/g, ' ');
  return `${count} ${cleanName}`;
};

export const DeleteBusinessModal: React.FC<DeleteBusinessModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  onSuccess,
}) => {
  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError } =
    useBusinessDeletionPreview(businessId, isOpen);

  const deleteMutation = useDeleteBusiness();

  const [typedName, setTypedName] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      setApiError(null);
      setIsDeleting(false);
    }
  }, [isOpen]);

  const isMatch =
    typedName.trim().length > 0 &&
    typedName.trim().toLowerCase() === businessName.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch || isDeleting) return;

    setApiError(null);
    setIsDeleting(true);

    try {
      await deleteMutation.mutateAsync({
        id: businessId,
        confirmName: typedName.trim(),
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.error || err.response?.data?.code;
      const message = err.response?.data?.message;

      if (
        status === 409 ||
        code === 'BUSINESS_PROTECTED' ||
        (typeof message === 'string' && message.includes('BUSINESS_PROTECTED'))
      ) {
        setApiError('Este negocio tiene un usuario Superadmin y no se puede eliminar.');
      } else {
        const formattedMsg = Array.isArray(message)
          ? message.join('. ')
          : message || 'No se pudo eliminar el negocio. Intentá nuevamente.';
        setApiError(formattedMsg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCounts = preview?.counts
    ? Object.entries(preview.counts)
        .filter(([_, count]) => typeof count === 'number' && count > 0)
        .map(([table, count]) => ({
          table,
          count,
          label: formatEntityCount(table, count),
        }))
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title="Eliminar negocio definitivamente"
      subtitle="Acción destructiva permanente e irreversible"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/90 text-xs text-red-800 flex items-start gap-2.5">
            <WarningCircle size={18} className="text-red-600 shrink-0 mt-0.5" weight="fill" />
            <div className="space-y-0.5">
              <p className="font-semibold text-red-900">No se pudo eliminar el negocio</p>
              <p className="text-[11px] text-red-700 leading-relaxed">{apiError}</p>
            </div>
          </div>
        )}

        {/* Advertencia fija irreversible */}
        <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200/70 text-xs text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-red-700">
            <Warning size={18} weight="fill" />
            <span>Estás por eliminar definitivamente: &ldquo;{businessName}&rdquo;</span>
          </div>
          <p className="text-[11px] font-medium text-red-800">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Advertencia si tiene membresía activa */}
        {preview?.hasActiveSubscription && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 font-semibold">
            <ShieldWarning size={18} className="text-amber-700 shrink-0" weight="fill" />
            <span>Este negocio tiene membresía activa. Se eliminará igual.</span>
          </div>
        )}

        {/* Vista previa de lo que se borrará */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 space-y-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Registros que se borrarán
          </p>

          {isLoadingPreview ? (
            <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent" />
              <span>Calculando registros vinculados...</span>
            </div>
          ) : isPreviewError ? (
            <p className="text-xs text-gray-500 py-1">
              Todos los datos, ventas, usuarios y configuraciones vinculadas a este negocio.
            </p>
          ) : activeCounts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeCounts.map((c) => (
                <span
                  key={c.table}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-gray-200/80 text-gray-800 shadow-2xs"
                >
                  {c.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-1">
              Este negocio no tiene registros vinculados aún. Se eliminará la ficha del negocio.
            </p>
          )}
        </div>

        {/* Confirmación con nombre exacto */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 leading-normal">
            Para confirmar, escribí el nombre del negocio:{' '}
            <span className="font-semibold text-gray-900 select-all">
              {businessName}
            </span>
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={`Escribí "${businessName}" para habilitar el botón`}
            autoFocus
            required
            disabled={isDeleting}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isMatch || isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            <Trash size={15} />
            <span>{isDeleting ? 'Eliminando...' : 'Eliminar negocio definitivamente'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
