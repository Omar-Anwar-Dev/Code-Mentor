import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

interface UIState {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    toasts: Toast[];
    modalStack: string[];
    theme: 'light' | 'dark';
    compactMode: boolean;
}

const initialState: UIState = {
    sidebarOpen: false,
    sidebarCollapsed: false,
    toasts: [],
    modalStack: [],
    theme: 'light', // Default to light, will check system pref in App
    compactMode: false, // Compact mode reduces spacing/padding
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
        },
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        toggleSidebarCollapse: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        toggleCompactMode: (state) => {
            state.compactMode = !state.compactMode;
        },
        setCompactMode: (state, action: PayloadAction<boolean>) => {
            state.compactMode = action.payload;
        },
        addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            state.toasts.push({ ...action.payload, id });
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
        },
        clearToasts: (state) => {
            state.toasts = [];
        },
        pushModal: (state, action: PayloadAction<string>) => {
            state.modalStack.push(action.payload);
        },
        popModal: (state) => {
            state.modalStack.pop();
        },
        clearModals: (state) => {
            state.modalStack = [];
        },
    },
});

export const {
    toggleTheme,
    setTheme,
    toggleSidebar,
    setSidebarOpen,
    toggleSidebarCollapse,
    toggleCompactMode,
    setCompactMode,
    addToast,
    removeToast,
    clearToasts,
    pushModal,
    popModal,
    clearModals,
} = uiSlice.actions;

export default uiSlice.reducer;

