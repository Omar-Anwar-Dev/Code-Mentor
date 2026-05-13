// Privacy + Terms — content-heavy with sticky TOC, Print button

function LegalHeader({ title, dark, setDark, onNav }) {
  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-slate-200/40 dark:border-white/5 px-5 lg:px-10 flex items-center no-print">
      <a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}}><BrandLogo size="sm" /></a>
      <div className="mx-auto hidden md:flex items-center gap-2">
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</span>
        <Badge tone="primary" icon="FileText">legal</Badge>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" leftIcon="ArrowLeft" onClick={()=>onNav("landing")}>Back</Button>
        <ThemeToggle dark={dark} setDark={setDark} />
      </div>
    </header>
  );
}

function TOC({ items, activeId, onClick }) {
  return (
    <aside className="hidden lg:block w-64 shrink-0 no-print">
      <div className="sticky top-24">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-3">Contents</div>
        <nav className="flex flex-col gap-0.5">
          {items.map((it, i) => (
            <a key={it.id} href={"#"+it.id}
               onClick={(e)=>{e.preventDefault(); onClick(it.id);}}
               className={[
                 "px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-colors",
                 activeId === it.id
                   ? "bg-primary-500/10 text-primary-700 dark:text-primary-200 border-l-2 border-primary-500"
                   : "text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-slate-100/60 dark:hover:bg-white/5 border-l-2 border-transparent"
               ].join(" ")}>
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 w-5 shrink-0">{String(i+1).padStart(2,'0')}</span>
              <span>{it.title}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function LegalPage({ title, lastUpdated, intro, sections, dark, setDark, onNav }) {
  const [active, setActive] = paUseState(sections[0].id);
  paUseEffect(() => {
    const handler = () => {
      const y = window.scrollY + 140;
      let cur = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= y) cur = s.id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [sections]);

  const goTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: "smooth" });
    setActive(id);
  };

  return (
    <div className="min-h-screen">
      <LegalHeader title={title} dark={dark} setDark={setDark} onNav={onNav} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
        <div className="flex gap-10">
          <TOC items={sections} activeId={active} onClick={goTo} />
          <main className="flex-1 min-w-0 max-w-3xl">
            {/* page header */}
            <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
              <div>
                <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">{title}</div>
                <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
                <p className="mt-2 font-mono text-[12.5px] text-slate-500 dark:text-slate-400">Last updated: {lastUpdated}</p>
              </div>
              <Button variant="ghost" size="sm" leftIcon="Printer" onClick={()=>window.print()} className="no-print">Print</Button>
            </div>
            <p className="text-[15.5px] text-slate-600 dark:text-slate-300 leading-relaxed mb-10 max-w-2xl">{intro}</p>

            <div className="flex flex-col gap-12">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[12px] text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded-md bg-primary-500/10">{String(i+1).padStart(2,'0')}</span>
                    <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{s.title}</h2>
                  </div>
                  <div className="flex flex-col gap-3.5 text-[14.5px] text-slate-700 dark:text-slate-300 leading-[1.75] max-w-2xl">
                    {s.body.map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 pt-8 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
              <div className="font-mono text-[12px] text-slate-500 dark:text-slate-400">commit · 2026-05-12 · Benha University</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" leftIcon="Printer" onClick={()=>window.print()} className="no-print">Print</Button>
                <Button variant="outline" size="sm" leftIcon="Mail">Contact us</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const PRIVACY_SECTIONS = [
  { id:"overview", title:"Overview", body:[
    "Code Mentor is an AI-powered code review and learning platform built by a 7-person CS team at Benha University Faculty of Computers and AI as part of our 2026 graduation project. This Privacy Policy describes how we collect, use, and protect information when you use the platform during the defense window.",
    "The platform is operated by the project team under the academic supervision of Prof. Mohammed Belal and Eng. Mohamed El-Saied. If you have any question about the practices described here, contact us at privacy@codementor.benha.edu.eg or open an issue in our public repository."
  ]},
  { id:"data", title:"Data we collect", body:[
    "We collect three categories of data. First, account information: your full name, email address, hashed password, chosen learning track, and (if you sign in via GitHub) your GitHub user ID and the email scoped to that token.",
    "Second, learning content: the source code you submit (via GitHub URL or ZIP), your assessment answers, the AI feedback returned, and any follow-up messages you send in the mentor chat.",
    "Third, operational telemetry: timestamps, the routes you visit inside the platform, anonymized error reports, and aggregate counters used to size our review queue. We do not collect device fingerprints, location data, or any third-party advertising identifiers."
  ]},
  { id:"use", title:"How we use your data", body:[
    "We use your data to operate the service: to authenticate you, to run static analysis and AI review on your submissions, to render your scored Learning CV, and to surface inline annotations against the exact lines they refer to.",
    "We use aggregated, de-identified metrics to improve the AI mentor's prompting, retrieval quality, and category coverage. We do not use your individual code to train any third-party model, and we do not sell, rent, or share your personal data with marketers."
  ]},
  { id:"storage", title:"Where your data lives", body:[
    "Account records sit in Azure SQL (East US). Submitted ZIPs and any extracted artifacts live in Azure Blob Storage with private access. The Qdrant vector store, used for RAG-grounded mentor chat, holds embeddings of code chunks tied to your account but never the original code in plaintext.",
    "Calls to OpenAI's API are made under their commercial-API contract, which states that prompts and completions sent through the API are not used to train OpenAI models. We log only the request metadata (model, token count, latency) — not the prompt body — for cost accounting."
  ]},
  { id:"access", title:"Who can see your code", body:[
    "By default, your submissions are private and visible only to you and the AI service. The project team does not browse user submissions; access for debugging requires your written consent and is audited.",
    "When you explicitly publish a Learning CV, you choose which submissions to feature. Those become accessible at a shareable URL of your choice. You can unpublish or delete a published submission at any time from your profile settings."
  ]},
  { id:"cookies", title:"Cookies & analytics", body:[
    "We use httpOnly, SameSite=Strict session cookies exclusively for authentication. We do not use third-party analytics, cross-site tracking, or marketing pixels. The platform sets no cookies at all until you sign in.",
    "Our backend records anonymized request counts to monitor service health. These records are retained for 30 days and then aggregated; raw entries are dropped."
  ]},
  { id:"rights", title:"Your rights", body:[
    "You can view and edit your account information from your profile page. You can delete your account at any time; deletion removes your record from Azure SQL within 24 hours and triggers garbage collection of your blobs and embeddings within seven days.",
    "Data portability is available as a JSON export covering your assessments, submissions, scores, and chat history. This export is post-MVP and we will publish a self-serve endpoint before the September 2026 defense."
  ]},
  { id:"contact", title:"Contact", body:[
    "Reach the team at privacy@codementor.benha.edu.eg for any privacy question. For technical issues or feature requests, open an issue at github.com/Omar-Anwar-Dev/Code-Mentor — the team monitors the repository daily during the defense window."
  ]},
];

const TERMS_SECTIONS = [
  { id:"acceptance", title:"Acceptance", body:[
    "By creating an account or using any part of Code Mentor, you agree to these Terms of Service. If you do not agree, do not use the platform. These Terms apply to the version of the platform that is currently live during the September 2026 defense window.",
    "You confirm you are at least 16 years old, or have a parent or guardian's consent if you are between 13 and 16. The platform is not intended for users under 13."
  ]},
  { id:"service", title:"Service description", body:[
    "Code Mentor provides AI-powered code review, an adaptive assessment, a personalized learning path, a mentor chat grounded in your submissions, and a Learning CV you can share. We integrate static analyzers (Bandit, ESLint, Cppcheck, and others) and a large language model to produce structured feedback.",
    "We do not provide: certifications recognized by any governmental authority, paid mentoring by a human reviewer, or legal advice on the code you submit. The platform is an educational tool, not a substitute for professional engineering review."
  ]},
  { id:"account", title:"Account responsibilities", body:[
    "You are responsible for keeping your credentials safe. Do not share your password or session cookie with anyone, do not let another person sign in as you, and do not create multiple accounts to abuse the free quota.",
    "If you suspect your account has been compromised, change your password immediately and email security@codementor.benha.edu.eg. We are not responsible for losses that result from a credential leak you did not report."
  ]},
  { id:"acceptable", title:"Acceptable use", body:[
    "Do not abuse the AI review quota by submitting machine-generated junk, ZIP bombs, or recursive symlinks. Do not run automated scrapers against the platform. Do not submit code containing malware, exploits, or material whose distribution is illegal in Egypt or in your jurisdiction.",
    "We may rate-limit, queue, or refuse submissions that we identify as abusive. Persistent abuse results in account suspension and, in serious cases, an internal note shared with your university's academic integrity office."
  ]},
  { id:"ip", title:"Intellectual property", body:[
    "You retain all ownership of the code you submit. By submitting code, you grant Code Mentor a limited, non-exclusive, non-transferable license to process, embed, and analyze that code for the sole purpose of producing your review and powering the mentor chat for you.",
    "The platform's user interface, brand, illustrations, design tokens, and source code are the property of the project team and the university. You may not copy or republish them without permission."
  ]},
  { id:"ai", title:"AI limitations", body:[
    "Feedback produced by Code Mentor is AI-generated. It may be incorrect, incomplete, or out of date. It is not a substitute for professional code review, security audit, or legal review.",
    "Do not rely on the platform's feedback alone before deploying code to production, before submitting work for grading, or before making any decision with real-world consequences. Always confirm AI suggestions against authoritative sources."
  ]},
  { id:"availability", title:"Availability", body:[
    "We operate the platform on a best-effort basis during the defense window. There is no service-level agreement and no uptime guarantee. We may pause non-critical features (e.g., the mentor chat, the project audit) at short notice if running costs exceed our budget.",
    "Scheduled maintenance windows are announced inside the app at least 24 hours in advance. Emergency maintenance may happen without notice."
  ]},
  { id:"liability", title:"Liability", body:[
    "To the maximum extent permitted by law, the project team's total liability for any claim related to the platform is limited to the fees you have paid us — which is $0 during the MVP and defense period. We are not liable for indirect, incidental, or consequential damages.",
    "Nothing in these Terms limits liability for fraud, willful misconduct, or any other liability that cannot be limited under applicable law."
  ]},
  { id:"changes", title:"Changes", body:[
    "We may update these Terms. Material changes will be notified by email at least 7 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the updated Terms.",
    "The current version of the Terms is always available at this URL. A diff against the prior version is available on request."
  ]},
];

function Privacy(props) {
  return (
    <LegalPage
      {...props}
      title="Privacy Policy"
      lastUpdated="2026-05-07"
      intro="We take a minimum-collection approach: we ask for only what we need to run a review, store it for as long as you keep your account, and never sell, share, or train third-party models on your code."
      sections={PRIVACY_SECTIONS}
    />
  );
}
function Terms(props) {
  return (
    <LegalPage
      {...props}
      title="Terms of Service"
      lastUpdated="2026-05-07"
      intro="Plain-English terms governing your use of Code Mentor during the September 2026 defense window. Read sections 5 and 6 closely — they describe how the AI's limits apply to your work."
      sections={TERMS_SECTIONS}
    />
  );
}

Object.assign(window, { Privacy, Terms });
