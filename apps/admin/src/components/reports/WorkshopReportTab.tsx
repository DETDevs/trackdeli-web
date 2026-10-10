import React from 'react';
import {
  Wrench,
  Car,
  CurrencyDollar,
  UserGear,
} from '@phosphor-icons/react';
import { WorkshopReport, PeriodType } from '../../types/reports';
import { formatCurrency } from '../../utils/formatters';

interface WorkshopReportTabProps {
  workshopData?: WorkshopReport | null;
  period: PeriodType;
  isLoading: boolean;
}

export const WorkshopReportTab: React.FC<WorkshopReportTabProps> = ({
  workshopData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          <div className="h-72 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
        </div>
      </div>
    );
  }

  if (!workshopData?.isWorkshop) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-10 max-w-lg mx-auto text-center space-y-3">
        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
          <Wrench size={24} />
        </div>
        <h3 className="text-base font-bold text-gray-900">Módulo de Taller no habilitado</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Este negocio no tiene configurado el perfil de Taller / Automotriz.
        </p>
      </div>
    );
  }

  const services = workshopData.services || [];
  const technicians = workshopData.technicians || [];
  const vehicles = workshopData.vehiclesAttended || [];

  const totalServicesCount = services.reduce((acc, s) => acc + s.quantity, 0);
  const totalWorkshopRevenue =
    technicians.reduce((acc, t) => acc + t.totalRevenue, 0) ||
    services.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Vehículos Atendidos */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Vehículos atendidos</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Car size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {workshopData.vehiclesAttendedCount || 0}
          </div>
          <div className="text-[11px] text-gray-400">Autos y motos en servicio</div>
        </div>

        {/* Servicios Realizados */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Servicios realizados</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wrench size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {totalServicesCount}
          </div>
          <div className="text-[11px] text-gray-400">Mano de obra y reparaciones</div>
        </div>

        {/* Facturación Taller */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Facturación taller</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center">
              <CurrencyDollar size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(totalWorkshopRevenue)}
          </div>
          <div className="text-[11px] text-gray-400">Total cobrado en órdenes</div>
        </div>
      </div>

      {/* Servicios Más Solicitados & Ingresos por Técnico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Servicios Más Solicitados */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Servicios Más Solicitados
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Top 10</span>
          </div>

          {services.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay servicios registrados en este período.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 pt-1 flex-1">
              {services.map((s, idx) => (
                <div key={s.productId || s.productName} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{s.productName}</div>
                      <div className="text-[11px] text-gray-400">
                        {s.quantity === 1 ? '1 servicio' : `${s.quantity} servicios`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-gray-900 shrink-0">
                    {formatCurrency(s.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingresos por Técnico */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <UserGear size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Rendimiento por Técnico
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Facturación acumulada</span>
          </div>

          {technicians.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay órdenes asignadas a técnicos en este período.
            </div>
          ) : (
            <div className="overflow-x-auto pt-1 flex-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[11px]">
                    <th className="py-2 px-2 font-semibold">Técnico</th>
                    <th className="py-2 px-2 font-semibold text-center">Órdenes</th>
                    <th className="py-2 px-2 font-semibold text-right">Facturación</th>
                    <th className="py-2 px-2 font-semibold text-right">% Taller</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {technicians.map((t) => {
                    const pct =
                      totalWorkshopRevenue > 0
                        ? Math.round((t.totalRevenue / totalWorkshopRevenue) * 1000) / 10
                        : 0;

                    return (
                      <tr key={t.technicianId} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-2 font-bold text-gray-900">{t.technicianName}</td>
                        <td className="py-2.5 px-2 text-center text-gray-600 font-medium">{t.ordersCount}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-gray-900">
                          {formatCurrency(t.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold text-blue-700">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Vehículos Atendidos List */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={16} className="text-gray-700" weight="bold" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Vehículos Atendidos en el Período
            </h3>
          </div>
          <span className="text-[11px] text-gray-400">{vehicles.length} vehículos</span>
        </div>

        {vehicles.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            No hay vehículos atendidos en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Placa</th>
                  <th className="py-2.5 px-4 font-semibold">Descripción</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Visitas / Órdenes</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total Facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map((v) => (
                  <tr key={v.vehicleId || v.plate} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-gray-900">{v.plate}</td>
                    <td className="py-2.5 px-4 text-gray-600">{v.description || 'Sin descripción'}</td>
                    <td className="py-2.5 px-4 text-center font-semibold text-gray-700">
                      {v.ordersCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(v.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
