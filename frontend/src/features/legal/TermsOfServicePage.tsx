import React from 'react';
import { LegalPage, type LegalSection } from './LegalPage';

const TERMS_SECTIONS: LegalSection[] = [
    {
        id: 'acceptance',
        title: 'Acceptance',
        body: [
            'By creating an account or using any part of Code Mentor, you agree to these Terms of Service. If you do not agree, do not use the platform. These Terms apply to the version of the platform that is currently live during the September 2026 defense window.',
            "You confirm you are at least 16 years old, or have a parent or guardian's consent if you are between 13 and 16. The platform is not intended for users under 13.",
        ],
    },
    {
        id: 'service',
        title: 'Service description',
        body: [
            'Code Mentor provides AI-powered code review, an adaptive assessment, a personalized learning path, a mentor chat grounded in your submissions, and a Learning CV you can share. We integrate static analyzers (Bandit, ESLint, Cppcheck, and others) and a large language model to produce structured feedback.',
            'We do not provide: certifications recognized by any governmental authority, paid mentoring by a human reviewer, or legal advice on the code you submit. The platform is an educational tool, not a substitute for professional engineering review.',
        ],
    },
    {
        id: 'account',
        title: 'Account responsibilities',
        body: [
            'You are responsible for keeping your credentials safe. Do not share your password or session cookie with anyone, do not let another person sign in as you, and do not create multiple accounts to abuse the free quota.',
            'If you suspect your account has been compromised, change your password immediately and email security@codementor.benha.edu.eg. We are not responsible for losses that result from a credential leak you did not report.',
        ],
    },
    {
        id: 'acceptable',
        title: 'Acceptable use',
        body: [
            'Do not abuse the AI review quota by submitting machine-generated junk, ZIP bombs, or recursive symlinks. Do not run automated scrapers against the platform. Do not submit code containing malware, exploits, or material whose distribution is illegal in Egypt or in your jurisdiction.',
            "We may rate-limit, queue, or refuse submissions that we identify as abusive. Persistent abuse results in account suspension and, in serious cases, an internal note shared with your university's academic integrity office.",
        ],
    },
    {
        id: 'ip',
        title: 'Intellectual property',
        body: [
            'You retain all ownership of the code you submit. By submitting code, you grant Code Mentor a limited, non-exclusive, non-transferable license to process, embed, and analyze that code for the sole purpose of producing your review and powering the mentor chat for you.',
            "The platform's user interface, brand, illustrations, design tokens, and source code are the property of the project team and the university. You may not copy or republish them without permission.",
        ],
    },
    {
        id: 'ai',
        title: 'AI limitations',
        body: [
            'Feedback produced by Code Mentor is AI-generated. It may be incorrect, incomplete, or out of date. It is not a substitute for professional code review, security audit, or legal review.',
            "Do not rely on the platform's feedback alone before deploying code to production, before submitting work for grading, or before making any decision with real-world consequences. Always confirm AI suggestions against authoritative sources.",
        ],
    },
    {
        id: 'availability',
        title: 'Availability',
        body: [
            'We operate the platform on a best-effort basis during the defense window. There is no service-level agreement and no uptime guarantee. We may pause non-critical features (e.g., the mentor chat, the project audit) at short notice if running costs exceed our budget.',
            'Scheduled maintenance windows are announced inside the app at least 24 hours in advance. Emergency maintenance may happen without notice.',
        ],
    },
    {
        id: 'liability',
        title: 'Liability',
        body: [
            "To the maximum extent permitted by law, the project team's total liability for any claim related to the platform is limited to the fees you have paid us — which is $0 during the MVP and defense period. We are not liable for indirect, incidental, or consequential damages.",
            'Nothing in these Terms limits liability for fraud, willful misconduct, or any other liability that cannot be limited under applicable law.',
        ],
    },
    {
        id: 'changes',
        title: 'Changes',
        body: [
            'We may update these Terms. Material changes will be notified by email at least 7 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the updated Terms.',
            'The current version of the Terms is always available at this URL. A diff against the prior version is available on request.',
        ],
    },
];

export const TermsOfServicePage: React.FC = () => (
    <LegalPage
        title="Terms of Service"
        lastUpdated="2026-05-07"
        intro="Plain-English terms governing your use of Code Mentor during the September 2026 defense window. Read sections 5 and 6 closely — they describe how the AI's limits apply to your work."
        sections={TERMS_SECTIONS}
    />
);
