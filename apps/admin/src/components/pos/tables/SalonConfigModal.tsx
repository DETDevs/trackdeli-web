import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Plus,
  PencilSimple,
  Trash,
  ArrowUp,
  ArrowDown,
  Check,
  WarningCircle,
  CircleNotch,
  Gear,
} from '@phosphor-icons/react';
import {
  getPosSalonZones,
  createPosSalonZone,
  updatePosSalonZone,
  reorderPosSalonZones,
  deletePosSalonZone,
  getPosTables,
  createPosTable,
  updatePosTable,
  deletePosTable,
  type PosSalonZone,
  type PosTableConfigItem,
  type PosTableShape,
} from 'api-client';
import toast from 'react-hot-toast';
import { extractApiErrorMessage } from '../../../utils/productCost';
import {
  findNextFreeGridPosition,
  generateNextTableNumbers,
} from '../../../utils/salonGrid';

interface SalonConfigModalProps {
  isOpen: boolean;
  business?: { gridColumns?: number; gridRows?: number } | null;
  onClose: () => void;
}

const mapZoneError = (err: any, fallback: string): string => {
  const rawMsg = extractApiErrorMessage(err, fallback);
  if (rawMsg.includes('ZONE_NAME_TAKEN')) {
    return 'Ya existe una zona activa con ese nombre.';
  }
  if (rawMsg.includes('ZONE_HAS_TABLES')) {
    return 'No podés borrar una zona que tiene mesas activas (o si es la única zona con mesas en el negocio). Mové o desactivá sus mesas primero.';
  }
  if (rawMsg.includes('ZONE_REQUIRED')) {
    return 'Debés seleccionar una zona válida.';
  }
  if (rawMsg.includes('ZONE_NOT_FOUND')) {
    return 'No se encontró la zona seleccionada.';
  }
  return rawMsg;
};

