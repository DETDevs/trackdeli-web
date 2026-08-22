import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none px-4 py-2';
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800',
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
