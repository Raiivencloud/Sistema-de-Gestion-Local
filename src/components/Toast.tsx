import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

export enum ToastType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const config = {
    [ToastType.SUCCESS]: { icon: CheckCircle2, border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-800', iconColor: 'text-emerald-500' },
    [ToastType.WARNING]: { icon: AlertCircle, border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-800', iconColor: 'text-amber-500' },
    [ToastType.ERROR]: { icon: AlertCircle, border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-800', iconColor: 'text-red-500' },
  };

  const { icon: Icon, border, bg, text, iconColor } = config[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
          className={`fixed bottom-8 left-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border ${border} ${bg} shadow-lg shadow-black/5 min-w-[320px]`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <p className={`flex-1 text-sm font-medium ${text}`}>{message}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
