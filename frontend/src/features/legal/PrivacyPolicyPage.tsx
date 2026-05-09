import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';

/**
 * S8-T9 (B-006): static Privacy Policy page so the MVP ships with the legal
 * surface PRD §8.3 calls for. Defense-grade content; not a substitute for a
 * proper legal review post-launch.
 */
export const PrivacyPolicyPage: React.FC = () => {
    useEffect(() => {
        const prev = document.title;
        document.title = 'Privacy Policy · Code Mentor';
        return () => { document.title = prev; };
    }, []);

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
            <header>
                <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
                <p className="text-sm text-neutral-500">Last updated: 2026-04-26</p>
            </header>
            <Card className="p-6 space-y-4 text-sm leading-relaxed">
                <section>
                    <h2 className="text-lg font-semibold mb-1">What we collect</h2>
                    <p>
                        Code Mentor stores the email, full name, and (optionally) GitHub username
                        you provide on registration. Your code submissions — uploaded ZIPs and
                        cloned GitHub repositories — are stored only for the duration of the
                        AI-review pipeline plus 30 days for retry windows.
                    </p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">Code privacy</h2>
                    <p>
                        Your submitted code is sent to our AI service for review and to the
                        OpenAI API (GPT-5.1-codex-mini). Per our contract with OpenAI, your
                        code <strong>is not used for model training</strong>.
                    </p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">Cookies</h2>
                    <p>
                        We use a single HttpOnly cookie to carry your refresh token. We do not
                        load third-party trackers or analytics scripts.
                    </p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">Your rights</h2>
                    <p>
                        You can edit your profile from <Link to="/profile" className="text-primary-600 hover:underline">your profile page</Link>.
                        Account deletion + GDPR data export are available on request via the
                        platform admin during the MVP period; tooling for self-serve flows is
                        on the post-MVP roadmap.
                    </p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">Contact</h2>
                    <p>
                        Questions about your data? Reach the team at{' '}
                        <a href="mailto:codementor@bu.edu.eg" className="text-primary-600 hover:underline">
                            codementor@bu.edu.eg
                        </a>.
                    </p>
                </section>
            </Card>
        </div>
    );
};
