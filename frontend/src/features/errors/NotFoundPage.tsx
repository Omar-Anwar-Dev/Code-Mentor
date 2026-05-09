import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { Compass } from 'lucide-react';

/**
 * S8-T11: friendly 404 — replaces the previous silent redirect to /dashboard so
 * mistyped URLs are visible to the user.
 */
export const NotFoundPage: React.FC = () => {
    useEffect(() => {
        const prev = document.title;
        document.title = 'Page not found · Code Mentor';
        return () => { document.title = prev; };
    }, []);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
            <Card className="max-w-md w-full p-8 text-center">
                <Compass className="w-12 h-12 mx-auto mb-3 text-primary-500" aria-hidden />
                <p className="text-5xl font-bold mb-1">404</p>
                <h1 className="text-2xl font-semibold mb-1">Page not found</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    We couldn't find the page you're looking for. The link may be old, or the
                    URL might have a typo.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link to="/dashboard">
                        <Button variant="primary">Back to dashboard</Button>
                    </Link>
                    <Link to="/tasks">
                        <Button variant="outline">Browse tasks</Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
};