export const SalonConfigModal: React.FC<SalonConfigModalProps> = ({
  isOpen,
  business,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'TABLES' | 'ZONES'>('TABLES');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Zonas state
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');

  // Mesas create state
  const [createMode, setCreateMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [batchCountStr, setBatchCountStr] = useState('5');
  const [targetZoneId, setTargetZoneId] = useState<string>('');
  const [startNumberStr, setStartNumberStr] = useState('');
  const [capacityStr, setCapacityStr] = useState('4');
  const [shape, setShape] = useState<PosTableShape>('SQUARE');

  // Mesa edit/delete inline state
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editTableCapacityStr, setEditTableCapacityStr] = useState('4');
  const [editTableShape, setEditTableShape] = useState<PosTableShape>('SQUARE');
  const [editTableZoneId, setEditTableZoneId] = useState<string>('');
  const [confirmDeleteTableId, setConfirmDeleteTableId] = useState<string | null>(null);

  const zonesQuery = useQuery<PosSalonZone[]>({
    queryKey: ['pos', 'salon', 'zones'],
    queryFn: () => getPosSalonZones(),
    enabled: isOpen,
  });

  const tablesQuery = useQuery<PosTableConfigItem[]>({
    queryKey: ['pos', 'tables', 'config'],
    queryFn: () => getPosTables(),
    enabled: isOpen,
  });

  const zones = useMemo(
    () =>
      [...(zonesQuery.data || [])].sort((a, b) =>
        a.sortOrder !== b.sortOrder
          ? a.sortOrder - b.sortOrder
          : a.name.localeCompare(b.name, 'es'),
      ),
    [zonesQuery.data],
  );

  const tables = tablesQuery.data || [];
  const gridColumns = Number(business?.gridColumns || 10);
  const gridRows = Number(business?.gridRows || 10);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setEditingZoneId(null);
      setEditingTableId(null);
      setConfirmDeleteTableId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (zones.length > 0 && (!targetZoneId || !zones.some((z) => z.id === targetZoneId))) {
      setTargetZoneId(zones[0].id);
    } else if (zones.length === 0) {
      setTargetZoneId('');
    }
  }, [zones, targetZoneId]);

  const suggestedNextNumber = useMemo(
    () => generateNextTableNumbers(tables, 1)[0] || '1',
    [tables],
  );

  if (!isOpen) return null;

  const invalidateSalonQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pos', 'salon', 'zones'] }),
      queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'status'] }),
      queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'config'] }),
    ]);
  };

  // --- Acciones de Zonas ---
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newZoneName.trim();
    if (clean.length < 2 || clean.length > 40) {
      setErrorMsg('El nombre de la zona debe tener entre 2 y 40 caracteres.');
      return;
    }
    setIsMutating(true);
    setErrorMsg(null);
    try {
      const created = await createPosSalonZone({ name: clean });
      setNewZoneName('');
      setTargetZoneId(created.id);
      await invalidateSalonQueries();
      toast.success(`Zona "${created.name}" creada`);
    } catch (err) {
      setErrorMsg(mapZoneError(err, 'No se pudo crear la zona.'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveZoneRename = async (zoneId: string) => {
    const clean = editingZoneName.trim();
    if (clean.length < 2 || clean.length > 40) {
      setErrorMsg('El nombre de la zona debe tener entre 2 y 40 caracteres.');
      return;
    }
    setIsMutating(true);
    setErrorMsg(null);
    try {
      await updatePosSalonZone(zoneId, { name: clean });
      setEditingZoneId(null);
      await invalidateSalonQueries();
      toast.success('Zona actualizada');
    } catch (err) {
      setErrorMsg(mapZoneError(err, 'No se pudo renombrar la zona.'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleMoveZone = async (index: number, direction: -1 | 1) => {
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= zones.length || isMutating) return;
    const nextOrder = [...zones];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(swapIdx, 0, moved);

    setIsMutating(true);
    setErrorMsg(null);
    try {
      await reorderPosSalonZones(nextOrder.map((z) => z.id));
      await invalidateSalonQueries();
    } catch (err) {
      setErrorMsg(mapZoneError(err, 'No se pudo reordenar las zonas.'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteZone = async (zone: PosSalonZone) => {
    if (isMutating) return;
    setIsMutating(true);
    setErrorMsg(null);
    try {
      await deletePosSalonZone(zone.id);
      await invalidateSalonQueries();
      toast.success(`Zona "${zone.name}" eliminada`);
    } catch (err) {
      setErrorMsg(mapZoneError(err, 'No se pudo eliminar la zona.'));
    } finally {
      setIsMutating(false);
    }
  };

  // --- Acciones de Mesas ---
  const handleCreateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetZoneId) {
      setErrorMsg('Creá o elegí una zona antes de agregar mesas.');
      setActiveTab('ZONES');
      return;
    }

    const capacity = parseInt(capacityStr, 10);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      setErrorMsg('La capacidad debe estar entre 1 y 100 personas.');
      return;
    }

    const count =
      createMode === 'SINGLE'
        ? 1
        : Math.min(50, Math.max(1, parseInt(batchCountStr || '1', 10) || 1));

    const numbersToCreate = generateNextTableNumbers(
      tables,
      count,
      startNumberStr.trim() || undefined,
    );

    setIsMutating(true);
    setErrorMsg(null);

    let createdCount = 0;
    const workingZoneTables = tables
      .filter((t) => t.zoneId === targetZoneId)
      .map((t) => ({ id: t.id, gridX: t.gridX, gridY: t.gridY }));

    try {
      for (const num of numbersToCreate) {
        const nextPos = findNextFreeGridPosition(
          workingZoneTables,
          gridColumns,
          gridRows,
        );
        if (!nextPos) {
          throw new Error(
            `La grilla (${gridColumns}×${gridRows}) de esta zona alcanzó su capacidad máxima.`,
          );
        }

        const created = await createPosTable({
          zoneId: targetZoneId,
          number: num,
          capacity,
          shape,
          gridX: nextPos.gridX,
          gridY: nextPos.gridY,
        });

        workingZoneTables.push({
          id: created.id,
          gridX: created.gridX,
          gridY: created.gridY,
        });
        createdCount++;
      }

      setStartNumberStr('');
      await invalidateSalonQueries();
      toast.success(
        createdCount === 1
          ? `Mesa "${numbersToCreate[0]}" creada`
          : `${createdCount} mesas creadas`,
      );
    } catch (err: any) {
      await invalidateSalonQueries();
      const baseMsg = err?.response
        ? extractApiErrorMessage(err, 'No se pudieron crear las mesas.')
        : err?.message || 'No se pudieron crear las mesas.';
      setErrorMsg(
        createdCount > 0
          ? `Se crearon ${createdCount} mesa(s), pero ocurrió un aviso: ${baseMsg}`
          : baseMsg,
      );
    } finally {
      setIsMutating(false);
    }
  };

  const beginEditTable = (t: PosTableConfigItem) => {
    setEditingTableId(t.id);
    setConfirmDeleteTableId(null);
    setEditTableNumber(t.number);
    setEditTableCapacityStr(String(t.capacity));
    setEditTableShape(t.shape || 'SQUARE');
    setEditTableZoneId(t.zoneId || zones[0]?.id || '');
    setErrorMsg(null);
  };

  const handleSaveEditTable = async (table: PosTableConfigItem) => {
    const trimmedNumber = editTableNumber.trim();
    if (!trimmedNumber || trimmedNumber.length > 50) {
      setErrorMsg('El número o identificador es obligatorio (máximo 50 caracteres).');
      return;
    }
    const capacity = parseInt(editTableCapacityStr, 10);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      setErrorMsg('La capacidad debe estar entre 1 y 100 personas.');
      return;
    }
    if (!editTableZoneId) {
      setErrorMsg('Elegí una zona válida para la mesa.');
      return;
    }

    const isMovingZone = editTableZoneId !== table.zoneId;
    let nextGridCoords: { gridX?: number; gridY?: number } = {};

    if (isMovingZone) {
      const destTables = tables.filter((t) => t.zoneId === editTableZoneId);
      const pos = findNextFreeGridPosition(
        destTables,
        gridColumns,
        gridRows,
        table.id,
      );
      if (!pos) {
        setErrorMsg('La zona destino ya tiene todas sus posiciones ocupadas.');
        return;
      }
      nextGridCoords = { gridX: pos.gridX, gridY: pos.gridY };
    } else if (table.gridX === null || table.gridY === null) {
      const sameZoneTables = tables.filter((t) => t.zoneId === editTableZoneId);
      const pos = findNextFreeGridPosition(
        sameZoneTables,
        gridColumns,
        gridRows,
        table.id,
      );
      if (pos) {
        nextGridCoords = { gridX: pos.gridX, gridY: pos.gridY };
      }
    }

    setIsMutating(true);
    setErrorMsg(null);
    try {
      await updatePosTable(table.id, {
        number: trimmedNumber,
        capacity,
        shape: editTableShape,
        ...(editTableZoneId !== table.zoneId ? { zoneId: editTableZoneId } : {}),
        ...nextGridCoords,
      });
      setEditingTableId(null);
      await invalidateSalonQueries();
      toast.success('Mesa actualizada');
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'No se pudo actualizar la mesa.'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeactivateTable = async (tableId: string) => {
    setIsMutating(true);
    setErrorMsg(null);
    try {
      await deletePosTable(tableId);
      setConfirmDeleteTableId(null);
      await invalidateSalonQueries();
      toast.success('Mesa desactivada');
    } catch (err) {
      setErrorMsg(
        extractApiErrorMessage(err, 'No se pudo desactivar la mesa.'),
      );
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        {/* Cabecera */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <Gear size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate">
                Configurar salón
              </h3>
              <p className="text-xs text-gray-500">
                Administrá tus zonas y mesas sin salir de la web
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isMutating}
            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-gray-100 bg-white shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('TABLES');
                setErrorMsg(null);
              }}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === 'TABLES'
                  ? 'bg-white text-[#0F0F0F] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mesas ({tables.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ZONES');
                setErrorMsg(null);
              }}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === 'ZONES'
                  ? 'bg-white text-[#0F0F0F] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Zonas ({zones.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAFAFA]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'ZONES' ? (
            <div className="space-y-4">
              {/* Crear zona */}
              <form
                onSubmit={handleCreateZone}
                className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
              >
                <label className="block text-xs font-bold text-gray-900">
                  Nueva zona
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="Ej: Salón principal, Terraza, Barra..."
                    maxLength={40}
                    className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={isMutating || newZoneName.trim().length < 2}
                    className="min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Plus size={15} weight="bold" />
                    <span>Crear zona</span>
                  </button>
                </div>
              </form>

              {/* Listado de zonas */}
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {zonesQuery.isLoading ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    Cargando zonas...
                  </div>
                ) : zones.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    Todavía no hay zonas creadas. Creá la primera zona arriba.
                  </div>
                ) : (
                  zones.map((zone, idx) => {
                    const isEditing = editingZoneId === zone.id;
                    const tablesInZone = tables.filter((t) => t.zoneId === zone.id).length;

                    return (
                      <div
                        key={zone.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              type="text"
                              value={editingZoneName}
                              onChange={(e) => setEditingZoneName(e.target.value)}
                              maxLength={40}
                              className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-300 text-xs sm:text-sm font-medium text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveZoneRename(zone.id)}
                              disabled={isMutating}
                              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0F0F0F] text-white flex items-center justify-center cursor-pointer"
                              aria-label="Guardar nombre"
                            >
                              <Check size={16} weight="bold" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingZoneId(null)}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
                              aria-label="Cancelar edición"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0F0F0F] truncate">
                                {zone.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {tablesInZone} {tablesInZone === 1 ? 'mesa' : 'mesas'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveZone(idx, -1)}
                                disabled={isMutating || idx === 0}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center cursor-pointer disabled:opacity-30"
                                aria-label="Subir zona"
                              >
                                <ArrowUp size={15} weight="bold" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveZone(idx, 1)}
                                disabled={isMutating || idx === zones.length - 1}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center cursor-pointer disabled:opacity-30"
                                aria-label="Bajar zona"
                              >
                                <ArrowDown size={15} weight="bold" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingZoneId(zone.id);
                                  setEditingZoneName(zone.name);
                                }}
                                disabled={isMutating}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center cursor-pointer"
                                aria-label="Renombrar zona"
                              >
                                <PencilSimple size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteZone(zone)}
                                disabled={isMutating}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center cursor-pointer disabled:opacity-40"
                                aria-label="Eliminar zona"
                              >
                                <Trash size={15} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Crear una o varias mesas */}
              <form
                onSubmit={handleCreateTables}
                className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wider">
                    Agregar mesas
                  </h4>
                  <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setCreateMode('SINGLE')}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                        createMode === 'SINGLE'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-600'
                      }`}
                    >
                      Una mesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateMode('BATCH')}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                        createMode === 'BATCH'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-600'
                      }`}
                    >
                      Varias seguidas
                    </button>
                  </div>
                </div>

                {zones.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                    <span>Necesitás crear al menos una zona antes de agregar mesas.</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ZONES')}
                      className="min-h-[36px] px-3 rounded-lg bg-[#0F0F0F] text-white text-xs font-semibold cursor-pointer"
                    >
                      Ir a Zonas
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Zona
                        </label>
                        <select
                          value={targetZoneId}
                          onChange={(e) => setTargetZoneId(e.target.value)}
                          className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900"
                        >
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {createMode === 'BATCH' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Cantidad a crear (1–50)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={batchCountStr}
                              onChange={(e) => setBatchCountStr(e.target.value)}
                              className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => setBatchCountStr('5')}
                              className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-800 cursor-pointer whitespace-nowrap"
                            >
                              5 mesas
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {createMode === 'BATCH'
                            ? `Número inicial (sugerido: ${suggestedNextNumber})`
                            : `Número / nombre (sugerido: ${suggestedNextNumber})`}
                        </label>
                        <input
                          type="text"
                          value={startNumberStr}
                          onChange={(e) => setStartNumberStr(e.target.value)}
                          placeholder={suggestedNextNumber}
                          maxLength={50}
                          className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-xs text-gray-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Capacidad
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={capacityStr}
                            onChange={(e) => setCapacityStr(e.target.value)}
                            className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Forma
                          </label>
                          <select
                            value={shape}
                            onChange={(e) => setShape(e.target.value as PosTableShape)}
                            className="w-full min-h-[44px] px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900"
                          >
                            <option value="SQUARE">Cuadrada</option>
                            <option value="ROUND">Redonda</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isMutating}
                      className="w-full min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {isMutating ? (
                        <>
                          <CircleNotch size={16} className="animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={15} weight="bold" />
                          <span>
                            {createMode === 'SINGLE'
                              ? 'Agregar mesa'
                              : `Agregar ${Math.min(50, Math.max(1, parseInt(batchCountStr || '1', 10) || 1))} mesas seguidas`}
                          </span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>

              {/* Listado de mesas existentes */}
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {tablesQuery.isLoading ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    Cargando mesas...
                  </div>
                ) : tables.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    No hay mesas activas todavía.
                  </div>
                ) : (
                  tables.map((t) => {
                    const isEditing = editingTableId === t.id;
                    const isConfirmingDel = confirmDeleteTableId === t.id;
                    const title = /^mesa\s+/i.test(t.number) ? t.number : `Mesa ${t.number}`;

                    return (
                      <div key={t.id} className="p-3.5 space-y-2.5">
                        {isEditing ? (
                          <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Número / nombre
                                </label>
                                <input
                                  type="text"
                                  value={editTableNumber}
                                  onChange={(e) => setEditTableNumber(e.target.value)}
                                  maxLength={50}
                                  className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Zona
                                </label>
                                <select
                                  value={editTableZoneId}
                                  onChange={(e) => setEditTableZoneId(e.target.value)}
                                  className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900"
                                >
                                  {zones.map((z) => (
                                    <option key={z.id} value={z.id}>
                                      {z.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Capacidad
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={editTableCapacityStr}
                                  onChange={(e) => setEditTableCapacityStr(e.target.value)}
                                  className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Forma
                                </label>
                                <select
                                  value={editTableShape}
                                  onChange={(e) =>
                                    setEditTableShape(e.target.value as PosTableShape)
                                  }
                                  className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900"
                                >
                                  <option value="SQUARE">Cuadrada</option>
                                  <option value="ROUND">Redonda</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingTableId(null)}
                                className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditTable(t)}
                                disabled={isMutating}
                                className="min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                              >
                                Guardar cambios
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0F0F0F] truncate">
                                {title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {t.zoneName} · {t.capacity}{' '}
                                {t.capacity === 1 ? 'persona' : 'personas'} ·{' '}
                                {t.shape === 'ROUND' ? 'Redonda' : 'Cuadrada'}
                                {t.gridX !== null && t.gridY !== null
                                  ? ` · Pos (${t.gridX},${t.gridY})`
                                  : ''}
                              </p>
                            </div>

                            {isConfirmingDel ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDeactivateTable(t.id)}
                                  disabled={isMutating}
                                  className="min-h-[44px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Confirmar baja
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteTableId(null)}
                                  className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => beginEditTable(t)}
                                  disabled={isMutating}
                                  className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <PencilSimple size={14} />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteTableId(t.id);
                                    setErrorMsg(null);
                                  }}
                                  disabled={isMutating}
                                  className="min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash size={14} />
                                  <span>Desactivar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
