import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { removeToast } from '@/features/ui/store/uiSlice';

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const styles = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
    success: 'text-success-500',
    error: 'text-error-500',
    warning: 'text-warning-500',
    info: 'text-blue-500',
};

interface ToastItemProps {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, type, title, message, duration = 5000 }) => {
    const dispatch = useAppDispatch();
    const Icon = icons[type];

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                dispatch(removeToast(id));
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, dispatch]);

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        animate-slide-up
        ${styles[type]}
      `}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[type]}`} />
            <div className="flex-1 min-w-0">
                <p className="font-medium">{title}</p>
                {message && <p className="text-sm mt-0.5 opacity-90">{message}</p>}
            </div>
            <button
                onClick={() => dispatch(removeToast(id))}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const toasts = useAppSelector((state) => state.ui.toasts);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} {...toast} />
            ))}
        </div>
    );
};
