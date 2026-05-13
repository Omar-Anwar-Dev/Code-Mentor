import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, Transition } from '@headlessui/react';
import { Bell, CheckCircle2, Inbox, Loader2 } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { notificationsApi, type NotificationDto, type NotificationListResponse } from './api/notificationsApi';

const POLL_INTERVAL_MS = 60_000;

/**
 * S6-T12: header bell that shows unread count + a dropdown of recent
 * notifications. Polls /api/notifications every 60s while the user is
 * authenticated; clicking an item marks it read and (when present) navigates
 * to its `link`.
 */
export const NotificationsBell: React.FC = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
    const [data, setData] = useState<NotificationListResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const resp = await notificationsApi.list(1, 10);
            setData(resp);
        } catch {
            // Quiet failure — the bell stays empty if the API is down. Don't toast on poll.
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            setData(null);
            return;
        }
        refresh();
        const t = setInterval(refresh, POLL_INTERVAL_MS);
        // S14-T11 hotfix (2026-05-13 walkthrough): allow other components to
        // trigger an immediate bell refresh by dispatching a window event.
        // Used by SettingsPage after a data-export request so the
        // DataExportReady notification shows up in seconds, not after the
        // next 60s poll tick.
        const onRefreshEvent = () => refresh();
        window.addEventListener('cm:notifications-refresh', onRefreshEvent);
        return () => {
            clearInterval(t);
            window.removeEventListener('cm:notifications-refresh', onRefreshEvent);
        };
    }, [isAuthenticated, refresh]);

    const handleClick = async (n: NotificationDto) => {
        if (!n.isRead) {
            try {
                await notificationsApi.markRead(n.id);
                setData((prev) => prev && {
                    ...prev,
                    unreadCount: Math.max(0, prev.unreadCount - 1),
                    items: prev.items.map((it) => it.id === n.id ? { ...it, isRead: true, readAt: new Date().toISOString() } : it),
                });
            } catch {
                // Swallow — UI stays optimistic.
            }
        }
        if (n.link) {
            // S14-T11 hotfix (2026-05-13 walkthrough): DataExportReady notifications
            // carry an absolute SAS blob URL on Notification.Link. React Router's
            // navigate() treats it as an internal SPA route and silently no-ops.
            // Detect absolute URLs + open them via window.open instead.
            const isAbsoluteUrl = /^https?:\/\//i.test(n.link);
            if (isAbsoluteUrl) {
                window.open(n.link, '_blank', 'noopener,noreferrer');
            } else {
                navigate(n.link);
            }
        }
    };

    if (!isAuthenticated) return null;

    const unread = data?.unreadCount ?? 0;
    const items = data?.items ?? [];

    return (
        <Popover className="relative">
            <Popover.Button
                className="relative p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center leading-none" aria-hidden="true">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </Popover.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <Popover.Panel className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white dark:bg-neutral-800 shadow-lg border border-neutral-100 dark:border-neutral-700 focus:outline-none z-50">
                    <div className="p-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                        <p className="text-sm font-semibold">Notifications</p>
                        <div className="flex items-center gap-2">
                            {unread > 0 && (
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const unreadItems = items.filter((n) => !n.isRead);
                                        // Optimistic — flip everything locally first.
                                        setData((prev) => prev && {
                                            ...prev,
                                            unreadCount: 0,
                                            items: prev.items.map((it) => ({ ...it, isRead: true, readAt: new Date().toISOString() })),
                                        });
                                        await Promise.allSettled(
                                            unreadItems.map((n) => notificationsApi.markRead(n.id))
                                        );
                                    }}
                                    className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                    aria-label="Mark all notifications as read"
                                >
                                    Mark all read
                                </button>
                            )}
                            {loading && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="p-6 text-center text-sm text-neutral-500 space-y-2">
                                <Inbox className="w-8 h-8 mx-auto text-neutral-300" />
                                <p>You're all caught up.</p>
                            </div>
                        ) : (
                            <ul>
                                {items.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => handleClick(n)}
                                            className={`w-full text-left p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0
                                                ${n.isRead ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {!n.isRead && (
                                                    <span className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                                                )}
                                                {n.isRead && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 mt-1 text-neutral-300 flex-shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{n.title}</p>
                                                    <p className="text-xs text-neutral-500 line-clamp-2">{n.message}</p>
                                                    <p className="text-[10px] uppercase tracking-wide text-neutral-400 mt-1">
                                                        {formatRelative(n.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Popover.Panel>
            </Transition>
        </Popover>
    );
};

function formatRelative(iso: string): string {
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(iso).toLocaleDateString();
}
