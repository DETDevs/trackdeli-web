import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string | React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  accent?: 'brand' | 'blue' | 'amber' | 'neutral' | 'red';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-gray-500 min-w-0">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
        <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight break-words">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.positive ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[13px] text-gray-500 font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
};
