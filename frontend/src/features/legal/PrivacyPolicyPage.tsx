import React from 'react';
import { LegalPage, type LegalSection } from './LegalPage';

const PRIVACY_SECTIONS: LegalSection[] = [
    {
        id: 'overview',
        title: 'Overview',
        body: [
            'Code Mentor is an AI-powered code review and learning platform built by a 7-person CS team at Benha University Faculty of Computers and AI as part of our 2026 graduation project. This Privacy Policy describes how we collect, use, and protect information when you use the platform during the defense window.',
            'The platform is operated by the project team under the academic supervision of Prof. Mohammed Belal and Eng. Mohamed El-Saied. If you have any question about the practices described here, contact us at privacy@codementor.benha.edu.eg or open an issue in our public repository.',
        ],
    },
    {
        id: 'data',
        title: 'Data we collect',
        body: [
            'We collect three categories of data. First, account information: your full name, email address, hashed password, chosen learning track, and (if you sign in via GitHub) your GitHub user ID and the email scoped to that token.',
            'Second, learning content: the source code you submit (via GitHub URL or ZIP), your assessment answers, the AI feedback returned, and any follow-up messages you send in the mentor chat.',
            'Third, operational telemetry: timestamps, the routes you visit inside the platform, anonymized error reports, and aggregate counters used to size our review queue. We do not collect device fingerprints, location data, or any third-party advertising identifiers.',
        ],
    },
    {
        id: 'use',
        title: 'How we use your data',
        body: [
            'We use your data to operate the service: to authenticate you, to run static analysis and AI review on your submissions, to render your scored Learning CV, and to surface inline annotations against the exact lines they refer to.',
            'We use aggregated, de-identified metrics to improve the AI mentor\'s prompting, retrieval quality, and category coverage. We do not use your individual code to train any third-party model, and we do not sell, rent, or share your personal data with marketers.',
        ],
    },
    {
        id: 'storage',
        title: 'Where your data lives',
        body: [
            'Account records sit in Azure SQL (East US). Submitted ZIPs and any extracted artifacts live in Azure Blob Storage with private access. The Qdrant vector store, used for RAG-grounded mentor chat, holds embeddings of code chunks tied to your account but never the original code in plaintext.',
            "Calls to OpenAI's API are made under their commercial-API contract, which states that prompts and completions sent through the API are not used to train OpenAI models. We log only the request metadata (model, token count, latency) — not the prompt body — for cost accounting.",
        ],
    },
    {
        id: 'access',
        title: 'Who can see your code',
        body: [
            'By default, your submissions are private and visible only to you and the AI service. The project team does not browse user submissions; access for debugging requires your written consent and is audited.',
            'When you explicitly publish a Learning CV, you choose which submissions to feature. Those become accessible at a shareable URL of your choice. You can unpublish or delete a published submission at any time from your profile settings.',
        ],
    },
    {
        id: 'cookies',
        title: 'Cookies & analytics',
        body: [
            'We use httpOnly, SameSite=Strict session cookies exclusively for authentication. We do not use third-party analytics, cross-site tracking, or marketing pixels. The platform sets no cookies at all until you sign in.',
            'Our backend records anonymized request counts to monitor service health. These records are retained for 30 days and then aggregated; raw entries are dropped.',
        ],
    },
    {
        id: 'rights',
        title: 'Your rights',
        body: [
            'You can view and edit your account information from your profile page. You can delete your account at any time; deletion removes your record from Azure SQL within 24 hours and triggers garbage collection of your blobs and embeddings within seven days.',
            'Data portability is available as a JSON export covering your assessments, submissions, scores, and chat history. This export is post-MVP and we will publish a self-serve endpoint before the September 2026 defense.',
        ],
    },
    {
        id: 'contact',
        title: 'Contact',
        body: [
            'Reach the team at privacy@codementor.benha.edu.eg for any privacy question. For technical issues or feature requests, open an issue at github.com/Omar-Anwar-Dev/Code-Mentor — the team monitors the repository daily during the defense window.',
        ],
    },
];

export const PrivacyPolicyPage: React.FC = () => (
    <LegalPage
        title="Privacy Policy"
        lastUpdated="2026-05-07"
        intro="We take a minimum-collection approach: we ask for only what we need to run a review, store it for as long as you keep your account, and never sell, share, or train third-party models on your code."
        sections={PRIVACY_SECTIONS}
    />
);
