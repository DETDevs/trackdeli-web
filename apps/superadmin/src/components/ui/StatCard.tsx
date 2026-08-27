import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
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
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs transition-all hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900 tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.positive ? 'text-brand-600' : 'text-danger'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-gray-400 font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
};
