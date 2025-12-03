
import React from 'react';
import { Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({ message, className }) => {
  return (
    <div 
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-surface-container/95 border border-outline-variant shadow-2xl text-sm font-medium text-on-surface flex items-center gap-2 transition-all duration-300 pointer-events-none backdrop-blur-sm
      ${message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className || 'z-toast'}`}
    >
      <Info className="w-4 h-4 text-primary" />
      <span>{message}</span>
    </div>
  );
};
