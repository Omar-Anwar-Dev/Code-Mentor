import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    size?: ModalSize;
    children: React.ReactNode;
    showCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> & {
    Header: React.FC<{ children: React.ReactNode; className?: string }>;
    Body: React.FC<{ children: React.ReactNode; className?: string }>;
    Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ isOpen, onClose, size = 'md', children, showCloseButton = true }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className={`
                  w-full ${sizeStyles[size]} transform rounded-2xl
                  bg-white dark:bg-neutral-900/95
                  backdrop-blur-xl transition-all relative
                  border border-neutral-200/60 dark:border-white/10
                  shadow-[0_30px_80px_-20px_rgba(15,23,42,.5)]
                `}
                            >
                                {showCloseButton && (
                                    <button
                                        onClick={onClose}
                                        className="absolute right-4 top-4 p-2 rounded-lg
                                            text-neutral-400 dark:text-neutral-500
                                            hover:text-neutral-600 dark:hover:text-neutral-200
                                            hover:bg-neutral-100 dark:hover:bg-white/5
                                            transition-colors z-10"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

Modal.Header = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-b border-neutral-100 dark:border-white/5 ${className}`}>
        <Dialog.Title as="h3" className="text-lg font-semibold text-neutral-900 dark:text-white">
            {children}
        </Dialog.Title>
    </div>
);

Modal.Body = ({ children, className = '' }) => (
    <div className={`px-6 py-4 ${className}`}>{children}</div>
);

Modal.Footer = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-t border-neutral-100 dark:border-white/5 flex justify-end gap-3 ${className}`}>
        {children}
    </div>
);

Modal.Header.displayName = 'Modal.Header';
Modal.Body.displayName = 'Modal.Body';
Modal.Footer.displayName = 'Modal.Footer';
