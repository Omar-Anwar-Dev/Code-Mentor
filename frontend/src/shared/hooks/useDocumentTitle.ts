import { useEffect } from 'react';

/**
 * S8-T9 (B-009): set the page title for the current route, restore on unmount.
 * Centralised so each page just calls one hook with a string.
 */
export function useDocumentTitle(title: string): void {
    useEffect(() => {
        const previous = document.title;
        document.title = title.endsWith('Code Mentor') ? title : `${title} · Code Mentor`;
        return () => { document.title = previous; };
    }, [title]);
}
