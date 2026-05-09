import React, { useEffect } from 'react';
import { Card } from '@/components/ui';

/**
 * S8-T9 (B-006): static Terms of Service for MVP. Mirrors the disclosures
 * in PrivacyPolicyPage; not a replacement for a proper legal review.
 */
export const TermsOfServicePage: React.FC = () => {
    useEffect(() => {
        const prev = document.title;
        document.title = 'Terms of Service · Code Mentor';
        return () => { document.title = prev; };
    }, []);

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
            <header>
                <h1 className="text-3xl font-bold mb-1">Terms of Service</h1>
                <p className="text-sm text-neutral-500">Last updated: 2026-04-26</p>
            </header>
            <Card className="p-6 space-y-4 text-sm leading-relaxed">
                <section>
                    <h2 className="text-lg font-semibold mb-1">What Code Mentor is</h2>
                    <p>
                        Code Mentor is an AI-powered learning platform that gives you adaptive
                        skill assessments, personalised learning paths, and multi-layered code
                        review. It is a graduation project of Benha University's Class of 2026
                        and is provided <strong>as-is</strong> while in MVP.
                    </p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">Acceptable use</h2>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Submit your own code, or code you have permission to share.</li>
                        <li>Don't upload malicious payloads — we reject ZIPs containing
                            path-traversal entries, anything over 50 MB, or known
                            non-source binaries.</li>
                        <li>Don't attempt to circumvent rate limits or our admin tooling.</li>
                    </ul>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">AI feedback disclaimer</h2>
                    <p>
                        Reviews are produced by an LLM. Treat suggestions as starting points,
                        not authoritative correctness guarantees. Always test code before
                        deploying to production.
                    </p>
                </section>
                <section>
                    <h2 className="text-lg font-semibold mb-1">Account suspension</h2>
                    <p>
                        We may deactivate accounts that abuse the platform. Deactivation
                        does not delete your past submissions; export tooling will be added
                        post-MVP.
                    </p>
                </section>
            </Card>
        </div>
    );
};
