'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

interface ToasterProps {
  toasts?: Toast[];
  onDismiss?: (id: string) => void;
}

export function Toaster({ toasts = [], onDismiss }: ToasterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.3 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`
              relative w-80 p-4 rounded-lg shadow-lg border
              ${toast.variant === 'destructive' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-white border-gray-200 text-gray-900'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {toast.variant === 'destructive' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{toast.title}</p>
                <p className="text-sm opacity-90 mt-1">{toast.description}</p>
              </div>
              <button
                onClick={() => onDismiss?.(toast.id)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}







