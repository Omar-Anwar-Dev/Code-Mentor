import React from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from '@/shared/components/ui/Toast';
import { Sparkles } from 'lucide-react';

export const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold">CodeMentor AI</span>
                    </div>

                    <h1 className="text-4xl font-bold mb-4 leading-tight">
                        Master Programming<br />
                        with AI-Powered<br />
                        Learning
                    </h1>

                    <p className="text-primary-100 text-lg max-w-md">
                        Personalized learning paths, adaptive assessments, and intelligent code review
                        to accelerate your programming journey.
                    </p>

                    <div className="mt-12 grid grid-cols-2 gap-6">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                            <div className="text-3xl font-bold">30+</div>
                            <div className="text-primary-200 text-sm">Skill Categories</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                            <div className="text-3xl font-bold">AI</div>
                            <div className="text-primary-200 text-sm">Code Review</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                            <div className="text-3xl font-bold">5</div>
                            <div className="text-primary-200 text-sm">Learning Tracks</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                            <div className="text-3xl font-bold">100%</div>
                            <div className="text-primary-200 text-sm">Personalized</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-900 transition-colors duration-300">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>

            <ToastContainer />
        </div>
    );
};
