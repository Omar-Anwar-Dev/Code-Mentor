import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
                    <div className="max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-error-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-neutral-600 mb-6">
                            We're sorry, but something unexpected happened. Please try reloading the page.
                        </p>
                        {this.state.error && (
                            <pre className="bg-neutral-100 p-4 rounded-lg text-left text-sm text-neutral-700 mb-6 overflow-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                        <Button onClick={this.handleReload} leftIcon={<RefreshCw className="w-4 h-4" />}>
                            Reload Page
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
