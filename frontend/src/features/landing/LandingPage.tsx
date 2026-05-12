import React from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setTheme } from '@/features/ui/uiSlice';
import { Button } from '@/components/ui';
import {
    Sparkles,
    Code2,
    Brain,
    Target,
    Rocket,
    Users,
    Award,
    ArrowRight,
    Github,
    Twitter,
    Linkedin,
    ChevronRight,
    Zap,
    BookOpen,
    TrendingUp,
    MessageSquare,
    Moon,
    Sun,
} from 'lucide-react';

// Animated background component
const AnimatedBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-r from-primary-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)]" />

        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-primary-500 rounded-full animate-float opacity-60" />
        <div className="absolute top-40 right-32 w-3 h-3 bg-purple-500 rounded-full animate-float opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-cyan-500 rounded-full animate-float opacity-50" style={{ animationDelay: '2s' }} />
    </div>
);

// Navigation component
const Navigation: React.FC = () => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector((state) => state.ui);
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    const toggleTheme = () => {
        dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'));
    };

    // Authenticated users see the surface they belong on, not auth CTAs they don't need.
    const homeDest = user?.role === 'Admin'
        ? '/admin'
        : user?.hasCompletedAssessment ? '/dashboard' : '/assessment';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass dark:glass-dark border-b border-neutral-100 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-primary-500/25 transition-shadow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                            CodeMentor AI
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            Features
                        </a>
                        <a href="#journey" className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            How It Works
                        </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        {isAuthenticated && user ? (
                            <Link to={homeDest}>
                                <Button variant="gradient" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                    {user.role === 'Admin' ? 'Open admin' : 'Go to dashboard'}
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost" size="sm">Sign in</Button>
                                </Link>
                                <Link to="/register">
                                    <Button variant="gradient" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                        Get Started
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

// Returns the right primary destination for the current viewer:
// — unauthenticated → /register (sign-up funnel)
// — authenticated admin → /admin
// — authenticated learner with assessment → /dashboard
// — authenticated learner without assessment → /assessment
function usePrimaryCtaDest(): { to: string; label: string } {
    const { isAuthenticated, user } = useAppSelector((s) => s.auth);
    if (!isAuthenticated || !user) return { to: '/register', label: 'Start Learning Free' };
    if (user.role === 'Admin') return { to: '/admin', label: 'Open admin' };
    return user.hasCompletedAssessment
        ? { to: '/dashboard', label: 'Go to dashboard' }
        : { to: '/assessment', label: 'Continue your assessment' };
}

// Hero Section
const HeroSection: React.FC = () => {
    const primary = usePrimaryCtaDest();
    return (
    <section className="relative min-h-screen flex items-center pt-16">
        <AnimatedBackground />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left content */}
                <div className="text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 mb-6">
                        <Zap className="w-4 h-4 text-primary-500" />
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">AI-Powered Learning Platform</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                        <span className="text-neutral-900 dark:text-white">Master Coding with </span>
                        <span className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            Personalized AI
                        </span>
                        <span className="text-neutral-900 dark:text-white"> Feedback</span>
                    </h1>

                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-xl mx-auto lg:mx-0">
                        Get instant code reviews, personalized learning paths, and expert guidance from our AI mentor.
                        Level up your skills faster than ever.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4">
                        <Link to={primary.to}>
                            <Button variant="gradient" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="w-full sm:w-auto">
                                {primary.label}
                            </Button>
                        </Link>
                        {/* S9-T11: Project Audit CTA — secondary action, equal billing as the
                            standalone path through the product. Clicking when unauth flows
                            through ProtectedRoute → /login (existing behavior). */}
                        <Link to="/audit/new">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                Audit your project
                            </Button>
                        </Link>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center lg:text-left mb-12">
                        Already have a project? Get an honest, structured AI audit in under 6 minutes.
                    </p>

                    {/* Trust strip — academic-honest stand-in for invented social proof. */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-success-500" aria-hidden="true" />
                            6 analyzers · 5 skill axes
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary-500" aria-hidden="true" />
                            Built with .NET 10 · React · FastAPI
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500" aria-hidden="true" />
                            Benha University · Class of 2026
                        </span>
                    </div>
                </div>

                {/* Right visual - Code preview */}
                <div className="relative hidden lg:block">
                    <div className="relative bg-neutral-900 dark:bg-neutral-950 rounded-2xl p-6 shadow-2xl border border-neutral-800">
                        {/* Window controls */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-4 text-sm text-neutral-500">code-review.tsx</span>
                        </div>

                        {/* Code snippet */}
                        <pre className="text-sm font-mono">
                            <code>
                                <span className="text-purple-400">function</span>
                                <span className="text-blue-400"> calculateTotal</span>
                                <span className="text-neutral-400">(items) {'{'}</span>
                                {'\n'}
                                <span className="text-neutral-500">  // ✨ AI Suggestion: Use reduce</span>
                                {'\n'}
                                <span className="text-pink-400">  return</span>
                                <span className="text-neutral-400"> items.</span>
                                <span className="text-yellow-400">reduce</span>
                                <span className="text-neutral-400">((sum, item) =&gt;</span>
                                {'\n'}
                                <span className="text-neutral-400">    sum + item.price, </span>
                                <span className="text-green-400">0</span>
                                <span className="text-neutral-400">);</span>
                                {'\n'}
                                <span className="text-neutral-400">{'}'}</span>
                            </code>
                        </pre>
                    </div>

                    {/* AI feedback card - enhanced */}
                    <div className="mt-6">
                        <div className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 text-white p-5 rounded-2xl shadow-xl animate-float">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Brain className="w-6 h-6" />
                                </div>
                                <span className="text-lg font-bold">AI Feedback</span>
                            </div>
                            <p className="text-base opacity-95 leading-relaxed">Great use of reduce! Consider adding TypeScript types for better safety.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    );
};

// Features Section
const FeaturesSection: React.FC = () => {
    const features = [
        {
            icon: Brain,
            title: 'AI Code Review',
            description: 'Get instant, detailed feedback on your code quality, best practices, and potential improvements.',
            gradient: 'from-cyan-500 to-blue-500',
        },
        {
            icon: Target,
            title: 'Personalized Learning',
            description: 'Adaptive learning paths tailored to your skill level and goals. Learn what matters most.',
            gradient: 'from-purple-500 to-pink-500',
        },
        {
            icon: Code2,
            title: 'Real-World Projects',
            description: 'Practice with industry-relevant projects and challenges that prepare you for actual work.',
            gradient: 'from-orange-500 to-red-500',
        },
        {
            icon: MessageSquare,
            title: 'Interactive Feedback',
            description: 'Ask questions about your code and get explanations from our AI mentor in real-time.',
            gradient: 'from-green-500 to-emerald-500',
        },
        {
            icon: BookOpen,
            title: 'Comprehensive Curriculum',
            description: 'From fundamentals to advanced topics - everything you need in one place.',
            gradient: 'from-indigo-500 to-purple-500',
        },
        {
            icon: Award,
            title: 'Track & Celebrate',
            description: 'Earn badges, track your progress, and celebrate milestones on your learning journey.',
            gradient: 'from-amber-500 to-orange-500',
        },
    ];

    return (
        <section id="features" className="relative py-24 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
                        Features
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                        Everything You Need to{' '}
                        <span className="bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                            Excel
                        </span>
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                        Our AI-powered platform provides all the tools and guidance you need to become a better developer.
                    </p>
                </div>

                {/* Features grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group relative bg-white dark:bg-neutral-800/50 backdrop-blur-sm rounded-2xl p-6 border border-neutral-100 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Learning Journey Timeline
const JourneySection: React.FC = () => {
    const steps = [
        {
            step: 1,
            title: 'Take the Assessment',
            description: 'Complete a quick skill assessment to help us understand your current level.',
            icon: Target,
        },
        {
            step: 2,
            title: 'Get Your Learning Path',
            description: 'Receive a personalized curriculum tailored to your goals and skill gaps.',
            icon: Rocket,
        },
        {
            step: 3,
            title: 'Code & Learn',
            description: 'Work through projects and challenges while getting real-time AI feedback.',
            icon: Code2,
        },
        {
            step: 4,
            title: 'Track & Improve',
            description: 'Monitor your progress, earn achievements, and continuously level up.',
            icon: TrendingUp,
        },
    ];

    return (
        <section id="journey" className="relative py-24 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
                        Your Journey
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                        How It{' '}
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                            Works
                        </span>
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                        A simple yet powerful learning process designed to maximize your growth.
                    </p>
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Vertical line */}
                    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary-500 via-purple-500 to-pink-500" />

                    <div className="space-y-12 lg:space-y-0">
                        {steps.map((item, index) => (
                            <div
                                key={index}
                                className={`relative lg:grid lg:grid-cols-2 lg:gap-16 items-center ${index % 2 === 0 ? '' : 'lg:direction-rtl'}`}
                            >
                                {/* Content */}
                                <div className={`mb-8 lg:mb-0 ${index % 2 === 0 ? 'lg:text-right lg:pr-16' : 'lg:text-left lg:pl-16 lg:col-start-2'}`}>
                                    <div className={`inline-flex items-center gap-2 mb-4 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                                        <span className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {item.step}
                                        </span>
                                        <span className="text-sm font-medium text-primary-500">Step {item.step}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                                        {item.title}
                                    </h3>
                                    <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                                        {item.description}
                                    </p>
                                </div>

                                {/* Icon card */}
                                <div className={`${index % 2 === 0 ? 'lg:pl-16' : 'lg:pr-16 lg:col-start-1 lg:row-start-1'}`}>
                                    <div className="relative inline-block">
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 dark:from-primary-500/10 dark:to-purple-500/10 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center shadow-xl">
                                                <item.icon className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Center dot */}
                                <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-neutral-900 border-4 border-primary-500" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// CTA Section
const CTASection: React.FC = () => {
    const primary = usePrimaryCtaDest();
    return (
    <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to Accelerate Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white">
                    Coding Journey?
                </span>
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Join thousands of developers who are already learning faster and building better code with CodeMentor AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={primary.to}>
                    <Button size="lg" variant="secondary" className="bg-white text-primary-600 hover:bg-neutral-100 w-full sm:w-auto" rightIcon={<ArrowRight className="w-5 h-5" />}>
                        {primary.label}
                    </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto" leftIcon={<Users className="w-5 h-5" />}>
                    Contact Sales
                </Button>
            </div>

            <p className="mt-6 text-sm text-white/60">
                No credit card required • Free forever plan available
            </p>
        </div>
    </section>
    );
};

// Footer
const Footer: React.FC = () => (
    <footer className="bg-neutral-900 dark:bg-neutral-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                {/* Brand */}
                <div className="lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">CodeMentor AI</span>
                    </div>
                    <p className="text-neutral-400 mb-6">
                        The AI-powered platform that helps you become a better developer, faster.
                    </p>
                    <div className="flex gap-4">
                        <a href="#" aria-label="GitHub (placeholder)" className="w-10 h-10 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
                            <Github className="w-5 h-5" aria-hidden />
                        </a>
                        <a href="#" aria-label="Twitter (placeholder)" className="w-10 h-10 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
                            <Twitter className="w-5 h-5" aria-hidden />
                        </a>
                        <a href="#" aria-label="LinkedIn (placeholder)" className="w-10 h-10 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
                            <Linkedin className="w-5 h-5" aria-hidden />
                        </a>
                    </div>
                </div>

                {/* Links */}
                {[
                    {
                        title: 'Product',
                        links: ['Features', 'Roadmap', 'Changelog'],
                    },
                    {
                        title: 'Resources',
                        links: ['Documentation', 'Blog', 'Community', 'Support'],
                    },
                    {
                        title: 'Company',
                        links: ['About', 'Careers', 'Privacy', 'Terms'],
                    },
                ].map((group, index) => (
                    <div key={index}>
                        <h3 className="font-semibold mb-4">{group.title}</h3>
                        <ul className="space-y-3">
                            {group.links.map((link) => (
                                <li key={link}>
                                    <a href="#" className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 group">
                                        <ChevronRight className="w-4 h-4 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Bottom */}
            <div className="pt-8 border-t border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-neutral-500 text-sm">
                    © 2024 CodeMentor AI. All rights reserved.
                </p>
                <div className="flex items-center gap-6 text-sm text-neutral-500">
                    <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-white transition-colors">Cookies</a>
                </div>
            </div>
        </div>
    </footer>
);

// Main Landing Page
export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-neutral-900 transition-colors">
            <Navigation />
            <main id="main-content">
                <HeroSection />
                <FeaturesSection />
                <JourneySection />
                <CTASection />
            </main>
            <Footer />
        </div>
    );
};

export default LandingPage;
