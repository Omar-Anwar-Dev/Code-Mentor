import React from 'react';
import { Tab } from '@headlessui/react';

interface TabsProps {
    tabs: {
        key: string;
        label: string;
        icon?: React.ReactNode;
        count?: number;
    }[];
    children: React.ReactNode;
    defaultIndex?: number;
    onChange?: (index: number) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, children, defaultIndex = 0, onChange }) => {
    return (
        <Tab.Group defaultIndex={defaultIndex} onChange={onChange}>
            <Tab.List className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                {tabs.map((tab) => (
                    <Tab
                        key={tab.key}
                        className={({ selected }) => `
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
              transition-all duration-200 focus:outline-none
              ${selected
                                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-700/50'
                            }
            `}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className={`
                px-1.5 py-0.5 text-xs rounded-full
                ${tab.count > 0 ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400'}
              `}>
                                {tab.count}
                            </span>
                        )}
                    </Tab>
                ))}
            </Tab.List>
            <Tab.Panels className="mt-4">
                {children}
            </Tab.Panels>
        </Tab.Group>
    );
};

export const TabPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => {
    return (
        <Tab.Panel className={`focus:outline-none animate-fade-in ${className}`}>
            {children}
        </Tab.Panel>
    );
};
