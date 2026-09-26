import React from 'react';
import type { Category } from '../types/mesero';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-4 -mx-4 scroll-smooth">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer touch-manipulation shadow-2xs ${
          selectedCategoryId === null
            ? 'bg-gray-900 text-white shadow-xs'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Todas
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer touch-manipulation shadow-2xs flex items-center gap-1.5 ${
              isSelected
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat.icon && <span className="text-sm">{cat.icon}</span>}
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
