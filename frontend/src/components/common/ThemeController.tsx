import React, { useEffect } from 'react';
import { useAppSelector } from '@/app/hooks';
export const ThemeController: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useAppSelector((state) => state.ui);

    // Check system preference on mount if no theme set (or logic to default)
    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old classes
        root.classList.remove('light', 'dark');

        // Add new class
        root.classList.add(theme);
    }, [theme]);

    return <>{children}</>;
};
