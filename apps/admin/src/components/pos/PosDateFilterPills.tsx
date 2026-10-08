import React, { useState } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { DateFilterPreset } from '../../hooks/useBackofficeDateFilter';

interface PosDateFilterPillsProps {
  preset: DateFilterPreset;
  setPreset: (preset: DateFilterPreset) => void;
  from: string;
  to: string;
  customFrom: string;
  customTo: string;
  setCustomRange: (from: string, to: string) => void;
}

export const PosDateFilterPills: React.FC<PosDateFilterPillsProps> = ({
  preset,
  setPreset,
  customFrom,
  customTo,
  setCustomRange,
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState(preset === 'custom');
  const [localFrom, setLocalFrom] = useState(customFrom);
  const [localTo, setLocalTo] = useState(customTo);

  const presetsList: Array<{ id: DateFilterPreset; label: string }> = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'week', label: '7 días' },
    { id: 'month', label: 'Este mes' },
    { id: 'custom', label: 'Personalizado' },
  ];

  const handlePresetClick = (pId: DateFilterPreset) => {
    setPreset(pId);
    if (pId === 'custom') {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (localFrom && localTo) {
      setCustomRange(localFrom, localTo);
    }
  };

  return (
    <div className="space-y-2">
      {/* Pills bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs shrink-0">
          {presetsList.map((p) => {
            const isActive = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs cuando está en personalizado */}
      {(showCustomInputs || preset === 'custom') && (
        <form
          onSubmit={handleApplyCustom}
          className="flex flex-wrap items-center gap-2 p-2.5 bg-white border border-gray-200/80 rounded-xl shadow-2xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
            <CalendarBlank size={15} className="text-gray-400" />
            <span className="font-medium">Rango:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-gray-900"
            />
            <span className="text-xs text-gray-400">a</span>
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-gray-900"
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shrink-0 shadow-2xs"
            >
              Aplicar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
