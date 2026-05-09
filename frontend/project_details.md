# Decumentation finaly version (1)

# **Declaration**

We, hereby declare that this graduation project, titled **“AI-Powered Learning & Code Review Platform,”** is our own original work. All sources used have been appropriately cited and acknowledged. This work has not been previously submitted for any other degree or qualification at this or any other institution.

# **Acknowledgment**

We would like to express our deepest gratitude to our project supervisor, **Dr. Mostafa Elgendy**, for their invaluable guidance, patience, and expert advice throughout this project. Their insights and constructive feedback were instrumental in shaping our research and development.

We also extend our sincere thanks to our teaching assistant, **Eng. Fatma Ibrahim**, for her continuous support and follow-up.

We also extend our sincere thanks to the faculty and staff of the **Computer Science Department, Faculty of Computers and Artificial Intelligence at Benha University** for providing the academic foundation and resources necessary to complete this work.

Our heartfelt appreciation goes to our fellow team members for the collaborative spirit, late-night brainstorming sessions, and shared dedication that made this project a reality. We are also grateful to our families and friends for their unwavering support and encouragement during this challenging journey.

# Abstract

The landscape of coding education is marked by a significant gap: aspiring developers, particularly self-learners and career-switchers, lack access to the personalized, expert-quality feedback that is crucial for achieving professional competency. High-cost coding bootcamps provide this mentorship but remain financially inaccessible to many, while generic online courses offer scalability but minimal feedback, creating a **“feedback desert.”** Furthermore, graduates of self-study lack the verifiable credentials employers trust.

This project introduces an **“AI-Powered Learning & Code Review Platform,”** an intelligent learning ecosystem designed to democratize expert-quality coding education. The platform addresses these challenges by providing a comprehensive journey from skill assessment to employment readiness.

Upon joining, learners undergo an adaptive assessment to determine their current skill level, which then generates a personalized learning track (e.g., Full Stack, Backend). Learners progress by building real-world projects and submitting their code via GitHub. The core of the solution is a **multi-layered analysis engine** that combines static analysis tools (like ESLint and SonarQube) with advanced AI models. This engine delivers instant, comprehensive feedback covering functionality, code quality, security, performance, and design patterns—emulating the review of a senior developer.

A key innovation is the **“Shareable Learning CV,”** a dynamic profile that showcases a learner’s verified skill progression, AI-assessed code quality, and project history, providing employers with credible, data-backed evidence of their capabilities. By combining the personalized attention of a bootcamp with the scalability and affordability of online education, this platform aims to bridge the learning gap and produce job-ready developers at a fraction of the traditional cost.

# **Chapter One: Project Introduction & Background**

## **1.1 Introduction**

Software development has become one of the most critical professional skills in the modern digital economy. As industries increasingly rely on software-driven systems, the demand for developers who can build secure, maintainable, and scalable applications continues to grow. Each year, millions of learners—including university students, self-taught developers, and career-switchers—enter the field seeking to acquire these skills.

Despite the abundance of online learning resources, a persistent gap remains between **basic coding literacy** and **professional software engineering competency**. While many learners can write code that functions correctly, far fewer develop the ability to produce production-quality software that meets industry standards for architecture, security, performance, and maintainability. Bridging this gap requires more than instructional content; it requires continuous evaluation, guided improvement, and credible validation of skill development.

This project introduces the **AI-Powered Learning & Code Review Platform**, an intelligent educational ecosystem designed to support learners throughout their progression from novice to job-ready developer. By combining adaptive assessment, automated multi-layered code review, and data-driven skill validation, the platform aims to deliver scalable, high-quality learning support that aligns closely with real-world software engineering practices.

This chapter establishes the academic and practical foundation of the project by defining the underlying problem, presenting the proposed solution, reviewing related work, and clarifying the project’s objectives and scope.

## **1.2 Problem Definition**

Although access to programming education has expanded significantly, several structural limitations continue to hinder learners’ progression toward professional competency. These limitations are systemic rather than incidental and affect the majority of self-directed and early-career developers.

### **1.2.1 The Feedback Desert in Self-Learning**

Self-taught developers predominantly rely on free or low-cost platforms such as YouTube, Udemy, Codecademy, and freeCodeCamp. While these platforms deliver structured curricula, they fundamentally fail to provide meaningful, individualized code evaluation—leaving learners without the expert feedback essential for developing industry-ready competencies.

**Critical Deficiencies:**

- **Absence of Quality Assurance:** Learners can verify functional correctness (i.e., whether code *executes*) but cannot assess adherence to best practices, identification of security vulnerabilities, or evaluation of readability and maintainability standards.
- **Generic Learning Pathways:** These platforms deliver one-size-fits-all curricula that fail to adapt to individual learner strengths, weaknesses, or progression rates. A student struggling with exception handling receives identical instruction as one who has already mastered the concept.
- **Overemphasis on Functionality Over Craftsmanship:** Algorithm-focused platforms like LeetCode and HackerRank prioritize functional correctness almost exclusively. Professional competencies—including software architecture, code structure, performance optimization, design patterns, and naming conventions—remain largely unaddressed.

This educational paradigm creates an environment where "knowing how to write code" diverges substantially from "knowing how to write professional, maintainable, industry-standard code."

### **1.2.2 The Prohibitive Cost Barrier of Bootcamps**

Coding bootcamps attempt to address the feedback deficit through human mentorship and comprehensive code review. However, their financial model introduces a severe accessibility barrier.

Programs typically cost between **$5,000 and $20,000+**, rendering them inaccessible to most learners—including students, self-funded individuals, and career-switchers. This cost structure transforms expert feedback from an educational resource into a socioeconomic privilege, thereby perpetuating educational inequality.

A vast population of motivated, capable learners remains unable to access the level of guidance necessary to transition successfully into professional software development roles.

### **1.2.3 The Scalability Challenge of Human Mentorship**

Human mentorship delivers high-quality coaching, but it **does not scale**:

- Mentors can support only small cohorts.
- Platforms like Exercism suffer from **24–72 hour review delays**, leading to:
    - Loss of momentum
    - Fragmented context
    - Inconsistent feedback
    - Slow learning cycles

These limitations prevent timely, reliable, and scalable expert review—something AI systems can uniquely provide.

### **1.2.4 The Lack of Credible Credentials**

Self-taught developers face significant challenges in demonstrating competence through mechanisms that employers recognize and trust.

**Credibility Gaps:**

- **Low-Value Certificates:** Course completion certificates indicate participation rather than mastery, offering minimal signal of actual competency.
- **Unverifiable Skill Claims:** Résumé statements such as "Proficient in React" remain subjective and unsupported by objective evidence.
- **Opaque Skill Development:** GitHub repositories showcase completed projects but fail to reveal the developer's learning trajectory, coding practices, problem-solving methodology, or skill evolution over time.

This credibility deficit forces self-taught learners to repeatedly "prove themselves" in competitive hiring processes, whereas graduates of structured bootcamp programs inherently benefit from institutionally validated credentials. This platform aims to eliminate this disparity by producing transparent, data-backed, verifiable learning credentials.

## **1.3 Proposed Solution**

To address these challenges, this project proposes an **AI-Powered Learning & Code Review Platform** that delivers expert-level guidance, adaptive learning, and verifiable credentials at scale. The platform is designed as an end-to-end learning system that integrates assessment, practice, feedback, and progress validation into a unified workflow.

The solution is structured around five core pillars.

### **1.3.1 Personalized, Adaptive Learning Path**

Learners begin with an automated assessment that evaluates their current proficiency across key development domains. Based on assessment results, the system generates a personalized learning path composed of practical, real-world projects. The learning path evolves dynamically as the learner progresses, continuously adjusting task recommendations to reflect demonstrated strengths and weaknesses.

### **1.3.2 Multi-Layered AI Code Review**

Submitted code undergoes a structured review pipeline consisting of:

- **Static Analysis:** Automated tools detect code smells, security issues, style violations, and maintainability concerns.
- **AI Contextual Analysis:** Advanced language models evaluate architectural decisions, logic correctness, performance implications, and adherence to best practices.

This layered approach enables comprehensive feedback that approximates senior-level code review while remaining scalable and responsive.

### **1.3.3 Shareable Learning CV**

The platform generates a dynamic **Learning CV** that aggregates validated skill metrics, historical performance data, and project-based evidence. Unlike traditional certificates, this CV provides employers with transparent, data-backed insight into a learner’s capabilities and progression over time.

### **1.3.4 Gamification and Engagement**

Gamification mechanisms—including badges, skill tiers, and learning streaks—are integrated to promote consistency and motivation. These elements reinforce progress visibility and support long-term engagement without compromising educational rigor.

## **1.4 Literature Review**

An extensive review of existing learning platforms, mentorship models, and AI-based development tools was conducted to contextualize the proposed system and identify gaps in current solutions.

### **1.4.1 Competitor Landscape**

Existing platforms can be broadly categorized into:

- **Algorithm-focused platforms** (e.g., LeetCode, HackerRank), which emphasize problem-solving but lack holistic code evaluation.
- **Interactive course platforms** (e.g., Codecademy, Scrimba), which provide guided instruction with limited adaptivity.
- **Mentorship-driven platforms** (e.g., Exercism), which offer personalized feedback but suffer from scalability constraints.
- **Coding bootcamps**, which provide comprehensive mentorship at high financial cost.
- **Professional AI code review tools**, which are not designed for structured learning or credentialing.

Each category addresses specific aspects of developer education but fails to provide an integrated, scalable solution that combines adaptive learning, deep feedback, and credential validation.

### **1.4.2 Feature Comparison Matrix**

| **Feature/Capability** | **LeetCode** | **HackerRank** | **Codecademy Pro** | **Scrimba** | **Exercism** | **Bootcamps** | **AI Review Tools** | **Our Platform** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **AI Code Review (Advanced)** | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ✔ | ✔ |
| **Code Quality Assessment** | ❌ | ❌ | ❌ | ❌ | ✔ | ✔ | ✔ | ✔ |
| **Security Analysis** | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ✔ | ✔ |
| **Design Patterns Review** | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ✔ | ✔ |
| **Personalized Learning Path** | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ✔ |
| **Adaptive Learning** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✔ |
| **Instant Feedback (< 5 min)** | ✔ | ✔ | ✔ | ✔ | ❌ | ❌ | ✔ | ✔ |
| **Scalability (1000s users)** | ✔ | ✔ | ✔ | ✔ | ❌ | ❌ | ✔ | ✔ |
| **Progress Metrics & Analytics** | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ✔ | ❌ | ✔ |
| **Shareable Learning CV** | ❌ | ❌ | ❌ | ❌ | ❌ | ✔ | ❌ | ✔ |
| **Community Platform** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ❌ | ✔ |
| **Real-World Projects** | ❌ | ❌ | 🟡 | 🟡 | ❌ | ✔ | ❌ | ✔ |
| **Adaptive Assessment** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✔ |
| **AI-Driven Recommendations** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✔ |
| **24/7 Availability** | ✔ | ✔ | ✔ | ✔ | ❌ | ❌ | ✔ | ✔ |
| **Gamification** | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ✔ |
| **GitHub Integration** | 🟡 | 🟡 | 🟡 | 🟡 | ✔ | 🟡 | ✔ | ✔ |
| **Beginner Friendly** | ❌ | ❌ | ✔ | ✔ | 🟡 | 🟡 | ❌ | ✔ |
| **Pricing (Individual)** | $35
/mo | $40
/mo | $20-40
/mo | $20-30/mo | Free | $5k-20k | $20-100/mo | **$20-50/mo** |

**Legend:**

- ✔ Full Support / Best-in-Class Implementation
- 🟡 Partial Support / Limited Functionality
- ❌ Not Available / Not Applicable

### **1.4.3 Strategic Competitive Advantages**

This platform *does not replicate competitors*. Instead, it merges their strengths while addressing their weaknesses.

**Borrowed Strengths, Enhanced Through AI**

- **From Bootcamps:** Expert-level review → delivered instantly and affordably via AI
- **From Codecademy/Scrimba:** Beginner accessibility → combined with deep analysis and adaptivity
- **From Exercism:** Iterative improvement → without delays or inconsistent mentor quality
- **From LeetCode:** Instant validation → extended to real-world project evaluation

**Unique Value Proposition (UVP)**

“Bootcamp-quality mentorship powered by scalable AI, enabling learners to achieve verifiable, job-ready skills at a fraction of traditional cost.”

**Key Differentiators:**

- Multi-layer, AI + static code review
- Personalized, adaptive learning paths
- Verifiable Learning CV with data-backed skill metrics
- 24/7 expert-level feedback, fully scalable

## **1.5 Project Objectives**

The objective of this research is to design and develop an **AI-powered learning and code review platform** that bridges the gap between self-learning limitations and industry-required software engineering skills. The system aims to deliver scalable, personalized, and expert-grade feedback that empowers learners to progress toward professional competency.

The following are the primary research objectives, structured to align with the project’s technical, educational, and AI-driven goals.

### **1.5.1 Primary Objective**

To build an intelligent, end-to-end learning ecosystem that evaluates, guides, and improves learners’ coding abilities through automated assessments, adaptive learning paths, and multi-layer AI code review—achieving educational outcomes comparable to expert human mentorship but with scalability and affordability.

### **1.5.2 Secondary Objectives**

- Develop an adaptive learning framework tailored to individual learner profiles.
- Implement a multi-layer AI code review system combining static and contextual analysis.
- Produce verifiable, data-driven learning credentials.
- Enhance learner engagement through structured gamification.

### **1.5.3 Long-Term Research Goals**

- Explore advanced AI reasoning such as repository-level analysis, multi-file understanding, and behavioral code analysis.
- Integrate ML models that predict a learner’s future performance, recommending career paths or specialization tracks.
- Introduce AI-assisted project building (e.g., AI pair programming for guided development).
- Expand into testing, cloud engineering, DevOps, system design, and other advanced engineering fields.

## **1.6 Scope of the Project**

The scope of this project encompasses the complete **design, development, validation, and deployment** of the **AI-Powered Learning & Code Review Platform**. The system is implemented using an enterprise-grade technology stack comprising **ASP.NET Core**, **SQL Server**, **React**, and **Python-based AI microservices**.

The defined scope aligns directly with the platform’s core pedagogical and technical pillars, ensuring the delivery of a cohesive intelligent learning environment that integrates assessment, guided practice, automated feedback, and progress validation. The scope is structured into three primary domains: learning and assessment, code analysis and feedback, and career and progress tracking.

### **1.6.1 Core Learning & Assessment Scope**

**User Authentication System**

A secure authentication layer using [ASP.NET](http://asp.net/) Core Identity, supporting:

- Email/password registration and login
- GitHub OAuth for simplified onboarding
- JWT-based session and token handling
- Password reset via verified email

**Adaptive Assessment Engine**

A 30-question adaptive exam that adjusts difficulty in real time to determine accurate proficiency levels (Beginner → Intermediate → Advanced).

**Technical Implementation:**

- Bayesian inference / Item Response Theory (IRT)
- Real-time question difficulty selection
- Dashboard for scoring visualization

**Personalized Learning Tracks**

Tailored, project-based learning paths targeting real-world development roles, including:

- **Full Stack Development** (Beginner → Advanced)
- **Backend Specialist** (.NET, Node.js)
- **Frontend Specialist** (React ecosystem)
- **Python Developer** (Django, Flask, data workflows)
- **CS Fundamentals** (DSA, System Design)

**Task Library**

A curated repository of **40–50 practical, real-world tasks** covering:

- Architecture & design patterns
- RESTful API design and integration
- Debugging and error handling
- Unit, integration, and E2E testing
- Security best practices
- UI development and responsive design

**AI-Driven Recommendation Engine**

A machine-learning-based engine that analyzes performance trends and recommends targeted tasks addressing specific weaknesses, enabling more efficient progression.

### **1.6.2 Code Analysis & Feedback Scope**

**GitHub Integration**

Enables users to:

- Connect GitHub via OAuth
- Submit repositories for automated review
- Trigger the multi-layer review pipeline
- Track submission versions and history

**Static Code Analysis Engine**

Industry-standard static analysis covering maintainability, style, and security using:

- **ESLint:** JS/TS linting
- **Prettier:** Code formatting
- **SonarQube:** Code smells, complexity, maintainability
- **Bandit:** Python security scanning
- **Roslyn:** .NET analyzers and security validation

**Output:** Structured JSON with severity categories, locations, and recommended fixes.

**AI Code Review Engine**

Python FastAPI microservice powered by LLaMA 3 / GPT-4 for deep contextual review:

- Functional correctness & edge-case detection
- Readability and naming assessment
- Performance & complexity evaluation
- Security flaw identification
- Design pattern and anti-pattern detection
- Inline annotated suggestions with refactored examples
- Multi-submission comparison to track improvements

### **1.6.3 Career & Progress Tracking Scope**

**Advanced Analytics Dashboard**

Displays detailed insights including:

- **Skill-level breakdowns** (20+ domains)
- **Trend graphs** showing long-term improvement
- **Peer benchmarking** using anonymized aggregates
- **Submission analytics** (scores, rates, category performance)

**Shareable Learning CV**

A data-driven, verifiable, AI-backed professional profile with:

- Public shareable URL
- PDF export
- Structured project showcase with feedback summaries
- Verified skill scores and competency indicators
- Visual quality metrics (readability, maintainability, security, performance)

## **1.7 Scope Exclusions and Constraints**

This section clarifies the features and components **not included** in the current project scope, as well as the **technical and operational constraints** governing the platform’s implementation. These boundaries ensure focused development, prevent scope creep, and maintain alignment with the project’s core objectives.

### **1.7.1 Scope Exclusions**

The following elements are intentionally out of scope for the initial release. They may be considered in future expansion phases but are **not** part of Version 1:

1. **Payment & Billing Infrastructure**
- No subscription management backend (Stripe, PayPal, etc.)
- No invoicing, receipts, promo codes, or financial tracking
- Monetization logic is defined conceptually but not implemented at system level
1. **Live Mentorship or Human-In-The-Loop Review**
- No live chat with experts
- No video-based mentorship
- No hybrid AI–human review models
- All feedback is machine-generated
1. **Full AI Pair-Programming Capabilities**
- No real-time AI code generation inside the editor
- No autocomplete or IDE-like suggestions similar to GitHub Copilot
- No repository-level auto-refactoring
1. **Institutional/Enterprise Features**
- No dashboards for universities or companies
- No multi-tenant organizational accounts
- No admin-level analytics for cohorts or classrooms
1. **Advanced DevOps & Cloud Automation**
- No CI/CD pipeline automation
- No cloud infrastructure management tools
- No performance auto-scaling orchestrated by the project
1. **Broader Specialization Tracks**

Outside the initial software development focus, the platform does **not** include:

- DevOps professional tracks
- Cloud engineering certifications
- AI/ML engineering programs
- Data science bootcamp–style curricula
1. **Multilingual or Localization Support**
- English-only interface
- No RTL adjustments or multi-language content authoring

### **1.7.2 Constraints**

The platform is designed within several operational, architectural, and technical constraints that guide system behavior and define performance baselines.

1. **AI Model Limitations**
- LLM output depends on prompt structure and model capabilities
- Multi-file / repository-wide reasoning is limited to contextual windows
- Code execution or sandboxed dynamic analysis is not included (static + AI only)
1. **Performance & Response-Time Requirements**
- AI review must remain near-instant (few seconds)
- Static analysis should execute efficiently under high-load conditions
- API gateway must handle concurrent submissions with minimal latency
1. **Security & Data Protection**
- User code must be processed securely with strict input sanitization
- No remote code execution to avoid sandbox vulnerabilities
- OAuth and JWT must follow best practices to prevent token misuse
1. **Database & Storage Constraints**
- High-write workloads (frequent submissions, analytics logs)
- Relational SQL schema optimized with indexing and caching
- Storage constraints for storing historical submissions and AI feedback reports
1. **Frontend Limitations**
- Browser-based experience means no local runtime execution
- Heavy operations delegated to backend/AI microservices
- Editor limited to browser capabilities (syntax highlighting, linting, formatting)
1. **Scalability Constraints**
- Horizontal scaling limited to [ASP.NET](http://asp.net/) Core load balancers
- AI microservices constrained by available compute resources
- ML-based recommendations depend on future data volume

## 1.8 Project Methodology Overview

To manage the technical complexity and uncertainty inherent in AI-driven educational systems, the project adopts an **Agile development methodology** based on iterative, Scrum-inspired cycles. Agile was selected due to its suitability for systems involving evolving requirements, distributed architectures, and experimental AI components.

The development lifecycle is organized into three major phases, each defined by explicit objectives, deliverables, validation metrics, and risk checkpoints.

### **1.8.1 Phased Rollout Strategy**

The rollout strategy prioritizes validation of the platform’s **core learning-feedback loop** before expanding into engagement and retention features.

**Phase 1 — MVP: Core Loop Validation (Months 1–6)**

**Objective:**

Validate the end-to-end workflow:

**Assessment → Task Assignment → Code Submission → Multi-Layered Feedback**

**Key Deliverables include:** authentication services, adaptive assessment, learning path generation, code submission pipelines, static and AI analysis engines, and initial feedback delivery interfaces.

**Validation Metrics:** AI feedback quality, user journey completion rate, system reliability, and feedback latency.

**Decision Outcome:** GO / PIVOT / NO-GO

**Phase 2 — Engagement & Retention (Months 7–12)**

**Objective:**

Enhance learner retention through gamification, analytics, and advanced recommendations.

**Key Deliverables:** gamification systems, expanded analytics dashboards, extended task libraries, improved recommendation models, and a fully featured Learning CV.

**Success Metrics:** retention rates, engagement levels, task completion ratios, CV adoption, and monthly growth.

### **1.8.2 Core Agile Practices**

- Two-week sprint cycles
- Structured sprint planning, reviews, and retrospectives
- User stories with acceptance criteria and definitions of done
- Continuous feedback from beta users and analytics-driven iteration
- Incremental feature delivery validated through real usage

### **1.8.3 Communication & Transparency**

**Internal Communication**

- Daily standups and weekly synchronization meetings
- Shared collaboration tools (Notion, Jira, GitHub)

**External Communication**

- Bi-weekly meetings with academic supervisors
- Monthly public development updates
- Transparent changelogs and user newsletters

# **Chapter Two: Project Management**

## **2.1 Project Organization**

Effective project organization establishes the foundational structure for successful software development, ensuring clear role definition, efficient communication channels, and appropriate authority delegation. This section delineates the organizational hierarchy, individual responsibilities, and collaborative frameworks governing the **AI-Powered Learning & Code Review Platform** development initiative.

The project is conducted under the academic supervision of **Dr. Mostafa Elgendy** and **Eng. Fatma Ebrahim** from the Faculty of Computers and Artificial Intelligence, Benha University. The development team employs an **Agile-Scrum methodology** to support iterative development cycles, transparent task ownership, and continuous stakeholder engagement throughout the project lifecycle.

**Backend & Databa Team**

**Team Members:**

- *Omar Anwar Helmy Ahmed*
- *Mohammed Ahmed Hasabo Ahmed*

**Responsibilities:**

- Oversees the full project lifecycle and ensures alignment with objectives, scope, and deadlines
- Leads sprint planning, weekly meetings, and coordination with supervisors
- Manages the Work Breakdown Structure (WBS), timeline, and milestone tracking
- Designs and implements backend services using [ASP.NET](http://asp.net/) Core
- Develops SQL Server database schema, relationships, and EF Core models
- Builds core APIs for authentication, tasks, submissions, analytics, and Learning CV data
- Ensures performance, scalability, and security standards
- Oversees project documentation and quality assurance efforts

**Frontend Development Team**

**Team Members:**

- *Mahmoud Ahmed Mostafa Abdelmoaty*
- *Ahmed Khaled Yassin Ahmed*

**Responsibilities:**

- Develops the platform’s user interface using React (Next.js)
- Implements dashboards, assessment screens, task browser, and feedback views
- Ensures responsive layouts, accessibility standards, and intuitive user experience
- Integrates frontend views with backend APIs and authentication flows
- Optimizes performance and supports interface testing

**AI & Analysis Team**

**Team Members:**

- *Mahmoud Mohamed Mahmoud Abdelhamid*
- *Ziad Ahmed Mohamed Salem*

**Responsibilities:**

- Implements the Python-based AI microservice using FastAPI
- Conducts prompt engineering and ensures accurate, structured AI feedback
- Integrates static analysis tools (ESLint, Prettier, SonarQube, Bandit)
- Develops algorithms that combine AI output with static analysis metrics
- Evaluates AI models (LLaMA, GPT-based, Claude) to optimize accuracy and cost
- Maintains backend–AI communication pipelines

**DevOps Lead**

**Team Member:** E*slam Emad Ebrahim Madani*

**Responsibilities:**

- Support deployment and runtime configuration required for system testing and demonstration
- Manage basic containerization, environment setup, and service hosting
- Assist in monitoring system availability during evaluation phases

## **2.2 Risk Management**

Risk management ensures that potential issues are identified early and resolved before they affect project progress. Risks are evaluated based on **probability**, **impact**, and **overall severity**, and appropriate mitigation strategies are defined.

### **2.2.1 Risk Assessment Approach**

- **Review cadence:** Risk reviews at the end of each phase and ad-hoc if any critical alert is raised.
- Risks are categorized into **Technical**, **Product**, and **Operational** types
- Each risk is evaluated on:
    - **Probability:** Low / Medium / High
    - **Impact:** Low / Medium / High
    - **Severity:** Combined rating used for prioritization
- Risks are reviewed at major project milestones or when triggered by alerts
- Each risk is assigned an **owner responsible** for monitoring and mitigation

### **2.2.2 Technical Risks — Matrix & Mitigations**

**Risk Matrix (Technical)**

| **ID** | **Risk** | **Probability** | **Impact** | **Severity** | **Owner** |
| --- | --- | --- | --- | --- | --- |
| **T-01** | AI provider outage or severe degradation | Medium → High | High | 🔴 Critical | AI Lead |
| **T-02** | Scalability bottlenecks (API, queues, DB) | Medium | High | 🔴 Critical | Backend Lead |
| **T-03** | Security breach / data leak (user data, source code) | Low → Medium | High | 🔴 Critical | Backend Lead / PM |
| **T-04** | Static analysis pipeline failures / container issues | Medium | Medium | 🟡 Moderate | AI Lead |
| **T-05** | Database performance or corruption | Medium | High | 🔴 Critical | Backend Lead |
| **T-06** | Third-party API limits (GitHub rate limits, OAuth) | Medium | Medium | 🟡 Moderate | Backend Lead |
| **T-07** | Code execution sandbox escape or unsafe execution | Low | High | 🔴 Critical | AI Lead / Backend Lead |

**Risk Details & Mitigation (Technical)**

**T-01 — AI Provider Outage / Degradation**

**Why it matters:** The AI review is user-visible core functionality; outages break the primary feedback loop.

**Mitigations (technical + process):**

- **Provider-agnostic AI layer:** Abstract AI calls behind a service interface in .NET; support multiple providers (primary cloud LLM + secondary cloud + local Ollama for fallback).
- **Queued processing:** Use durable job queue (e.g., RabbitMQ / Azure Service Bus + Hangfire for .NET) so requests are retried and not lost.
- **Graceful degradation:** Show static-analysis results immediately; mark AI review as “pending” with estimated ETA.
- **SLA / Circuit breaker:** Implement circuit-breaker logic and fast-fail with exponential backoff.
- **Monitoring & Alerts:** Track AI latency/error rate; auto-notify the team and trigger fallback policies.

**Verification:** Automated smoke tests and synthetic requests every 5–10 minutes.

**T-02 — Scalability Bottlenecks**

**Why it matters:** Poor scaling results in high latency, timeouts, and poor UX.

**Mitigations:**

- **Containerized services & auto-scaling:** Host backend APIs and workers in containers (Azure App Service / AKS) with horizontal scaling policies.
- **Job sharding & backpressure:** Limit concurrent AI jobs per worker; implement rate limiting and backpressure in the API gateway.
- **DB scaling:** Use read replicas for analytics, partition large tables, optimize indices, and monitor connection pools. SQL Server configuration tuning (MAXDOP, tempdb) for heavy workloads.
- **Caching:** Use Redis / Azure Cache to reduce DB load for hot reads (dashboards, summaries).
- **Pre-production load testing:** k6/JMeter scenarios simulating expected and 10x load to find bottlenecks early.

**Verification:** Regular load-tests and performance benchmarks included in CI pipeline.

**T-03 — Security Breach / Data Leak**

**Why it matters:** Exposure of user credentials or private code is highly damaging legally and reputationally.

**Mitigations:**

- **Defense-in-depth:** Network-level security (VNet, firewalls), API gateway with rate limits, and RBAC.
- **Encryption:** TLS in transit, TDE / Always Encrypted for sensitive columns in SQL Server where applicable.
- **Secure auth:** [ASP.NET](http://asp.net/) Core Identity with MFA for admin accounts; JWT best-practices for sessions.
- **Secure coding & scanning:** Static code analysis, dependency scanning, and SAST/DAST in CI/CD.
- **Least privilege & secrets management:** Use Azure Key Vault or equivalent for secrets; enforce least privilege on DB and services.
- **Incident plan:** Formal incident response playbook, notification templates, and periodic tabletop exercises.

**Verification:** Quarterly security audits and penetration testing for critical releases.

**T-04 — Static Analysis Pipeline Failures**

**Mitigations:**

- Containerize each static tool with health checks; test containers in CI; fall back to simpler lint checks if the advanced tool fails; alert owner on failures.

**T-05 — Database Performance / Corruption**

**Mitigations:**

- Regular automated backups, point-in-time restore enabled (Azure SQL / SQL Server backup policies).
- DB migration scripts in CI with dry-run tests.
- Read replicas for analytics; archive old data periodically.
- Monitor long-running queries and index usage.

**T-06 — Third-party API Limits (GitHub)**

**Mitigations:**

- Use server-side OAuth tokens with caching and respectful rate usage.
- Implement webhooks rather than polling, and exponential backoff on failures.
- Provide UI guidance when user’s GitHub repo is private or large (reduce clone size).

**T-07 — Code Execution Sandbox Escape**

**Why it matters:** Running user code (if needed for dynamic checks) can be dangerous.

**Mitigations:**

- Isolate execution in hardened sandboxes (containerized, limited CPU/memory, seccomp/AppArmor) or use language-specific static-only checks where possible.
- No direct access from sandbox to internal network or storage.
- Timeouts, resource limits, and continuous monitoring of container behavior.
- Prefer instrumentation and static analysis over full execution when risk is unacceptable.

### **2.2.3 Product Risks — Matrix & Mitigations**

| **ID** | **Risk** | **Probability** | **Impact** | **Severity** | **Owner** |
| --- | --- | --- | --- | --- | --- |
| **P-01** | Feature complexity overwhelms new users | Medium | High | 🔴 Critical | PM / Frontend Lead |
| **P-02** | AI feedback quality not meeting user expectations | High | High | 🔴 Critical | AI Lead |
| **P-03** | Strong competition / market noise | High | Medium | 🟡 Moderate | PM / Growth |
| **P-04** | Low initial user adoption | High | High | 🔴 Critical | PM / Growth |
| **P-05** | Pricing model mismatch | Medium | Medium | 🟡 Moderate | PM / Product |

**P-01 — Feature Overwhelm**

**Mitigations:**

- Prioritize the core loop for Phase 1 and use progressive disclosure in the UI.
- Guided onboarding (interactive tutorial) and contextual help tips.
- Measure drop-off funnels and iterate UX using real user data.

**P-02 — AI Feedback Quality**

**Mitigations:**

- **Layered feedback:** Combine deterministic static analysis with LLM-based insights to improve reliability.
- **Prompt engineering & versioning:** Keep prompt templates in version control; A/B test prompt variations and track user ratings.
- **Human-in-the-loop for early users:** Manually review and correct AI outputs for the first N beta users and use the corrections to improve prompts/scoring.
- **Feedback telemetry:** Collect per-review ratings and comment metadata to prioritize problematic patterns.

**P-03 — Competition**

**Mitigations:**

- Focus on a clear UVP: instant, educative code feedback + shareable Learning CV.
- Niche targeting and content-led organic growth (technical blog posts, case studies).
- Rapid iteration on features that directly affect retention and referrals.

**P-04 — Low Adoption**

**Mitigations:**

- Generous free tier to reduce friction and demonstrate value.
- Early community building and partnerships (student groups, local meetups).
- Simplified onboarding flows and referral incentives.

**P-05 — Pricing**

**Mitigations:**

- Test pricing via controlled experiments and surveys; start with a low-cost Pro tier and iteratively adjust.
- Monitor conversion funnel and elasticity; offer scholarships or discounts for students.

## **2.3 Project Communication Plan**

Effective communication ensures coordination among team members and transparency with academic supervisors.

### **2.3.1 Communication Structure**

| **Activity** | **Participants** | **Frequency** | **Purpose** |
| --- | --- | --- | --- |
| **Daily Standup** | Development Team | Daily | Task alignment and blockers |
| **Sprint Planning & Review** | Team + Supervisors | Bi-weekly | Progress validation |
| **Technical Sync** | Relevant Sub-team | As needed | Problem-solving |
| **Documentation Review** | All Members | Continuous | Academic consistency |

Primary tools include **Slack**, **GitHub**, **Notion**, and **Zoom**, selected for accessibility and academic suitability rather than enterprise complexity.

## **2.4 Work Breakdown Structure (WBS)**

The WBS provides hierarchical decomposition of project deliverables organized for task assignment, effort estimation, and progress monitoring.

### **2.4.1 WBS Structure**

**Four-level hierarchy:**

1. Project (root)
2. Major phases (MVP, Engagement, Monetization, Cross-Cutting)
3. Functional components/subsystems
4. Work packages and tasks

**Numbering:** Phase.Component.Task (e.g., 1.2.3)

### **2.4.2**

![A diagram of a company AI-generated content may be incorrect.](image2.jpeg)

## **2.5 Time Management (PERT, Gantt Chart)**

Time management is a critical element of project success, providing structured approaches to activity scheduling, dependency management, duration estimation, and timeline visualization. This section presents comprehensive time management artifacts including **PERT (Program Evaluation and Review Technique)**, **Network Diagrams**, **Critical Path Method (CPM)**, and **Gantt Charts**.

### **2.5.1 PERT Estimation**

PERT is a probabilistic scheduling technique that accounts for uncertainty in task duration by using three time estimates to calculate expected completion time.

**PERT Formula:**

$$Expected\ Time\ (ET) = \frac{O\  + \ 4R\  + \ P}{6}$$

Where:

- **O** = Optimistic time (best-case scenario, everything goes perfectly)
- **R** = Realistic time (most likely scenario, normal conditions)
- **P** = Pessimistic time (worst-case scenario, maximum delays)
- **ET** = Expected Time (weighted average)

**PERT Estimation Table for Major Activities:**

| No. | Task | Predecessor | O | M | P | ET |
| --- | --- | --- | --- | --- | --- | --- |
| 1. | Define Project Scope & Objectives | - | 5 | 7 | 9 | 7 |
| 1. | Requirements Analysis & Gathering | T1 | 10 | 14 | 18 | 14 |
| 1. | Risk identification & Mitigation planning | T2 | 4 | 8 | 12 | 8 |
| 1. | Develop Detailed Project Plan (WBS & Timeline) | T3 | 5 | 7 | 9 | 7 |
| 1. | Resource Allocation & Environment Setup | T4 | 3 | 5 | 7 | 5 |
| 1. | System Architecture & Database Design | T5 | 10 | 12 | 14 | 12 |
| 1. | Database Implementation & Optimization | T6 | 4 | 8 | 12 | 8 |
| 1. | Frontend UI & Development | T6 | 26 | 30 | 34 | 30 |
| 1. | Static Analysis & Tool Integration | T6 | 8 | 10 | 12 | 10 |
| 1. | AI Microservice Implementation | T6 | 8 | 10 | 12 | 10 |
| 1. | Backend API Development | T7 | 25 | 30 | 35 | 30 |
| 1. | Code Submission Pipeline Development | T9, T10, T11 | 9 | 12 | 15 | 12 |
| 1. | Testing plan creation & Test case development | T6 | 5 | 6 | 7 | 6 |
| 1. | Functional & Integration Testing | T8, T12, T13 | 6 | 8 | 10 | 8 |
| 1. | Bug fixing & refinement | T14 | 4 | 8 | 12 | 8 |
| 1. | Phase 1 review & Go/No-Go decision | T15 | 1 | 2 | 3 | 2 |
| 1. | Community Platform Development | T16 | 8 | 12 | 16 | 12 |
| 1. | Gamification System Implementation | T16 | 6 | 8 | 10 | 8 |
| 1. | Advanced Analytics Dashboard | T16 | 8 | 10 | 12 | 10 |
| 1. | Learning CV System Development | T16 | 8 | 10 | 12 | 10 |
| 1. | Learning Track Expansion (New Tracks) | T16 | 6 | 10 | 14 | 10 |
| 1. | Mock Payment Integration | T16 | 5 | 8 | 11 | 8 |
| 1. | Phase 2 Testing & UAT (User Acceptance Testing) | T17, T18, T19, T20, T21, T22 | 5 | 6 | 7 | 6 |
| 1. | Mobile Application Development | T16 | 20 | 25 | 30 | 25 |
| 1. | Infrastructure Scaling & Optimization | T23 | 5 | 6 | 7 | 6 |
| 1. | AI Cost Optimization | T23 | 5 | 6 | 7 | 6 |
| 1. | Phase 3 Testing & Production Launch | T24, T25, T26 | 6 | 9 | 12 | 9 |
| 1. | Final Documentation & Presentation Preparation | T27 | 8 | 12 | 16 | 12 |
| 1. | Project Defense & Final | T28 | 6 | 8 | 10 | 8 |

### **2.5.2 Network Diagram**

The Network Diagram (also known as Activity-on-Node diagram) illustrates the **logical relationships and dependencies** between project activities. It identifies:

- Sequential dependencies (Task B cannot start until Task A completes)
- Parallel activities (Tasks that can occur simultaneously)
- Critical path (longest sequence determining minimum project duration)

**Network Diagram Description:**

The following network diagram represents the major activity sequences across all three project phases. Each node represents a significant activity, and directed edges indicate precedence relationships. Activities are labeled with their task number and expected time (ET).

![A group of blue dots AI-generated content may be incorrect.](image3.png)

### **2.5.3 Gantt Chart**

The Gantt Chart provides a **visual timeline representation** of the project schedule, displaying:

- Task durations (horizontal bars)
- Start and end dates
- Dependencies between tasks
- Milestones and phase boundaries
- Resource allocation periods
- Current progress status

**Gantt Chart Description:**

The following Gantt chart visualizes the 18-month project timeline across all three phases. Each horizontal bar represents a task or work package, with its length proportional to estimated duration. Dependencies are shown through connecting lines, and critical path activities are highlighted in red for emphasis.

![A graph with blue squares AI-generated content may be incorrect.](image4.png)

# **Chapter Three: System Analysis**

## **3.1 Introduction**

System analysis constitutes a critical phase in the software development lifecycle, serving as the bridge between problem identification and solution design. This chapter presents a comprehensive analytical examination of the **AI-Powered Learning & Code Review Platform**, establishing the foundational requirements, constraints, and specifications that govern subsequent design and implementation decisions.

The system analysis process encompasses multiple dimensions:

**Requirements Engineering:** Systematic elicitation, documentation, and validation of functional and non-functional requirements that define system capabilities and quality attributes.

**Stakeholder Analysis:** Identification and characterization of all individuals and entities affected by or influencing the platform's development and operation.

**Business Model Definition:** Articulation of the value proposition, revenue mechanisms, and economic sustainability framework.

**Comparative Analysis:** Evaluation of existing solutions versus the proposed system, highlighting differentiating capabilities and competitive advantages.

This analysis employs industry-standard methodologies including structured requirements specification, quality attribute scenarios, and systematic stakeholder mapping. The resulting artifacts provide a clear, unambiguous foundation for architectural design, implementation planning, and validation testing.

The analysis is conducted within the context of modern software engineering best practices, ensuring alignment with international standards for requirements documentation (IEEE 29148-2018) and software quality models (ISO/IEC 25010). All requirements are written to be **specific, measurable, achievable, relevant, and testable (SMART)**, facilitating objective verification during quality assurance phases.

## **3.2 Planning**

The planning phase establishes the strategic direction and operational framework for the **AI-Powered Learning & Code Review Platform**. This section synthesizes insights from the problem definition (Chapter 1) and project management framework (Chapter 2) to define the analytical approach governing requirements elicitation and system specification.

**Planning Objectives:**

1. **Establish Requirements Baseline:** Define a complete, consistent, and validated set of functional and non-functional requirements serving as the contractual foundation for development.
2. **Identify System Boundaries:** Clearly delineate what functionality resides within the system scope versus external dependencies and integrations.
3. **Define Success Criteria:** Establish measurable acceptance criteria for each requirement, enabling objective verification during testing and validation.
4. **Prioritize Requirements:** Classify requirements by criticality (Must-Have, Should-Have, Could-Have, Won't-Have) to support phased delivery and resource allocation.
5. **Validate Feasibility:** Ensure all specified requirements are technically achievable within project constraints (timeline, budget, technology stack, team expertise).

**Analytical Methodology:**

The requirements analysis follows a **structured, iterative approach**:

**Phase 1 — Requirements Elicitation:**

- Stakeholder interviews with supervisors, potential users, and domain experts
- Analysis of competitor platforms to identify feature gaps and opportunities
- Review of academic literature on educational technology and AI-assisted learning
- User journey mapping to understand end-to-end workflows

**Phase 2 — Requirements Specification:**

- Documentation of functional requirements using structured use case narratives
- Definition of non-functional requirements using quality attribute scenarios
- Creation of requirements traceability matrix linking requirements to design elements

**Phase 3 — Requirements Validation:**

- Technical feasibility assessment by development team leads
- Consistency checking to identify conflicts or ambiguities
- Completeness verification ensuring all critical functionality is specified
- Supervisor review and approval

**Requirements Management:**

Requirements are managed as living artifacts throughout the project lifecycle:

- **Version Control:** All requirements documents maintained in Git with change tracking
- **Traceability:** Each requirement linked to design elements, test cases, and implementation artifacts
- **Change Management:** Formal change request process for requirement modifications post-baseline
- **Continuous Refinement:** Requirements elaborated incrementally as understanding deepens during development

**Alignment with Project Phases:**

The planning approach directly supports the three-phase development strategy:

- **Phase 1 (MVP):** Focus on core functional requirements enabling the basic learning loop
- **Phase 2 (Engagement):** Incorporate gamification, and analytics requirements

This phased approach balances the need for comprehensive planning with Agile principles of iterative refinement and responsiveness to emerging insights.

## **3.3 System Requirements**

System requirements define the complete set of capabilities, constraints, and quality attributes the platform must satisfy. Requirements are organized into two primary categories: **Functional Requirements (FR)** specifying observable system behaviors, and **Non-Functional Requirements (NFR)** defining quality characteristics and operational constraints.

### **3.3.1 Functional Requirements (FR)**

Functional requirements describe **what the system must do**—the specific features, operations, and behaviors users will observe and interact with. Each requirement is uniquely identified, precisely specified, and includes explicit acceptance criteria for validation.

**Requirements are organized by functional domain**, corresponding to the system's architectural modules:

**3.3.1.1 User Authentication & Profile Management**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | **User Registration** | The system must allow users to register via email and password. The registration form will include full name, email, password, and optional GitHub username. Passwords are hashed using [**ASP.NET](http://asp.net/) Core Identity** and stored securely in **SQL Server**. | High | None |
| FR-AUTH-02 | **GitHub OAuth Login** | The system must support GitHub OAuth2 login to simplify onboarding and link code submissions automatically. OAuth tokens will be stored securely (encrypted) in the database. | High | GitHub API |
| FR-AUTH-03 | **Email Verification** | Upon registration, the system must send a verification email using the **SendGrid API** before account activation. | Medium | Notification Service |
| FR-AUTH-04 | **User Login** | Users must log in using either email/password or GitHub OAuth. JWT tokens will be issued by the .NET API for authenticated access. | High | [ASP.NET](http://asp.net/) Core Identity |
| FR-AUTH-05 | **Password Reset** | Users can request a password reset link, sent via email. The token is valid for 10 minutes. | Medium | Notification Service |
| FR-AUTH-06 | **Profile Management** | Users can update personal information (name, GitHub username, profile picture). Changes are reflected immediately in the database. | Medium | SQL Server |
| FR-AUTH-07 | **Role-Based Access Control (RBAC)** | The system must distinguish between **Admin** and **Learner** roles using claims-based authorization. | High | Identity Middleware |
| FR-AUTH-08 | **Session Management** | Active sessions are cached using **Redis**, with automatic expiration and rate limiting to prevent abuse. | Medium | Redis Cache |

**3.3.1.2 Adaptive Assessment Module**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-ASSESS-01 | **Assessment Start** | A learner can begin an adaptive assessment (30 questions). The difficulty adjusts dynamically based on previous answers. | High | React Frontend, .NET API |
| FR-ASSESS-02 | **Question Bank** | The assessment uses a curated question bank stored in SQL Server. Questions are categorized by difficulty and topic. | High | SQL Server |
| FR-ASSESS-03 | **Adaptive Algorithm** | The backend (.NET) calculates difficulty progression and selects the next question dynamically based on prior performance. | High | Adaptive Logic Engine |
| FR-ASSESS-04 | **Timer & Auto-Submit** | The assessment is time-bound (e.g., 40 minutes). Unanswered questions are auto-submitted. | Medium | React Timer |
| FR-ASSESS-05 | **Score Calculation** | After completion, the system computes the learner’s skill level and stores the score, completion time, and performance summary in SQL Server. | High | .NET API |
| FR-ASSESS-06 | **AI Feedback Integration** | The **Python FastAPI** service may later enhance this module by generating personalized advice (“You’re strong in data structures, weak in security”). | Low (Phase 2) | FastAPI |
| FR-ASSESS-07 | **Result Visualization** | The frontend displays a result dashboard showing percentage scores and categorized skill levels. | High | React Charts |
| FR-ASSESS-08 | **Reattempt Policy** | Users can retake the assessment after 30 days . | Medium | .NET Policy Logic |

**3.3.1.3 Personalized Learning Path Management**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-PATH-01 | **Path Generation** | Based on assessment results, the system generates a personalized learning path from predefined templates (Full Stack, Backend, etc.). | High | SQL Server, .NET |
| FR-PATH-02 | **Path Storage** | Each user’s path is stored in the LearningPath table, linked to their UserId. | High | SQL Server |
| FR-PATH-03 | **Task Linking** | Each path includes ordered tasks linked through the PathTasks junction table. | High | ERD: PathTasks |
| FR-PATH-04 | **Add Custom Task** | Users can manually add a recommended task from feedback to their learning path. | Medium | Recommendation Module |
| FR-PATH-05 | **Path Progress Tracking** | The backend calculates path progress (e.g., tasks completed / total tasks) and updates in real-time. | Medium | .NET Worker |
| FR-PATH-06 | **Modify Path** | Users can re-order or remove tasks within their path; updates are persisted. | Low | SQL Update Logic |

**3.3.1.4 Code Submission & Multi-Layered Analysis**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-SUB-01 | Code Submission via GitHub Repository | Accept code submissions by linking GitHub repositories and automatically fetching contents via GitHub API. | High | GitHub REST API, OAuth token management |
| FR-SUB-02 | Code Submission via File Upload | Accept direct file uploads (ZIP) for users without GitHub or preferring local development. | High | Azure Blob Storage, file validation service |
| FR-SUB-03 | Submission Metadata Management | Capture and store metadata for each submission including status, timestamps, and task linkage. | High | SQL Server Submissions table, audit logging |
| FR-SUB-04 | Repository Fetching Service | Background Worker fetches GitHub repos or uploaded files, extracts them, and handles cleanup. | High | .NET Background Worker, GitHub API, temp file isolation |
| FR-SUB-05 | Static Analysis Execution | Execute ESLint, SonarQube, Bandit, etc. inside Docker containers with timeouts and resource limits. | High | Docker containers, static analysis tools |
| FR-SUB-06 | Static Analysis Results Storage | Normalize & store static analysis outputs in SQL for later aggregation with AI results. | High | SQL Server StaticAnalysis table, JSON parsing |
| FR-SUB-07 | AI Analysis Invocation | Worker sends code + static analysis results + task context to Python FastAPI microservice. | High | FastAPI AI microservice, HTTP schema validation |
| FR-SUB-08 | AI Analysis Results Storage | Store AI-generated scores, raw JSON feedback, timestamps, and model metadata. | High | SQL Server AIAnalysis table |
| FR-SUB-09 | Feedback Aggregation | Combine static + AI output into a unified report with insights and recommendations. | High | Report generation engine, frontend renderer |
| FR-SUB-10 | Job Queue Management | Manage queued submission processing with durable, reliable job handling. | High | Azure Service Bus or Hangfire |
| FR-SUB-11 | Version Control & Resubmission | Support multiple attempts per task and track version history and improvement. | Medium | SQL optimization, diff comparison algorithms |
| FR-SUB-12 | Submission Status Tracking & Notifications | Provide real-time updates, notifications, and fail/retry options. | Medium | Email service, notification system, status polling API |

**3.3.1.5 Feedback, Recommendation & Resource Engine**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-FEED-01 | Structured Feedback Generation | AI microservice generates structured educational feedback as JSON with scores, strengths, weaknesses, and recommendations. | High | AI prompt engineering, output validation service |
| FR-FEED-02 | Feedback Report Rendering | Frontend renders feedback in a clear, organized, interactive interface with actionable insights. | High | React components, Prism.js syntax highlighting |
| FR-FEED-03 | Task Recommendations | System generates 3–5 task recommendations based on skill gaps and stores them per submission. | High | Task database, AI recommendation logic, Recommendations table |
| FR-FEED-04 | Learning Resource Links | Provide curated learning resources tailored to weaknesses, stored and categorized by topic. | High | AI resource recommendation logic, Resources table, link validation service |
| FR-FEED-05 | Feedback Quality Rating | Collect user ratings and comments on feedback quality to improve AI prompts continuously. | Medium | Rating UI components, analytics database |
| FR-FEED-06 | Notification Delivery | Notify users when analysis completes via email, push, and in-app notifications. | Medium | SendGrid email service, notification templates, mobile push service |

**3.3.1.6 Gamification, Analytics & Learning CV**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-GAME-01 | Achievement Badge System | Award badges for milestones to boost engagement and skill development. | Medium | Badge database, achievement tracking logic, UI badge components |
| FR-GAME-02 | Learning Streak Tracking | Track daily/weekly learning streaks and reward consistent activity. | Medium | Daily cron job, streak calculation service, timezone management |
| FR-GAME-03 | Experience Points (XP) & Level Progression | Award XP for activities and enable users to progress through skill levels. | Medium | XP calculation rules, level thresholds, database schema |
| FR-GAME-04 | Advanced Analytics Dashboard | Provide analytics visualizing skill development, trends, and performance comparisons. | High | Charting library, analytics aggregation service, PDF export tools |
| FR-GAME-05 | Shareable Learning CV – Core Functionality | Generate dynamic CVs showcasing verified skills, project history, and progress. | High | CV generation service, URL routing, privacy management |
| FR-GAME-06 | Learning CV – PDF Export | Allow users to export a professional PDF version of their Learning CV. | Medium | PDF generation library, cloud storage |
| FR-GAME-07 | Learning CV – Privacy Controls | Provide granular privacy settings to manage CV visibility and access. | Low | Authorization middleware, access logging |

**3.3.1.7 Administrative Functions**

| ID | Requirement | Description | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| FR-ADMIN-01 | User Management | Provide comprehensive user management capabilities including viewing, editing, deactivating, and auditing users. | High | Admin panel UI, authorization middleware, audit logging |
| FR-ADMIN-02 | Task Library Management | Enable administrators to create, edit, organize, version, preview, and import/export learning tasks. | High | Admin panel, rich text editor, database schema |
| FR-ADMIN-03 | Learning Track Management | Allow administrators to define learning tracks, order tasks, visualize dependencies, and manage track lifecycle. | High | Admin panel, drag-and-drop library, visualization component |
| FR-ADMIN-04 | Analytics Dashboard | Provide platform analytics including user metrics, engagement, performance, and financial reporting. | Medium | Analytics aggregation service, charting library, alerting system |
| FR-ADMIN-05 | Content Moderation Queue | Offer a centralized moderation interface for reviewing and acting on flagged community content. | Low | Moderation UI, authorization system, email service |
| FR-ADMIN-06 | System Configuration Management | Allow administrators to configure platform settings, manage AI models, and track configuration history. | Low | Configuration management service, database schema |
| FR-ADMIN-07 | System Health Monitoring | Provide real-time health metrics, alerts, and historical trends for operational oversight. | Medium | Azure Application Insights, monitoring dashboards, alerting infrastructure |

### **3.3.2 Non-Functional Requirements (NFR)**

Non-functional requirements define the quality attributes, operational constraints, and system characteristics that govern **how** the platform performs its functions. These requirements are organized by quality attribute category following the ISO/IEC 25010 quality model.

**3.3.2.1 Performance Requirements**

| ID | Requirement | Description | Target Metrics |
| --- | --- | --- | --- |
| NFR-PERF-01 | API Response Time | Core API endpoints must remain responsive under normal and peak load conditions. | Read: ≤200ms (p95), Write: ≤500ms (p95), Complex queries: ≤1000ms (p95) |
| NFR-PERF-02 | Code Analysis Processing Time | Full code analysis pipeline (static + AI) must complete within acceptable time limits. | Static ≤3 min, AI ≤2 min, Total ≤5 min typical / ≤10 min max |
| NFR-PERF-03 | Database Query Performance | SQL queries must be optimized through indexing and proper querying strategies. | Simple: ≤50ms (p95), Joins: ≤200ms (p95), Aggregations: ≤500ms (p95), Full-text: ≤300ms (p95) |
| NFR-PERF-04 | Frontend Page Load Time | Frontend must load quickly and remain visually stable for a pleasant UX. | FCP ≤1.5s, LCP ≤2.5s, TTI ≤3s, CLS ≤0.1 |
| NFR-PERF-05 | Concurrent User Capacity | System must handle increasing numbers of simultaneous active users smoothly. | Phase 1: 100 users, Phase 2: 500 users, Phase 3: 2000+ users |
| NFR-PERF-06 | Cache Hit Ratio | Frequently accessed data must be served from cache to reduce DB load. | Session ≥90%, Profiles ≥70%, Task metadata ≥80% |

**3.3.2.2 Scalability Requirements**

| ID | Requirement | Description | Scaling Strategy |
| --- | --- | --- | --- |
| NFR-SCAL-01 | Horizontal API Scaling | Backend API must support horizontal scaling via stateless design and load balancing. | Auto-scale when CPU ≥75% or queue depth ≥50; 2–10 instances (Phase 1–2), unlimited Phase 3 |
| NFR-SCAL-02 | Background Worker Scaling | Worker service must scale to handle increased submission volume. | Scale-out when queue depth ≥20; ≥5 parallel jobs per instance; up to 20 workers |
| NFR-SCAL-03 | Database Scalability | SQL Server must scale using read replicas, connection pooling, and table partitioning. | Read replicas for analytics; monthly partitioning when >1M records; pool size 20–200 |
| NFR-SCAL-04 | Storage Scalability | Blob storage must scale elastically with no capacity limits. | Unlimited Azure Blob capacity; file limit 50MB; auto-tiering based on usage |
| NFR-SCAL-05 | Concurrent User Scaling | System must support large increases in concurrent learners. | Phase 1: 100 users, Phase 2: 500 users, Phase 3: 2000+ users |
| NFR-SCAL-06 | API Scale-Out Time | Scaling events should occur quickly to avoid backlog buildup. | Scale-out time ≤3 minutes |
| NFR-SCAL-07 | Worker Queue Throughput | Queue processing must remain stable during peak hours. | Maintain queue at <100 pending jobs during load spikes |

**3.3.2.3 Availability & Reliability Requirements**

| ID | Requirement | Description | Target Metrics |
| --- | --- | --- | --- |
| NFR-AVAIL-01 | System Uptime | Platform must maintain high availability for global learners. | ≥ 99.5% monthly uptime |
| NFR-AVAIL-02 | Graceful Degradation | System continues core functionality even when dependent services fail. | AI failure → show static analysis; Email failure → queue; Cache failure → fallback to DB |
| NFR-AVAIL-03 | Data Backup & Recovery | Critical data must be backed up and recoverable within strict time objectives. | RPO ≤ 1 hour; RTO ≤ 4 hours; Daily full + 6-hour incremental backups |
| NFR-AVAIL-04 | Job Retry Logic | Background jobs must retry automatically upon transient failures. | 3 retries with exponential backoff (1m → 5m → 15m) |
| NFR-AVAIL-05 | Disaster Recovery | Platform must recover from major cloud outages with minimal downtime. | Full restore within ≤ 4 hours |
| NFR-AVAIL-06 | Queue Persistence | No job should be lost during worker restarts or failures. | Durable queues (Azure Service Bus Dead-letter support) |
| NFR-AVAIL-07 | Maintenance Windows | Maintenance must not disrupt global users and should be communicated early. | Scheduled 7 days ahead, 2–4 AM UTC window |

**3.3.2.4 Security Requirements**

| ID | Requirement | Description | Compliance / Control |
| --- | --- | --- | --- |
| NFR-SEC-01 | Authentication Security | Authentication must follow industry-standard security practices. | PBKDF2 (100k iterations), JWT RS256, MFA for admins |
| NFR-SEC-02 | Authorization & Access Control | Role-based access must restrict all sensitive operations. | RBAC (Learner/Admin), claims-based access control |
| NFR-SEC-03 | Data Encryption | All sensitive data encrypted at rest and in transit. | TLS 1.3, SQL TDE, AES-256, Azure Key Vault |
| NFR-SEC-04 | Input Validation & Sanitization | Prevent injection attacks via strict validation. | FluentValidation, XSS escaping, CSRF tokens |
| NFR-SEC-05 | Secure File Handling | Uploaded files must be scanned and isolated securely. | MIME validation, ClamAV scan, sandbox execution |
| NFR-SEC-06 | Rate Limiting & Abuse Prevention | Prevent brute-force and DoS attacks. | Redis sliding-window limiter (100 req/min), 5 auth attempts/15m |
| NFR-SEC-07 | OAuth Token Protection | Protect GitHub OAuth tokens from exposure. | AES-256 encrypted storage via Key Vault |
| NFR-SEC-08 | Security Logging & Monitoring | Log all high-risk actions for audit & detection. | Azure Log Analytics + SIEM alerts |
| NFR-SEC-09 | Secure API Practices | APIs must follow secure communication and error-handling guidelines. | HTTPS-only, no sensitive data in error responses |
| NFR-SEC-10 | AI Output Safety | AI responses must be sanitized for safety and compliance. | FastAPI output filtering layer |

**3.3.2.5 Usability & Accessibility Requirements**

| ID | Requirement | Description | Compliance |
| --- | --- | --- | --- |
| NFR-UX-01 | Responsive Design | Platform must be fully responsive across mobile, tablet, and desktop. | WCAG 2.1 AA |
| NFR-UX-02 | Accessibility Compliance | Interface must support accessible use for users with disabilities. | Screen readers, ARIA labels, keyboard navigation |
| NFR-UX-03 | Intuitive Navigation | Clear layouts, breadcrumbs, and menus must simplify task flows. | UX best practices |
| NFR-UX-04 | Onboarding Experience | New users must be guided smoothly through platform features. | Interactive tutorial + contextual tooltips |
| NFR-UX-05 | Error Handling & Feedback | Users must receive clear, actionable error and success messages. | Inline errors + global error boundaries |
| NFR-UX-06 | Localization Readiness | System must be prepared for multilingual UI support. | i18next + externalized strings |
| NFR-UX-07 | Mobile App Usability | Mobile UI must be optimized for touch interactions and small screens. | iOS/Android platform guidelines |
| NFR-UX-08 | Loading & State Indicators | Provide consistent loading indicators for slow operations. | Spinners, skeleton loaders |

**3.3.2.6 Maintainability & Extensibility Requirements**

| ID | Requirement | Description | Implementation Standard |
| --- | --- | --- | --- |
| NFR-MAIN-01 | Code Architecture | System must follow clean, modular architecture with clear separation of concerns. | .NET Clean Architecture (Domain → Application → Infrastructure → API) |
| NFR-MAIN-02 | Code Quality Standards | Code must follow strict quality standards and best practices. | Linters, cyclomatic complexity <15, <5% duplication |
| NFR-MAIN-03 | Automated Testing Coverage | Maintain comprehensive automated tests for reliability and refactoring safety. | ≥80% unit test coverage, integration + E2E tests |
| NFR-MAIN-04 | API Documentation | All APIs must be fully documented and explorable interactively. | Swagger/OpenAPI auto-generation |
| NFR-MAIN-05 | Version Control Strategy | Follow structured branching and review practices to ensure code quality. | Git Flow + protected branches + PR approvals |
| NFR-MAIN-06 | CI/CD Pipeline | Automated pipelines must handle build, test, and deployment workflows. | GitHub Actions CI/CD workflow |
| NFR-MAIN-07 | Logging & Observability | System must provide deep visibility into logs, performance, and tracing. | Azure App Insights + structured JSON logs |
| NFR-MAIN-08 | AI Model Abstraction | AI integration must support provider swapping with zero refactoring. | Provider interface + adapter pattern |
| NFR-MAIN-09 | Database Migration Management | Schema changes must be safe, reversible, and version-controlled. | EF Core Migrations + rollback scripts |
| NFR-MAIN-10 | Documentation Maintenance | Documentation must remain accurate and updated throughout development. | Living documentation via Notion + quarterly audits |

**3.3.2.7 Interoperability & Integration Requirements**

| ID | Requirement | Description | Integration Target |
| --- | --- | --- | --- |
| NFR-INT-01 | RESTful API Standards | Backend APIs must follow REST principles for cross-platform compatibility. | REST + JSON + API versioning |
| NFR-INT-02 | Third-Party Service Integration | System must integrate securely with GitHub, SendGrid, Stripe, and others. | GitHub API, SendGrid, Stripe (Phase 3), FCM |
| NFR-INT-03 | Webhook Support | System must process external webhook events reliably and securely. | GitHub webhooks, Stripe events |
| NFR-INT-04 | Data Export & Import | Users/admins must export/import data in standard formats. | JSON, CSV, PDF exports |
| NFR-INT-05 | AI Service Communication | .NET backend must interact seamlessly with Python FastAPI AI service. | Secure internal HTTPS API |
| NFR-INT-06 | Storage Integration | Platform must use cloud blob storage for large files and reports. | Azure Blob Storage (private SAS URLs) |
| NFR-INT-07 | Queue-Based Processing | API and Worker communicate asynchronously using message queues. | Azure Service Bus queues/topics |
| NFR-INT-08 | Monitoring Integration | Centralized logs/metrics collected from all microservices. | Azure App Insights + Azure Monitor |

**3.3.2.8 Compliance & Legal Requirements**

| ID | Requirement | Description | Standard / Reference |
| --- | --- | --- | --- |
| NFR-COMP-01 | GDPR Compliance | Users must be able to access, export, delete, and control their personal data. | GDPR Articles 15–17 |
| NFR-COMP-02 | Data Retention & Deletion | User data must be retained and deleted according to legal and platform policies. | GDPR + ISO 27001 |
| NFR-COMP-03 | Intellectual Property Protection | User-submitted code must remain private and never used for AI training without consent. | IP Compliance Policy |
| NFR-COMP-04 | AI Ethics & Transparency | All AI feedback must include clear disclosure and adhere to ethical guidelines. | AI Ethics Framework |
| NFR-COMP-05 | Accessibility Compliance | Platform must follow accessibility standards to support users with disabilities. | WCAG 2.1 AA + Section 508 |
| NFR-COMP-06 | Cookie & Privacy Policy | Clear privacy and cookie policies must be provided with user consent controls. | GDPR Cookie Directive |
| NFR-COMP-07 | Audit Logging | All admin changes and sensitive user actions must be logged for accountability. | ISO 27001 Logging Standards |

**3.3.2.9 Cost & Resource Optimization Requirements**

| ID | Requirement | Description | Cost Strategy |
| --- | --- | --- | --- |
| NFR-COST-01 | Cloud Resource Optimization | Cloud infrastructure must be cost-efficient without affecting performance. | Auto-scale down off-peak, reserved instances, right-sizing, storage tiering |
| NFR-COST-02 | AI Token Optimization | AI usage must be optimized to reduce token consumption and API costs. | Prompt shortening, response length limits, caching, batch processing |
| NFR-COST-03 | Database Cost Management | Database must use optimal tiers and archival strategies to reduce cost. | Scale tiers as needed, archive old data, caching heavy queries |
| NFR-COST-04 | Storage Optimization | Blob storage costs must be minimized while retaining required data. | Hot → Cool/Archive tiering, lifecycle management |
| NFR-COST-05 | Monitoring & Cost Alerts | Automatic alerts must notify when cloud spending exceeds thresholds. | Azure Cost Alerts + monthly cost reviews |
| NFR-COST-06 | Efficient Queue Usage | Queue throughput must be optimized to avoid cost spikes due to over-scaling. | Balanced worker scaling + queue depth monitoring |
| NFR-COST-07 | API Usage Optimization | Optimize external API calls (GitHub, SendGrid, Stripe) to control cost. | Retry logic, caching, reduced polling frequency |

## **3.5 Stakeholders**

Stakeholders are individuals, groups, or organizations who affect or are affected by the system's development, deployment, and operation. Understanding stakeholder interests, expectations, and influence levels is critical for requirements elicitation, priority setting, and change management.

### **Primary Stakeholders (Direct Users)**

**1. Learners / Students**

- **Role**: Core platform users seeking skill development
- **Interests**:
    - Receiving high-quality, actionable code feedback
    - Improving programming skills efficiently
    - Obtaining credible skill validation (Learning CV)
    - Affordable access to expert-level guidance
- **Influence**: High (product success depends on satisfaction)
- **Engagement**: User testing, surveys, community feedback

**2. Self-Taught Developers**

- **Role**: Career-switchers building portfolios
- **Interests**:
    - Bridging skill gaps without bootcamp costs
    - Demonstrating competency to employers
    - Structured learning paths with clear progression
- **Influence**: High (key target demographic)
- **Engagement**: Beta testing, testimonials, referrals

**3. Junior Developers**

- **Role**: Early-career professionals improving skills
- **Interests**:
    - Continuous learning and professional development
    - Staying current with best practices
    - Peer learning and community interaction
- **Influence**: Medium (secondary target audience)
- **Engagement**: Feature requests, community contributions

### **Secondary Stakeholders (Indirect Beneficiaries)**

**4. Academic Supervisors**

- **Role**: Project oversight and guidance
- **Interests**:
    - Academic rigor and quality
    - Alignment with educational objectives
    - Successful project completion and student learning
- **Influence**: High (approval authority)
- **Engagement**: Bi-weekly meetings, milestone reviews, final evaluation

**5. Development Team**

- **Role**: System implementers and maintainers
- **Interests**:
    - Clear requirements and specifications
    - Manageable scope and realistic timelines
    - Technical learning and skill development
    - Project success for academic credentials
- **Influence**: High (execution responsibility)
- **Engagement**: Daily standups, sprint planning, retrospectives

**6. Employers / Recruiters**

- **Role**: Consumers of Learning CV credentials
- **Interests**:
    - Reliable skill validation mechanisms
    - Reduced hiring risk through objective metrics
    - Efficient candidate screening
- **Influence**: Medium (validate credential value)
- **Engagement**: Feedback on Learning CV format, employer surveys (Phase 2+)

### **Stakeholder Analysis Matrix**

| Stakeholder | Interest Level | Influence Level | Engagement Strategy |
| --- | --- | --- | --- |
| Learners | Very High | Very High | Continuous feedback loops, user testing |
| Academic Supervisors | High | Very High | Regular meetings, formal reviews |
| Development Team | Very High | Very High | Agile collaboration, transparent communication |
| Employers | Medium | Medium | Surveys, Learning CV validation studies |

# **Chapter Four: System Design**

## **4.1 Introduction**

System design is the critical phase where abstract requirements are transformed into concrete architectural blueprints and detailed technical specifications. This chapter presents the complete design architecture for the **AI-Powered Learning & Code Review Platform**, encompassing structural models, behavioral specifications, data management strategies, and component interaction patterns.

The design methodology follows **industry-standard software engineering practices**, adhering to established modeling languages (Unified Modeling Language - UML) and architectural patterns (layered architecture, microservices, asynchronous processing). All design artifacts are created to be:

- **Precise**: Unambiguous specifications enabling direct implementation
- **Complete**: Covering all system aspects from user interactions to data persistence
- **Consistent**: Maintaining coherent relationships across all diagrams and specifications
- **Traceable**: Explicitly linked to requirements defined in Chapter 3
- **Implementable**: Aligned with the chosen technology stack (.NET 8, React, Python, SQL Server)

**Design Principles Guiding This Architecture:**

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, data access, and external services
2. **Scalability by Design**: Horizontal scaling capabilities built into core architecture
3. **Fault Tolerance**: Graceful degradation and error handling at all system levels
4. **Security First**: Authentication, authorization, and data protection integrated throughout
5. **Maintainability**: Modular design enabling independent component evolution
6. **Testability**: Dependency injection and interface-based design facilitating automated testing

**Design Artifacts Presented:**

The design is documented through complementary views, each addressing specific stakeholder concerns:

- **Structural Diagrams**: Block, Class, Context, and ERD showing system components and relationships
- **Behavioral Diagrams**: Use Case, Activity, Sequence, and State diagrams modeling system dynamics
- **Data Flow Diagrams**: DFD hierarchy illustrating information movement and transformation
- **Database Design**: Relational schema, indexing strategy, and data management specifications

**Technology Stack Alignment:**

All design decisions are made within the constraints of the predetermined technology stack:

| Layer | Technology | Design Implications |
| --- | --- | --- |
| Frontend | React.js + TypeScript | Component-based architecture, Redux state management |
| Backend API | [ASP.NET](http://asp.net/) Core 8 | RESTful services, Clean Architecture pattern |
| Background Processing | .NET Worker Service | Queue-based asynchronous job processing |
| AI Engine | Python FastAPI | Microservice architecture, HTTP-based communication |
| Static Analysis | Docker containers | Sandboxed tool execution, resource isolation |
| Database | SQL Server | Relational schema, Entity Framework Core ORM |
| Cache | Redis | Distributed caching, session management |
| Queue | Azure Service Bus | Durable message queuing, retry logic |
| Storage | Azure Blob Storage | Scalable file storage, CDN integration |

## **4.2 Block Diagram**

### **4.2.1 Overview**

The Block Diagram provides a high-level architectural view of the platform, highlighting major subsystems and how they interact across logical and physical boundaries. The system follows a multi-tier, microservices-inspired architecture composed of:

- **Presentation Tier**: Web and mobile applications
- **Application Tier**: .NET API and business logic
- **Processing Tier**: Background job worker
- **Intelligence Tier**: Python AI microservice
- **Analysis Tier**: Containerized static analysis tools
- **Data Tier**: Database, cache, object storage, message queue

**Key Architectural Patterns Used:**

API Gateway, Worker pattern, Microservice isolation, Repository abstraction, Queue-based load leveling, Circuit breaker for external services.

### **4.2.2 Block Diagram**

plantuml

```html
@startuml
title Block Diagram - AI-Powered Learning & Code Review Platform
left to right direction

skinparam packageStyle rectangle
skinparam backgroundColor #FFFFFF

skinparam rectangle {
  BackgroundColor #F9FAFB
  BorderColor #1E3A8A
  RoundCorner 15
}

' ================= CLIENT ===================
package "Client Layer" {
  rectangle "React Web App\n(TypeScript + Redux)" as ReactApp
  rectangle "Mobile App\n(Flutter / React Native)" as MobileApp
}

' ================= BACKEND ==================
package ".NET Backend Layer" {
  rectangle "Web API\nASP.NET Core" as WebAPI
  rectangle "Auth Service\nJWT + OAuth" as AuthService
  rectangle "Business Logic Layer" as BLL
  rectangle "Background Worker\nJob Processor" as Worker
}

' ================= AI LAYER =================
package "AI & Analysis Layer" {
  rectangle "AI Service\nPython FastAPI" as AIService
  rectangle "Prompt Engineering Module" as PromptEngine
  rectangle "LLM Provider\n(OpenAI / Claude / Ollama)" as LLMProvider

  package "Static Analysis Tools" {
    rectangle "ESLint" as ESLint
    rectangle "SonarQube" as Sonar
    rectangle "Bandit" as Bandit
  }
}

' ================= STORAGE ==================
package "Data Storage Layer" {
  rectangle "SQL Server\n(Relational DB)" as SQLDB
  rectangle "Redis Cache" as Redis
  rectangle "Blob Storage" as Blob
  rectangle "Azure Service Bus" as Queue
}

' ================= EXTERNAL =================
package "External Services" {
  rectangle "GitHub API" as GitHub
  rectangle "SendGrid" as SendGrid
  rectangle "Azure Monitor" as Monitor
}

' -------- connections --------
ReactApp --> WebAPI
MobileApp --> WebAPI

WebAPI --> AuthService
WebAPI --> BLL
WebAPI --> SQLDB
WebAPI --> Redis
WebAPI --> Queue

Worker --> Queue
Worker --> SQLDB
Worker --> Blob
Worker --> ESLint
Worker --> Sonar
Worker --> Bandit

Worker --> AIService
AIService --> PromptEngine
PromptEngine --> LLMProvider

WebAPI --> GitHub
WebAPI --> SendGrid
WebAPI --> Monitor
Worker --> Monitor
AIService --> Monitor

@enduml

```

![A diagram of a computer program AI-generated content may be incorrect.](image6.jpeg)

### **4.2.3 Explanation of the Block Diagram**

The architecture is divided into **five primary layers**, each responsible for a core part of the platform’s functionality.

**Layer 1: Client Layer**

**Components**

- Web application (desktop/tablet)
- Mobile application

**Responsibilities**

- Render user interfaces and manage client-side state
- Communicate securely with backend APIs
- Handle authentication tokens and user sessions
- Provide offline-first capabilities for mobile users

**Design Considerations (Condensed)**

- SPA architecture for seamless navigation
- Token-based authentication
- Responsive design ensuring compatibility across devices

**Layer 2: Backend Application Layer (.NET)**

**Components**

- **Web API**: Entry point for all client operations
- **Auth Service**: Registration, login, OAuth, JWT
- **Business Logic Layer**: Domain rules and orchestration
- **Background Worker**: Asynchronous job processor

**Responsibilities**

- Validate input, enforce rules, and manage workflows
- Provide API gateway access
- Execute long-running analysis tasks outside request cycles
- Coordinate data access and consistency

**Design Considerations (Condensed)**

- Clean Architecture separation
- Repository abstraction for maintainability
- Queue-driven processing for scalability and reliability

**Layer 3: AI & Analysis Layer**

**Components**

- **AI Microservice**: Receives code + static results; returns structured feedback
- **Prompt Engineering Module**: Builds contextual prompts
- **LLM Provider Interface**: Abstraction for OpenAI/Claude/Ollama
- **Static Analysis Tools**: ESLint, SonarQube, Bandit (in isolated containers)

**Responsibilities**

- Perform code understanding beyond syntactic checks
- Generate structured, educational AI feedback
- Execute static analysis securely and in isolation
- Provide task/resource recommendations

**Design Considerations (Condensed)**

- AI service isolated for independent scaling and deployment
- Provider-agnostic interface to allow LLM switching
- Container sandboxing for safe static analysis

**Layer 4: Data & Storage Layer**

**Components**

- Relational database (users, tasks, submissions, assessments, CVs)
- Redis cache for sessions, rate limits, and hot data
- Blob storage for uploads, reports, assets
- Service Bus queue for job coordination

**Responsibilities**

- Persistent storage of all platform data
- High-performance caching for frequent reads
- Fault-tolerant asynchronous processing via queue
- Scalable file storage for user code and generated outputs

**Design Considerations (Condensed)**

- Normalized schema with targeted indexing
- Queue-based decoupling to absorb traffic spikes
- Blob tiers for cost-efficient storage

**Layer 5: External Services**

**Components**

- **GitHub API**: OAuth + repo content access
- **SendGrid**: Transactional email delivery
- **Azure Monitor**: Logging, tracing, metrics, alerting

**Responsibilities**

- User authentication via GitHub
- Email notifications (verification, reset, alerts)
- Full observability of system health and performance

**Design Considerations (Condensed)**

- Circuit breaker protection for external failures
- Graceful degradation when services are unavailable
- Centralized telemetry for distributed components

**Architectural Rationale (Condensed)**

- **Multi-tier architecture** ensures clear separation of concerns and independent scalability.
- **AI as a microservice** enables rapid iteration, provider flexibility, and isolated scaling for compute-heavy workloads.
- **Queue-based processing** improves responsiveness, fault tolerance, and load handling.
- **Containerized static analysis** guarantees isolation, safety, and flexibility in tool selection.

## **4.3 Use Case Diagram**

### **4.3.1 Overview**

The Use Case Diagram provides an external view of the system’s functional requirements and illustrates how different actors interact with the platform to achieve their goals. It supports requirement validation and communication among stakeholders.

The diagram follows UML 2.5 notation and focuses on actors, system functionalities, and interaction boundaries without describing UML relationship theory.

**Scope:**

The diagram includes all functionalities provided within the platform, and external services (GitHub, LLM provider, static analysis tools) are represented as actors to clarify integration points.

### **4.3.2 Actors**

### Primary Actors

- **Guest/Visitor** - Unauthenticated user who can register and browse marketing pages
- **Learner** - Registered, authenticated user
- **Admin** - Manages content, users, and moderation

### External Actors

- **GitHub** - OAuth provider & code repository host
- **AI Review Service (LLM Provider)** - Performs AI code analysis
- **Static Analysis Service** - Wrapped set of tools (ESLint, SonarQube, Bandit, etc.)
- **Email/Notification Service** - Sends verification emails, password reset, status notifications

### **4.3.3 Use Case Diagram**

plantuml

```html
@startuml
title AI-Powered Learning & Code Review Platform - Use Case Diagram
left to right direction
skinparam backgroundColor #FFFFFF

skinparam actor {
  BackgroundColor #E0F2FE
  BorderColor #1E3A8A
  FontColor #1E3A8A
}

skinparam usecase {
  BackgroundColor #F9FAFB
  BorderColor #2E3A59
  FontColor #111827
  FontSize 11
}

'-------------------------------------------------------
' Actors
'-------------------------------------------------------
actor "Guest/Visitor" as Guest
actor "Learner" as Learner
actor "Admin" as Admin

actor "GitHub" as GitHub
actor "AI Review\nService" as LLM
actor "Static Analysis\nService" as StaticSvc
actor "Email/Notification\nService" as NotifSvc

'-------------------------------------------------------
' System Boundary
'-------------------------------------------------------
rectangle "AI-Powered Learning & Code Review Platform" {

  '-------------------------------
  ' 1. Authentication & Profile
  '-------------------------------
  package "Authentication & Profile" {

    usecase "Register Account" as UC_Reg
    usecase "Login" as UC_Login
    usecase "Login with GitHub" as UC_LoginGH
    usecase "Reset Password" as UC_ResetPwd
    usecase "Verify Email Address" as UC_VerifyEmail
    usecase "Manage Profile" as UC_Profile
    usecase "Link GitHub Account" as UC_LinkGH
    usecase "Unlink GitHub Account" as UC_UnlinkGH
    usecase "Manage Notification\nPreferences" as UC_NotifyPrefs

    usecase "Authenticate via\nGitHub OAuth" as UC_OAuth
    usecase "Send Verification/\nReset Email" as UC_SendVerif
  }

  '-------------------------------
  ' 2. Assessment & Learning Path
  '-------------------------------
  package "Assessment & Learning Path" {

    usecase "Take Adaptive\nAssessment" as UC_Assess
    usecase "View Assessment\nResults" as UC_AssessResults
    usecase "Generate/Update\nLearning Path" as UC_LPath
    usecase "Review/Adjust\nLearning Path" as UC_LPathAdjust

    ' internal system UCs
    usecase "Select Next\nAssessment Question" as UC_NextQ
    usecase "Update Skill\nProfile" as UC_UpdateSkill
    usecase "Recalculate\nLearning Path" as UC_RecalcPath
  }

  '-------------------------------
  ' 3. Tasks, Submission & Analysis
  '-------------------------------
  package "Tasks, Submission\n& Analysis" {

    usecase "Browse Tasks &\nLearning Tracks" as UC_BrowseTasks
    usecase "View Task Details" as UC_TaskDetails
    usecase "Submit Code\n(GitHub/Upload)" as UC_SubmitCode
    usecase "Track Submission\nStatus" as UC_SubmitStatus
    usecase "View Feedback\nReport" as UC_Feedback

    ' internal / external
    usecase "Fetch Code from\nGitHub Repository" as UC_FetchRepo
    usecase "Run Static Code\nAnalysis" as UC_Static
    usecase "Run AI Code\nReview" as UC_AICR
    usecase "Aggregate Feedback\n& Scores" as UC_AggFeedback
  }

  '-------------------------------
  ' 4. Recommendations & Resources
  '-------------------------------
  package "Recommendations\n& Resources" {

    usecase "View AI\nRecommendations" as UC_ViewRecs
    usecase "Add Recommended\nTask to Learning Path" as UC_AddRecTask
    usecase "Access Suggested\nLearning Resources" as UC_Resources

    ' system/internal
    usecase "Generate Task\nRecommendations" as UC_GenRecs
    usecase "Recommend Learning\nResources" as UC_GenRes
  }

  '-------------------------------
  ' 5. Progress, Analytics & CV
  '   6. Gamification
  '-------------------------------
  package "Progress, Analytics,\nLearning CV & Gamification" {

    usecase "View Progress\nDashboard" as UC_Dashboard
    usecase "View Skill\nAnalytics" as UC_SkillAnalytics
    usecase "Compare Progress\nwith Peers" as UC_ComparePeers

    usecase "Generate\nLearning CV" as UC_LCV
    usecase "Export Learning CV\n(PDF)" as UC_LCVExport
    usecase "Configure CV Visibility/\nShare Link" as UC_LCVShare

    usecase "Earn Badges &\nAchievements" as UC_EarnBadges
    usecase "View Badge\nCollection" as UC_Badges
    usecase "Track Learning\nStreaks" as UC_Streaks
    usecase "View\nLeaderboards" as UC_Leaderboards

    ' internal
    usecase "Calculate Streaks\n& XP" as UC_CalcXP
    usecase "Award Badges" as UC_AwardBadges
  }

  '-------------------------------
  ' 7. Community
  '-------------------------------
  package "Community" {

    usecase "Post Question" as UC_PostQ
    usecase "Answer Question" as UC_AnswerQ
    usecase "Comment on Posts" as UC_Comment
    usecase "Vote on Content" as UC_Vote
    usecase "Search Community" as UC_SearchComm
    usecase "Report Inappropriate\nContent" as UC_ReportContent
    usecase "Moderate Community\nContent" as UC_Moderate

    ' optional internal
    usecase "Handle Reports\n& Moderation Actions" as UC_HandleReports
  }

  '-------------------------------
  ' 8. Admin & Platform Management
  '-------------------------------
  package "Admin & Platform\nManagement" {

    usecase "Manage Users" as UC_Users
    usecase "Manage Tasks &\nLearning Tracks" as UC_AdminTasks
    usecase "Manage Assessment\nQuestions & Rules" as UC_AdminAssess
    usecase "Manage Learning\nResources" as UC_AdminRes
    usecase "Configure Gamification\nRules" as UC_AdminGame
    usecase "Configure Static & AI\nAnalysis Settings" as UC_AdminAnalysis
    usecase "View Platform\nAnalytics" as UC_AdminAnalytics
  }

  '-------------------------------
  ' 9. Notifications (cross-cutting)
  '-------------------------------
  package "Notifications\n(cross-cutting)" {

    usecase "Send Assessment Result\nNotification" as UC_AssessNotif
    usecase "Send Submission Status\nNotification" as UC_SubmitNotif
    usecase "Send Community/\nEngagement Notifications" as UC_CommNotif
  }
}

'-------------------------------------------------------
' Actor – Use Case Associations
'-------------------------------------------------------

' Guest
Guest --> UC_Reg
Guest --> UC_Login
Guest --> UC_LoginGH

' Learner
Learner --> UC_Login
Learner --> UC_LoginGH
Learner --> UC_ResetPwd
Learner --> UC_VerifyEmail
Learner --> UC_Profile
Learner --> UC_LinkGH
Learner --> UC_UnlinkGH
Learner --> UC_NotifyPrefs

Learner --> UC_Assess
Learner --> UC_AssessResults
Learner --> UC_LPath
Learner --> UC_LPathAdjust

Learner --> UC_BrowseTasks
Learner --> UC_TaskDetails
Learner --> UC_SubmitCode
Learner --> UC_SubmitStatus
Learner --> UC_Feedback

Learner --> UC_ViewRecs
Learner --> UC_AddRecTask
Learner --> UC_Resources

Learner --> UC_Dashboard
Learner --> UC_ComparePeers
Learner --> UC_LCV
Learner --> UC_LCVShare

Learner --> UC_EarnBadges
Learner --> UC_Badges
Learner --> UC_Streaks
Learner --> UC_Leaderboards

Learner --> UC_PostQ
Learner --> UC_AnswerQ
Learner --> UC_Comment
Learner --> UC_Vote
Learner --> UC_SearchComm
Learner --> UC_ReportContent

' Admin
Admin --> UC_Users
Admin --> UC_AdminTasks
Admin --> UC_AdminAssess
Admin --> UC_AdminRes
Admin --> UC_AdminGame
Admin --> UC_AdminAnalysis
Admin --> UC_AdminAnalytics
Admin --> UC_Moderate

' External services
GitHub --> UC_OAuth
GitHub --> UC_FetchRepo

LLM --> UC_AICR
StaticSvc --> UC_Static

NotifSvc --> UC_SendVerif
NotifSvc --> UC_AssessNotif
NotifSvc --> UC_SubmitNotif
NotifSvc --> UC_CommNotif

'-------------------------------------------------------
' Include / Extend Relationships
'-------------------------------------------------------

' Auth - include relationships (mandatory sub-flows)
UC_Reg ..> UC_VerifyEmail : <<include>>
UC_VerifyEmail ..> UC_SendVerif : <<include>>
UC_ResetPwd ..> UC_SendVerif : <<include>>

UC_LoginGH ..> UC_OAuth : <<include>>
UC_LinkGH ..> UC_OAuth : <<include>>
UC_UnlinkGH ..> UC_OAuth : <<include>>

' Assessment & learning path - include (mandatory sub-flows)
UC_Assess ..> UC_NextQ : <<include>>
UC_Assess ..> UC_UpdateSkill : <<include>>
UC_AssessResults ..> UC_LPath : <<include>>
UC_LPath ..> UC_RecalcPath : <<include>>

' Submission & analysis - include (mandatory sub-flows)
UC_SubmitCode ..> UC_FetchRepo : <<include>>
UC_SubmitCode ..> UC_Static : <<include>>
UC_SubmitCode ..> UC_AICR : <<include>>
UC_Feedback ..> UC_AggFeedback : <<include>>

' Notifications - extend (optional flows FROM notification TO base use case)
UC_AssessNotif ..> UC_AssessResults : <<extend>>
UC_SubmitNotif ..> UC_SubmitStatus : <<extend>>
UC_CommNotif ..> UC_PostQ : <<extend>>
UC_CommNotif ..> UC_AnswerQ : <<extend>>
UC_CommNotif ..> UC_Comment : <<extend>>

' Recommendations - extend (optional flows FROM recs/resources TO feedback)
UC_ViewRecs ..> UC_Feedback : <<extend>>
UC_AddRecTask ..> UC_Feedback : <<extend>>
UC_Resources ..> UC_Feedback : <<extend>>

' Recommendations generation - include (mandatory to generate)
UC_ViewRecs ..> UC_GenRecs : <<include>>
UC_Resources ..> UC_GenRes : <<include>>

' Progress & gamification - include and extend
UC_Dashboard ..> UC_SkillAnalytics : <<include>>
UC_ComparePeers ..> UC_Dashboard : <<extend>>

UC_Badges ..> UC_Dashboard : <<extend>>
UC_Streaks ..> UC_Dashboard : <<extend>>
UC_Leaderboards ..> UC_Dashboard : <<extend>>

UC_EarnBadges ..> UC_AwardBadges : <<include>>
UC_Streaks ..> UC_CalcXP : <<include>>

' Learning CV - extend (optional flows FROM export/share TO generate)
UC_LCVExport ..> UC_LCV : <<extend>>
UC_LCVShare ..> UC_LCV : <<extend>>

' Community moderation - extend and include
UC_ReportContent ..> UC_PostQ : <<extend>>
UC_ReportContent ..> UC_AnswerQ : <<extend>>
UC_ReportContent ..> UC_Comment : <<extend>>

UC_Moderate ..> UC_HandleReports : <<include>>

note right of UC_SubmitCode
  Primary submission flow:
  1. User links GitHub repo or uploads code
  2. Static analysis runs (mandatory)
  3. AI review generates feedback (mandatory)
  4. Comprehensive feedback delivered
end note

note right of UC_LCV
  Learning CV showcases:
  • Verified skill scores
  • Project portfolio
  • Improvement metrics
  • AI-assessed quality
end note

note bottom of UC_Assess
  Adaptive assessment:
  • 30 questions
  • Dynamic difficulty adjustment
  • Skill level assignment
  • Personalized path generation
end note

@enduml
```

![image.png](image.png)

### **4.3.4 Diagram Explanation**

### **1. Authentication & Profile**

**For Learner/Guest:**

- Register Account
- Login
- Login with GitHub
- Reset Password
- Verify Email Address
- Manage Profile (edit personal data, avatar, preferences)
- Link GitHub Account
- Unlink GitHub Account
- Manage Notification Preferences

**External interactions:**

- Authenticate via GitHub OAuth (GitHub actor)
- Send Verification/Reset Emails (Email Service actor)

---

### **2. Adaptive Assessment & Learning Path**

**Learner:**

- Take Adaptive Assessment
- View Assessment Results
- Generate Initial Learning Path
- Review/Adjust Learning Path (reorder, skip, accept recommended track)

**System/internal UCs (can be included):**

- Select Next Assessment Question (internal)
- Update Skill Profile
- Recalculate Learning Path (after new data)

---

### **3. Tasks, Code Submission & Analysis**

**Learner:**

- Browse Tasks & Learning Tracks
- View Task Details
- Submit Code (GitHub/Upload)
- Track Submission Status
- View Feedback Report

**System/externals:**

- Fetch Code from GitHub Repository (interacts with GitHub)
- Run Static Code Analysis (interacts with Static Analysis Service)
- Run AI Code Review (interacts with AI Review Service)
- Aggregate Feedback & Scores

**Relationships:**

- Submit Code **includes** Fetch Code from GitHub Repository
- Submit Code **includes** Run Static Code Analysis and Run AI Code Review
- View Feedback Report **includes** Aggregate Feedback & Scores
- View Feedback Report may **extend** into recommendations/resources

---

### **4. Recommendations & Learning Resources**

**Learner:**

- View AI Recommendations
- Add Recommended Task to Learning Path
- Access Suggested Learning Resources

**System/external:**

- Generate Task Recommendations
- Recommend Learning Resources

**Relations:**

- View Feedback Report is **extended by**:
    - View AI Recommendations
    - Add Recommended Task to Learning Path
    - Access Suggested Learning Resources

---

### **5. Progress, Analytics & Learning CV**

**Learner:**

- View Progress Dashboard
- Compare Progress with Peers
- Generate Learning CV
- Export Learning CV (PDF)
- Configure Learning CV Visibility/Share Link

**Relations:**

- View Progress Dashboard **includes** View Skill Analytics
- Compare Progress with Peers may **extend** dashboard
- Export Learning CV (PDF) **extends** Generate Learning CV

---

### **6. Gamification**

**Learner:**

- Earn Badges & Achievements
- View Badge Collection
- Track Learning Streaks
- (Optional) View Leaderboards

**System/internal:**

- Calculate Streaks & XP
- Award Badges

**Relations:**

- View Progress Dashboard may **extend** into View Badge Collection and Track Learning Streaks

---

### **7. Community**

**Learner:**

- Post Question
- Answer Question
- Comment on Posts (if you want more detail)
- Vote on Content
- Search Community
- Report Inappropriate Content

**Admin:**

- Moderate Community Content (review reports, delete/lock posts, ban users)

**Relations:**

- Report Inappropriate Content **extends** the posting/reading UCs
- Moderate Community Content **includes** handling reports and performing moderation actions

---

### **8. Admin & Platform Management**

**Admin:**

- Manage Users (create, deactivate, assign roles)
- Manage Tasks & Learning Tracks
- Manage Assessment Questions & Scoring Rules
- Manage Learning Resources
- Configure Gamification Rules (badges, thresholds)
- Configure Static & AI Analysis Settings
- View Platform Analytics
- Moderate Community Content

---

### **9. Notifications (cross-cutting)**

**Learner:**

- Manage Notification Preferences

**System/external:**

- Send Assessment Result Notifications
- Send Submission Status Notifications
- Send Community/Engagement Notifications

(These all use the Email/Notification Service actor)

## **4.4 Activity Diagrams**

### **4.4.1 Overview**

Activity Diagrams model the **dynamic behavior of the system** by depicting workflows as sequences of actions, decisions, and control flows. Unlike sequence diagrams that focus on message passing between objects, activity diagrams emphasize the **flow of control and data** through algorithmic logic, business processes, and user interactions.

**Purpose in System Design:**

- **Business Process Modeling**: Document complex workflows (e.g., submission pipeline)
- **Algorithm Specification**: Detail computational logic (e.g., adaptive assessment scoring)
- **User Journey Mapping**: Visualize end-to-end user experiences
- **System Behavior Documentation**: Provide implementation guidance for developers

**Notation Elements Used:**

- **Initial Node** (filled circle): Workflow entry point
- **Activity Node** (rounded rectangle): Individual action or operation
- **Decision Node** (diamond): Conditional branching
- **Merge Node** (diamond): Convergence of alternative paths
- **Fork/Join Nodes** (thick bar): Parallel execution and synchronization
- **Final Node** (circle with border): Workflow termination
- **Swimlanes** (vertical partitions): Responsibility assignment to actors/systems

The following subsections present six critical activity diagrams covering the platform's core workflows.

### **4.4.2 User Authentication & Login Activity**

### Overview

This activity diagram models the complete user authentication workflow, encompassing both traditional email/password login and OAuth-based GitHub authentication. The workflow includes comprehensive security measures such as rate limiting, session management, email verification, and multi-factor authentication support for administrative accounts.

**Scope:**

- User navigation to login page
- Email/password authentication flow
- GitHub OAuth 2.0 authentication flow
- JWT token generation and issuance
- Session management with Redis caching
- Password reset workflow
- Account status verification
- Security controls (rate limiting, brute force protection)
- Post-authentication routing (dashboard, onboarding, assessment)

**Actors/Systems Involved:**

- **User:** Initiates authentication
- **Frontend (React):** Provides login UI and client-side validation
- **Backend API (ASP.NET Core):** Orchestrates authentication logic
- **ASP.NET Core Identity:** Handles password hashing and verification
- **GitHub OAuth Provider:** External identity provider for OAuth flow
- **SQL Server:** Stores user credentials, account status, OAuth tokens
- **Redis Cache:** Manages sessions and rate limiting
- **SendGrid (Notification Service):** Sends verification and password reset emails

**Key Design Decisions:**

- **Dual Authentication Methods:** Support both traditional and OAuth for flexibility
- **JWT-Based Sessions:** Stateless authentication with refresh token support
- **Security-First Approach:** Rate limiting, CSRF protection, secure token storage
- **Encrypted OAuth Tokens:** GitHub tokens encrypted at rest using ASP.NET Data Protection API
- **Session Persistence:** Redis caching for improved performance and session management
- **Account Status Checks:** Verify active status before issuing tokens
- **Automatic Expiration:** Access tokens expire after 15 minutes; refresh tokens after 7 days

---

### Activity Flow Description

**Phase 1: Login Initiation**

**1.1 User Navigates to Login Page**

- **Actor:** User
- **Entry Points:**
    - Direct URL: `/login`
    - Redirect from protected route (with `returnUrl` parameter)
    - "Login" button from landing page or registration flow
- **Context:** User is not authenticated or has expired session

**1.2 Frontend Checks for Existing Valid Session**

- **Actor:** Frontend
- **Action:** Check browser storage for valid JWT token
    - **localStorage:** `access_token` and `refresh_token`
    - **Token Validation:** Check expiration timestamp (client-side quick check)
- **Decision Point:**
    - **Valid Session Exists (not expired):** Redirect to dashboard or `returnUrl`. **Workflow terminates.**
    - **No Valid Session or Expired:** Proceed to 1.3.

**1.3 Frontend Displays Authentication Options**

- **Actor:** Frontend
- **UI Components:**
    - **Email/Password Form:**
        - Email input (type: email, required)
        - Password input (type: password, required)
        - "Remember me" checkbox (extends refresh token to 30 days)
        - "Forgot password?" link
        - "Login" button (primary action)
    - **OAuth Options:**
        - "Continue with GitHub" button (prominent, icon-based)
        - Visual separator: "OR"
    - **Registration Link:**
        - "Don't have an account? Sign up"
    - **Security Notice:**
        - "Your data is encrypted and secure"

---

**Phase 2A: Email/Password Authentication Flow**

**2A.1 User Enters Email and Password**

- **Actor:** User
- **Action:** Fill email and password fields

**2A.2 Frontend Validates Input Format (Client-Side)**

- **Actor:** Frontend
- **Validation:**
    - **Email:** Valid email format (regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
    - **Password:** Not empty, minimum 8 characters
- **Decision Point:**
    - **Format Invalid:** Display inline validation errors (red text below fields). **Return to 2A.1.**
    - **Format Valid:** Proceed to 2A.3.

**2A.3 User Clicks "Login" Button**

- **Actor:** User
- **Frontend Action:** Disable button, show loading spinner

**2A.4 Frontend Sends Login Request**

- **Actor:** Frontend → Backend API
- **Action:**

  `POST /api/auth/login
  Content-Type: application/json
  
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "rememberMe": false
  }`

**2A.5 Backend Receives Login Request**

- **Actor:** Backend API
- **Action:** Extract request payload and client metadata (IP address, User-Agent)

**2A.6 Backend Checks Rate Limit**

- **Actor:** Backend API → Redis
- **Rate Limiting Strategy:** Sliding window counter
    - **Limit:** 5 login attempts per 15 minutes per IP address
    - **Additional Limit:** 10 attempts per 15 minutes per email (prevent targeted attacks)
- **Implementation:**

csharp

  `var key = $"login_attempts:{ipAddress}";
  var attempts = await redis.StringIncrementAsync(key);
  if (attempts == 1) {
      await redis.KeyExpireAsync(key, TimeSpan.FromMinutes(15));
  }
  if (attempts > 5) {
      return TooManyRequests();
  }`

- **Decision Point:**
    - **Rate Limit Exceeded:** Return `429 Too Many Requests` with `Retry-After` header. **Workflow terminates.**
    - **Within Limit:** Proceed to 2A.7.

**2A.7 Backend Validates Request Payload Schema**

- **Actor:** Backend API
- **Validation (using FluentValidation):**
    - Email: Required, valid format
    - Password: Required, length ≥ 8
- **Decision Point:**
    - **Payload Invalid:** Return `400 Bad Request` with detailed validation errors:

json

    `{
      "errors": {
        "email": ["Email address is required"],
        "password": ["Password must be at least 8 characters"]
      }
    }`

`Frontend displays errors inline. **Workflow terminates.**`

- **Payload Valid:** Proceed to 2A.8.

**2A.8 Backend Queries Database for User by Email**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      Id, Email, PasswordHash, IsActive, 
      EmailVerified, FailedLoginAttempts, LockoutEnd
  FROM Users
  WHERE Email = @Email`

- **Decision Point:**
    - **User Not Found:** Return `401 Unauthorized` with generic message: "Invalid email or password". **Workflow terminates.**
        - **Security Note:** Generic message prevents email enumeration attacks
    - **User Found:** Proceed to 2A.9.

**2A.9 Backend Checks Account Status**

- **Actor:** Backend API
- **Validations:**
    - **IsActive:** Must be `true`
    - **LockoutEnd:** Must be `NULL` or past current time
    - **EmailVerified:** Should be `true` (enforced based on configuration)
- **Decision Point:**
    - **Account Inactive:** Return `403 Forbidden` with message: "Account has been deactivated. Please contact support." **Workflow terminates.**
    - **Account Locked Out:** Return `403 Forbidden` with message: "Account temporarily locked due to multiple failed login attempts. Try again after [time]." **Workflow terminates.**
    - **Email Not Verified:** Return `403 Forbidden` with message: "Please verify your email address. Check your inbox for verification link." Optionally offer to resend verification email. **Workflow terminates.**
    - **Account Active:** Proceed to 2A.10.

**2A.10 Backend Retrieves Stored Password Hash**

- **Actor:** Backend API
- **Action:** Extract `PasswordHash` from query result
- **Hash Format:** PBKDF2 with 100,000 iterations (ASP.NET Core Identity default)

**2A.11 Backend Verifies Password Using PBKDF2**

- **Actor:** Backend API - ASP.NET Core Identity
- **Action:**

csharp

  `var result = passwordHasher.VerifyHashedPassword(
      user, 
      user.PasswordHash, 
      loginRequest.Password
  );`

- **Result:** `Success`, `Failed`, or `SuccessRehashNeeded`

**2A.12 Backend Evaluates Password Verification Result**

- **Actor:** Backend API
- **Decision Point:**
    - **Password Incorrect (`Failed`):** Proceed to 2A.13 (handle failure).
    - **Password Correct (`Success` or `SuccessRehashNeeded`):** Proceed to 2A.14 (successful authentication).

---

**Sub-Path 2A.13: Failed Login Attempt**

**2A.13.1 Backend Increments Failed Login Counter**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Users
  SET FailedLoginAttempts = FailedLoginAttempts + 1,
      LastFailedLoginAt = GETUTCDATE()
  WHERE Id = @UserId`

**2A.13.2 Backend Checks if Account Should Be Locked**

- **Actor:** Backend API
- **Logic:**

csharp

  `if (user.FailedLoginAttempts >= 5) {
      user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
      await context.SaveChangesAsync();
  }`

- **Lockout Policy:** 5 failed attempts → 15-minute lockout

**2A.13.3 Backend Returns Unauthorized Response**

- **Actor:** Backend API → Frontend
- **Response:** `401 Unauthorized`

json

  `{
    "error": "Invalid email or password",
    "attemptsRemaining": 3
  }`

- **Note:** Generic error message; do not reveal whether email exists

**2A.13.4 Frontend Displays Error Message**

- **Actor:** Frontend
- **UI Update:** Display error banner: "Invalid credentials. X attempts remaining before account lockout."
- **→ Workflow terminates. User can retry from 2A.1.**

---

**Sub-Path 2A.14: Successful Authentication**

**2A.14.1 Backend Resets Failed Login Counter**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Users
  SET FailedLoginAttempts = 0,
      LastLoginAt = GETUTCDATE(),
      LastLoginIP = @IPAddress
  WHERE Id = @UserId`

**2A.14.2 Backend Generates JWT Access Token**

- **Actor:** Backend API
- **Token Claims:**

json

  `{
    "sub": "<user_id>",
    "email": "user@example.com",
    "role": "Learner",
    "email_verified": true,
    "iat": 1702816800,
    "exp": 1702817700,
    "iss": "https://platform.com",
    "aud": "https://platform.com"
  }`

- **Expiration:** 15 minutes (900 seconds)
- **Signing Algorithm:** RS256 (asymmetric key)

**2A.14.3 Backend Generates Refresh Token**

- **Actor:** Backend API
- **Token Properties:**
    - Cryptographically secure random string (256-bit)
    - Stored in database with user association
    - **Expiration:** 7 days (default) or 30 days (if "Remember Me" enabled)
- **Storage:**

sql

  `INSERT INTO RefreshTokens (
      Id, UserId, Token, ExpiresAt, CreatedAt, CreatedByIP
  )
  VALUES (
      NEWID(), @UserId, @Token, @ExpiresAt, GETUTCDATE(), @IPAddress
  )`

**2A.14.4 Backend Creates Session Record in Redis**

- **Actor:** Backend API → Redis
- **Session Data:**

json

  `{
    "userId": "<guid>",
    "email": "user@example.com",
    "role": "Learner",
    "loginTime": "2025-12-15T10:00:00Z",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }`

- **Key:** `session:{user_id}:{session_id}`
- **Expiration:** Matches refresh token expiration
- **Purpose:** Fast session validation, rate limiting, concurrent session tracking

**2A.14.5 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK`

json

  `{
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "f4e3d2c1b0a9...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "<guid>",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Learner",
      "hasCompletedAssessment": false
    }
  }`

- **Security:** Tokens sent in response body (HTTPS required); optionally set httpOnly secure cookies for refresh token

**2A.14.6 Frontend Receives and Validates Tokens**

- **Actor:** Frontend
- **Actions:**
    - Decode JWT (client-side, no verification - validation happens on backend)
    - Check expiration timestamp
    - Verify token structure

**2A.14.7 Frontend Updates Authentication State**

- **Actor:** Frontend
- **State Management (Redux/Context):**

javascript

  `dispatch(setAuthState({
    isAuthenticated: true,
    user: response.user,
    accessToken: response.accessToken,
    tokenExpiry: Date.now() + (response.expiresIn * 1000)
  }));`

- **Storage:**
    - Store `accessToken` in memory (Redux store)
    - Store `refreshToken` in httpOnly cookie or secure localStorage
    - Never expose tokens to JavaScript if using cookies

**2A.14.8 Frontend Determines Post-Login Destination**

- **Actor:** Frontend
- **Routing Logic:**

javascript

  `if (returnUrl) {
    navigate(returnUrl); // Return to originally requested page
  } else if (!user.hasCompletedAssessment) {
    navigate('/assessment/start'); // New user onboarding
  } else {
    navigate('/dashboard'); // Existing user
  }`

**2A.14.9 Frontend Redirects to Destination**

- **Actor:** Frontend
- **Action:** Navigate to determined route

**→ Workflow Complete (Email/Password Path)**

---

**Phase 2B: GitHub OAuth Authentication Flow**

**2B.1 User Clicks "Continue with GitHub" Button**

- **Actor:** User
- **Frontend Action:** Initiate OAuth flow

**2B.2 Frontend Generates CSRF Token**

- **Actor:** Frontend
- **Action:**
    - Generate cryptographically secure random token (128-bit)
    - Store in session storage: `oauth_state_token`
- **Purpose:** Prevent CSRF attacks during OAuth callback

**2B.3 Frontend Stores CSRF Token in Session**

- **Actor:** Frontend
- **Storage:**

javascript

  `sessionStorage.setItem('oauth_state', csrfToken);
  sessionStorage.setItem('oauth_returnUrl', currentPath);
```

**2B.4 Frontend Constructs GitHub OAuth Authorization URL**
- **Actor:** Frontend
- **URL Construction:**
```
  https://github.com/login/oauth/authorize
    ?client_id=<github_client_id>
    &redirect_uri=https://platform.com/auth/github/callback
    &scope=user:email,read:user
    &state=<csrf_token>
```
- **Parameters:**
  - `client_id`: GitHub OAuth application ID (from configuration)
  - `redirect_uri`: Registered callback URL
  - `scope`: Requested permissions (email and basic profile)
  - `state`: CSRF token for validation

**2B.5 Frontend Redirects User to GitHub OAuth URL**
- **Actor:** Frontend
- **Action:** `window.location.href = githubAuthUrl;`
- **User Experience:** Browser navigates away to GitHub.com

**2B.6 GitHub Processes OAuth Authorization**
- **Actor:** GitHub OAuth Provider
- **User Actions on GitHub:**
  1. User logs into GitHub (if not already authenticated)
  2. GitHub displays consent screen showing requested permissions
  3. User clicks "Authorize [Application Name]"
- **GitHub Internal Processing:**
  - Validate client_id and redirect_uri
  - Generate authorization code
  - Redirect back to callback URL

**2B.7 GitHub Redirects to Platform Callback URL**
- **Actor:** GitHub → Frontend (via browser redirect)
- **Callback URL Format:**
```
  https://platform.com/auth/github/callback
    ?code=<authorization_code>
    &state=<csrf_token>`

- **Parameters:**
    - `code`: Single-use authorization code (valid for 10 minutes)
    - `state`: Original CSRF token for validation

**2B.8 Frontend (Callback Page) Receives OAuth Callback**

- **Actor:** Frontend
- **Action:** Parse URL parameters to extract `code` and `state`

**2B.9 Frontend Validates CSRF State Token**

- **Actor:** Frontend
- **Validation:**

javascript

  `const storedState = sessionStorage.getItem('oauth_state');
  const receivedState = urlParams.get('state');
  
  if (storedState !== receivedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }
```
- **Decision Point:**
  - **CSRF Token Mismatch:** Display security error: "Authentication failed due to security validation. Please try again." **Workflow terminates.**
  - **Token Valid:** Proceed to 2B.10.

**2B.10 Frontend Sends Callback Data to Backend**
- **Actor:** Frontend → Backend API
- **Action:**
```
  POST /api/auth/github/callback
  Content-Type: application/json
  
  {
    "code": "<authorization_code>",
    "state": "<csrf_token>"
  }
```

**2B.11 Backend Receives OAuth Callback Request**
- **Actor:** Backend API
- **Action:** Extract authorization code and state

**2B.12 Backend Validates CSRF State Token**
- **Actor:** Backend API
- **Validation:** Verify state parameter matches expected value (if stored server-side) or trust frontend validation
- **Decision Point:**
  - **Invalid State:** Return `403 Forbidden` with message: "Invalid authentication request." **Workflow terminates.**
  - **Valid State:** Proceed to 2B.13.

**2B.13 Backend Extracts Authorization Code**
- **Actor:** Backend API
- **Action:** Retrieve `code` from request payload

**2B.14 Backend Exchanges Authorization Code for Access Token**
- **Actor:** Backend API → GitHub API
- **Request:**
```
  POST https://github.com/login/oauth/access_token
  Content-Type: application/json
  Accept: application/json
  
  {
    "client_id": "<github_client_id>",
    "client_secret": "<github_client_secret>",
    "code": "<authorization_code>",
    "redirect_uri": "https://platform.com/auth/github/callback"
  }`

- **Decision Point:**
    - **CSRF Token Mismatch:** Display security error: "Authentication failed due to security validation. Please try again." **Workflow terminates.**
    - **Token Valid:** Proceed to 2B.10.

**2B.10 Frontend Sends Callback Data to Backend**

- **Actor:** Frontend → Backend API
- **Action:**

````
  POST /api/auth/github/callback
  Content-Type: application/json
  
  {
    "code": "<authorization_code>",
    "state": "<csrf_token>"
  }
````

**2B.11 Backend Receives OAuth Callback Request**

- **Actor:** Backend API
- **Action:** Extract authorization code and state

**2B.12 Backend Validates CSRF State Token**

- **Actor:** Backend API
- **Validation:** Verify state parameter matches expected value (if stored server-side) or trust frontend validation
- **Decision Point:**
    - **Invalid State:** Return `403 Forbidden` with message: "Invalid authentication request." **Workflow terminates.**
    - **Valid State:** Proceed to 2B.13.

**2B.13 Backend Extracts Authorization Code**

- **Actor:** Backend API
- **Action:** Retrieve `code` from request payload

**2B.14 Backend Exchanges Authorization Code for Access Token**

- **Actor:** Backend API → GitHub API
- **Request:**

```
  POST <https://github.com/login/oauth/access_token>
  Content-Type: application/json
  Accept: application/json

  {
    "client_id": "<github_client_id>",
    "client_secret": "<github_client_secret>",
    "code": "<authorization_code>",
    "redirect_uri": "<https://platform.com/auth/github/callback>"
  }
```

- **Security Note:** `client_secret` stored securely in Azure Key Vault or environment variables

**2B.15 GitHub Validates Code and Returns Access Token**

- **Actor:** GitHub API → Backend API
- **Response (Success):**

json

  `{
    "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
    "token_type": "bearer",
    "scope": "user:email,read:user"
  }`

- **Response (Error):**

json

  `{
    "error": "bad_verification_code",
    "error_description": "The code passed is incorrect or expired."
  }`

**2B.16 Backend Evaluates Token Exchange Result**

- **Actor:** Backend API
- **Decision Point:**
    - **Exchange Failed (error response):**
        - **Retry Logic:** Retry once after 1-second delay (handles transient failures)
        - **If Retry Fails:** Return `500 Internal Server Error` with message: "Authentication with GitHub failed. Please try again." **Workflow terminates.**
    - **Exchange Succeeded:** Proceed to 2B.17.

**2B.17 Backend Requests User Profile from GitHub**

- **Actor:** Backend API → GitHub API
- **Request:**

```
  GET <https://api.github.com/user>
  Authorization: Bearer <github_access_token>
  Accept: application/vnd.github+json
```

**2B.18 GitHub Returns User Profile**

- **Actor:** GitHub API → Backend API
- **Response:**

json

  `{
    "id": 12345678,
    "login": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
    "bio": "Software Developer",
    "location": "San Francisco, CA"
  }`

- **Fallback:** If primary email is `null`, request `/user/emails` endpoint

**2B.19 Backend Evaluates Profile Fetch Result**

- **Actor:** Backend API
- **Decision Point:**
    - **Profile Fetch Failed:**
        - **Retry Logic:** Retry once
        - **If Retry Fails:** Return `500 Internal Server Error`. **Workflow terminates.**
    - **Profile Fetched Successfully:** Proceed to 2B.20.

**2B.20 Backend Queries Database for Existing User by GitHub Email**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      Id, Email, IsActive, GitHubId, GitHubAccessToken
  FROM Users
  WHERE Email = @GitHubEmail OR GitHubId = @GitHubId`

**2B.21 Backend Evaluates User Existence**

- **Actor:** Backend API
- **Decision Point:**
    - **User Exists:** Proceed to 2B.22 (existing user flow).
    - **User Does Not Exist:** Proceed to 2B.23 (new user creation).

---

**Sub-Path 2B.22: Existing User (GitHub OAuth)**

**2B.22.1 Backend Updates Last Login Timestamp**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Users
  SET LastLoginAt = GETUTCDATE(),
      LastLoginIP = @IPAddress
  WHERE Id = @UserId`

**2B.22.2 Backend Updates GitHub Profile Data**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Users
  SET 
      GitHubLogin = @GitHubLogin,
      GitHubAvatarUrl = @AvatarUrl,
      Name = COALESCE(Name, @GitHubName) -- Update name only if not set
  WHERE Id = @UserId`

**2B.22.3 Backend Encrypts and Updates GitHub Access Token**

- **Actor:** Backend API
- **Encryption:** Use ASP.NET Data Protection API

csharp

  `var protector = dataProtectionProvider.CreateProtector("GitHub.OAuth");
  var encryptedToken = protector.Protect(githubAccessToken);`

- **Storage:**

sql

  `UPDATE Users
  SET GitHubAccessToken = @EncryptedToken,
      GitHubTokenUpdatedAt = GETUTCDATE()
  WHERE Id = @UserId`

- **Purpose:** Store for future GitHub API calls (e.g., fetching repositories)

**→ Skip to 2B.25 (Token Generation - common for both existing and new users)**

---

**Sub-Path 2B.23: New User Creation (GitHub OAuth)**

**2B.23.1 Backend Creates New User Record**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO Users (
      Id, Email, Name, GitHubId, GitHubLogin, 
      GitHubAvatarUrl, GitHubAccessToken, EmailVerified,
      IsActive, CreatedAt, CreatedVia
  )
  VALUES (
      NEWID(), @Email, @Name, @GitHubId, @GitHubLogin,
      @AvatarUrl, @EncryptedToken, 1, -- Email pre-verified via GitHub
      1, GETUTCDATE(), 'GitHub'
  )`

- **Note:** OAuth users skip email verification (GitHub confirms ownership)

**2B.23.2 Backend Captures New User ID**

- **Actor:** Backend API
- **Action:** Retrieve `Id` from insert result or query newly created user

**→ Proceed to 2B.25 (Token Generation)**

---

**2B.25 Backend Generates JWT Access Token**

- **Actor:** Backend API
- **Same process as 2A.14.2** (JWT generation with user claims)

**2B.26 Backend Generates Refresh Token**

- **Actor:** Backend API
- **Same process as 2A.14.3** (refresh token creation and storage)

**2B.27 Backend Creates Session Record in Redis**

- **Actor:** Backend API → Redis
- **Same process as 2A.14.4** (session caching)

**2B.28 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK` with tokens and user data (same structure as 2A.14.5)

**2B.29 Frontend Receives and Validates Tokens**

- **Actor:** Frontend
- **Same process as 2A.14.6**

**2B.30 Frontend Updates Authentication State**

- **Actor:** Frontend
- **Same process as 2A.14.7**

**2B.31 Frontend Determines Post-Login Destination**

- **Actor:** Frontend
- **Routing Logic:**

javascript

  `if (returnUrl) {
    navigate(returnUrl);
  } else if (user.isNewUser) {
    navigate('/onboarding'); // GitHub users see onboarding wizard
  } else if (!user.hasCompletedAssessment) {
    navigate('/assessment/start');
  } else {
    navigate('/dashboard');
  }`

**2B.32 Frontend Redirects to Destination**

- **Actor:** Frontend
- **Action:** Navigate to determined route

**→ Workflow Complete (GitHub OAuth Path)**

---

### Decision Points Summary

| Decision Node | Condition | Path A (Success) | Path B (Failure) |
| --- | --- | --- | --- |
| Existing Valid Session? | JWT not expired | → Redirect dashboard | → Show login form |
| Client-side Validation? | Email/password format | → Send to backend | → Show inline errors |
| Rate Limit OK? | Attempts < 5 per 15 min | → Continue | → 429 Too Many Requests |
| Payload Valid? | Schema validation | → Query database | → 400 Bad Request |
| User Found? | Email exists in DB | → Check status | → 401 Unauthorized (generic) |
| Account Active? | IsActive = true | → Verify password | → 403 Forbidden |
| Email Verified? | EmailVerified = true | → Continue | → 403 Forbidden (resend email) |
| Password Correct? | PBKDF2 verification | → Generate tokens | → Increment failed attempts |
| Account Locked? | FailedAttempts ≥ 5 | → 403 Forbidden (locked) | → Allow login |
| CSRF Token Valid? | State parameter match | → Exchange code | → 403 Forbidden |
| GitHub Token Exchange? | Authorization code valid | → Fetch profile | → Retry once → 500 Error |
| GitHub Profile Fetch? | API call successful | → Query/create user | → Retry once → 500 Error |
| User Exists (OAuth)? | Found by email/GitHubId | → Update user | → Create new user |

---

### **Parallel Activities**

**No explicit fork/join in this workflow.** Authentication flows are sequential to maintain security and data consistency. However, certain operations could be optimized:

**Potential Async Operations (Implementation Detail):**

- Rate limit checks (Redis)
- Session creation (Redis)
- Email notifications (password reset, verification)

These are typically fire-and-forget or use async/await patterns in code but don't require parallel activity diagram branches.

---

### **Performance Characteristics**

**Target Response Times:**

- **Email/Password Login:** < 500ms (p95) including database query and token generation
- **GitHub OAuth (full flow):** < 3 seconds (includes external GitHub API calls)
- **Rate Limit Check:** < 10ms (Redis lookup)
- **Session Creation:** < 50ms (Redis write)

**Security Performance:**

- **Password Hashing:** PBKDF2 with 100,000 iterations (intentionally slow to prevent brute force)
- **Token Generation:** RS256 signing < 10ms

**Caching:**

- User profile data cached in Redis after login (5-minute TTL)
- Rate limit counters use sliding window in Redis

---

### **Data Persistence**

**Users Table:**

sql

`CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX), -- NULL for OAuth-only users
    Name NVARCHAR(200),
    IsActive BIT NOT NULL DEFAULT 1,
    EmailVerified BIT NOT NULL DEFAULT 0,
    GitHubId BIGINT NULL UNIQUE,
    GitHubLogin NVARCHAR(100),
    GitHubAvatarUrl NVARCHAR(500),
    GitHubAccessToken NVARCHAR(MAX), -- Encrypted
    GitHubTokenUpdatedAt DATETIME2,
    FailedLoginAttempts INT NOT NULL DEFAULT 0,
    LastFailedLoginAt DATETIME2,
    LockoutEnd DATETIME2,
    LastLoginAt DATETIME2,
    LastLoginIP NVARCHAR(50),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedVia VARCHAR(20) -- 'Email', 'GitHub'
);

CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Users_GitHubId ON Users(GitHubId);`

**RefreshTokens Table:**

sql

`CREATE TABLE RefreshTokens (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Token NVARCHAR(512) NOT NULL UNIQUE,
    ExpiresAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedByIP NVARCHAR(50),
    RevokedAt DATETIME2,
    RevokedByIP NVARCHAR(50),
    ReplacedByToken NVARCHAR(512),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_RefreshTokens_Token ON RefreshTokens(Token);
CREATE INDEX IX_RefreshTokens_User ON RefreshTokens(UserId, ExpiresAt DESC);
````

**Redis Session Keys:**

```
session:{userId}:{sessionId} → JSON session data
login_attempts:{ipAddress} → Integer counter with 15-min TTL
login_attempts:{email} → Integer counter with 15-min TTL
```

---

## **Alignment with Requirements**

**Functional Requirements:**

- ✅ **FR-AUTH-01:** User registration (referenced, detailed in separate diagram)
- ✅ **FR-AUTH-02:** GitHub OAuth login
- ✅ **FR-AUTH-03:** Email verification enforcement
- ✅ **FR-AUTH-04:** User login (email/password + OAuth)
- ✅ **FR-AUTH-05:** Password reset workflow (referenced)
- ✅ **FR-AUTH-07:** Role-based access control (JWT claims)
- ✅ **FR-AUTH-08:** Session management with Redis

**Non-Functional Requirements:**

- ✅ **NFR-SEC-01:** Strong password hashing (PBKDF2, 100k iterations)
- ✅ **NFR-SEC-02:** RBAC implementation via JWT claims
- ✅ **NFR-SEC-06:** Rate limiting (5 attempts per 15 min)
- ✅ **NFR-SEC-07:** OAuth token encryption at rest
- ✅ **NFR-SEC-08:** Security logging (login attempts, IP tracking)
- ✅ **NFR-PERF-01:** API response time < 500ms
- ✅ **NFR-AVAIL-02:** Graceful degradation (GitHub API failures)

---

## Notes for Implementation

1. **JWT Security:**
    - Use RS256 (asymmetric) not HS256 (symmetric) for better key management
    - Rotate signing keys quarterly
    - Store private keys in Azure Key Vault
2. **OAuth Token Storage:**
    - Encrypt GitHub tokens using ASP.NET Data Protection API
    - Set appropriate key lifetime and rotation policies
    - Never log or expose tokens in error messages
3. **Rate Limiting:**
    - Implement distributed rate limiting with Redis (not in-memory)
    - Consider IP + email combination for more granular control
    - Add CAPTCHA after 3 failed attempts
4. **Session Management:**
    - Implement token refresh flow (not shown in diagram - separate workflow)
    - Detect and prevent concurrent session abuse
    - Provide "Active Sessions" page for users to revoke sessions
5. **Testing:**
    - Unit tests for password verification logic
    - Integration tests for full OAuth flow (mock GitHub API)
    - Security tests for rate limiting and CSRF protection
    - Load tests for concurrent authentication requests

---

### **4.4.3 Adaptive Assessment Activity**

### Overview

This activity diagram models the adaptive assessment system that dynamically adjusts question difficulty based on real-time learner performance. The assessment serves as the entry point for new users, determining their current skill level and generating a personalized learning path tailored to their demonstrated competencies and knowledge gaps.

**Scope:**

- User initiation of adaptive assessment
- Track/specialization selection (Frontend, Backend, Full Stack, etc.)
- Dynamic question selection based on performance
- Real-time difficulty adjustment algorithm
- Per-category skill evaluation
- Final scoring and skill level determination
- Personalized learning path generation
- Task recommendation based on identified weaknesses
- Result presentation and path preview

**Actors/Systems Involved:**

- **User (Learner):** Takes the assessment
- **Frontend (React):** Provides interactive assessment UI with timer and progress tracking
- **Backend API (ASP.NET Core):** Orchestrates assessment logic, question selection, scoring
- **SQL Server:** Stores questions, user responses, assessment results, skill profiles
- **Learning Path Service:** Generates personalized learning paths based on assessment results
- **Recommendation Engine:** Identifies optimal tasks to address skill gaps

**Key Design Decisions:**

- **Adaptive Algorithm:** Uses performance-based difficulty adjustment (correct → increase, incorrect → decrease)
- **Question Pool:** 30 questions from curated bank categorized by difficulty (1-5) and topic
- **No Repetition:** Questions shown once per session to prevent memorization
- **Time Management:** 40-minute total time limit with per-question tracking
- **Multi-Dimensional Scoring:** Evaluates 20+ skill categories (e.g., React Hooks, Security, Algorithms)
- **Skill Level Mapping:** Beginner (<60%), Intermediate (60-80%), Advanced (≥80%)
- **Path Generation:** Selects 15-20 tasks based on weak categories, skill level, and prerequisites
- **Idempotency:** Users can retake assessment after 30-day cooldown period

---

### Activity Flow Description

**Phase 1: Assessment Initialization**

**1.1 User Initiates Assessment**

- **Actor:** User
- **Entry Points:**
    - New user onboarding flow
    - Dashboard "Start Assessment" button
    - Direct navigation to `/assessment/start`
- **Context:** User has completed registration and email verification

**1.2 Frontend Displays Track Selection Screen**

- **Actor:** Frontend
- **UI Components:**
    - **Header:** "Choose Your Learning Track"
    - **Track Cards:** Visual cards for each specialization:
        - **Full Stack Development:** Frontend + Backend mastery
        - **Backend Specialist:** Server-side, APIs, databases
        - **Frontend Specialist:** React, UI/UX, client-side
        - **Python Developer:** Django, Flask, data workflows
        - **C# / .NET Developer:** ASP.NET, Entity Framework
        - **Computer Science Fundamentals:** Algorithms, data structures, system design
    - **Each Card Shows:**
        - Track icon and title
        - Brief description
        - Key technologies covered
        - Typical career paths
        - "Select This Track" button

**1.3 User Selects Desired Track**

- **Actor:** User
- **Action:** Click "Select This Track" button on preferred specialization
- **Frontend:** Highlight selected track, enable "Start Assessment" button

**1.4 Frontend Sends Assessment Start Request**

- **Actor:** Frontend → Backend API
- **Action:**

  `POST /api/assessments/start
  {
    "trackId": "<guid>",
    "selectedTrack": "FullStack"
  }`

- **Headers:** `Authorization: Bearer <JWT>`

**1.5 Backend Validates JWT Token**

- **Actor:** Backend API
- **Validation:** Extract and verify token signature, expiration, user claims
- **Decision Point:**
    - **Invalid/Expired Token:** Return `401 Unauthorized`. Frontend redirects to login. **Workflow terminates.**
    - **Valid Token:** Extract `userId` and proceed to 1.6.

**1.6 Backend Checks for Active Assessment**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT Id, Status, CreatedAt
  FROM Assessments
  WHERE UserId = @UserId
    AND Status = 'InProgress'
    AND CreatedAt > DATEADD(hour, -2, GETUTCDATE()) -- Active within last 2 hours`

- **Decision Point:**
    - **Active Assessment Exists:** Return `409 Conflict` with assessment ID and option to resume. Frontend offers "Resume Assessment" or "Start New" (abandons previous). **If user chooses resume, jump to Phase 2 with restored state.**
    - **No Active Assessment:** Proceed to 1.7.

**1.7 Backend Checks 30-Day Reattempt Policy**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT TOP 1 CompletedAt
  FROM Assessments
  WHERE UserId = @UserId
    AND Status = 'Completed'
  ORDER BY CompletedAt DESC`

- **Logic:** If most recent completion < 30 days ago, user must wait
- **Decision Point:**
    - **Too Soon to Retake:** Return `429 Too Many Requests` with retry date. Frontend displays: "You can retake the assessment on [date]". **Workflow terminates.**
    - **Eligible for Assessment:** Proceed to 1.8.

**1.8 Backend Creates Assessment Session**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO Assessments (
      Id, UserId, TrackType, Status, 
      StartedAt, CreatedAt
  )
  VALUES (
      NEWID(), @UserId, @TrackType, 'InProgress',
      GETUTCDATE(), GETUTCDATE()
  )`

- **Decision Point:**
    - **Database Insert Fails:** Return `500 Internal Server Error`. **Workflow terminates.**
    - **Insert Succeeds:** Capture `assessmentId` and proceed to 1.9.

**1.9 Backend Initializes Assessment State**

- **Actor:** Backend API
- **In-Memory State (Session/Cache):**

json

  `{
    "assessmentId": "<guid>",
    "userId": "<guid>",
    "trackType": "FullStack",
    "currentDifficulty": 3, // Start at medium (scale 1-5)
    "questionsAnswered": 0,
    "totalQuestions": 30,
    "overallScore": 0,
    "categoryScores": {}, // e.g., {"ReactHooks": 0, "Security": 0, ...}
    "shownQuestionIds": [], // Prevent repetition
    "startTime": "2025-12-15T10:00:00Z",
    "status": "InProgress"
  }`

**1.10 Backend Returns Assessment Initialization Response**

- **Actor:** Backend API → Frontend
- **Response:** `201 Created`

json

  `{
    "assessmentId": "<guid>",
    "trackType": "FullStack",
    "trackTitle": "Full Stack Development",
    "totalQuestions": 30,
    "timeLimit": 2400, // seconds (40 minutes)
    "instructions": "Answer 30 questions. Difficulty adjusts based on performance. No question repetition.",
    "categories": ["React", "Node.js", "Databases", "Security", "Algorithms", ...]
  }`

**1.11 Frontend Displays Assessment Instructions**

- **Actor:** Frontend
- **UI Components:**
    - **Instructions Panel:**
        - Assessment rules and format
        - Time limit: 40 minutes
        - 30 questions with adaptive difficulty
        - Progress saved automatically
        - No ability to go back to previous questions
    - **Action Buttons:**
        - "Start Assessment" (primary)
        - "Cancel" (returns to dashboard)

---

**Phase 2: Question Loop (30 Questions)**

**2.1 User Clicks "Start Assessment"**

- **Actor:** User
- **Frontend Action:** Initialize assessment session, start 40-minute countdown timer

**2.2 Frontend Starts Countdown Timer**

- **Actor:** Frontend
- **Timer Display:** Prominent countdown in header (MM:SS format)
- **Behavior:**
    - Update every second
    - Yellow warning when < 5 minutes remaining
    - Red alert when < 2 minutes remaining
    - Auto-submit when timer reaches 00:00

**Fork: Parallel Timer Management**

**Branch A: Main Question Loop (continues below)**

**Branch B: Timer Monitoring**

- **Actor:** Frontend
- **Continuous Process:**
    - Monitor timer countdown
    - **Decision Point:**
        - **Timer Expires (00:00):** Trigger auto-finalize
            - Send finalization request to backend
            - Mark remaining questions as unanswered
            - **Jump to Phase 3: Final Scoring**
        - **Timer Active:** Continue monitoring

**Join Point:** End of assessment (after 30 questions OR timer expiry)

---

**2.3 Frontend Requests Next Question**

- **Actor:** Frontend → Backend API
- **Action:**

```
  GET /api/assessments/{assessmentId}/next-question

```

**2.4 Backend Loads Current Assessment State**

- **Actor:** Backend API
- **Source:** Retrieve from Redis cache or session storage
- **State Includes:** Current difficulty, answered count, shown questions, category scores

**2.5 Backend Selects Next Question**

- **Actor:** Backend API → SQL Server
- **Selection Algorithm:**
    
    **Step 1: Determine Target Difficulty**
    

```
  targetDifficulty = currentDifficulty (from state)
```

**Step 2: Query Question Pool**

sql

  `SELECT TOP 1 
      Q.Id, Q.QuestionText, Q.OptionsJSON, 
      Q.Difficulty, Q.Category, Q.Topic,
      Q.Points -- Weighted by difficulty
  FROM Questions Q
  WHERE Q.TrackType = @TrackType
    AND Q.Difficulty = @TargetDifficulty
    AND Q.IsActive = 1
    AND Q.Id NOT IN @ShownQuestionIds -- Prevent repetition
  ORDER BY 
      -- Prioritize categories with fewer questions answered
      CASE WHEN Q.Category IN @UnderrepresentedCategories THEN 0 ELSE 1 END,
      -- Randomize within difficulty tier
      NEWID()`

**Step 3: Balanced Topic Coverage**

- Track questions answered per category
- Prefer categories with < 2 questions shown
- Ensures comprehensive skill evaluation

**2.6 Backend Marks Question as Shown**

- **Actor:** Backend API
- **Action:** Add `questionId` to `shownQuestionIds` in assessment state
- **Purpose:** Prevent showing same question twice

**2.7 Backend Returns Question Data**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK`

json

  `{
    "questionId": "<guid>",
    "questionNumber": 5,
    "totalQuestions": 30,
    "questionText": "What is the correct way to handle async operations in React?",
    "options": [
      {"id": "A", "text": "Using useEffect with async/await"},
      {"id": "B", "text": "Using async function directly in component"},
      {"id": "C", "text": "Using .then() in render method"},
      {"id": "D", "text": "Using callback functions only"}
    ],
    "difficulty": 3,
    "category": "React",
    "topic": "Hooks",
    "timeStarted": "2025-12-15T10:05:23Z"
  }`

**2.8 Frontend Displays Question**

- **Actor:** Frontend
- **UI Components:**
    - **Progress Bar:** "Question 5 of 30" (17% complete)
    - **Timer:** Countdown display (35:12 remaining)
    - **Question Card:**
        - Category badge (e.g., "React - Hooks")
        - Difficulty indicator (3 out of 5 stars)
        - Question text (clear typography)
        - Radio button options (A, B, C, D)
        - "Submit Answer" button (disabled until option selected)
    - **Per-Question Timer:** Track time spent on this question (displayed subtly)

**2.9 User Reads Question and Selects Answer**

- **Actor:** User
- **Action:** Click radio button for chosen option
- **Frontend:** Enable "Submit Answer" button, highlight selected option

**2.10 User Clicks "Submit Answer"**

- **Actor:** User
- **Frontend Validation:** Ensure an option is selected
- **Decision Point:**
    - **No Option Selected:** Display inline error: "Please select an answer". **Return to 2.9.**
    - **Option Selected:** Proceed to 2.11.

**2.11 Frontend Sends Answer Submission**

- **Actor:** Frontend → Backend API
- **Action:**

```
  POST /api/assessments/{assessmentId}/answer
  {
    "questionId": "<guid>",
    "selectedOption": "A",
    "timeSpent": 23 // seconds
  }
```

**2.12 Backend Validates Request Payload**

- **Actor:** Backend API
- **Validation:**
    - Assessment exists and belongs to user
    - Question ID matches expected next question
    - Selected option is valid (A, B, C, or D)
- **Decision Point:**
    - **Invalid Payload:** Return `400 Bad Request` with error details. Frontend displays error. **Workflow terminates this answer attempt.**
    - **Valid Payload:** Proceed to 2.13.

**2.13 Backend Retrieves Correct Answer**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT CorrectOption, Points, Category, Topic
  FROM Questions
  WHERE Id = @QuestionId`

**2.14 Backend Evaluates Answer Correctness**

- **Actor:** Backend API
- **Logic:**

```
  isCorrect = (selectedOption == correctOption)

```

**2.15 Backend Updates Assessment State**

- **Actor:** Backend API
- **Conditional Logic Based on Correctness:**
    
    **If Answer is CORRECT:**
    

```
  // Increase overall score (weighted by difficulty)
  overallScore += question.Points

  // Increase difficulty (cap at 5)
  currentDifficulty = min(currentDifficulty + 1, 5)

  // Update category score
  categoryScores[category] += question.Points

```

**If Answer is INCORRECT:**

```
  // Do not increase overall score

  // Decrease difficulty (floor at 1)
  currentDifficulty = max(currentDifficulty - 1, 1)

  // Mark category as weak
  categoryWeaknesses[category] = true

```

**Common Updates:**

```
  questionsAnswered += 1
```

**2.16 Backend Stores Answer Record**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO AssessmentAnswers (
      Id, AssessmentId, QuestionId, SelectedOption,
      IsCorrect, TimeSpent, Category, Topic, CreatedAt
  )
  VALUES (
      NEWID(), @AssessmentId, @QuestionId, @SelectedOption,
      @IsCorrect, @TimeSpent, @Category, @Topic, GETUTCDATE()
  )`

**2.17 Backend Updates Assessment State in Cache/Session**

- **Actor:** Backend API → Redis
- **Action:** Persist updated state (score, difficulty, answered count, category scores)

**2.18 Backend Returns Answer Response**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK`

json

  `{
    "isCorrect": true,
    "correctOption": "A",
    "explanation": "useEffect with async/await is the recommended pattern for handling async operations in React functional components.",
    "nextDifficulty": 4,
    "questionsRemaining": 25,
    "currentScore": 45 // out of potential max
  }`

- **Note:** Explanation shown after submission to provide educational value

**2.19 Frontend Displays Answer Feedback**

- **Actor:** Frontend
- **UI Update:**
    - **Correct Answer:** Green checkmark, brief success animation
    - **Incorrect Answer:** Red X, show correct answer highlighted
    - **Explanation Panel:** Display educational explanation (2-3 sentences)
    - **Progress Update:** Increment question counter (5/30 → 6/30)
    - **Auto-Advance:** After 3 seconds, automatically load next question

**2.20 Check Loop Termination Condition**

- **Actor:** Frontend/Backend
- **Decision Point:**
    - **questionsAnswered < 30 AND timer active:** **Repeat from 2.3** (request next question)
    - **questionsAnswered == 30 OR timer expired:** **Proceed to Phase 3** (final scoring)

---

**Phase 3: Final Scoring and Analysis**

**3.1 Backend Calculates Final Scores**

- **Actor:** Backend API
- **Action:** Retrieve all assessment answers and compute comprehensive scoring

**3.2 Backend Computes Overall Score**

- **Actor:** Backend API
- **Formula:**

```
  // Sum weighted points from correct answers
  totalPointsEarned = SUM(points WHERE isCorrect = true)

  // Calculate maximum possible points
  maxPossiblePoints = SUM(all_question_points)

  // Overall percentage
  overallScore = (totalPointsEarned / maxPossiblePoints) * 100

```

**3.3 Backend Calculates Per-Category Scores**

- **Actor:** Backend API
- **Logic:** For each of 20+ skill categories (React Hooks, Security, Algorithms, etc.):

```
  categoryScore[category] = (
      SUM(points WHERE isCorrect = true AND category = X) /
      SUM(all_points WHERE category = X)
  ) * 100
```

- **Result:** Detailed breakdown like:

json

  `{
    "ReactHooks": 85,
    "StateManagement": 70,
    "SecurityPractices": 55,
    "RESTAPIs": 80,
    "DatabaseDesign": 65,
    ...
  }`

**3.4 Backend Determines Skill Level**

- **Actor:** Backend API
- **Mapping Logic:**

```
  if (overallScore >= 80) {
      skillLevel = "Advanced"
  } else if (overallScore >= 60) {
      skillLevel = "Intermediate"
  } else {
      skillLevel = "Beginner"
  }
```

**3.5 Backend Analyzes Performance by Category**

- **Actor:** Backend API
- **Analysis:**
    - **Identify Top 3 Strengths:** Categories with scores ≥ 80%
    - **Identify Top 3-5 Weaknesses:** Categories with scores < 60%
    - **Example Output:**

json

    `{
      "strengths": [
        {"category": "ReactHooks", "score": 85},
        {"category": "RESTAPIs", "score": 80},
        {"category": "ComponentDesign", "score": 83}
      ],
      "weaknesses": [
        {"category": "SecurityPractices", "score": 55},
        {"category": "DatabaseDesign", "score": 65},
        {"category": "Testing", "score": 50}
      ]
    }`

**3.6 Backend Updates Assessment Record**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Assessments
  SET 
      Status = 'Completed',
      OverallScore = @OverallScore,
      SkillLevel = @SkillLevel,
      CategoryScoresJSON = @CategoryScoresJSON,
      CompletedAt = GETUTCDATE(),
      Duration = DATEDIFF(second, StartedAt, GETUTCDATE())
  WHERE Id = @AssessmentId`

**Phase 4: Personalized Learning Path Generation**

**4.1 Backend Initiates Path Generation**

- **Actor:** Backend API - Learning Path Service
- **Input:** Assessment results (skill level, weak categories, track type)

**4.2 Backend Selects Path Template**

- **Actor:** Learning Path Service
- **Logic:** Based on selected track and skill level:

```
  if (trackType == "FullStack" AND skillLevel == "Intermediate") {
      templateId = "FullStack_Intermediate_Template"
  }
```

- **Templates Define:**
    - Core curriculum tasks
    - Recommended task sequence
    - Prerequisite dependencies
    - Difficulty progression

**4.3 Backend Prioritizes Weak Categories**

- **Actor:** Learning Path Service
- **Logic:**
    - Extract weak categories from assessment (score < 60%)
    - Sort by severity (lowest scores first)
    - These categories receive additional focused tasks

**4.4 Backend Queries Task Database**

- **Actor:** Learning Path Service → SQL Server
- **Query:**

sql

  `SELECT 
      T.Id, T.Title, T.Category, T.Difficulty,
      T.EstimatedTime, T.Prerequisites, T.ImpactScore
  FROM Tasks T
  WHERE T.TrackType = @TrackType
    AND T.IsActive = 1
    AND (
        -- Include tasks addressing weak categories
        T.Category IN @WeakCategories
        OR
        -- Include core curriculum tasks
        T.Id IN (SELECT TaskId FROM TrackTemplates WHERE TemplateId = @TemplateId)
    )
  ORDER BY 
      -- Prioritize tasks addressing weaknesses
      CASE WHEN T.Category IN @WeakCategories THEN 0 ELSE 1 END,
      -- Then by impact score
      T.ImpactScore DESC`

**4.5 Backend Applies Learning Path Algorithm**

- **Actor:** Learning Path Service
- **Algorithm Steps:Step 1: Initialize PathStep 2: Add Foundation TasksStep 3: Address Weak CategoriesStep 4: Fill Core CurriculumStep 5: Respect PrerequisitesStep 6: Balance Difficulty ProgressionStep 7: Optimize Sequence**
    - Start with empty ordered task list
    - Set target: 15-20 tasks
    - Include prerequisite tasks from template
    - Ensure learner has baseline knowledge
    - For each weak category:
        - Select 2-3 tasks that develop that skill
        - Ensure tasks match skill level (Beginner/Intermediate/Advanced)
        - Respect prerequisite dependencies
    - Add remaining template tasks up to 15-20 total
    - Balance across all track categories
    - Topological sort to ensure prerequisites come before dependent tasks
    - Example: "React Basics" must precede "React Hooks"
    - Avoid steep difficulty jumps
    - Gradual increase: Easy → Medium → Hard
    - Final ordering by:
        1. Prerequisites (mandatory)
        2. Skill impact (high-impact tasks prioritized)
        3. Difficulty progression (gradual)
        4. Estimated time (balance short and long tasks)

**4.6 Backend Creates Learning Path Record**

- **Actor:** Learning Path Service → SQL Server
- **Action:**

sql

  `INSERT INTO LearningPaths (
      Id, UserId, TrackType, SkillLevel, 
      TotalTasks, CreatedAt, IsActive
  )
  VALUES (
      NEWID(), @UserId, @TrackType, @SkillLevel,
      @TotalTasks, GETUTCDATE(), 1
  )`

- **Capture:** `learningPathId`

**4.7 Backend Inserts Path Tasks**

- **Actor:** Learning Path Service → SQL Server
- **Action:** For each task in ordered sequence:

sql

  `INSERT INTO PathTasks (
      Id, PathId, TaskId, OrderIndex, Status, Source
  )
  VALUES (
      NEWID(), @PathId, @TaskId, @OrderIndex, 'NotStarted', 'Assessment'
  )`

- **OrderIndex:** Sequential (1, 2, 3, ..., 20)
- **Status:** 'NotStarted' for all initially
- **Source:** 'Assessment' (indicates path generated from assessment results)

---

**Phase 5: Task Recommendations Generation**

**5.1 Backend Generates Top 5 Immediate Recommendations**

- **Actor:** Learning Path Service
- **Purpose:** Highlight 5 tasks learner should start with immediately
- **Criteria:**
    - Address identified weaknesses
    - Match current skill level
    - High impact on learning progression
    - Diverse topic coverage
    - Not overly time-consuming (< 4 hours each)

**5.2 Backend Queries Recommended Tasks**

- **Actor:** Learning Path Service → SQL Server
- **Query:**

sql

  `SELECT TOP 5
      T.Id, T.Title, T.Description, T.Category,
      T.Difficulty, T.EstimatedTime, T.ImpactScore
  FROM Tasks T
  INNER JOIN PathTasks PT ON T.Id = PT.TaskId
  WHERE PT.PathId = @PathId
    AND T.Category IN @WeakCategories
    AND T.Difficulty <= @SkillLevelDifficulty
  ORDER BY 
      T.ImpactScore DESC,
      T.EstimatedTime ASC -- Prefer shorter tasks initially`

**5.3 Backend Creates Recommendation Records**

- **Actor:** Learning Path Service → SQL Server
- **Action:** For each recommended task:

sql

  `INSERT INTO Recommendations (
      Id, UserId, AssessmentId, TaskId,
      Reason, Priority, CreatedAt
  )
  VALUES (
      NEWID(), @UserId, @AssessmentId, @TaskId,
      @Reason, @Priority, GETUTCDATE()
  )`

- **Reason Examples:**
    - "Addresses weakness in Security Practices (55% score)"
    - "Builds foundation for advanced React concepts"
    - "High-impact task for Full Stack developers"

### **Phase 6: Results Presentation**

**6.1 Backend Constructs Comprehensive Results Response**

- **Actor:** Backend API
- **Response Payload:**

json

  `{
    "assessmentId": "<guid>",
    "completedAt": "2025-12-15T10:38:45Z",
    "duration": 2325, // seconds (38m 45s)
    "overallScore": 74,
    "skillLevel": "Intermediate",
    "grade": "B",
    "categoryScores": {
      "ReactHooks": 85,
      "StateManagement": 70,
      "SecurityPractices": 55,
      ...
    },
    "strengths": [
      {"category": "ReactHooks", "score": 85, "message": "Strong understanding of React Hooks patterns"},
      {"category": "RESTAPIs", "score": 80, "message": "Solid API design and implementation skills"}
    ],
    "weaknesses": [
      {"category": "SecurityPractices", "score": 55, "message": "Needs improvement in authentication and data protection"},
      {"category": "Testing", "score": 50, "message": "Limited experience with unit and integration testing"}
    ],
    "learningPath": {
      "pathId": "<guid>",
      "trackType": "FullStack",
      "skillLevel": "Intermediate",
      "totalTasks": 18,
      "estimatedCompletionTime": "6-8 weeks",
      "firstTask": {
        "taskId": "<guid>",
        "title": "Implement JWT Authentication",
        "category": "Security",
        "estimatedTime": 3
      }
    },
    "recommendations": [
      {
        "taskId": "<guid>",
        "title": "Implement JWT Authentication",
        "reason": "Addresses weakness in Security Practices",
        "priority": "high",
        "estimatedTime": 3
      },
      // ... top 5 recommendations
    ]
  }`

**6.2 Backend Returns Results**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK` with comprehensive results payload

**6.3 Frontend Renders Results Dashboard**

- **Actor:** Frontend
- **UI Components:Header Section:Score Breakdown Section:Strengths & Weaknesses Cards:Learning Path Preview:Recommendations Section:**
    - Congratulatory message: "Assessment Complete!"
    - Overall score (large, prominent): **74%**
    - Skill level badge: **Intermediate**
    - Grade indicator: **B**
    - **Radar Chart:** Visualize category scores across all 20+ dimensions
    - **Progress Bars:** Individual bars for each category with color coding:
        - Green (≥80%): Strengths
        - Yellow (60-79%): Adequate
        - Red (<60%): Needs improvement
    - **Strengths Card:** List top 3 with checkmarks and positive messaging
    - **Weaknesses Card:** List top 3-5 with constructive guidance
    - **Path Summary:**
        - Track type and skill level
        - Total tasks: 18
        - Estimated completion: 6-8 weeks
    - **First 5 Tasks Preview:** Numbered list with:
        - Task title
        - Category badge
        - Estimated time
        - "Start" button on first task
    - **Action Button:** "View Full Learning Path"
    - **Title:** "Recommended Tasks to Start With"
    - **Cards:** Display top 5 recommendations with:
        - Task title and description
        - Reason for recommendation
        - Priority indicator (High/Medium)
        - Estimated time
        - "Add to Path" or "Start Now" button

**6.4 Frontend Displays "Your Learning Path is Ready" Message**

- **Actor:** Frontend
- **Message:** "Based on your assessment, we've created a personalized learning path with 18 tasks to help you become a proficient Full Stack Developer."
- **CTA Button:** "Start Learning" (navigates to first task)

---

**Phase 7: User Reviews Path and Begins Learning**

**7.1 User Reviews Personalized Path**

- **Actor:** User
- **Actions:**
    - Explore radar chart (hover for category details)
    - Read strengths and weaknesses
    - Review recommended tasks
    - Preview learning path task list

**7.2 User Clicks "Start Learning" or "View Full Learning Path"**

- **Actor:** User
- **Decision Point:**
    - **"Start Learning":** Navigate directly to first task → `/tasks/{firstTaskId}`
    - **"View Full Learning Path":** Navigate to path overview → `/dashboard/learning-path`

**7.3 Frontend Navigates to Next Screen**

- **Actor:** Frontend
- **Action:** Route user to selected destination

**7.4 System Updates User Profile**

- **Actor:** Backend API (Background) → SQL Server
- **Action:**

sql

  `UPDATE Users
  SET 
      SkillLevel = @SkillLevel,
      HasCompletedAssessment = 1,
      AssessmentCompletedAt = GETUTCDATE()
  WHERE Id = @UserId`

**7.5 System Creates Initial Skill Profile**

- **Actor:** Backend API → SQL Server
- **Action:** For each category evaluated:

sql

  `INSERT INTO UserSkills (
      Id, UserId, SkillCategory, Score, Level, LastUpdated
  )
  VALUES (
      NEWID(), @UserId, @Category, @CategoryScore, @SkillLevel, GETUTCDATE()
  )`

- **Purpose:** Baseline for tracking skill progression over time

---

**→ Workflow Complete**

**Note:** User now enters main learning loop (covered in other activity diagrams):

- Browse and start tasks
- Submit code for review
- Receive feedback
- Update learning path based on performance

---

### Decision Points Summary

| Decision Node | Condition | Path A (Yes/Success) | Path B (No/Failure) |
| --- | --- | --- | --- |
| JWT Valid? | Token verification | → Continue | → 401, redirect login |
| Active Assessment? | In-progress session | → Offer resume | → Check cooldown |
| Cooldown Elapsed? | Last attempt > 30 days | → Create new assessment | → 429, show retry date |
| DB Insert Success? | Assessment record created | → Initialize state | → 500 error |
| Option Selected? | User chose answer | → Submit | → Show validation error |
| Payload Valid? | Request validation | → Evaluate answer | → 400 Bad Request |
| Answer Correct? | Match with correct option | → Increase difficulty & score | → Decrease difficulty |
| Questions Remaining |  |  |  |
| Timer Expired? | Countdown reaches 00:00 | → Auto-finalize | → Continue |

---

### Parallel Activities (Fork/Join)

**Fork Point:** Step 2.2 (User starts assessment)

**Branch A (Main Flow):**

- Question presentation loop
- Answer submission and evaluation
- State updates
- Progress tracking

**Branch B (Timer Monitoring):**

- Countdown timer (40 minutes)
- Visual warnings (5 min, 2 min)
- Auto-submit when timer expires

**Join Point:** Phase 3 (Final Scoring)

- Triggered by: 30 questions completed OR timer expiration
- Both branches must complete or be terminated before final scoring begins

**Rationale:** Timer runs independently to enforce time limits without blocking question flow

---

### Performance Characteristics

**Target Response Times:**

- **Assessment Start:** < 500ms
- **Next Question Retrieval:** < 200ms (Redis-cached state)
- **Answer Submission:** < 300ms
- **Final Scoring & Path Generation:** < 3 seconds (complex computation)

**Scalability:**

- Assessment state stored in Redis for fast access
- Question selection optimized with indexed queries
- Path generation algorithm: O(n log n) complexity
- Concurrent assessments: Stateless API supports 100+ simultaneous users

---

### Data Persistence

**Assessments Table:**

sql

`CREATE TABLE Assessments (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    TrackType VARCHAR(50) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'InProgress', -- 'InProgress', 'Completed', 'Abandoned'
    OverallScore DECIMAL(5,2),
    SkillLevel VARCHAR(20), -- 'Beginner', 'Intermediate', 'Advanced'
    CategoryScoresJSON NVARCHAR(MAX), -- JSON with category breakdown
    StartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2,
    Duration INT, -- seconds
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_Assessments_User ON Assessments(UserId, CompletedAt DESC);`

**AssessmentAnswers Table:**

sql

`CREATE TABLE AssessmentAnswers (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    AssessmentId UNIQUEIDENTIFIER NOT NULL,
    QuestionId UNIQUEIDENTIFIER NOT NULL,
    SelectedOption CHAR(1) NOT NULL CHECK (SelectedOption IN ('A', 'B', 'C', 'D')),
    IsCorrect BIT NOT NULL,
    TimeSpent INT, -- seconds on this question
    Category VARCHAR(50),
    Topic VARCHAR(100),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (AssessmentId) REFERENCES Assessments(Id),
    FOREIGN KEY (QuestionId) REFERENCES Questions(Id)
);

CREATE INDEX IX_AssessmentAnswers_Assessment ON AssessmentAnswers(AssessmentId);`

**Questions Table:**

sql

`CREATE TABLE Questions (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    TrackType VARCHAR(50) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    Topic VARCHAR(100),
    Difficulty INT NOT NULL CHECK (Difficulty BETWEEN 1 AND 5),
    QuestionText NVARCHAR(1000) NOT NULL,
    OptionsJSON NVARCHAR(MAX) NOT NULL, -- JSON array of 4 options
    CorrectOption CHAR(1) NOT NULL CHECK (CorrectOption IN ('A', 'B', 'C', 'D')),
    Explanation NVARCHAR(1000),
    Points INT NOT NULL, -- Weighted by difficulty
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Questions_TrackDifficulty ON Questions(TrackType, Difficulty, IsActive);
CREATE INDEX IX_Questions_Category ON Questions(Category);`

**UserSkills Table:**

sql

`CREATE TABLE UserSkills (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SkillCategory VARCHAR(50) NOT NULL,
    Score DECIMAL(5,2) NOT NULL, -- 0-100
    Level VARCHAR(20), -- 'Beginner', 'Intermediate', 'Advanced'
    LastUpdated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    UNIQUE (UserId, SkillCategory)
);

CREATE INDEX IX_UserSkills_User ON UserSkills(UserId);`

---

## Alignment with Requirements

**Functional Requirements:**

- ✅ **FR-ASSESS-01:** Assessment start with track selection
- ✅ **FR-ASSESS-02:** Question bank management
- ✅ **FR-ASSESS-03:** Adaptive difficulty algorithm
- ✅ **FR-ASSESS-04:** Timer and auto-submit
- ✅ **FR-ASSESS-05:** Score calculation and skill level determination
- ✅ **FR-PATH-01:** Personalized learning path generation
- ✅ **FR-ASSESS-07:** Results visualization dashboard

**Non-Functional Requirements:**

- ✅ **NFR-PERF-01:** API response times < 500ms
- ✅ **NFR-UX-03:** Intuitive navigation with progress indicators
- ✅ **NFR-UX-04:** Progressive disclosure in results
- ✅ **NFR-MAIN-07:** Comprehensive logging of assessment events

---

### Notes for Implementation

1. **Question Bank Curation:**
    - Minimum 200 questions per track
    - Balanced distribution across difficulties (1-5)
    - Cover all 20+ skill categories
    - Regular content review and updates
2. **Adaptive Algorithm Tuning:**
    - Test with real user data
    - Adjust difficulty step size (currently ±1)
    - Consider more sophisticated models (IRT, Bayesian)
3. **Timer UX:**
    - Persist timer state across page refreshes
    - Warn users before auto-submit (modal at 1 minute)
    - Allow brief grace period (10 seconds) for network delays
4. **Path Generation Performance:**
    - Cache track templates for fast retrieval
    - Pre-compute prerequisite dependency graphs
    - Consider async path generation if > 3 seconds
5. **Testing Strategy:**
    - Unit tests for adaptive algorithm
    - Integration tests for full assessment flow
    - Load tests for concurrent assessments
    - A/B testing of path generation algorithms

### **4.4.4 Code Submission — Ingestion & Queueing Activity**

### Overview

This activity diagram models the complete workflow for code submission from the moment a learner initiates a submission until the code is successfully queued for analysis. The process encompasses two primary submission methods: **GitHub repository linking** and **direct file upload (ZIP)**. The workflow includes validation, metadata capture, repository fetching, file storage, and reliable job queueing for subsequent analysis.

**Scope:**

- User-initiated code submission via either GitHub or file upload
- Input validation and format verification
- GitHub repository cloning and content extraction
- File upload processing and storage in Azure Blob Storage
- Submission metadata persistence in SQL Server
- Message enqueueing to Azure Service Bus for asynchronous processing
- Error handling for validation failures, GitHub API errors, storage issues, and queue failures

**Actors/Systems Involved:**

- **User (Learner):** Initiates code submission
- **Frontend (React):** Provides submission UI and client-side validation
- **Backend API (ASP.NET Core):** Orchestrates submission workflow, validates requests, persists metadata
- **GitHub API:** External service for OAuth token validation and repository content retrieval
- **Azure Blob Storage:** Persistent storage for uploaded code files and cloned repositories
- **SQL Server:** Stores submission records and metadata
- **Azure Service Bus:** Message queue for reliable, asynchronous job processing
- **Background Worker (.NET Worker Service):** Consumes queue messages (not active in this diagram; represented as external system boundary)

**Key Design Decisions:**

- **Asynchronous Processing:** Submission ingestion is separated from analysis to ensure responsive API performance and fault tolerance.
- **Dual Submission Modes:** Support both GitHub integration (developer-friendly) and direct upload (accessibility for users without GitHub or preferring local development).
- **Validation Layers:** Client-side validation for immediate feedback; server-side validation for security and data integrity.
- **Idempotency:** Prevent duplicate submissions for the same task and repository/file combination within a configurable time window.
- **Graceful Degradation:** Comprehensive error handling with specific error codes and user-facing messages.
- **Reliable Queueing:** Azure Service Bus ensures message durability and retry logic in case of transient failures.

---

### Activity Flow Description

**Phase 1: Submission Initiation**

**1.1 User Navigates to Task Submission Page**

- **Actor:** User
- **Description:** The learner navigates to a specific task detail page and clicks the "Submit Code" button.

**1.2 Frontend Displays Submission Modal**

- **Actor:** Frontend
- **Description:** A modal dialog appears presenting two submission options:
    - **Option A:** Link GitHub Repository
    - **Option B:** Upload ZIP File

**1.3 User Selects Submission Method**

- **Actor:** User
- **Decision Point:** The user chooses between GitHub or File Upload.
    - If **GitHub Repository** → Proceed to Phase 2A
    - If **File Upload** → Proceed to Phase 2B

**Phase 2A: GitHub Repository Submission Workflow**

**2A.1 User Provides GitHub Repository URL**

- **Actor:** User
- **Description:** The user enters the full GitHub repository URL (e.g., `https://github.com/username/repo-name`) in the input field.

**2A.2 Frontend Validates URL Format**

- **Actor:** Frontend
- **Validation:** Client-side regex validation ensures the URL matches GitHub's URL pattern.
- **Decision Point:**
    - **Invalid Format:** Display inline error message ("Invalid GitHub URL format"). Return to step 2A.1.
    - **Valid Format:** Proceed to 2A.3.

**2A.3 Frontend Sends Submission Request**

- **Actor:** Frontend
- **Action:** `POST /api/submissions`
- **Payload:**

json

  `{
    "taskId": "<task_guid>",
    "submissionType": "GitHub",
    "repositoryUrl": "https://github.com/username/repo",
    "branch": "main" // optional, defaults to main
  }`

**2A.4 Backend Validates JWT Token**

- **Actor:** Backend API
- **Validation:** Extract and verify JWT token from Authorization header.
- **Decision Point:**
    - **Invalid/Expired Token:** Return `401 Unauthorized`. Frontend redirects to login. **Workflow terminates.**
    - **Valid Token:** Extract `userId` from claims and proceed to 2A.5.

**2A.5 Backend Validates Request Payload**

- **Actor:** Backend API
- **Validation:**
    - `taskId` exists in database and is active
    - `repositoryUrl` is well-formed and accessible
    - User has not exceeded submission rate limits (e.g., 10 submissions per hour)
- **Decision Point:**
    - **Validation Fails:** Return `400 Bad Request` with detailed error messages. Frontend displays errors. **Workflow terminates.**
    - **Validation Succeeds:** Proceed to 2A.6.

**2A.6 Backend Checks for Duplicate Submission**

- **Actor:** Backend API
- **Query:** Check `Submissions` table for existing record matching:
    - `UserId = current_user`
    - `TaskId = provided_task_id`
    - `RepositoryUrl = provided_url`
    - `Status IN ('Pending', 'Processing')`
    - `CreatedAt > NOW() - 15 minutes`
- **Decision Point:**
    - **Duplicate Found:** Return `409 Conflict` ("You have already submitted this repository for this task recently"). **Workflow terminates.**
    - **No Duplicate:** Proceed to 2A.7.

**2A.7 Backend Verifies GitHub OAuth Token**

- **Actor:** Backend API
- **Action:** Retrieve user's stored GitHub OAuth token from database (encrypted).
- **Decision Point:**
    - **Token Missing/Expired:** Return `403 Forbidden` ("Please reconnect your GitHub account"). **Workflow terminates.**
    - **Token Valid:** Proceed to 2A.8.

**2A.8 Backend Requests Repository Metadata from GitHub API**

- **Actor:** Backend API → GitHub API
- **Action:** `GET https://api.github.com/repos/{owner}/{repo}`
- **Headers:** `Authorization: token <user_oauth_token>`
- **Decision Point:**
    - **Repository Not Found (404):** Return `404 Not Found` ("Repository does not exist or is private"). **Workflow terminates.**
    - **Access Denied (403):** Return `403 Forbidden` ("You do not have access to this repository"). **Workflow terminates.**
    - **Rate Limit Exceeded (429):** Return `429 Too Many Requests` ("GitHub rate limit exceeded, try again later"). **Workflow terminates.**
    - **Success (200):** Receive repository metadata (size, default branch, last updated). Proceed to 2A.9.

**2A.9 Backend Validates Repository Size**

- **Actor:** Backend API
- **Validation:** Check if repository size < 50 MB (configurable limit).
- **Decision Point:**
    - **Size Exceeds Limit:** Return `413 Payload Too Large` ("Repository is too large. Maximum 50 MB."). **Workflow terminates.**
    - **Size Acceptable:** Proceed to 2A.10.

**2A.10 Backend Creates Submission Record**

- **Actor:** Backend API
- **Action:** Insert new record into `Submissions` table:

sql

  `INSERT INTO Submissions (Id, UserId, TaskId, SubmissionType, RepositoryUrl, Branch, Status, CreatedAt)
  VALUES (NEWID(), @UserId, @TaskId, 'GitHub', @RepoUrl, @Branch, 'Pending', GETUTCDATE())`

- **Decision Point:**
    - **Database Insert Fails:** Return `500 Internal Server Error`. **Workflow terminates.**
    - **Insert Succeeds:** Capture `submissionId`. Proceed to 2A.11.

**2A.11 Backend Enqueues Submission Job**

- **Actor:** Backend API → Azure Service Bus
- **Action:** Send message to `code-ingestion-queue`:

json

  `{
    "submissionId": "<guid>",
    "userId": "<guid>",
    "taskId": "<guid>",
    "submissionType": "GitHub",
    "repositoryUrl": "https://github.com/username/repo",
    "branch": "main",
    "timestamp": "2025-12-14T12:00:00Z"
  }`

- **Properties:** Set message TTL = 24 hours, delivery count = 3 retries
- **Decision Point:**
    - **Queue Unavailable:** Log error, mark submission as `Failed`, return `503 Service Unavailable`. **Workflow terminates.**
    - **Message Enqueued Successfully:** Proceed to 2A.12.

**2A.12 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `202 Accepted`

json

  `{
    "submissionId": "<guid>",
    "status": "Pending",
    "message": "Your code submission has been received and is being processed.",
    "estimatedProcessingTime": "3-5 minutes"
  }`

**2A.13 Frontend Displays Success Notification**

- **Actor:** Frontend
- **Action:** Display success toast notification and redirect to submission status page.

**→ Workflow proceeds to Background Processing (handled in Activity Diagram 4.4.5)**

---

### **Phase 2B: File Upload (ZIP) Submission Workflow**

**2B.1 User Selects ZIP File**

- **Actor:** User
- **Description:** User clicks "Upload ZIP" and selects a compressed archive from their local filesystem.

**2B.2 Frontend Validates File**

- **Actor:** Frontend
- **Validation:**
    - File extension is `.zip`
    - File size < 50 MB
    - File is not empty
- **Decision Point:**
    - **Validation Fails:** Display inline error ("Invalid file type or size exceeds 50 MB"). Return to 2B.1.
    - **Validation Succeeds:** Proceed to 2B.3.

**2B.3 Frontend Uploads File**

- **Actor:** Frontend
- **Action:** `POST /api/submissions/upload` (multipart/form-data)
- **Payload:**

```
  taskId: <guid>
  submissionType: Upload
  file: <binary_zip_data>
```

**2B.4 Backend Validates JWT Token**

- **Actor:** Backend API
- **Validation:** Same as 2A.4.
- **Decision Point:**
    - **Invalid Token:** Return `401 Unauthorized`. **Workflow terminates.**
    - **Valid Token:** Proceed to 2B.5.

**2B.5 Backend Validates Request Payload**

- **Actor:** Backend API
- **Validation:**
    - `taskId` exists and is active
    - File size < 50 MB
    - MIME type is `application/zip` or `application/x-zip-compressed`
    - User has not exceeded rate limits
- **Decision Point:**
    - **Validation Fails:** Return `400 Bad Request`. **Workflow terminates.**
    - **Validation Succeeds:** Proceed to 2B.6.

**2B.6 Backend Scans File for Malware**

- **Actor:** Backend API
- **Action:** Perform basic security scan (file signature validation, entropy analysis, or integration with ClamAV if available).
- **Decision Point:**
    - **Suspicious File Detected:** Return `400 Bad Request` ("File failed security scan"). **Workflow terminates.**
    - **File Clean:** Proceed to 2B.7.

**2B.7 Backend Checks for Duplicate Submission**

- **Actor:** Backend API
- **Query:** Check for recent identical file upload (based on file hash if computed, or recent uploads by same user for same task).
- **Decision Point:**
    - **Duplicate Found:** Return `409 Conflict`. **Workflow terminates.**
    - **No Duplicate:** Proceed to 2B.8.

**2B.8 Backend Uploads File to Azure Blob Storage**

- **Actor:** Backend API → Azure Blob Storage
- **Action:** Upload ZIP file to container `submissions/{userId}/{submissionId}/code.zip`
- **Decision Point:**
    - **Upload Fails:** Return `500 Internal Server Error` ("Failed to store file"). **Workflow terminates.**
    - **Upload Succeeds:** Capture blob URL. Proceed to 2B.9.

**2B.9 Backend Creates Submission Record**

- **Actor:** Backend API
- **Action:** Insert record into `Submissions` table:

sql

  `INSERT INTO Submissions (Id, UserId, TaskId, SubmissionType, BlobUrl, Status, CreatedAt)
  VALUES (NEWID(), @UserId, @TaskId, 'Upload', @BlobUrl, 'Pending', GETUTCDATE())`

- **Decision Point:**
    - **Database Insert Fails:** Delete uploaded blob, return `500 Internal Server Error`. **Workflow terminates.**
    - **Insert Succeeds:** Proceed to 2B.10.

**2B.10 Backend Enqueues Submission Job**

- **Actor:** Backend API → Azure Service Bus
- **Action:** Send message to `code-ingestion-queue`:

json

  `{
    "submissionId": "<guid>",
    "userId": "<guid>",
    "taskId": "<guid>",
    "submissionType": "Upload",
    "blobUrl": "https://storage.blob.core.windows.net/submissions/...",
    "timestamp": "2025-12-14T12:00:00Z"
  }`

- **Decision Point:**
    - **Queue Unavailable:** Mark submission as `Failed`, return `503 Service Unavailable`. **Workflow terminates.**
    - **Message Enqueued Successfully:** Proceed to 2B.11.

**2B.11 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `202 Accepted` (same structure as 2A.12)

**2B.12 Frontend Displays Success Notification**

- **Actor:** Frontend
- **Action:** Display success notification and navigate to submission tracking page.

**→ Workflow proceeds to Background Processing (Activity Diagram 4.4.5)**

---

### Decision Points Summary

| Decision Node | Condition | Path A (Yes/Success) | Path B (No/Failure) |
| --- | --- | --- | --- |
| Submission Method | GitHub or Upload? | → GitHub Flow (2A) | → Upload Flow (2B) |
| URL Format Valid? | Regex match | → Continue | → Show error, retry |
| JWT Valid? | Token verification | → Continue | → 401, redirect login |
| Request Valid? | Schema validation | → Continue | → 400 Bad Request |
| Duplicate Submission? | DB query | → 409 Conflict | → Continue |
| GitHub Token Valid? | Token exists & not expired | → Continue | → 403 Forbidden |
| Repository Accessible? | GitHub API 200 | → Continue | → 404/403 error |
| Repository Size OK? | Size < 50 MB | → Continue | → 413 Too Large |
| File Valid? | Extension, size, MIME | → Continue | → 400 Bad Request |
| File Scan Clean? | Security validation | → Continue | → 400 Rejected |
| Blob Upload Success? | Azure API response | → Continue | → 500 Error |
| DB Insert Success? | SQL execution | → Continue | → 500 Error, rollback |
| Queue Message Sent? | Service Bus ACK | → 202 Accepted | → 503 Unavailable |

---

### Parallel Activities (Fork/Join)

This diagram does **not** include parallel processing within the ingestion phase. All operations are sequential to ensure:

- Proper validation order (authentication → authorization → business logic)
- Transactional consistency (DB insert before queue message)
- Error handling atomicity (rollback storage on DB failure)

**Parallel processing begins** in Activity Diagram 4.4.5 where static analysis and AI analysis may run concurrently.

---

### Error Handling Strategy

All error responses include:

- **HTTP Status Code:** Standard REST codes (400, 401, 403, 404, 409, 413, 429, 500, 503)
- **Error Message:** User-friendly description
- **Error Code:** Internal code for logging and debugging (e.g., `GITHUB_TOKEN_EXPIRED`)
- **Timestamp:** ISO 8601 format

**Logging:**

- All errors logged to Azure Application Insights with severity levels
- GitHub API failures include rate limit headers for monitoring
- Queue failures trigger alerts to DevOps team

**User Feedback:**

- Frontend displays error messages in toast notifications or inline validation
- Actionable guidance provided (e.g., "Reconnect GitHub account" button for 403 errors)

---

### Data Persistence

**Submissions Table (SQL Server):**

sql

`CREATE TABLE Submissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    TaskId UNIQUEIDENTIFIER NOT NULL,
    SubmissionType VARCHAR(20) NOT NULL, -- 'GitHub' or 'Upload'
    RepositoryUrl NVARCHAR(500) NULL,
    Branch NVARCHAR(100) NULL,
    BlobUrl NVARCHAR(1000) NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Processing', 'Completed', 'Failed'
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (TaskId) REFERENCES Tasks(Id)
);`

**Azure Service Bus Message:**

- **Queue Name:** `code-ingestion-queue`
- **Message Properties:**
    - `ContentType`: `application/json`
    - `MessageId`: `{submissionId}`
    - `TimeToLive`: 24 hours
    - `MaxDeliveryCount`: 3

---

### Performance Considerations

**Response Time Targets (Non-Functional Requirements):**

- **GitHub URL submission:** < 500ms (p95) — API responds immediately after queueing
- **File upload submission:** < 2s (p95) — includes blob upload time

**Scalability:**

- API horizontally scalable via stateless design
- Azure Service Bus supports high-throughput message ingestion
- Blob storage auto-scales with demand

**Reliability:**

- Queue ensures no submission is lost even if backend crashes after DB insert
- Dead-letter queue captures messages that fail after 3 retries for manual investigation

---

### Alignment with Requirements

**Functional Requirements:**

- ✅ **FR-SUB-01:** Accept GitHub repository submissions
- ✅ **FR-SUB-02:** Accept file upload submissions
- ✅ **FR-SUB-03:** Capture and store metadata
- ✅ **FR-SUB-10:** Manage job queue

**Non-Functional Requirements:**

- ✅ **NFR-PERF-01:** API response time < 500ms for submission acknowledgment
- ✅ **NFR-SEC-04:** Input validation and sanitization
- ✅ **NFR-SEC-05:** Secure file handling with malware scanning
- ✅ **NFR-AVAIL-04:** Job retry logic via Azure Service Bus
- ✅ **NFR-AVAIL-06:** Queue persistence ensures no job loss

---

### Notes for Implementation

1. **GitHub OAuth Token Security:** Tokens must be encrypted at rest using Azure Key Vault or ASP.NET Data Protection API.
2. **Rate Limiting:** Implement sliding window rate limiter using Redis (FR from NFR-SEC-06).
3. **Idempotency Keys:** Consider adding client-generated idempotency keys in headers for additional duplicate prevention.
4. **Monitoring:** Track submission success/failure rates, queue depth, and GitHub API usage in Azure Monitor dashboards.
5. **Testing:** Unit tests for validation logic; integration tests for GitHub API interaction; E2E tests for full submission flow.

### **4.4.5 Submission Processing — Static + AI Analysis Activity**

### Overview

This activity diagram models the asynchronous background processing workflow that executes after a code submission has been successfully queued (as completed in Activity Diagram 4.4.4). The workflow encompasses code retrieval, parallel execution of static code analysis and AI-powered code review, result aggregation, scoring calculation, and feedback persistence.

**Scope:**

- Background Worker consumption of queued submission messages
- Code retrieval from GitHub or Azure Blob Storage
- Parallel execution of static analysis (ESLint, SonarQube, Bandit, Roslyn) and AI code review (Python FastAPI service)
- Result normalization and aggregation
- Comprehensive scoring calculation across multiple quality dimensions
- Feedback record persistence in SQL Server
- Status updates and notification triggering
- Error handling and retry logic for transient failures

**Actors/Systems Involved:**

- **Background Worker (.NET Worker Service):** Orchestrates the entire processing pipeline
- **Azure Service Bus:** Provides durable message queue with retry capabilities
- **GitHub API:** Source of code for GitHub-based submissions
- **Azure Blob Storage:** Source of code for uploaded submissions; stores extracted code temporarily
- **Docker Containers:** Isolated execution environments for static analysis tools
- **Static Analysis Tools:** ESLint (JS/TS), SonarQube (multi-language), Bandit (Python), Roslyn (.NET)
- **AI Service (Python FastAPI):** Provides deep contextual code review using LLM
- **SQL Server:** Stores analysis results, feedback records, and submission status
- **Notification Service (SendGrid):** Sends email notifications to users

**Key Design Decisions:**

- **Asynchronous Processing:** Decouples API responsiveness from compute-intensive analysis
- **Parallel Analysis Execution:** Static and AI analysis run concurrently to minimize total processing time
- **Fault Tolerance:** Dead-letter queue handling for permanent failures; retry logic for transient errors
- **Isolation:** Static analysis tools run in sandboxed Docker containers for security
- **Provider Abstraction:** AI service supports multiple LLM providers (OpenAI, Claude, Ollama) via interface pattern
- **Graceful Degradation:** If AI service fails, static analysis results are still persisted and surfaced to users
- **Idempotency:** Processing logic handles duplicate message delivery gracefully

---

### Activity Flow Description

**Phase 1: Message Consumption and Validation**

**1.1 Background Worker Polls Queue**

- **Actor:** Background Worker
- **Action:** Continuously poll Azure Service Bus queue `code-ingestion-queue` for new messages
- **Configuration:**
    - Long polling with 30-second timeout
    - PrefetchCount = 5 for batch processing optimization
    - MaxConcurrentCalls = 10 (configurable based on compute resources)

**1.2 Message Received**

- **Actor:** Azure Service Bus
- **Description:** Worker receives message containing submission metadata
- **Message Structure:**

json

  `{
    "submissionId": "<guid>",
    "userId": "<guid>",
    "taskId": "<guid>",
    "submissionType": "GitHub" | "Upload",
    "repositoryUrl": "<url>" | null,
    "branch": "main" | null,
    "blobUrl": "<url>" | null,
    "timestamp": "2025-12-14T12:00:00Z"
  }`

**1.3 Worker Validates Message Schema**

- **Actor:** Background Worker
- **Validation:**
    - All required fields present
    - Valid GUID formats
    - SubmissionType is either "GitHub" or "Upload"
    - Appropriate URL field populated based on type
- **Decision Point:**
    - **Invalid Schema:** Log error with message details, move message to dead-letter queue. **Workflow terminates.**
    - **Valid Schema:** Extract `submissionId` and proceed to 1.4.

**1.4 Worker Updates Submission Status to "Processing"**

- **Actor:** Background Worker → SQL Server
- **Action:**

sql

  `UPDATE Submissions
  SET Status = 'Processing',
      UpdatedAt = GETUTCDATE()
  WHERE Id = @SubmissionId`

- **Decision Point:**
    - **Update Fails (e.g., submission not found):** Log error, move to dead-letter queue. **Workflow terminates.**
    - **Update Succeeds:** Proceed to 1.5.

**1.5 Worker Retrieves Task Metadata**

- **Actor:** Background Worker → SQL Server
- **Query:**

sql

  `SELECT T.Id, T.Title, T.Description, T.ExpectedLanguage, T.Difficulty
  FROM Tasks T
  WHERE T.Id = @TaskId AND T.IsActive = 1`

- **Decision Point:**
    - **Task Not Found or Inactive:** Mark submission as `Failed`, move message to dead-letter queue. **Workflow terminates.**
    - **Task Retrieved:** Store task context for analysis. Proceed to Phase 2.

---

**Phase 2: Code Retrieval**

**Decision Point: Submission Type**

- **If SubmissionType = "GitHub":** Proceed to Phase 2A
- **If SubmissionType = "Upload":** Proceed to Phase 2B

---

**Phase 2A: GitHub Repository Code Retrieval**

**2A.1 Worker Retrieves User's GitHub OAuth Token**

- **Actor:** Background Worker → SQL Server
- **Query:** Fetch encrypted OAuth token from `Users` table
- **Decision Point:**
    - **Token Missing/Expired:** Mark submission as `Failed`, send notification to user. **Workflow terminates.**
    - **Token Retrieved:** Decrypt token and proceed to 2A.2.

**2A.2 Worker Clones GitHub Repository**

- **Actor:** Background Worker → GitHub API
- **Action:** Use `libgit2sharp` or GitHub API to clone repository to temporary isolated directory
    - Target: `/tmp/submissions/{submissionId}/`
    - Shallow clone (depth=1) to minimize data transfer
    - Checkout specified branch (default: `main`)
- **Decision Point:**
    - **Clone Fails (404, 403, network error):**
        - Retry up to 3 times with exponential backoff (1s, 5s, 15s)
        - If all retries fail: Mark submission as `Failed`, log error, send notification. **Workflow terminates.**
    - **Clone Succeeds:** Verify directory contents. Proceed to 2A.3.

**2A.3 Worker Validates Repository Structure**

- **Actor:** Background Worker
- **Validation:**
    - Directory is not empty
    - Contains recognizable code files (based on `ExpectedLanguage` from task)
    - Total size < 50 MB (sanity check)
- **Decision Point:**
    - **Invalid Structure:** Mark submission as `Failed` with reason "Invalid repository structure". **Workflow terminates.**
    - **Valid Structure:** Proceed to 2A.4.

**2A.4 Worker Copies Code to Blob Storage (Archival)**

- **Actor:** Background Worker → Azure Blob Storage
- **Action:**
    - Compress repository to ZIP
    - Upload to `submissions/{userId}/{submissionId}/retrieved-code.zip`
    - Purpose: Preserve exact analyzed version for auditing
- **Decision Point:**
    - **Upload Fails:** Log warning (non-critical), continue processing.
    - **Upload Succeeds:** Proceed to Phase 3.

**→ Code ready for analysis. Jump to Phase 3.**

---

**Phase 2B: Uploaded File Code Retrieval**

**2B.1 Worker Downloads ZIP from Blob Storage**

- **Actor:** Background Worker → Azure Blob Storage
- **Action:** Download file from `blobUrl` provided in message to temporary directory `/tmp/submissions/{submissionId}/code.zip`
- **Decision Point:**
    - **Download Fails (404, timeout):**
        - Retry up to 3 times
        - If all retries fail: Mark submission as `Failed`. **Workflow terminates.**
    - **Download Succeeds:** Proceed to 2B.2.

**2B.2 Worker Extracts ZIP File**

- **Actor:** Background Worker
- **Action:** Extract ZIP contents to `/tmp/submissions/{submissionId}/extracted/`
- **Security Check:** Validate no directory traversal attacks (e.g., `../` in paths)
- **Decision Point:**
    - **Extraction Fails (corrupt file, malicious content):** Mark submission as `Failed`. **Workflow terminates.**
    - **Extraction Succeeds:** Proceed to 2B.3.

**2B.3 Worker Validates Extracted Contents**

- **Actor:** Background Worker
- **Validation:**
    - Contains code files matching expected language
    - No executable binaries or suspicious files
    - Total extracted size < 50 MB
- **Decision Point:**
    - **Invalid Contents:** Mark submission as `Failed`. **Workflow terminates.**
    - **Valid Contents:** Proceed to Phase 3.

---

**Phase 3: Parallel Analysis Execution (Fork)**

**3.0 Preparation**

- **Actor:** Background Worker
- **Action:**
    - Set code directory path: `codeDir = /tmp/submissions/{submissionId}/`
    - Initialize result containers for static and AI analysis

**Fork into Two Parallel Branches:**

---

**Branch A: Static Code Analysis**

**3A.1 Worker Determines Applicable Static Tools**

- **Actor:** Background Worker
- **Logic:** Based on `ExpectedLanguage` from task metadata:
    - **JavaScript/TypeScript:** ESLint + Prettier + SonarQube
    - **Python:** Bandit + SonarQube
    - **C#/.NET:** Roslyn Analyzers + SonarQube
    - **Java:** SonarQube
    - **Multiple/Unknown:** SonarQube (multi-language support)

**3A.2 Worker Launches Docker Containers for Static Analysis**

- **Actor:** Background Worker → Docker Engine
- **Action:** For each selected tool:
    - Pull pre-configured Docker image (e.g., `static-analysis/eslint:latest`)
    - Mount code directory as read-only volume
    - Execute analysis with timeout (e.g., 3 minutes per tool)
    - Capture JSON output to `/tmp/submissions/{submissionId}/static-{tool}.json`

**Example ESLint Execution:**

bash

`docker run --rm \
  -v /tmp/submissions/{submissionId}:/code:ro \
  static-analysis/eslint:latest \
  eslint /code --format json --output-file /output/eslint.json`

**3A.3 Worker Monitors Container Execution**

- **Actor:** Background Worker
- **Monitoring:**
    - Track execution time per tool
    - Enforce resource limits (CPU: 1 core, Memory: 512 MB)
    - Kill containers exceeding timeout
- **Decision Point for Each Tool:**
    - **Execution Succeeds:** Parse JSON output. Proceed to 3A.4.
    - **Execution Fails (timeout, crash):**
        - Log error with tool name
        - Mark tool result as `unavailable`
        - Continue with other tools (partial degradation)

**3A.4 Worker Normalizes Static Analysis Results**

- **Actor:** Background Worker
- **Action:** Parse each tool's output and normalize to unified schema:

json

  `{
    "tool": "ESLint",
    "issues": [
      {
        "severity": "error" | "warning" | "info",
        "category": "code-smell" | "bug" | "security" | "style",
        "message": "Avoid using 'var'; use 'let' or 'const'",
        "file": "src/app.js",
        "line": 42,
        "column": 5,
        "rule": "no-var"
      }
    ],
    "summary": {
      "totalIssues": 15,
      "errors": 3,
      "warnings": 10,
      "info": 2
    }
  }`

**3A.5 Worker Aggregates Static Results**

- **Actor:** Background Worker
- **Action:**
    - Combine results from all tools
    - Remove duplicate issues (same file/line reported by multiple tools)
    - Categorize by severity and type
    - Calculate static analysis scores:
        - **Maintainability Score:** Based on code smells, complexity
        - **Security Score:** Based on vulnerability count and severity
        - **Style Score:** Based on formatting and naming violations

**3A.6 Worker Stores Static Analysis Record**

- **Actor:** Background Worker → SQL Server
- **Action:**

sql

  `INSERT INTO StaticAnalysis (Id, SubmissionId, ToolResults, MaintainabilityScore, 
                               SecurityScore, StyleScore, ExecutionTime, CreatedAt)
  VALUES (NEWID(), @SubmissionId, @ToolResultsJSON, @MaintScore, 
          @SecScore, @StyleScore, @ExecTime, GETUTCDATE())`

- **Decision Point:**
    - **Insert Fails:** Log error but continue (results cached in memory for aggregation).
    - **Insert Succeeds:** Static analysis complete.

**→ Wait at Join Node**

---

**Branch B: AI Code Review**

**3B.1 Worker Prepares Context for AI Service**

- **Actor:** Background Worker
- **Action:** Build comprehensive context payload:

json

  `{
    "submissionId": "<guid>",
    "taskContext": {
      "title": "Build REST API with Authentication",
      "description": "Implement JWT-based auth...",
      "expectedLanguage": "JavaScript",
      "difficulty": "Intermediate"
    },
    "codeFiles": [
      {
        "path": "src/app.js",
        "content": "<file_content>",
        "language": "javascript"
      },
      {
        "path": "src/auth.js",
        "content": "<file_content>",
        "language": "javascript"
      }
    ],
    "staticAnalysisSummary": {
      "issues": 15,
      "criticalIssues": 3,
      "topCategories": ["security", "code-smell"]
    }
  }`

- **Optimization:**
    - Limit total code content to 15,000 tokens (configurable)
    - Prioritize main files; summarize or exclude large dependencies
    - Include static analysis summary for context-aware AI review

**3B.2 Worker Invokes AI Service**

- **Actor:** Background Worker → Python FastAPI AI Service
- **Action:**
    - `POST https://ai-service.internal/api/review`
    - Headers: `Content-Type: application/json`, `X-API-Key: <internal_key>`
    - Timeout: 120 seconds
- **Circuit Breaker:** Implement circuit breaker pattern:
    - **Closed (Normal):** Allow requests
    - **Open (Failing):** Stop requests after 5 consecutive failures for 60 seconds
    - **Half-Open:** Test with single request after cooldown

**3B.3 AI Service Processes Request**

- **Actor:** Python FastAPI Service
- **Internal Steps (not detailed in this diagram - see AI Service design docs):**
    - Validate request schema
    - Select LLM provider (primary: OpenAI GPT-4, fallback: Claude, local: Ollama)
    - Execute prompt engineering pipeline
    - Generate structured feedback
    - Return JSON response
- **Response Structure:**

json

  `{
    "overallScore": 78,
    "scores": {
      "functionality": 85,
      "readability": 75,
      "security": 70,
      "performance": 80,
      "bestPractices": 75
    },
    "strengths": [
      "Good separation of concerns in authentication module",
      "Proper error handling with try-catch blocks"
    ],
    "weaknesses": [
      "Password hashing uses MD5 (insecure)",
      "Missing input validation on user endpoints"
    ],
    "recommendations": [
      {
        "priority": "high",
        "category": "security",
        "message": "Replace MD5 with bcrypt for password hashing",
        "suggestedFix": "const bcrypt = require('bcrypt');\nconst hash = await bcrypt.hash(password, 10);"
      }
    ],
    "detailedFeedback": "...",
    "modelUsed": "gpt-4-turbo",
    "tokensUsed": 3450
  }`

**3B.4 Worker Receives AI Response**

- **Actor:** Background Worker
- **Decision Point:**
    - **Timeout (120s exceeded):**
        - Log timeout error
        - Set AI result as `unavailable`
        - **Continue workflow** (graceful degradation - use static analysis only)
    - **AI Service Error (500, 503):**
        - Check circuit breaker state
        - Retry once after 5-second delay
        - If retry fails: Set AI result as `unavailable`, continue
    - **Success (200):** Proceed to 3B.5.

**3B.5 Worker Validates AI Response Schema**

- **Actor:** Background Worker
- **Validation:** Ensure all required fields present and types correct
- **Decision Point:**
    - **Invalid Response:** Log error, treat as `unavailable`, continue.
    - **Valid Response:** Proceed to 3B.6.

**3B.6 Worker Stores AI Analysis Record**

- **Actor:** Background Worker → SQL Server
- **Action:**

sql

  `INSERT INTO AIAnalysis (Id, SubmissionId, OverallScore, ScoresJSON, 
                          StrengthsJSON, WeaknessesJSON, RecommendationsJSON,
                          ModelUsed, TokensUsed, ExecutionTime, CreatedAt)
  VALUES (NEWID(), @SubmissionId, @OverallScore, @ScoresJSON,
          @StrengthsJSON, @WeaknessesJSON, @RecommendationsJSON,
          @Model, @Tokens, @ExecTime, GETUTCDATE())`

- **Decision Point:**
    - **Insert Fails:** Log error but continue (results cached for aggregation).
    - **Insert Succeeds:** AI analysis complete.

**→ Wait at Join Node**

---

### **Phase 4: Result Synchronization and Aggregation (Join)**

**4.1 Worker Synchronizes Analysis Results**

- **Actor:** Background Worker
- **Action:** Wait for both parallel branches to complete (or timeout/fail)
- **Join Condition:** At least one analysis completed successfully
- **Decision Point:**
    - **Both Analyses Failed:** Mark submission as `Failed`, log critical error. **Workflow terminates.**
    - **At Least One Succeeded:** Proceed to 4.2.

**4.2 Worker Aggregates Comprehensive Feedback**

- **Actor:** Background Worker
- **Logic:**
    - **If Both Available:** Merge static + AI insights, prioritize AI for high-level feedback
    - **If Only Static:** Use static results; note AI unavailability
    - **If Only AI:** Use AI results; note static tools failed
- **Output Structure:**

json

  `{
    "submissionId": "<guid>",
    "overallScore": 76,
    "categoryScores": {
      "functionality": 85,
      "codeQuality": 72,
      "security": 68,
      "performance": 80,
      "maintainability": 75
    },
    "staticAnalysisSummary": {
      "totalIssues": 15,
      "critical": 3,
      "high": 5,
      "medium": 7
    },
    "aiInsights": {
      "strengths": [...],
      "weaknesses": [...],
      "recommendations": [...]
    },
    "analysisMetadata": {
      "staticToolsUsed": ["ESLint", "SonarQube"],
      "aiModelUsed": "gpt-4-turbo",
      "totalProcessingTime": 142,
      "aiAvailable": true,
      "staticAvailable": true
    }
  }`

**4.3 Worker Calculates Final Submission Score**

- **Actor:** Background Worker
- **Formula (weighted average):**

```
  FinalScore = (
    Functionality × 0.30 +
    CodeQuality × 0.25 +
    Security × 0.20 +
    Performance × 0.15 +
    Maintainability × 0.10
  )
```

- **Grade Assignment:**
    - **Excellent:** ≥ 90
    - **Good:** 80-89
    - **Satisfactory:** 70-79
    - **Needs Improvement:** 60-69
    - **Poor:** < 60

---

### **Phase 5: Feedback Persistence and Notification**

**5.1 Worker Creates Feedback Record**

- **Actor:** Background Worker → SQL Server
- **Action:**

sql

  `INSERT INTO Feedback (Id, SubmissionId, OverallScore, Grade, 
                        CategoryScoresJSON, AggregatedFeedbackJSON, 
                        StaticAnalysisId, AIAnalysisId, CreatedAt)
  VALUES (NEWID(), @SubmissionId, @FinalScore, @Grade,
          @CategoryScoresJSON, @FeedbackJSON,
          @StaticId, @AIId, GETUTCDATE())`

- **Transaction:** Use database transaction to ensure atomicity with status update
- **Decision Point:**
    - **Insert Fails:** Rollback transaction, retry once, if fails again: mark submission as `Failed`. **Workflow terminates.**
    - **Insert Succeeds:** Proceed to 5.2.

**5.2 Worker Updates Submission Status to "Completed"**

- **Actor:** Background Worker → SQL Server
- **Action:**

sql

  `UPDATE Submissions
  SET Status = 'Completed',
      FinalScore = @FinalScore,
      CompletedAt = GETUTCDATE(),
      ProcessingTime = DATEDIFF(SECOND, CreatedAt, GETUTCDATE())
  WHERE Id = @SubmissionId`

- **Commit Transaction**

**5.3 Worker Generates Task Recommendations**

- **Actor:** Background Worker
- **Logic:** Based on identified weaknesses, query `Tasks` table for relevant learning tasks
- **Recommendation Criteria:**
    - Address specific weak categories (e.g., security → tasks tagged "authentication", "input-validation")
    - Match user's current skill level
    - Not already in user's learning path
    - Limit to top 5 recommendations
- **Action:**

sql

  `INSERT INTO Recommendations (Id, UserId, SubmissionId, TaskId, Reason, Priority, CreatedAt)
  SELECT NEWID(), @UserId, @SubmissionId, T.Id, @Reason, @Priority, GETUTCDATE()
  FROM Tasks T
  WHERE T.Category IN @WeakCategories
    AND T.Difficulty = @UserSkillLevel
    AND T.Id NOT IN (SELECT TaskId FROM PathTasks WHERE UserId = @UserId)
  ORDER BY T.ImpactScore DESC
  LIMIT 5`

**5.4 Worker Generates Learning Resources**

- **Actor:** Background Worker
- **Logic:** Map weaknesses to curated learning resources (articles, videos, documentation)
- **Action:** Insert records into `Resources` table linking to submission

**5.5 Worker Updates User Skill Profile**

- **Actor:** Background Worker → SQL Server
- **Action:** Update skill scores in `UserSkills` table based on category performance

sql

  `UPDATE UserSkills
  SET Score = (Score * 0.7 + @NewCategoryScore * 0.3), -- weighted average
      LastUpdated = GETUTCDATE()
  WHERE UserId = @UserId AND SkillCategory = @Category`

- **Purpose:** Enables adaptive learning path adjustments

**5.6 Worker Completes Message Processing**

- **Actor:** Background Worker → Azure Service Bus
- **Action:** Send `Complete()` acknowledgment to queue
- **Effect:** Message removed from queue; processing successfully finished

---

**Phase 6: Notification and Cleanup**

**6.1 Worker Triggers Email Notification**

- **Actor:** Background Worker → Notification Service (SendGrid)
- **Action:** Send async notification request (non-blocking)

json

  `POST /api/notifications/submission-completed
  {
    "userId": "<guid>",
    "submissionId": "<guid>",
    "finalScore": 76,
    "grade": "Satisfactory",
    "feedbackUrl": "https://platform.com/submissions/{id}/feedback"
  }`

- **Email Content:**
    - Subject: "Your Code Submission Results Are Ready"
    - Body: Summary of score, key insights, link to full feedback
- **Decision Point:**
    - **Notification Fails:** Log error but do not fail workflow (non-critical).
    - **Notification Sent:** Proceed to 6.2.

**6.2 Worker Cleans Up Temporary Files**

- **Actor:** Background Worker
- **Action:**
    - Delete cloned repository from `/tmp/submissions/{submissionId}/`
    - Remove extracted ZIP files
    - Clear Docker container artifacts
- **Purpose:** Free disk space; maintain worker hygiene

**6.3 Worker Logs Completion Metrics**

- **Actor:** Background Worker → Azure Application Insights
- **Metrics Logged:**
    - Total processing time
    - Static analysis duration
    - AI analysis duration
    - Final score
    - Tools used
    - Success/failure status
- **Purpose:** Performance monitoring, cost tracking, quality assurance

**→ Workflow Complete**

---

### **Error Handling and Retry Logic**

**Transient Errors (Retry Eligible):**

- GitHub API timeouts → Retry 3 times with exponential backoff
- Blob Storage download failures → Retry 3 times
- AI Service timeouts → Retry once after 5 seconds
- Database deadlocks → Retry with exponential backoff

**Permanent Errors (No Retry):**

- Invalid message schema → Move to dead-letter queue
- Repository not found (404) → Mark submission as `Failed`
- Code validation failures → Mark submission as `Failed`
- All retries exhausted → Mark submission as `Failed`

**Graceful Degradation:**

- AI service unavailable → Proceed with static analysis only
- Static analysis tool fails → Continue with other tools and AI
- Both analyses fail → Mark submission as `Failed`

**Dead-Letter Queue Handling:**

- Messages moved to DLQ after 3 delivery attempts
- Admin notification triggered for DLQ messages
- Manual investigation and reprocessing workflow available

---

### **Performance Characteristics**

**Target Processing Times (Non-Functional Requirements):**

- **Static Analysis:** < 3 minutes (per tool)
- **AI Analysis:** < 2 minutes (LLM inference)
- **Total Processing:** < 5 minutes typical, < 10 minutes maximum

**Concurrency:**

- Worker supports 10 concurrent submissions (configurable)
- Each submission processed in isolated execution context
- Static tools run in separate Docker containers (resource isolation)

**Scalability:**

- Workers scale horizontally based on queue depth
- Auto-scale trigger: Queue length > 20 messages
- Maximum workers: 20 (Phase 2), unlimited (Phase 3)

---

### **Decision Points Summary**

| **Decision Node** | **Condition** | **Path A (Success)** | **Path B (Failure)** |
| --- | --- | --- | --- |
| Message Schema Valid? | All fields present and valid | → Continue | → Dead-letter queue |
| Submission Found? | Record exists in DB | → Continue | → Dead-letter queue |
| Task Retrieved? | Active task found | → Continue | → Mark failed |
| Submission Type? | GitHub or Upload | → Phase 2A or 2B | N/A (always one) |
| GitHub Clone Success? | Repository cloned | → Continue | → Retry 3x → Fail |
| Blob Download Success? | File downloaded | → Continue | → Retry 3x → Fail |
| Code Validation Passed? | Valid structure | → Continue | → Mark failed |
| Static Tool Executed? | Container completed | → Parse results | → Mark unavailable |
| AI Service Responded? | 200 OK received | → Continue | → Retry 1x → Graceful degradation |
| At Least One Analysis? | Static OR AI succeeded | → Aggregate | → Mark failed |
| Feedback Persisted? | DB insert successful | → Continue | → Retry 1x → Fail |

### **Parallel Processing (Fork/Join)**

**Fork Node:** After code retrieval (Phase 3.0)

- **Branch A:** Static Code Analysis (3A.1 - 3A.6)
- **Branch B:** AI Code Review (3B.1 - 3B.6)

**Join Node:** Before result aggregation (Phase 4.1)

- **Synchronization:** Wait for both branches with timeout
- **Timeout:** If any branch exceeds 10 minutes, terminate and proceed with available results

**Rationale for Parallelization:**

- **Performance:** Reduces total processing time by ~40% (sequential: 5-6 min → parallel: 3-4 min)
- **Independence:** Static and AI analyses do not depend on each other's results
- **Fault Tolerance:** Failure of one branch does not block the other

---

### **Data Persistence**

**StaticAnalysis Table:**

sql

`CREATE TABLE StaticAnalysis (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    SubmissionId UNIQUEIDENTIFIER NOT NULL,
    ToolResults NVARCHAR(MAX) NOT NULL, -- JSON
    MaintainabilityScore INT,
    SecurityScore INT,
    StyleScore INT,
    ExecutionTime INT, -- seconds
    CreatedAt DATETIME2 NOT NULL,
    FOREIGN KEY (SubmissionId) REFERENCES Submissions(Id)
);`

**AIAnalysis Table:**

sql

`CREATE TABLE AIAnalysis (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    SubmissionId UNIQUEIDENTIFIER NOT NULL,
    OverallScore INT NOT NULL,
    ScoresJSON NVARCHAR(MAX), -- category scores
    StrengthsJSON NVARCHAR(MAX),
    WeaknessesJSON NVARCHAR(MAX),
    RecommendationsJSON NVARCHAR(MAX),
    DetailedFeedback NVARCHAR(MAX),
    ModelUsed VARCHAR(50),
    TokensUsed INT,
    ExecutionTime INT,
    CreatedAt DATETIME2 NOT NULL,
    FOREIGN KEY (SubmissionId) REFERENCES Submissions(Id)
);`

**Feedback Table:**

sql

`CREATE TABLE Feedback (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    SubmissionId UNIQUEIDENTIFIER NOT NULL,
    OverallScore INT NOT NULL,
    Grade VARCHAR(20) NOT NULL,
    CategoryScoresJSON NVARCHAR(MAX),
    AggregatedFeedbackJSON NVARCHAR(MAX),
    StaticAnalysisId UNIQUEIDENTIFIER,
    AIAnalysisId UNIQUEIDENTIFIER,
    CreatedAt DATETIME2 NOT NULL,
    FOREIGN KEY (SubmissionId) REFERENCES Submissions(Id),
    FOREIGN KEY (StaticAnalysisId) REFERENCES StaticAnalysis(Id),
    FOREIGN KEY (AIAnalysisId) REFERENCES AIAnalysis(Id)
);`

---

### **Alignment with Requirements**

**Functional Requirements:**

- ✅ **FR-SUB-04:** Repository fetching service
- ✅ **FR-SUB-05:** Static analysis execution
- ✅ **FR-SUB-06:** Static analysis results storage
- ✅ **FR-SUB-07:** AI analysis invocation
- ✅ **FR-SUB-08:** AI analysis results storage
- ✅ **FR-SUB-09:** Feedback aggregation
- ✅ **FR-SUB-10:** Job queue management
- ✅ **FR-SUB-12:** Submission status tracking

**Non-Functional Requirements:**

- ✅ **NFR-PERF-02:** Code analysis processing time < 5 min typical, < 10 min max
- ✅ **NFR-AVAIL-02:** Graceful degradation (AI failure → static only)
- ✅ **NFR-AVAIL-04:** Job retry logic with exponential backoff
- ✅ **NFR-AVAIL-06:** Queue persistence ensures no job loss
- ✅ **NFR-SEC-05:** Secure file handling in Docker containers
- ✅ **NFR-MAIN-08:** AI model abstraction for provider swapping

---

### **Notes for Implementation**

1. **Docker Container Security:**
    - Run as non-root user
    - Apply resource limits (CPU, memory)
    - Use read-only filesystem mounts
    - Implement seccomp profiles to restrict syscalls
2. **AI Service Circuit Breaker:**
    - Use Polly library (.NET) for resilience patterns
    - Track failure rate and automatically open circuit
    - Provide health check endpoint for monitoring
3. **Cost Optimization:**
    - Cache frequently analyze

code patterns

- Implement token-efficient prompts for AI service
- Use batch processing for multiple submissions when possible
1. **Monitoring Dashboards:**
    - Track queue depth in real-time
    - Alert on processing time > 10 minutes
    - Monitor AI service response times and error rates
    - Track cost per submission (AI tokens, compute)
2. **Testing Strategy:**
    - Unit tests for result normalization and scoring logic
    - Integration tests with mock static tools and AI service
    - Load tests simulating 50+ concurrent submissions
    - Chaos engineering: inject failures in static/AI branches

### **4.4.6 Feedback Review & Learning Path Update Activity**

### Overview

This activity diagram models the learner's interaction with completed code submission feedback and the subsequent adaptive learning path updates triggered by their performance. The workflow encompasses feedback retrieval and presentation, detailed review of AI and static analysis insights, recommendation exploration, manual learning path adjustments, and automatic skill-based path recalculation.

**Scope:**

- User navigation to submission feedback page
- Retrieval and rendering of comprehensive feedback (static + AI analysis)
- Interactive exploration of code issues with inline annotations
- Review of personalized task recommendations based on identified weaknesses
- Manual addition of recommended tasks to learning path
- Access to curated learning resources
- Feedback quality rating and comment submission
- Automatic learning path recalculation based on updated skill profile
- Progress tracking and milestone updates

**Actors/Systems Involved:**

- **User (Learner):** Reviews feedback and manages learning path
- **Frontend (React):** Provides interactive feedback UI with syntax highlighting and annotations
- **Backend API (ASP.NET Core):** Serves feedback data, manages learning path updates
- **SQL Server:** Stores feedback, recommendations, learning paths, user skills
- **Recommendation Engine:** Generates and ranks task recommendations
- **Learning Path Service:** Recalculates personalized learning sequences

**Key Design Decisions:**

- **Progressive Disclosure:** Feedback presented in layered complexity (summary → detailed → code-level)
- **Interactive Exploration:** Users can navigate between high-level insights and specific code issues
- **Actionable Recommendations:** Direct integration with learning path management
- **Bidirectional Updates:** User actions (adding tasks) trigger automatic path recalculation
- **Feedback Loop:** User ratings improve AI prompt engineering and recommendation quality
- **Performance Optimization:** Feedback preloaded; path updates processed asynchronously

### Activity Flow Description

**Phase 1: Feedback Access and Retrieval**

**1.1 User Navigates to Submissions Dashboard**

- **Actor:** User
- **Description:** Learner clicks "My Submissions" from main navigation menu
- **Frontend Action:** Route to `/dashboard/submissions`

**1.2 Frontend Displays Submissions List**

- **Actor:** Frontend
- **Action:**
    - `GET /api/submissions?userId={currentUser}&status=Completed`
    - Render paginated list with submission cards showing:
        - Task title
        - Submission date
        - Status badge (Completed/Pending/Failed)
        - Overall score (if completed)
        - Quick action: "View Feedback"

**1.3 User Selects Submission to Review**

- **Actor:** User
- **Description:** User clicks "View Feedback" button on a completed submission
- **Frontend Action:** Navigate to `/submissions/{submissionId}/feedback`

**1.4 Frontend Requests Feedback Data**

- **Actor:** Frontend → Backend API
- **Action:**

  `GET /api/submissions/{submissionId}/feedback`

- **Headers:** `Authorization: Bearer <JWT>`

**1.5 Backend Validates Request**

- **Actor:** Backend API
- **Validation:**
    - JWT token valid and not expired
    - User owns the submission (authorization check)
    - Submission status is "Completed"
- **Decision Point:**
    - **Unauthorized (401/403):** Return error. Frontend redirects to login or shows access denied. **Workflow terminates.**
    - **Not Found (404):** Submission doesn't exist or feedback not ready. Display message. **Workflow terminates.**
    - **Authorized:** Proceed to 1.6.

**1.6 Backend Retrieves Comprehensive Feedback**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      F.Id AS FeedbackId,
      F.OverallScore,
      F.Grade,
      F.CategoryScoresJSON,
      F.AggregatedFeedbackJSON,
      F.CreatedAt,
      SA.Id AS StaticAnalysisId,
      SA.ToolResults AS StaticResults,
      SA.MaintainabilityScore,
      SA.SecurityScore,
      SA.StyleScore,
      AI.Id AS AIAnalysisId,
      AI.OverallScore AS AIScore,
      AI.ScoresJSON AS AIScores,
      AI.StrengthsJSON,
      AI.WeaknessesJSON,
      AI.RecommendationsJSON,
      AI.DetailedFeedback,
      AI.ModelUsed,
      S.SubmissionType,
      S.RepositoryUrl,
      S.BlobUrl,
      T.Title AS TaskTitle,
      T.Description AS TaskDescription
  FROM Feedback F
  INNER JOIN Submissions S ON F.SubmissionId = S.Id
  INNER JOIN Tasks T ON S.TaskId = T.Id
  LEFT JOIN StaticAnalysis SA ON F.StaticAnalysisId = SA.Id
  LEFT JOIN AIAnalysis AI ON F.AIAnalysisId = AI.Id
  WHERE F.SubmissionId = @SubmissionId`

**1.7 Backend Retrieves Recommendations**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      R.Id,
      R.TaskId,
      R.Reason,
      R.Priority,
      T.Title,
      T.Description,
      T.Difficulty,
      T.EstimatedTime,
      T.Category
  FROM Recommendations R
  INNER JOIN Tasks T ON R.TaskId = T.Id
  WHERE R.SubmissionId = @SubmissionId
  ORDER BY R.Priority DESC, T.ImpactScore DESC
  LIMIT 5`

**1.8 Backend Retrieves Learning Resources**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      LR.Id,
      LR.Title,
      LR.Type, -- 'Article', 'Video', 'Documentation', 'Tutorial'
      LR.Url,
      LR.Category,
      LR.Description
  FROM Resources LR
  WHERE LR.SubmissionId = @SubmissionId
  ORDER BY LR.Relevance DESC
  LIMIT 10`

**1.9 Backend Constructs Response Payload**

- **Actor:** Backend API
- **Action:** Build comprehensive JSON response:

json

  `{
    "feedbackId": "<guid>",
    "submissionId": "<guid>",
    "taskTitle": "Build REST API with Authentication",
    "submittedAt": "2025-12-14T10:30:00Z",
    "analyzedAt": "2025-12-14T10:35:00Z",
    "overallScore": 76,
    "grade": "Satisfactory",
    "categoryScores": {
      "functionality": 85,
      "codeQuality": 72,
      "security": 68,
      "performance": 80,
      "maintainability": 75
    },
    "staticAnalysis": {
      "available": true,
      "toolsUsed": ["ESLint", "SonarQube"],
      "maintainabilityScore": 75,
      "securityScore": 68,
      "styleScore": 80,
      "issues": [
        {
          "severity": "error",
          "category": "security",
          "message": "SQL injection vulnerability detected",
          "file": "src/db.js",
          "line": 42,
          "column": 15,
          "rule": "security/detect-sql-injection",
          "suggestedFix": "Use parameterized queries"
        },
        // ... more issues
      ]
    },
    "aiInsights": {
      "available": true,
      "modelUsed": "gpt-4-turbo",
      "overallScore": 78,
      "strengths": [
        "Good separation of concerns in authentication module",
        "Proper error handling with try-catch blocks",
        "Clear and descriptive function names"
      ],
      "weaknesses": [
        "Password hashing uses MD5 (insecure)",
        "Missing input validation on user endpoints",
        "No rate limiting on authentication endpoints"
      ],
      "recommendations": [
        {
          "priority": "high",
          "category": "security",
          "message": "Replace MD5 with bcrypt for password hashing",
          "codeExample": "const bcrypt = require('bcrypt');\nconst hash = await bcrypt.hash(password, 10);"
        },
        // ... more recommendations
      ],
      "detailedFeedback": "Your implementation demonstrates..."
    },
    "taskRecommendations": [
      {
        "taskId": "<guid>",
        "title": "Implement Input Validation Middleware",
        "reason": "Addresses identified weakness in input validation",
        "priority": "high",
        "difficulty": "Intermediate",
        "estimatedTime": "2-3 hours"
      },
      // ... top 5 recommendations
    ],
    "learningResources": [
      {
        "title": "OWASP Top 10 Security Risks",
        "type": "Documentation",
        "url": "https://owasp.org/top10",
        "category": "security"
      },
      // ... curated resources
    ]
  }
````

**1.10 Backend Returns Feedback Response**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK` with comprehensive feedback payload
- **Performance:** Response time < 500ms (cached feedback data)

---

**Phase 2: Feedback Presentation and Exploration**

**2.1 Frontend Renders Feedback Dashboard**

- **Actor:** Frontend
- **Components Rendered:**
    - **Header Section:**
        - Task title and description
        - Submission timestamp
        - Overall score (large, prominent display)
        - Grade badge with color coding
    - **Score Breakdown Section:**
        - Radar chart visualizing category scores
        - Progress bars for each category
        - Comparison to average scores (anonymized peer data)
    - **Tabbed Interface:**
        - Tab 1: Summary (default view)
        - Tab 2: Code Issues (static analysis)
        - Tab 3: AI Insights
        - Tab 4: Recommendations
        - Tab 5: Learning Resources

**2.2 User Reviews Summary Tab**

- **Actor:** User
- **Content Displayed:**
    - Top 3 strengths (from AI analysis)
    - Top 3 weaknesses (from AI analysis)
    - Quick wins: Easy-to-fix issues
    - High-priority security issues (highlighted)
    - Estimated effort to improve to next grade

**2.3 User Navigates to Code Issues Tab**

- **Actor:** User
- **Action:** Click "Code Issues" tab

**2.4 Frontend Renders Interactive Code View**

- **Actor:** Frontend
- **Components:**
    - **File Tree (Left Panel):**
        - Hierarchical view of submitted files
        - Issue count badges per file
        - Color-coded severity indicators
    - **Code Editor (Center Panel):**
        - Syntax-highlighted code display
        - Line numbers
        - Inline annotations for issues (markers on affected lines)
        - Click line to see issue details
    - **Issue Details (Right Panel):**
        - Issue severity and category
        - Full description
        - Suggested fix
        - Related documentation links

**2.5 User Explores Specific Code Issue**

- **Actor:** User
- **Action:** Click on highlighted line in code editor
- **Frontend Response:**
    - Scroll to affected code
    - Highlight issue context (surrounding lines)
    - Display issue card with:
        - Problem description
        - Why it matters (educational context)
        - Suggested refactoring
        - Code example showing correct approach

**Decision Point: User Engagement Path**

- **Path A:** Continue exploring code issues → Repeat 2.5
- **Path B:** Switch to AI Insights tab → Proceed to 2.6
- **Path C:** Skip to Recommendations → Proceed to Phase 3

**2.6 User Reviews AI Insights Tab**

- **Actor:** User
- **Content Displayed:**
    - **Detailed Feedback Narrative:** AI-generated prose analysis
    - **Strengths Section:** Expandable cards for each strength
    - **Weaknesses Section:** Expandable cards for each weakness
    - **Architecture Review:** High-level design assessment
    - **Best Practices Adherence:** Checklist of standards met/missed

**2.7 User Reads AI Recommendation**

- **Actor:** User
- **Action:** Expand recommendation card
- **Content:**
    - Priority indicator (High/Medium/Low)
    - Category tag (Security/Performance/Maintainability)
    - Detailed explanation
    - Code example with before/after comparison
    - Syntax-highlighted suggested implementation

---

**Phase 3: Task Recommendations and Learning Path Updates**

**3.1 User Navigates to Recommendations Tab**

- **Actor:** User
- **Action:** Click "Recommendations" tab

**3.2 Frontend Displays Recommended Tasks**

- **Actor:** Frontend
- **Content:** List of 5 recommended tasks with:
    - Task title and brief description
    - Difficulty badge
    - Estimated completion time
    - Reason for recommendation (linked to weakness)
    - Quick actions:
        - "Add to Learning Path" button
        - "View Details" button

**3.3 User Reviews Task Recommendation**

- **Actor:** User
- **Action:** Click "View Details" on a recommended task

**3.4 Frontend Displays Task Details Modal**

- **Actor:** Frontend
- **Modal Content:**
    - Full task description
    - Learning objectives
    - Prerequisites
    - Expected outcomes
    - Related skills this task develops
    - Action buttons:
        - "Add to My Path"
        - "View Similar Tasks"
        - "Close"

**Decision Point: Add Task to Learning Path?**

---

**Path A: User Adds Recommended Task**

**3.5 User Clicks "Add to My Path"**

- **Actor:** User
- **Action:** Click button on task card or in modal

**3.6 Frontend Sends Add Task Request**

- **Actor:** Frontend → Backend API
- **Action:**

```
  POST /api/learning-paths/tasks
  {
    "userId": "<guid>",
    "taskId": "<guid>",
    "source": "recommendation",
    "submissionId": "<guid>"
  }
```

**3.7 Backend Validates Request**

- **Actor:** Backend API
- **Validation:**
    - User authenticated
    - Task exists and is active
    - Task not already in user's path
    - User has active learning path
- **Decision Point:**
    - **Validation Fails:** Return `400 Bad Request` or `409 Conflict`. Frontend displays error. **Return to 3.2.**
    - **Validation Succeeds:** Proceed to 3.8.

**3.8 Backend Retrieves Current Learning Path**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      LP.Id AS PathId,
      LP.TrackType,
      LP.CurrentTaskIndex,
      PT.TaskId,
      PT.OrderIndex,
      PT.Status
  FROM LearningPaths LP
  INNER JOIN PathTasks PT ON LP.Id = PT.PathId
  WHERE LP.UserId = @UserId
  ORDER BY PT.OrderIndex`

**3.9 Backend Determines Insertion Position**

- **Actor:** Backend API - Learning Path Service
- **Logic:**
    - **Strategy 1 (Default):** Insert after current task (prioritize immediate relevance)
    - **Strategy 2:** Insert based on prerequisite dependencies
    - **Strategy 3:** Insert at end of current difficulty tier
- **Selected Strategy:** Insert after current task, before next milestone
- **Calculated Position:** `CurrentTaskIndex + 1`

**3.10 Backend Inserts Task into Learning Path**

- **Actor:** Backend API → SQL Server
- **Transaction Begin**
- **Action 1:** Shift existing tasks to accommodate new insertion

sql

  `UPDATE PathTasks
  SET OrderIndex = OrderIndex + 1
  WHERE PathId = @PathId 
    AND OrderIndex >= @InsertPosition`

- **Action 2:** Insert new task

sql

  `INSERT INTO PathTasks (Id, PathId, TaskId, OrderIndex, Status, AddedAt, Source)
  VALUES (NEWID(), @PathId, @TaskId, @InsertPosition, 'NotStarted', GETUTCDATE(), 'Recommendation')`

- **Action 3:** Update learning path metadata

sql

  `UPDATE LearningPaths
  SET TotalTasks = TotalTasks + 1,
      UpdatedAt = GETUTCDATE()
  WHERE Id = @PathId`

- **Transaction Commit**
- **Decision Point:**
    - **Transaction Fails:** Rollback, return `500 Internal Server Error`. **Workflow terminates for this action.**
    - **Transaction Succeeds:** Proceed to 3.11.

**3.11 Backend Marks Recommendation as Acted Upon**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Recommendations
  SET Status = 'Added',
      ActedAt = GETUTCDATE()
  WHERE Id = @RecommendationId`

**3.12 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK`

json

  `{
    "success": true,
    "message": "Task added to your learning path",
    "pathId": "<guid>",
    "taskPosition": 5,
    "totalTasks": 18
  }`

**3.13 Frontend Updates UI**

- **Actor:** Frontend
- **Actions:**
    - Display success toast: "Task added to your learning path ✓"
    - Update recommendation card:
        - Disable "Add" button
        - Show "✓ Added" badge
        - Display insertion position: "Added at position #5"
    - Optionally: Animate card to indicate action completed

**3.14 User Reviews Updated Learning Path (Optional)**

- **Actor:** User
- **Action:** Click "View My Learning Path" link in toast notification
- **Frontend Response:** Navigate to `/dashboard/learning-path`
- **→ This triggers automatic path recalculation (covered in 3.15-3.20)**

---

**Path B: User Skips Recommendation**

**3.5B User Clicks "Not Interested" or Closes Modal**

- **Actor:** User
- **Action:** Dismiss recommendation without adding
- **Frontend:** Return to recommendations list
- **No backend action:** Recommendation remains available
- **→ User can continue exploring other recommendations or proceed to Phase 4**

**Phase 4: Automatic Learning Path Recalculation**

**Note:** This phase triggers automatically when:

1. User adds a task to their path (as in 3.14)
2. User completes a submission (system updates skill profile)
3. User manually adjusts their path (reorder/remove tasks)

**4.1 System Detects Learning Path Change Event**

- **Actor:** Backend API
- **Trigger:** Task added, task completed, or skill profile updated
- **Action:** Enqueue asynchronous job for path recalculation

**4.2 Backend Retrieves Updated User Skill Profile**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      US.SkillCategory,
      US.Score,
      US.Level, -- 'Beginner', 'Intermediate', 'Advanced'
      US.LastUpdated
  FROM UserSkills US
  WHERE US.UserId = @UserId
  ORDER BY US.Score ASC -- Weakest skills first`

**4.3 Backend Analyzes Skill Gaps**

- **Actor:** Learning Path Service
- **Logic:**
    - Identify categories with scores < 70 (weak areas)
    - Compare against track requirements (e.g., Full Stack requires 75+ in frontend AND backend)
    - Detect skills that haven't been practiced recently (LastUpdated > 30 days)
- **Output:** Ranked list of skill gaps requiring attention

**4.4 Backend Retrieves Available Tasks**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      T.Id,
      T.Title,
      T.Category,
      T.Difficulty,
      T.EstimatedTime,
      T.ImpactScore,
      T.Prerequisites
  FROM Tasks T
  WHERE T.IsActive = 1
    AND T.Category IN @WeakCategories
    AND T.Difficulty IN @AppropriateLevel
    AND T.Id NOT IN (
      SELECT TaskId FROM PathTasks 
      WHERE PathId = @CurrentPathId
    )
  ORDER BY T.ImpactScore DESC, T.Difficulty ASC`

**4.5 Backend Applies Learning Path Algorithm**

- **Actor:** Learning Path Service
- **Algorithm:**
    1. **Load Current Path:** Preserve user-added tasks and completed tasks
    2. **Identify Gaps:** Compare weak skills against track curriculum
    3. **Select Fill Tasks:** Choose tasks that address gaps without disrupting flow
    4. **Respect Prerequisites:** Ensure dependency order maintained
    5. **Balance Difficulty:** Avoid steep jumps in complexity
    6. **Optimize Sequence:** Order by:
        - Prerequisite dependencies (mandatory)
        - Skill impact (prioritize high-impact tasks)
        - Difficulty progression (gradual increase)
        - Estimated time (balance short and long tasks)
- **Output:** Updated task sequence with justification for each addition/reorder

**4.6 Backend Determines Minimal Changes**

- **Actor:** Learning Path Service
- **Logic:**
    - **Preserve User Intent:** Don't remove manually added tasks
    - **Minimize Disruption:** Only reorder if significant benefit (> 15% path efficiency gain)
    - **Notify Changes:** Flag which tasks are new suggestions vs. reordered
- **Decision Point:**
    - **Significant Changes Required (> 5 tasks affected):** Proceed to 4.7 (notify user).
    - **Minor Adjustments (≤ 5 tasks):** Apply silently and log changes. Skip to 4.9.

**4.7 Backend Prepares Change Notification**

- **Actor:** Backend API
- **Action:** Create notification record:

json

  `{
    "userId": "<guid>",
    "type": "LearningPathUpdate",
    "title": "Your Learning Path Has Been Updated",
    "message": "Based on your recent progress, we've suggested 3 new tasks to strengthen your security skills.",
    "changes": {
      "tasksAdded": 3,
      "tasksReordered": 2,
      "reason": "Improved skill gaps in security and performance"
    },
    "actionUrl": "/dashboard/learning-path",
    "createdAt": "2025-12-14T11:00:00Z"
  }`

**4.8 Backend Sends In-App and Email Notification**

- **Actor:** Backend API → Notification Service
- **Action:**
    - Create in-app notification badge
    - Send optional email digest (based on user preferences)
- **Decision Point:**
    - **Notification Fails:** Log error (non-critical). Continue path update.
    - **Notification Sent:** Proceed to 4.9.

**4.9 Backend Updates Learning Path in Database**

- **Actor:** Backend API → SQL Server
- **Transaction Begin**
- **Action 1:** Mark old path version as archived

sql

  `UPDATE LearningPaths
  SET IsActive = 0,
      ArchivedAt = GETUTCDATE()
  WHERE Id = @CurrentPathId`

- **Action 2:** Create new path version

sql

  `INSERT INTO LearningPaths (Id, UserId, TrackType, Version, IsActive, CreatedAt)
  VALUES (NEWID(), @UserId, @TrackType, @Version + 1, 1, GETUTCDATE())`

- **Action 3:** Insert updated task sequence

sql

  `INSERT INTO PathTasks (Id, PathId, TaskId, OrderIndex, Status, Source)
  SELECT NEWID(), @NewPathId, TaskId, OrderIndex, Status, Source
  FROM @UpdatedTaskSequence`

- **Transaction Commit**

**4.10 Backend Logs Path Recalculation**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO PathRecalculationLogs (Id, UserId, OldPathId, NewPathId, Reason, ChangeSummary, CreatedAt)
  VALUES (NEWID(), @UserId, @OldPathId, @NewPathId, @Reason, @ChangeSummaryJSON, GETUTCDATE())
````

- **Purpose:** Audit trail, A/B testing of algorithm variants, user analytics

---

**Phase 5: Learning Resources Exploration**

**5.1 User Navigates to Learning Resources Tab**

- **Actor:** User
- **Action:** Click "Resources" tab in feedback view

**5.2 Frontend Displays Curated Resources**

- **Actor:** Frontend
- **Content:** Grid/list of resources grouped by category:
    - **Security:** 3 resources
    - **Performance:** 2 resources
    - **Best Practices:** 3 resources
    - **Related Topics:** 2 resources

**5.3 User Clicks Resource Link**

- **Actor:** User
- **Action:** Click on resource card or title
- **Frontend Response:**
    - Open link in new browser tab (external resources)
    - Track resource access event

**5.4 Frontend Sends Resource Tracking Event**

- **Actor:** Frontend → Backend API
- **Action:** (Asynchronous, non-blocking)

```
  POST /api/analytics/resource-accessed
  {
    "userId": "<guid>",
    "resourceId": "<guid>",
    "submissionId": "<guid>",
    "timestamp": "2025-12-14T11:05:00Z"
  }
```

**5.5 Backend Logs Resource Access**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO ResourceAccessLogs (Id, UserId, ResourceId, SubmissionId, AccessedAt)
  VALUES (NEWID(), @UserId, @ResourceId, @SubmissionId, GETUTCDATE())
````

- **Purpose:**
    - Track resource effectiveness
    - Personalize future recommendations
    - Identify popular learning materials

---

**Phase 6: Feedback Quality Rating**

**6.1 User Rates Feedback Quality**

- **Actor:** User
- **UI Element:** Rating widget at bottom of feedback page
    - 5-star rating scale
    - Optional text comment field
    - "Submit Rating" button

**6.2 User Submits Rating**

- **Actor:** User
- **Action:** Select star rating (1-5) and optionally add comment, then click "Submit Rating"

**6.3 Frontend Sends Rating Request**

- **Actor:** Frontend → Backend API
- **Action:**

```
  POST /api/feedback/{feedbackId}/rating
  {
    "rating": 4,
    "comment": "Very helpful analysis, but some recommendations were unclear.",
    "categories": {
      "accuracy": 5,
      "clarity": 3,
      "actionability": 4
    }
  }
```

**6.4 Backend Validates Rating**

- **Actor:** Backend API
- **Validation:**
    - User owns the feedback
    - Rating is 1-5
    - Comment length < 500 characters
    - User hasn't already rated this feedback
- **Decision Point:**
    - **Invalid:** Return `400 Bad Request`. Frontend displays error.
    - **Valid:** Proceed to 6.5.

**6.5 Backend Stores Rating**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO FeedbackRatings (Id, FeedbackId, UserId, Rating, Comment, CategoryRatings, CreatedAt)
  VALUES (NEWID(), @FeedbackId, @UserId, @Rating, @Comment, @CategoryRatingsJSON, GETUTCDATE())`

**6.6 Backend Updates Feedback Aggregate Metrics**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Feedback
  SET AverageRating = (SELECT AVG(Rating) FROM FeedbackRatings WHERE FeedbackId = @FeedbackId),
      RatingCount = (SELECT COUNT(*) FROM FeedbackRatings WHERE FeedbackId = @FeedbackId),
      LastRatedAt = GETUTCDATE()
  WHERE Id = @FeedbackId`

**6.7 Backend Enqueues Feedback Improvement Job (Async)**

- **Actor:** Backend API
- **Action:** If rating < 3 (low satisfaction):
    - Enqueue job for AI prompt engineering team to review
    - Flag for manual quality assessment
    - Include feedback ID, rating, comment, and original AI response for analysis

**6.8 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK`

json

  `{
    "success": true,
    "message": "Thank you for your feedback!"
  }`

**6.9 Frontend Displays Confirmation**

- **Actor:** Frontend
- **Action:**
    - Show success toast: "Thank you for rating this feedback!"
    - Disable rating widget (prevent duplicate ratings)
    - Display "You rated this feedback: ★★★★☆"

---

**Phase 7: Progress Tracking Update**

**7.1 System Updates Progress Metrics (Background)**

- **Actor:** Backend API (triggered by feedback viewing)
- **Action:** Update user progress statistics:

sql

  `UPDATE UserProgress
  SET 
      TotalSubmissions = TotalSubmissions + 1,
      AverageScore = (AverageScore * (TotalSubmissions - 1) + @CurrentScore) / TotalSubmissions,
      LastActivityAt = GETUTCDATE(),
      CurrentStreak = CASE 
          WHEN DATEDIFF(day, LastActivityAt, GETUTCDATE()) <= 1 
          THEN CurrentStreak + 1 
          ELSE 1 
      END
  WHERE UserId = @UserId`

**7.2 System Checks for Achievement Unlocks**

- **Actor:** Backend API - Gamification Service
- **Logic:** Check if new score/activity triggers badge awards:
    - "First Submission" badge
    - "Security Conscious" (high security score)
    - "Code Quality Champion" (3 consecutive submissions with score > 85)
    - "Week Warrior" (7-day submission streak)

**7.3 System Awards Achievements (If Applicable)**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO UserAchievements (Id, UserId, BadgeId, UnlockedAt)
  VALUES (NEWID(), @UserId, @BadgeId, GETUTCDATE())`

**7.4 System Sends Achievement Notification**

- **Actor:** Backend API → Notification Service
- **Action:** Create in-app notification:

json

  `{
    "userId": "<guid>",
    "type": "AchievementUnlocked",
    "title": "🎉 Achievement Unlocked!",
    "message": "You've earned the 'Security Conscious' badge!",
    "badgeImageUrl": "https://...",
    "createdAt": "2025-12-14T11:10:00Z"
  }
````

---

**Phase 8: Workflow Completion**

**8.1 User Completes Feedback Review Session**

- **Actor:** User
- **Possible Actions:**
    - Navigate to learning path to start next task
    - Return to submissions dashboard
    - Close browser tab
    - Navigate to another section of platform

**8.2 Frontend Tracks Session Analytics**

- **Actor:** Frontend
- **Metrics Captured:**
    - Time spent on feedback page
    - Tabs viewed
    - Issues explored
    - Tasks added to path
    - Resources accessed
    - Rating provided (yes/no)

**8.3 Frontend Sends Session Summary (Async)**

- **Actor:** Frontend → Backend API
- **Action:**

```
  POST /api/analytics/feedback-session
  {
    "userId": "<guid>",
    "feedbackId": "<guid>",
    "duration": 420, // seconds
    "tabsViewed": ["summary", "code-issues", "recommendations"],
    "issuesExplored": 5,
    "tasksAdded": 1,
    "resourcesAccessed": 2,
    "ratingProvided": true
  }
```

**8.4 Backend Logs Session for Analytics**

- **Actor:** Backend API → SQL Server / Azure Application Insights
- **Purpose:**
    - User engagement analysis
    - Feature usage tracking
    - A/B testing of UI variants
    - Recommendation effectiveness measurement

**→ Workflow Complete**

Continue

Dec 14

---

### Decision Points Summary

| Decision Node | Condition | Path A | Path B |
| --- | --- | --- | --- |
| Request Authorized? | JWT valid + owns submission | → Retrieve feedback | → 401/403 error |
| Feedback Ready? | Status = Completed | → Display feedback | → 404 error |
| User Engagement? | Tab selection | → Code Issues / AI / Recommendations | N/A (any tab valid) |
| Add Task to Path? | User clicks "Add" | → Execute path update | → Skip to next recommendation |
| Task Already in Path? | DB check | → 409 Conflict | → Insert task |
| Path Update Success? | Transaction result | → Display success | → Rollback, show error |
| Significant Path Changes? | Change count > 5 | → Notify user | → Apply silently |
| Low Feedback Rating? | Rating < 3 | → Flag for review | → Log normally |
| Achievement Unlocked? | Criteria met | → Award badge + notify | → Continue normally |

---

### Parallel Activities (Fork/Join)

This diagram includes **one asynchronous fork** for non-blocking operations:

**Fork Point:** After user adds task to learning path (Step 3.13)

**Branch A (Main Thread):**

- Display success message
- Update UI
- User continues interaction
- **No blocking wait**

**Branch B (Background Thread):**

- Path recalculation (Phase 4)
- Notification generation
- Analytics logging
- **Executes asynchronously**

**Join Point:** Not explicitly required (background operations don't block user flow)

**Rationale:** Ensures responsive UI while complex path recalculation happens in background

---

### Performance Characteristics

**Target Response Times (NFR Alignment):**

- **Feedback Retrieval:** < 500ms (p95) — cached in Redis after first load
- **Task Addition:** < 200ms (p95) — simple INSERT operations
- **Path Recalculation:** < 3 seconds (background) — user not blocked
- **Rating Submission:** < 200ms (p95) — lightweight write operation

**Caching Strategy:**

- Feedback data cached for 24 hours (immutable after generation)
- Recommendations cached until acted upon
- Learning path cached with 5-minute TTL (updates propagate quickly)

**Scalability:**

- Read-heavy workload (10:1 read:write ratio)
- Database read replicas for feedback queries
- CDN caching for static resources (code syntax highlighting libraries)

---

### Data Persistence

**FeedbackRatings Table:**

sql

`CREATE TABLE FeedbackRatings (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    FeedbackId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment NVARCHAR(500),
    CategoryRatings NVARCHAR(MAX), -- JSON: {"accuracy": 5, "clarity": 3, ...}
    CreatedAt DATETIME2 NOT NULL,
    FOREIGN KEY (FeedbackId) REFERENCES Feedback(Id),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    UNIQUE (FeedbackId, UserId) -- Prevent duplicate ratings
);`

**PathTasks Table (Updated):**

sql

`CREATE TABLE PathTasks (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    PathId UNIQUEIDENTIFIER NOT NULL,
    TaskId UNIQUEIDENTIFIER NOT NULL,
    OrderIndex INT NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'NotStarted', -- 'NotStarted', 'InProgress', 'Completed'
    AddedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Source VARCHAR(50), -- 'Initial', 'Recommendation', 'Manual', 'Recalculation'
    CompletedAt DATETIME2,
    FOREIGN KEY (PathId) REFERENCES LearningPaths(Id),
    FOREIGN KEY (TaskId) REFERENCES Tasks(Id),
    UNIQUE (PathId, OrderIndex)
);`

**PathRecalculationLogs Table:**

sql

`CREATE TABLE PathRecalculationLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    OldPathId UNIQUEIDENTIFIER,
    NewPathId UNIQUEIDENTIFIER NOT NULL,
    Reason VARCHAR(100), -- 'TaskAdded', 'SkillUpdate', 'SubmissionCompleted'
    ChangeSummary NVARCHAR(MAX), -- JSON: {"tasksAdded": 3, "tasksReordered": 2, ...}
    CreatedAt DATETIME2 NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);`

---

### Alignment with Requirements

**Functional Requirements:**

- ✅ **FR-FEED-01:** Structured feedback generation and rendering
- ✅ **FR-FEED-02:** Interactive feedback report UI
- ✅ **FR-FEED-03:** Task recommendation generation and display
- ✅ **FR-FEED-04:** Learning resource links
- ✅ **FR-FEED-05:** Feedback quality rating
- ✅ **FR-PATH-04:** Add recommended task to learning path
- ✅ **FR-PATH-05:** Path progress tracking
- ✅ **FR-PATH-06:** Modify path (via task additions)

**Non-Functional Requirements:**

- ✅ **NFR-PERF-01:** API response time < 500ms
- ✅ **NFR-UX-03:** Intuitive navigation with tabbed interface
- ✅ **NFR-UX-05:** Clear error handling and success feedback
- ✅ **NFR-MAIN-07:** Comprehensive logging and observability
- ✅ **NFR-UX-04:** Progressive disclosure in feedback presentation

---

### Notes for Implementation

1. **Frontend State Management:**
    - Use Redux/Context for feedback state
    - Cache feedback data to avoid redundant API calls
    - Implement optimistic UI updates for task additions
2. **Code Highlighting:**
    - Use Prism.js or Monaco Editor for syntax highlighting
    - Lazy-load language grammars on demand
    - Render annotations as overlays on code view
3. **Path Recalculation Performance:**
    - Offload to background job queue (Azure Service Bus)
    - Implement rate limiting (max 1 recalculation per user per 5 minutes)
    - Use algorithm caching for common patterns
4. **Accessibility:**
    - Ensure keyboard navigation in code view
    - Provide ARIA labels for interactive elements
    - Support screen readers in feedback narrative
5. **Testing Strategy:**
    - Unit tests for path insertion logic
    - Integration tests for feedback retrieval pipeline
    - E2E tests for complete user journey (view feedback → add task → verify path)

### **4.4.7 Activity Diagram: Admin Task & Analytics Management**

### Overview

This activity diagram models the administrative workflows for platform management, focusing on two primary domains: **Task Library Management** and **Platform Analytics & Monitoring**. Administrators use these capabilities to curate learning content, monitor system health, track user engagement, and make data-driven decisions to improve platform effectiveness.

**Scope:**

- Admin authentication and role verification
- Task creation, editing, and lifecycle management
- Learning track definition and curriculum design
- Platform analytics dashboard access
- User engagement metrics review
- Submission quality analysis
- AI/Static analysis performance monitoring
- System health and cost monitoring
- Content moderation and quality assurance

**Actors/Systems Involved:**

- **Admin User:** Platform administrator with elevated privileges
- **Frontend (React Admin Panel):** Specialized administrative interface
- **Backend API (ASP.NET Core):** Admin-specific endpoints with RBAC
- **SQL Server:** Stores tasks, tracks, analytics data, audit logs
- **Azure Application Insights:** Provides telemetry, logs, performance metrics
- **Azure Cost Management:** Tracks cloud resource spending
- **Notification Service:** Alerts for critical events and thresholds

**Key Design Decisions:**

- **Role-Based Access Control (RBAC):** All admin endpoints protected by role verification
- **Audit Logging:** Every administrative action logged with timestamp, actor, and change details
- **Draft/Publish Workflow:** Tasks support draft state before public availability
- **Version Control:** Task edits create new versions; old versions archived
- **Real-Time Analytics:** Dashboard refreshes automatically with live metrics
- **Threshold Alerts:** Automated notifications when KPIs exceed/fall below targets
- **Data Aggregation:** Analytics pre-computed for performance (materialized views/cache)

---

### Activity Flow Description

**Phase 1: Admin Authentication and Dashboard Access**

**1.1 Admin User Navigates to Admin Portal**

- **Actor:** Admin User
- **Description:** User accesses admin interface via dedicated URL or "Admin" menu option
- **Frontend Action:** Route to `/admin` or `/admin/dashboard`
- **Note:** Only visible to users with Admin role

**1.2 Frontend Validates Admin Session**

- **Actor:** Frontend
- **Action:** Check for valid JWT with Admin role claim
- **Decision Point:**
    - **No Valid Session or Non-Admin Role:** Redirect to login with `returnUrl=/admin`. **Workflow terminates.**
    - **Valid Admin Session:** Proceed to 1.3.

**1.3 Frontend Requests Admin Dashboard Data**

- **Actor:** Frontend → Backend API
- **Action:**

  `GET /api/admin/dashboard`

- **Headers:** `Authorization: Bearer <admin_jwt>`

**1.4 Backend Validates Admin Authorization**

- **Actor:** Backend API
- **Validation:**
    - JWT signature valid
    - Token not expired
    - User has `Admin` role claim
    - Admin account is active (not suspended)
- **Decision Point:**
    - **Authorization Failed:** Return `403 Forbidden`. **Workflow terminates.**
    - **Authorized:** Proceed to 1.5.

**1.5 Backend Retrieves Platform Summary Metrics**

- **Actor:** Backend API → SQL Server / Azure Application Insights
- **Queries (Parallel Execution):User Metrics:**

sql

  `SELECT 
      COUNT(DISTINCT Id) AS TotalUsers,
      COUNT(DISTINCT CASE WHEN LastActivityAt > DATEADD(day, -7, GETUTCDATE()) THEN Id END) AS ActiveUsers7Days,
      COUNT(DISTINCT CASE WHEN LastActivityAt > DATEADD(day, -30, GETUTCDATE()) THEN Id END) AS ActiveUsers30Days,
      COUNT(DISTINCT CASE WHEN CreatedAt > DATEADD(day, -7, GETUTCDATE()) THEN Id END) AS NewUsers7Days
  FROM Users`

**Submission Metrics:**

sql

  `SELECT 
      COUNT(*) AS TotalSubmissions,
      AVG(FinalScore) AS AverageScore,
      COUNT(CASE WHEN Status = 'Pending' THEN 1 END) AS PendingSubmissions,
      COUNT(CASE WHEN Status = 'Processing' THEN 1 END) AS ProcessingSubmissions,
      COUNT(CASE WHEN Status = 'Failed' THEN 1 END) AS FailedSubmissions,
      AVG(ProcessingTime) AS AvgProcessingTime
  FROM Submissions
  WHERE CreatedAt > DATEADD(day, -30, GETUTCDATE())`

**Task Metrics:**

sql

  `SELECT 
      COUNT(*) AS TotalTasks,
      COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveTasks,
      COUNT(DISTINCT TrackType) AS TotalTracks
  FROM Tasks`

**System Health (from Azure Application Insights):**

- API response time (p50, p95, p99)
- Error rate (5xx responses)
- Queue depth (Azure Service Bus)
- AI service latency and error rate
- Database query performance

**1.6 Backend Constructs Dashboard Response**

- **Actor:** Backend API
- **Response Payload:**

json

  `{
    "summary": {
      "totalUsers": 1247,
      "activeUsers7Days": 342,
      "activeUsers30Days": 678,
      "newUsers7Days": 54,
      "totalSubmissions": 4521,
      "avgSubmissionScore": 74.3,
      "pendingSubmissions": 12,
      "processingSubmissions": 3,
      "failedSubmissions": 8,
      "avgProcessingTime": 187, // seconds
      "totalTasks": 156,
      "activeTasks": 142,
      "totalTracks": 8
    },
    "systemHealth": {
      "apiResponseTime_p95": 342, // ms
      "errorRate": 0.3, // percent
      "queueDepth": 15,
      "aiServiceLatency": 1850, // ms
      "aiServiceErrors": 2 // last hour
    },
    "recentAlerts": [
      {
        "severity": "warning",
        "message": "AI service latency exceeded 2s threshold",
        "timestamp": "2025-12-14T10:45:00Z"
      }
    ],
    "topTasks": [
      {"taskId": "<guid>", "title": "Build REST API", "submissionCount": 234},
      // top 5 by submission count
    ]
  }
````

**1.7 Backend Returns Dashboard Data**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK` with comprehensive dashboard payload
- **Performance:** Response time < 1 second (pre-aggregated data)

**1.8 Frontend Renders Admin Dashboard**

- **Actor:** Frontend
- **Components Displayed:**
    - **KPI Cards:** Total users, active users, submissions, avg score
    - **Charts:**
        - User growth trend (line chart, 30 days)
        - Submission volume (bar chart, weekly)
        - Score distribution (histogram)
        - System health indicators (gauges)
    - **Quick Actions:**
        - "Create New Task"
        - "View All Tasks"
        - "View Analytics"
        - "View System Logs"
    - **Recent Alerts:** List of warnings/errors
    - **Top Tasks:** Most popular tasks by submission count

---

### **Decision Point: Admin Action Selection**

**Admin chooses one of two primary workflows:**

- **Path A:** Task Library Management → Proceed to Phase 2
- **Path B:** Platform Analytics & Monitoring → Proceed to Phase 3

---

**Phase 2: Task Library Management**

**2.1 Admin Navigates to Task Management**

- **Actor:** Admin User
- **Action:** Click "Manage Tasks" from dashboard or navigation menu
- **Frontend:** Navigate to `/admin/tasks`

**2.2 Frontend Requests Task List**

- **Actor:** Frontend → Backend API
- **Action:**

```
  GET /api/admin/tasks?page=1&pageSize=20&status=all&track=all&sortBy=createdAt&order=desc
```

**2.3 Backend Retrieves Tasks**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      T.Id,
      T.Title,
      T.Difficulty,
      T.Category,
      T.TrackType,
      T.EstimatedTime,
      T.IsActive,
      T.Status, -- 'Draft', 'Published', 'Archived'
      T.Version,
      T.CreatedBy,
      T.CreatedAt,
      T.UpdatedAt,
      (SELECT COUNT(*) FROM Submissions WHERE TaskId = T.Id) AS SubmissionCount,
      (SELECT AVG(FinalScore) FROM Submissions WHERE TaskId = T.Id) AS AvgScore
  FROM Tasks T
  WHERE (@Status = 'all' OR T.Status = @Status)
    AND (@Track = 'all' OR T.TrackType = @Track)
  ORDER BY 
      CASE WHEN @SortBy = 'createdAt' THEN T.CreatedAt END DESC,
      CASE WHEN @SortBy = 'title' THEN T.Title END ASC,
      CASE WHEN @SortBy = 'submissions' THEN (SELECT COUNT(*) FROM Submissions WHERE TaskId = T.Id) END DESC
  OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
````

**2.4 Frontend Displays Task List**

- **Actor:** Frontend
- **UI Elements:**
    - **Filters:** Status (Draft/Published/Archived), Track, Difficulty
    - **Search Bar:** Full-text search on title/description
    - **Sort Options:** Created date, Title, Submission count
    - **Task Cards/Table:** Each row shows:
        - Title
        - Difficulty badge
        - Track tags
        - Status indicator
        - Submission count
        - Avg score
        - Quick actions: Edit, View Details, Archive/Activate
    - **Actions Bar:** "Create New Task" button

---

**Sub-Workflow 2A: Create New Task**

**2A.1 Admin Clicks "Create New Task"**

- **Actor:** Admin User
- **Frontend:** Navigate to `/admin/tasks/new` or open modal

**2A.2 Frontend Displays Task Creation Form**

- **Actor:** Frontend
- **Form Fields:**
    - **Basic Info:**
        - Title (required, max 200 chars)
        - Description (required, rich text editor, max 2000 chars)
        - Learning Objectives (list, min 3)
    - **Classification:**
        - Difficulty: Beginner / Intermediate / Advanced (required)
        - Category: dropdown (e.g., "Frontend", "Backend", "Security", "Testing")
        - Track Type: Multi-select (Full Stack, Backend, Frontend, Python, etc.)
        - Tags: Free text, comma-separated
    - **Specifications:**
        - Expected Language: JavaScript, Python, C#, Java, etc.
        - Estimated Time: Hours (numeric)
        - Prerequisites: Multi-select from existing tasks
    - **Content:**
        - Detailed Instructions (rich text, max 5000 chars)
        - Starter Code Template (code editor, optional)
        - Test Cases / Acceptance Criteria (list)
        - Reference Solution (code editor, optional - for internal use)
    - **Resources:**
        - External Learning Links (list of URLs with titles)
    - **Status:**
        - Save as Draft (default)
        - Publish Immediately (checkbox)

**2A.3 Admin Fills Form and Submits**

- **Actor:** Admin User
- **Action:** Complete form and click "Save" or "Save & Publish"

**2A.4 Frontend Validates Form**

- **Actor:** Frontend
- **Client-Side Validation:**
    - All required fields present
    - Title unique (check against existing tasks)
    - Numeric fields within valid ranges
    - URLs properly formatted
- **Decision Point:**
    - **Validation Fails:** Display inline errors, highlight invalid fields. **Return to 2A.3.**
    - **Validation Succeeds:** Proceed to 2A.5.

**2A.5 Frontend Sends Create Task Request**

- **Actor:** Frontend → Backend API
- **Action:**

```
  POST /api/admin/tasks
  {
    "title": "Implement Rate Limiting Middleware",
    "description": "Build a middleware that prevents API abuse...",
    "learningObjectives": [
      "Understand rate limiting algorithms",
      "Implement sliding window counter",
      "Handle distributed systems with Redis"
    ],
    "difficulty": "Intermediate",
    "category": "Backend",
    "trackTypes": ["Backend", "FullStack"],
    "tags": ["security", "middleware", "redis"],
    "expectedLanguage": "JavaScript",
    "estimatedTime": 3,
    "prerequisites": ["<task_guid_1>", "<task_guid_2>"],
    "detailedInstructions": "<rich_html_content>",
    "starterCode": "// Optional starter template",
    "testCases": ["API should limit to 100 req/min", "..."],
    "referenceSolution": "// Internal use only",
    "resources": [
      {"title": "Rate Limiting Patterns", "url": "https://..."}
    ],
    "status": "Draft" // or "Published"
  }
```

**2A.6 Backend Validates Request**

- **Actor:** Backend API
- **Server-Side Validation:**
    - Admin authorization verified
    - All required fields present
    - Title unique in database
    - Prerequisites exist and are valid
    - Category and track types valid enum values
- **Decision Point:**
    - **Validation Fails:** Return `400 Bad Request` with detailed errors. **Workflow terminates for this attempt.**
    - **Validation Succeeds:** Proceed to 2A.7.

**2A.7 Backend Creates Task Record**

- **Actor:** Backend API → SQL Server
- **Transaction Begin**
- **Action:**

sql

  `INSERT INTO Tasks (
      Id, Title, Description, LearningObjectives, Difficulty, Category,
      ExpectedLanguage, EstimatedTime, DetailedInstructions, StarterCode,
      TestCases, ReferenceSolution, Status, Version, IsActive,
      CreatedBy, CreatedAt, ImpactScore
  )
  VALUES (
      NEWID(), @Title, @Description, @LearningObjectivesJSON, @Difficulty,
      @Category, @ExpectedLanguage, @EstimatedTime, @Instructions,
      @StarterCode, @TestCasesJSON, @ReferenceSolution, @Status, 1,
      CASE WHEN @Status = 'Published' THEN 1 ELSE 0 END,
      @AdminUserId, GETUTCDATE(), @ImpactScore
  )`

- **Capture:** `taskId` from insert

**2A.8 Backend Creates Track Associations**

- **Actor:** Backend API → SQL Server
- **Action:** For each selected track type:

sql

  `INSERT INTO TaskTracks (Id, TaskId, TrackType)
  VALUES (NEWID(), @TaskId, @TrackType)`

**2A.9 Backend Creates Prerequisite Relationships**

- **Actor:** Backend API → SQL Server
- **Action:** For each prerequisite:

sql

  `INSERT INTO TaskPrerequisites (Id, TaskId, PrerequisiteTaskId)
  VALUES (NEWID(), @TaskId, @PrerequisiteId)`

**2A.10 Backend Stores Learning Resources**

- **Actor:** Backend API → SQL Server
- **Action:** For each resource:

sql

  `INSERT INTO TaskResources (Id, TaskId, Title, Url, Type, CreatedAt)
  VALUES (NEWID(), @TaskId, @Title, @Url, 'External', GETUTCDATE())`

**2A.11 Backend Logs Admin Action**

- **Actor:** Backend API → SQL Server
- **Audit Log:**

sql

  `INSERT INTO AdminAuditLogs (
      Id, AdminUserId, Action, EntityType, EntityId,
      ChangeDetails, IpAddress, Timestamp
  )
  VALUES (
      NEWID(), @AdminUserId, 'TaskCreated', 'Task', @TaskId,
      @ChangeDetailsJSON, @IpAddress, GETUTCDATE()
  )`

**2A.12 Backend Commits Transaction**

- **Actor:** Backend API
- **Decision Point:**
    - **Transaction Fails:** Rollback all changes, return `500 Internal Server Error`. **Workflow terminates.**
    - **Transaction Succeeds:** Proceed to 2A.13.

**2A.13 Backend Invalidates Task Cache**

- **Actor:** Backend API → Redis
- **Action:** Clear cached task lists and search indices
- **Purpose:** Ensure frontend displays updated task inventory

**2A.14 Backend Returns Success Response**

- **Actor:** Backend API → Frontend
- **Response:** `201 Created`

json

  `{
    "taskId": "<guid>",
    "title": "Implement Rate Limiting Middleware",
    "status": "Draft",
    "message": "Task created successfully",
    "viewUrl": "/admin/tasks/<guid>"
  }`

**2A.15 Frontend Displays Success Notification**

- **Actor:** Frontend
- **Actions:**
    - Display success toast: "Task created successfully ✓"
    - Navigate to task list or task detail page
    - Highlight newly created task

---

**Sub-Workflow 2B: Edit Existing Task**

**2B.1 Admin Selects Task to Edit**

- **Actor:** Admin User
- **Action:** Click "Edit" button on task card in task list
- **Frontend:** Navigate to `/admin/tasks/{taskId}/edit`

**2B.2 Frontend Requests Task Details**

- **Actor:** Frontend → Backend API
- **Action:**

```
  GET /api/admin/tasks/{taskId}
```

**2B.3 Backend Retrieves Full Task Data**

- **Actor:** Backend API → SQL Server
- **Query:**

sql

  `SELECT 
      T.*,
      (SELECT TrackType FROM TaskTracks WHERE TaskId = T.Id FOR JSON PATH) AS Tracks,
      (SELECT PrerequisiteTaskId FROM TaskPrerequisites WHERE TaskId = T.Id FOR JSON PATH) AS Prerequisites,
      (SELECT Title, Url FROM TaskResources WHERE TaskId = T.Id FOR JSON PATH) AS Resources,
      U.Email AS CreatedByEmail
  FROM Tasks T
  INNER JOIN Users U ON T.CreatedBy = U.Id
  WHERE T.Id = @TaskId`

**2B.4 Frontend Populates Edit Form**

- **Actor:** Frontend
- **Action:** Pre-fill all form fields with existing task data
- **UI Notes:**
    - Display version number
    - Show "Last updated by [admin_email] on [date]"
    - If task is Published, show warning: "Editing will create a new version"

**2B.5 Admin Modifies Task and Submits**

- **Actor:** Admin User
- **Action:** Edit fields and click "Save Changes"

**2B.6 Frontend Validates Changes**

- **Actor:** Frontend
- **Validation:** Same as create workflow (2A.4)
- **Decision Point:**
    - **Validation Fails:** Display errors. **Return to 2B.5.**
    - **Validation Succeeds:** Proceed to 2B.7.

**2B.7 Frontend Sends Update Request**

- **Actor:** Frontend → Backend API
- **Action:**

```
  PUT /api/admin/tasks/{taskId}
  {
    // Full task object with modifications
    "version": 2, // optimistic concurrency check
    "title": "Updated Title",
    // ... all fields
  }
```

**2B.8 Backend Validates Update Request**

- **Actor:** Backend API
- **Validation:**
    - Admin authorization
    - Task exists
    - Version matches (prevent lost updates)
    - Modified fields valid
- **Decision Point:**
    - **Version Mismatch (409 Conflict):** Return error: "Task was modified by another admin". **Workflow terminates.**
    - **Validation Fails:** Return `400 Bad Request`. **Workflow terminates.**
    - **Valid:** Proceed to 2B.9.

**2B.9 Backend Determines Update Strategy**

- **Actor:** Backend API
- **Logic:**
    - **If Task Status = Draft:** Update in-place (no versioning)
    - **If Task Status = Published:** Create new version, archive old version
- **Decision Point:**
    - **Draft → Update In-Place:** Proceed to 2B.10A
    - **Published → Create Version:** Proceed to 2B.10B

---

**Path 2B.10A: Update Draft Task (In-Place)**

**2B.10A Backend Updates Task Record**

- **Actor:** Backend API → SQL Server
- **Transaction Begin**
- **Action:**

sql

  `UPDATE Tasks
  SET 
      Title = @Title,
      Description = @Description,
      LearningObjectives = @LearningObjectivesJSON,
      Difficulty = @Difficulty,
      Category = @Category,
      -- ... all updatable fields
      UpdatedBy = @AdminUserId,
      UpdatedAt = GETUTCDATE()
  WHERE Id = @TaskId AND Version = @CurrentVersion`

**2B.10A.2 Delete and Recreate Associations**

- **Actor:** Backend API → SQL Server
- **Actions:**

sql

  `DELETE FROM TaskTracks WHERE TaskId = @TaskId;
  DELETE FROM TaskPrerequisites WHERE TaskId = @TaskId;
  DELETE FROM TaskResources WHERE TaskId = @TaskId;
  
  -- Re-insert with new values (same as create workflow)`

**2B.10A.3 Log Admin Action**

- **Actor:** Backend API → SQL Server
- **Audit Log:**

sql

  `INSERT INTO AdminAuditLogs (...)
  VALUES (..., 'TaskUpdated', 'Task', @TaskId, @ChangeDetailsJSON, ...)`

**2B.10A.4 Commit Transaction and Return**

- **Actor:** Backend API
- **Response:** `200 OK` with updated task data
- **→ Skip to 2B.12**

---

**Path 2B.10B: Update Published Task (Create New Version)**

**2B.10B.1 Backend Archives Current Version**

- **Actor:** Backend API → SQL Server
- **Transaction Begin**
- **Action:**

sql

  `UPDATE Tasks
  SET 
      IsActive = 0,
      Status = 'Archived',
      ArchivedAt = GETUTCDATE(),
      ArchivedBy = @AdminUserId
  WHERE Id = @TaskId`

**2B.10B.2 Backend Creates New Version**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `INSERT INTO Tasks (
      Id, Title, Description, ...,
      Version, PreviousVersionId,
      CreatedBy, CreatedAt, Status, IsActive
  )
  SELECT 
      NEWID(), -- new ID
      @NewTitle, @NewDescription, ..., -- updated values
      Version + 1, -- increment version
      @TaskId, -- link to previous version
      @AdminUserId, GETUTCDATE(), @Status, 1
  FROM Tasks
  WHERE Id = @TaskId`

- **Capture:** `newTaskId`

**2B.10B.3 Backend Recreates Associations for New Version**

- **Actor:** Backend API → SQL Server
- **Action:** Insert tracks, prerequisites, resources for new task version

**2B.10B.4 Backend Updates Learning Paths**

- **Actor:** Backend API → SQL Server
- **Action:** Replace old task ID with new version ID in active learning paths

sql

  `UPDATE PathTasks
  SET TaskId = @NewTaskId
  WHERE TaskId = @OldTaskId
    AND PathId IN (SELECT Id FROM LearningPaths WHERE IsActive = 1)`

- **Note:** Maintains continuity for learners with this task in their path

**2B.10B.5 Log Admin Action**

- **Actor:** Backend API → SQL Server
- **Audit Log:**

sql

  `INSERT INTO AdminAuditLogs (...)
  VALUES (..., 'TaskVersionCreated', 'Task', @NewTaskId, 
         JSON: {oldVersion: @TaskId, newVersion: @NewTaskId, changes: ...}, ...)`

**2B.10B.6 Commit Transaction and Return**

- **Actor:** Backend API
- **Response:** `200 OK`

json

  `{
    "oldTaskId": "<old_guid>",
    "newTaskId": "<new_guid>",
    "version": 3,
    "message": "New task version created successfully",
    "affectedLearningPaths": 42
  }
````

---

**2B.12 Frontend Displays Update Confirmation**

- **Actor:** Frontend
- **Actions:**
    - Display success toast with appropriate message
    - Refresh task list or task detail view
    - If new version created, show notification: "Task updated. New version created. 42 learning paths updated."

---

**Sub-Workflow 2C: Archive/Activate Task**

**2C.1 Admin Selects Archive/Activate Action**

- **Actor:** Admin User
- **Action:** Click "Archive" or "Activate" button on task card
- **Frontend:** Display confirmation dialog

**2C.2 Admin Confirms Action**

- **Actor:** Admin User
- **Action:** Click "Confirm" in dialog

**2C.3 Frontend Sends Status Update Request**

- **Actor:** Frontend → Backend API
- **Action:**

```
  PATCH /api/admin/tasks/{taskId}/status
  {
    "status": "Archived", // or "Published"
    "reason": "Task outdated - superseded by v3" // optional
  }
```

**2C.4 Backend Updates Task Status**

- **Actor:** Backend API → SQL Server
- **Action:**

sql

  `UPDATE Tasks
  SET 
      Status = @NewStatus,
      IsActive = CASE WHEN @NewStatus = 'Published' THEN 1 ELSE 0 END,
      ArchivedAt = CASE WHEN @NewStatus = 'Archived' THEN GETUTCDATE() ELSE NULL END,
      ArchivedBy = CASE WHEN @NewStatus = 'Archived' THEN @AdminUserId ELSE NULL END,
      UpdatedAt = GETUTCDATE()
  WHERE Id = @TaskId
````

**2C.5 Backend Logs Action**

- **Actor:** Backend API → SQL Server
- **Audit Log:** INSERT INTO AdminAuditLogs with action details

**2C.6 Backend Returns Success**

- **Response:** `200 OK`

**2C.7 Frontend Updates UI**

- **Actor:** Frontend
- **Actions:**
    - Update task card status badge
    - Display success toast
    - Optionally remove from active tasks list if archived

---

**Phase 3: Platform Analytics & Monitoring**

**3.1 Admin Navigates to Analytics Dashboard**

- **Actor:** Admin User
- **Action:** Click "Analytics" from main admin menu
- **Frontend:** Navigate to `/admin/analytics`

**3.2 Frontend Requests Analytics Data**

- **Actor:** Frontend → Backend API
- **Action:**

```
  GET /api/admin/analytics?period=30days&metrics=all
```

- **Query Parameters:**
    - `period`: 7days / 30days / 90days / custom
    - `metrics`: all / users / submissions / performance / costs

**3.3 Backend Aggregates Analytics Data**

- **Actor:** Backend API → SQL Server / Azure Application Insights
- **Parallel Queries:** **User Analytics:**

sql

  `SELECT 
      CAST(CreatedAt AS DATE) AS Date,
      COUNT(*) AS NewUsers,
      SUM(COUNT(*)) OVER (ORDER BY CAST(CreatedAt AS DATE)) AS CumulativeUsers
  FROM Users
  WHERE CreatedAt >= DATEADD(day, -@Days, GETUTCDATE())
  GROUP BY CAST(CreatedAt AS DATE)
  ORDER BY Date`

**Submission Analytics:**

sql

  `SELECT 
      T.Category,
      COUNT(S.Id) AS SubmissionCount,
      AVG(S.FinalScore) AS AvgScore,
      AVG(S.ProcessingTime) AS AvgProcessingTime,
      COUNT(CASE WHEN S.Status = 'Failed' THEN 1 END) AS FailureCount
  FROM Submissions S
  INNER JOIN Tasks T ON S.TaskId = T.Id
  WHERE S.CreatedAt >= DATEADD(day, -@Days, GETUTCDATE())
  GROUP BY T.Category`

**Learning Path Analytics:**

sql

  `SELECT 
      LP.TrackType,
      COUNT(DISTINCT LP.UserId) AS EnrolledUsers,
      AVG(LP.CompletionPercentage) AS AvgCompletion,
      AVG(DATEDIFF(day, LP.CreatedAt, COALESCE(LP.CompletedAt, GETUTCDATE()))) AS AvgDaysToComplete
  FROM LearningPaths LP
  WHERE LP.CreatedAt >= DATEADD(day, -@Days, GETUTCDATE())
  GROUP BY LP.TrackType`

**Feedback Quality Analytics:**

sql

  `SELECT 
      AVG(FR.Rating) AS AvgFeedbackRating,
      COUNT(CASE WHEN FR.Rating <= 2 THEN 1 END) AS LowRatings,
      COUNT(CASE WHEN FR.Rating >= 4 THEN 1 END) AS HighRatings,
      (SELECT TOP 1 CategoryRatings FROM FeedbackRatings 
       ORDER BY CreatedAt DESC FOR JSON PATH) AS RecentCategoryRatings
  FROM FeedbackRatings FR
  WHERE FR.CreatedAt >= DATEADD(day, -@Days, GETUTCDATE())`

**AI Service Performance (from Azure Application Insights):**

- Average token usage per submission
- Model distribution (GPT-4 vs Claude vs Ollama)
- Average inference time
- Error rate by model
- Cost per submission

**System Performance:**

- API latency percentiles (p50, p95, p99)
- Error rates by endpoint
- Queue depth trends
- Database query performance
- Static analysis tool execution times

**3.4 Backend Retrieves Cost Data**

- **Actor:** Backend API → Azure Cost Management API
- **Action:** Query Azure billing data for current month
- **Metrics:**
    - Total spend
    - Spend by service (App Service, SQL, Service Bus, AI, Storage)
    - Trend vs. previous month
    - Forecast to month-end

**3.5 Backend Constructs Analytics Response**

- **Actor:** Backend API
- **Response Payload:** (abbreviated)

json

  `{
    "period": "30days",
    "userAnalytics": {
      "totalUsers": 1247,
      "newUsers": 87,
      "activeUsers": 678,
      "growthRate": 7.5, // percent
      "dailySignups": [
        {"date": "2025-11-14", "count": 3},
        // ... 30 days
      ],
      "retentionRate_7day": 45.2,
      "retentionRate_30day": 28.7
    },
    "submissionAnalytics": {
      "totalSubmissions": 4521,
      "avgScore": 74.3,
      "failureRate": 0.2,
      "avgProcessingTime": 187,
      "byCategory": [
        {"category": "Backend", "count": 1234, "avgScore": 75.1},
        // ...
      ],
      "scoreDistribution": {
        "0-50": 123,
        "51-70": 456,
        "71-85": 789,
        "86-100": 321
      }
    },
    "learningPathAnalytics": {
      "byTrack": [
        {
          "track": "FullStack",
          "enrolledUsers": 342,
          "avgCompletion": 67.5,
          "avgDaysToComplete": 45
        },
        // ...
      ]
    },
    "feedbackQuality": {
      "avgRating": 4.2,
      "lowRatings": 34,
      "highRat`

ings": 456,
"categoryRatings": {
"accuracy": 4.5,
"clarity": 3.9,
"actionability": 4.3
}
},
"aiPerformance": {
"avgTokensPerSubmission": 3450,
"avgInferenceTime": 1850,
"modelDistribution": {
"gpt-4-turbo": 78,
"claude-3": 15,
"ollama": 7
},
"errorRate": 0.5,
"avgCostPerSubmission": 0.12 // USD
},
"systemHealth": {
"apiLatency_p95": 342,
"errorRate": 0.3,
"queueDepth": 15,
"dbQueryTime_p95": 123
},
"costs": {
"totalSpend": 1247.56,
"byService": {
"AI": 456.78,
"Compute": 389.12,
"Database": 234.56,
"Storage": 89.10,
"Other": 78.00
},
"monthlyForecast": 1890.00
}
}

**3.6 Backend Returns Analytics Data**

- **Actor:** Backend API → Frontend
- **Response:** `200 OK` with comprehensive analytics
- **Caching:** Analytics data cached for 5 minutes (Redis)

**3.7 Frontend Renders Analytics Dashboard**

- **Actor:** Frontend
- **Visualizations:**
    - **User Growth:** Line chart showing daily signups and cumulative users
    - **Submission Volume:** Bar chart by category
    - **Score Distribution:** Histogram
    - **Learning Path Completion:** Horizontal bar chart by track
    - **Feedback Quality:** Gauge charts for rating categories
    - **AI Performance:** Multi-metric dashboard (tokens, latency, cost)
    - **System Health:** Real-time indicators (green/yellow/red)
    - **Cost Breakdown:** Pie chart by service + trend line

**3.8 Admin Reviews Key Metrics**

- **Actor:** Admin User
- **Interactive Exploration:**
    - Hover over charts for detailed tooltips
    - Click category bars to drill down
    - Adjust time period filter
    - Export data to CSV/PDF

---

**Sub-Workflow 3A: Investigate Anomaly or Alert**

**3A.1 Admin Notices Alert or Anomaly**

- **Actor:** Admin User
- **Examples:**
    - Feedback quality rating dropped below 4.0
    - AI service error rate spiked to 5%
    - Processing time exceeded 5 minutes for multiple submissions
    - Cost forecast exceeds budget

**3A.2 Admin Clicks on Alert/Metric**

- **Actor:** Admin User
- **Action:** Click on alert banner or metric card

**3A.3 Frontend Requests Detailed Drill-Down Data**

- **Actor:** Frontend → Backend API
- **Example:**`

GET /api/admin/analytics/ai-errors?period=24hours&groupBy=model

`**3A.4 Backend Retrieves Detailed Logs**

- **Actor:** Backend API → SQL Server / Azure Application Insights
- **Query Examples:**
    
    **AI Errors:**
    

```sql
  SELECT
      AI.Id,
      AI.SubmissionId,
      AI.ModelUsed,
      AI.ErrorMessage,
      AI.CreatedAt,
      S.UserId,
      T.Title AS TaskTitle
  FROM AIAnalysis AI
  INNER JOIN Submissions S ON AI.SubmissionId = S.Id
  INNER JOIN Tasks T ON S.TaskId = T.Id
  WHERE AI.Status = 'Failed'
    AND AI.CreatedAt >= DATEADD(hour, -24, GETUTCDATE())
  ORDER BY AI.CreatedAt DESC

```

**Low-Rated Feedback:**

```sql
  SELECT
      FR.FeedbackId,
      FR.Rating,
      FR.Comment,
      FR.CategoryRatings,
      F.OverallScore,
      S.TaskId,
      T.Title AS TaskTitle,
      U.Email AS UserEmail
  FROM FeedbackRatings FR
  INNER JOIN Feedback F ON FR.FeedbackId = F.Id
  INNER JOIN Submissions S ON F.SubmissionId = S.Id
  INNER JOIN Tasks T ON S.TaskId = T.Id
  INNER JOIN Users U ON S.UserId = U.Id
  WHERE FR.Rating <= 2
    AND FR.CreatedAt >= DATEADD(day, -7, GETUTCDATE())
  ORDER BY FR.CreatedAt DESC

```

**3A.5 Frontend Displays Drill-Down View**

- **Actor:** Frontend
- **Content:**
    - Table of individual incidents/records
    - Filters and search
    - Export options
    - Action buttons: "View Submission", "Contact User", "Flag for Review"

**3A.6 Admin Takes Corrective Action**

- **Actor:** Admin User
- **Possible Actions:**
    - Adjust AI service configuration
    - Scale up/down resources
    - Flag task for content review
    - Contact user for feedback
    - Create internal support ticket

---

### **Sub-Workflow 3B: Generate Analytics Report**

**3B.1 Admin Clicks "Generate Report"**

- **Actor:** Admin User
- **Action:** Click button to export analytics data

**3B.2 Frontend Displays Report Configuration Modal**

- **Actor:** Frontend
- **Options:**
    - Report Type: Executive Summary / Detailed Metrics / Custom
    - Time Period: Last 7/30/90 days or custom date range
    - Sections: Select which analytics to include (users, submissions, costs, etc.)
    - Format: PDF / Excel / CSV
    - Recipients: Email addresses (optional - send directly)

**3B.3 Admin Configures and Submits**

- **Actor:** Admin User
- **Action:** Select options and click "Generate Report"

**3B.4 Frontend Sends Report Generation Request**

- **Actor:** Frontend → Backend API
- **Action:**

```
POST /api/admin/analytics/reports
{
"reportType": "detailed",
"period": {"start": "2025-11-14", "end": "2025-12-14"},
"sections": ["users", "submissions", "costs", "aiPerformance"],
"format": "pdf",
"recipients": ["[manager@company.com](<mailto:manager@company.com>)"]
}

```

**3B.5 Backend Enqueues Report Generation Job**

- **Actor:** Backend API → Azure Service Bus
- **Action:** Send message to `report-generation-queue`
- **Response:** `202 Accepted

```json
  {
    "jobId": "<guid>",
    "status": "queued",
    "estimatedTime": "2-3 minutes"
  }

```

**3B.6 Background Worker Generates Report**

- **Actor:** Background Worker (separate from main diagram flow)
- **Steps:**
    1. Retrieve analytics data (same queries as 3.3)
    2. Generate visualizations (charts, tables)
    3. Compile into PDF/Excel using reporting library
    4. Upload to Blob Storage
    5. Send email if recipients specified
    6. Update job status to "completed"

**3B.7 Frontend Polls Job Status**

- **Actor:** Frontend
- **Action:** Periodically `GET /api/admin/analytics/reports/{jobId}/status`
- **Decision Point:**
    - **Status = "completed":** Proceed to 3B.8
    - **Status = "failed":** Display error
    - **Status = "queued" or "processing":** Continue polling

**3B.8 Frontend Displays Download Link**

- **Actor:** Frontend
- **Action:** Show success notification with "Download Report" button
- **Link:** Pre-signed URL to Blob Storage with 24-hour expiration

**3B.9 Admin Downloads Report**

- **Actor:** Admin User
- **Action:** Click "Download Report"
- **Result:** PDF/Excel file downloaded to local machine

---

**Phase 4: Workflow Completion and Session Logging**

**4.1 Admin Completes Administrative Session**

- **Actor:** Admin User
- **Action:** Navigate away, log out, or close browser

**4.2 Frontend Logs Admin Session Analytics**

- **Actor:** Frontend → Backend API (async)
- **Action:**

```
POST /api/analytics/admin-session
{
"adminUserId": "<guid>",
"sessionDuration": 1847, // seconds
"actionsPerformed": [
{"action": "TaskCreated", "taskId": "<guid>", "timestamp": "..."},
{"action": "AnalyticsViewed", "period": "30days", "timestamp": "..."},
{"action": "ReportGenerated", "reportId": "<guid>", "timestamp": "..."}
],
"pagesViewed": ["/admin/dashboard", "/admin/tasks", "/admin/analytics"]
}

```

**4.3 Backend Logs Session for Compliance**

- **Actor:** Backend API → SQL Server
- **Purpose:** Security audit, admin activity tracking, compliance

**→ Workflow Complete**

stop

---

### Decision Points Summary

| Decision Node | Condition | Path A | Path B |
| --- | --- | --- | --- |
| Admin Authorized? | Valid JWT + Admin role | → Access dashboard | → 403 Forbidden |
| Admin Action? | Task Management or Analytics | → Phase 2 or Phase 3 | N/A |
| Task Operation? | Create, Edit, or Archive | → Sub-workflow 2A, 2B, or 2C | N/A |
| Form Valid? | All validations pass | → Submit to backend | → Show errors, retry |
| Task Status? | Draft or Published | → Update in-place or create version | N/A |
| Version Conflict? | Optimistic concurrency check | → Reject with 409 | → Proceed with update |
| Anomaly Detected? | Metric threshold exceeded | → Drill-down investigation | → Continue monitoring |
| Report Ready? | Background job status | → Provide download link | → Continue polling |

---

### Parallel Activities

**Limited Parallelism in Admin Workflows:**

- **Report Generation:** Background job runs asynchronously; admin continues other tasks
- **Analytics Dashboard:** Multiple SQL queries execute in parallel for faster aggregation
- **No explicit fork/join in diagram:** Admin actions are primarily sequential

**Rationale:** Admin operations are less time-critical than user-facing workflows; prioritize data consistency over parallelism

---

### Performance Characteristics

**Target Response Times:**

- **Dashboard Load:** < 1 second (pre-aggregated metrics)
- **Task CRUD Operations:** < 500ms
- **Analytics Data Retrieval:** < 2 seconds (complex aggregations, cached)
- **Report Generation:** 2-3 minutes (background, non-blocking)

**Caching Strategy:**

- Dashboard metrics: 5-minute TTL
- Task lists: Invalidate on create/update/delete
- Analytics data: 5-minute TTL (acceptable staleness for admin use)

---

### Data Persistence

**AdminAuditLogs Table:**

```sql
CREATE TABLE AdminAuditLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    AdminUserId UNIQUEIDENTIFIER NOT NULL,
    Action VARCHAR(50) NOT NULL, -- 'TaskCreated', 'TaskUpdated', 'TaskArchived', etc.
    EntityType VARCHAR(50), -- 'Task', 'User', 'LearningPath'
    EntityId UNIQUEIDENTIFIER,
    ChangeDetails NVARCHAR(MAX), -- JSON with before/after values
    IpAddress VARCHAR(50),
    UserAgent NVARCHAR(500),
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (AdminUserId) REFERENCES Users(Id)
);

CREATE INDEX IX_AdminAuditLogs_AdminUser ON AdminAuditLogs(AdminUserId, Timestamp DESC);
CREATE INDEX IX_AdminAuditLogs_EntityType ON AdminAuditLogs(EntityType, EntityId);

```

**Tasks Table (Versioning Support):**

```sql
CREATE TABLE Tasks (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(2000) NOT NULL,
    -- ... all task fields
    Version INT NOT NULL DEFAULT 1,
    PreviousVersionId UNIQUEIDENTIFIER NULL, -- Links to previous version
    Status VARCHAR(20) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Published', 'Archived'
    IsActive BIT NOT NULL DEFAULT 0,
    CreatedBy UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy UNIQUEIDENTIFIER NULL,
    UpdatedAt DATETIME2 NULL,
    ArchivedBy UNIQUEIDENTIFIER NULL,
    ArchivedAt DATETIME2 NULL,
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
    FOREIGN KEY (PreviousVersionId) REFERENCES Tasks(Id)
);

```

---

### Alignment with Requirements

**Functional Requirements:**

- ✅ **FR-ADMIN-01:** User management (not fully detailed - out of scope for this diagram)
- ✅ **FR-ADMIN-02:** Task library management (create, edit, archive)
- ✅ **FR-ADMIN-03:** Learning track management (via task-track associations)
- ✅ **FR-ADMIN-04:** Analytics dashboard (comprehensive platform metrics)
- ✅ **FR-ADMIN-07:** System health monitoring

**Non-Functional Requirements:**

- ✅ **NFR-SEC-02:** RBAC for admin endpoints
- ✅ **NFR-COMP-07:** Audit logging for all admin actions
- ✅ **NFR-PERF-01:** Dashboard response time < 1s
- ✅ **NFR-MAIN-07:** Comprehensive logging and observability

## **4.5 Sequence Diagrams**

### **4.5.1 Sequence Diagram: User Authentication (Email/Password + GitHub OAuth)**

### Overview

This sequence diagram models the complete user authentication workflow, illustrating the temporal ordering of message exchanges between system components during login operations. The diagram encompasses both traditional email/password authentication and OAuth 2.0-based GitHub authentication, demonstrating how these distinct authentication mechanisms interact with the platform's security infrastructure.

**Purpose:**

- Visualize the chronological flow of authentication requests and responses
- Demonstrate interaction between client, server, external identity provider, and data stores
- Illustrate security validation checkpoints and token generation processes
- Show both synchronous and asynchronous communication patterns
- Model error handling and alternative authentication paths

**Scope:**

- User-initiated login via email/password
- User-initiated login via GitHub OAuth
- JWT token generation and issuance
- Session management with Redis
- Security validations (rate limiting, account status, CSRF protection)
- Database interactions for user verification
- External API calls to GitHub OAuth provider

**Alignment with Previous Diagrams:**

- **Activity Diagram 4.4.2:** Provides the logical flow; this sequence diagram adds temporal ordering and message-level details
- **Use Case UC_Login:** Implements the login use case with detailed interactions
- **Functional Requirements:** FR-AUTH-01 through FR-AUTH-08

---

### Lifelines (Participants)

The sequence diagram includes the following lifelines, representing entities that participate in the authentication workflow:

**1. User**

- **Type:** Human Actor
- **Role:** Initiates authentication by providing credentials or selecting OAuth provider
- **Interactions:** Provides input, clicks buttons, receives UI feedback

**2. Frontend (React Application)**

- **Type:** Client Application
- **Role:** User interface layer; validates input, manages local state, displays responses
- **Technology:** React with TypeScript, Redux for state management
- **Responsibilities:**
    - Render login form
    - Perform client-side validation
    - Construct and send HTTP requests
    - Handle authentication tokens
    - Manage routing post-authentication

**3. Backend API (ASP.NET Core)**

- **Type:** Application Server
- **Role:** Central orchestrator for authentication logic
- **Technology:** ASP.NET Core 8 with Identity framework
- **Responsibilities:**
    - Validate request payloads
    - Enforce security policies (rate limiting)
    - Coordinate with data stores and external services
    - Generate JWT tokens
    - Return authentication responses

**4. Redis Cache**

- **Type:** In-Memory Data Store
- **Role:** Fast access for rate limiting and session management
- **Responsibilities:**
    - Track login attempts (rate limiting)
    - Store session metadata
    - Provide sub-millisecond response times

**5. SQL Server Database**

- **Type:** Relational Database
- **Role:** Persistent storage for user credentials and account data
- **Responsibilities:**
    - Store user records (email, password hash, account status)
    - Store refresh tokens
    - Maintain OAuth provider associations (GitHub ID, encrypted tokens)

**6. ASP.NET Core Identity**

- **Type:** Security Framework (Component within Backend API)
- **Role:** Password hashing and verification
- **Responsibilities:**
    - Verify password hash using PBKDF2
    - Manage password policies
    - Handle account lockout logic

**7. GitHub OAuth Provider**

- **Type:** External Identity Provider
- **Role:** Third-party authentication via OAuth 2.0
- **Responsibilities:**
    - Authenticate user via GitHub credentials
    - Issue authorization codes
    - Provide access tokens upon code exchange

**8. GitHub API**

- **Type:** External REST API
- **Role:** Provide authenticated user profile data
- **Responsibilities:**
    - Return user email, name, avatar, and GitHub ID
    - Validate access tokens

---

### Interaction Flow Description

The sequence diagram is organized into three primary interaction flows:

---

### **Flow 1: Email/Password Authentication (Main Success Scenario)**

**Precondition:** User navigates to login page and selects email/password authentication method.

**Step 1: User Submits Credentials**

- **Message:** User → Frontend: `submitLogin(email, password)`
- **Description:** User enters email and password in the login form and clicks "Login" button
- **UI State:** Button disabled, loading spinner displayed

**Step 2: Client-Side Validation**

- **Message:** Frontend → Frontend: `validateInput(email, password)`
- **Description:** Frontend performs local validation
    - Email format validation (regex)
    - Password non-empty and minimum length check
- **Decision Point (alt fragment):**
    - **[validation fails]:**
        - Frontend displays inline error messages
        - **Return to Step 1** (user corrects input)
    - **[validation succeeds]:**
        - Proceed to Step 3

**Step 3: Send Login Request**

- **Message:** Frontend → Backend API: `POST /api/auth/login {email, password, rememberMe}`
- **HTTP Details:**
    - **Method:** POST
    - **Endpoint:** `/api/auth/login`
    - **Headers:** `Content-Type: application/json`
    - **Payload:**

json

    `{
      "email": "user@example.com",
      "password": "SecurePass123!",
      "rememberMe": false
    }`

**Step 4: Rate Limit Check**

- **Message:** Backend API → Redis: `INCR login_attempts:{ipAddress}`
- **Description:** Backend increments counter for login attempts from the client IP address
- **Message:** Redis → Backend API: `return attemptCount`
- **Decision Point (alt fragment):**
    - **[attemptCount > 5]:**
        - Backend API → Frontend: `429 Too Many Requests {retryAfter: 900}`
        - Frontend displays: "Too many login attempts. Try again in 15 minutes."
        - **Sequence terminates**
    - **[attemptCount ≤ 5]:**
        - Proceed to Step 5

**Step 5: Validate Request Payload**

- **Message:** Backend API → Backend API: `validatePayload(request)`
- **Description:** Server-side validation using FluentValidation
    - Required fields present
    - Email format valid
    - Password meets minimum requirements
- **Decision Point (alt fragment):**
    - **[validation fails]:**
        - Backend API → Frontend: `400 Bad Request {errors}`
        - Frontend displays inline validation errors
        - **Sequence terminates**
    - **[validation succeeds]:**
        - Proceed to Step 6

**Step 6: Query User by Email**

- **Message:** Backend API → SQL Server: `SELECT * FROM Users WHERE Email = @Email`
- **Description:** Retrieve user record including password hash and account status
- **Message:** SQL Server → Backend API: `return userRecord`
- **Decision Point (alt fragment):**
    - **[user not found]:**
        - Backend API → Frontend: `401 Unauthorized {error: "Invalid email or password"}`
        - Frontend displays generic error message
        - **Sequence terminates**
    - **[user found]:**
        - Proceed to Step 7

**Step 7: Check Account Status**

- **Message:** Backend API → Backend API: `checkAccountStatus(user)`
- **Description:** Validate account is active, not locked, and email verified
- **Decision Point (alt fragment - multiple conditions):**
    - **[IsActive = false]:**
        - Backend API → Frontend: `403 Forbidden {error: "Account deactivated"}`
        - **Sequence terminates**
    - **[LockoutEnd > NOW()]:**
        - Backend API → Frontend: `403 Forbidden {error: "Account locked until [time]"}`
        - **Sequence terminates**
    - **[EmailVerified = false]:**
        - Backend API → Frontend: `403 Forbidden {error: "Email not verified"}`
        - **Sequence terminates**
    - **[account valid]:**
        - Proceed to Step 8

**Step 8: Verify Password**

- **Message:** Backend API → ASP.NET Core Identity: `VerifyHashedPassword(user, passwordHash, providedPassword)`
- **Description:** Use PBKDF2 algorithm to verify password against stored hash
- **Message:** ASP.NET Core Identity → Backend API: `return PasswordVerificationResult`
- **Decision Point (alt fragment):**
    - **[password incorrect]:**
        - **Sub-sequence: Handle Failed Login**
            - Backend API → SQL Server: `UPDATE Users SET FailedLoginAttempts += 1 WHERE Id = @UserId`
            - **Conditional:** If `FailedLoginAttempts >= 5`:
                - Backend API → SQL Server: `UPDATE Users SET LockoutEnd = DATEADD(minute, 15, GETUTCDATE())`
            - Backend API → Frontend: `401 Unauthorized {error: "Invalid credentials", attemptsRemaining: X}`
            - **Sequence terminates**
    - **[password correct]:**
        - Proceed to Step 9

**Step 9: Reset Failed Login Counter**

- **Message:** Backend API → SQL Server: `UPDATE Users SET FailedLoginAttempts = 0, LastLoginAt = GETUTCDATE() WHERE Id = @UserId`
- **Description:** Reset counter and update last login timestamp

**Step 10: Generate JWT Access Token**

- **Message:** Backend API → Backend API: `generateJWT(user)`
- **Description:** Create signed JWT with user claims
    - **Claims:** sub (user ID), email, role, email_verified
    - **Expiration:** 15 minutes (900 seconds)
    - **Algorithm:** RS256 (asymmetric signing)
- **Message:** Backend API → Backend API: `return accessToken`

**Step 11: Generate Refresh Token**

- **Message:** Backend API → Backend API: `generateRefreshToken()`
- **Description:** Create cryptographically secure random token
    - **Length:** 256-bit
    - **Expiration:** 7 days (or 30 days if "Remember Me" enabled)
- **Message:** Backend API → SQL Server: `INSERT INTO RefreshTokens (UserId, Token, ExpiresAt, CreatedByIP)`

**Step 12: Create Session in Redis**

- **Message:** Backend API → Redis: `SET session:{userId}:{sessionId} {sessionData}`
- **Description:** Store session metadata for fast lookup
- **Data Stored:**

json

  `{
    "userId": "<guid>",
    "email": "user@example.com",
    "role": "Learner",
    "loginTime": "ISO8601",
    "ipAddress": "192.168.1.100"
  }`

- **Expiration:** Matches refresh token expiration

**Step 13: Return Authentication Response**

- **Message:** Backend API → Frontend: `200 OK {accessToken, refreshToken, expiresIn, user}`
- **Response Payload:**

```json

  {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "f4e3d2c1b0a9...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "<guid>",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Learner",
      "hasCompletedAssessment": false
    }
  }

```

**Step 14: Store Tokens and Update State**

- **Message:** Frontend → Frontend: `storeTokens(accessToken, refreshToken)`
- **Description:**
    - Store access token in memory (Redux store)
    - Store refresh token in secure storage (httpOnly cookie or encrypted localStorage)
- **Message:** Frontend → Frontend: `updateAuthState(user)`
- **Description:** Update global authentication state to reflect logged-in status

**Step 15: Navigate to Destination**

- **Message:** Frontend → Frontend: `determineDestination(user, returnUrl)`
- **Routing Logic:**
    - If `returnUrl` exists → navigate to originally requested page
    - Else if `!user.hasCompletedAssessment` → navigate to `/assessment/start`
    - Else → navigate to `/dashboard`
- **Message:** Frontend → User: `redirect to destination`

**End of Email/Password Authentication Flow**

---

### **Flow 2: GitHub OAuth Authentication (Alternative Flow)**

**Precondition:** User navigates to login page and selects "Continue with GitHub" option.

**Step 1: User Initiates OAuth Flow**

- **Message:** User → Frontend: `clickGitHubLogin()`
- **Description:** User clicks "Continue with GitHub" button

**Step 2: Generate CSRF Token**

- **Message:** Frontend → Frontend: `generateCSRFToken()`
- **Description:** Generate cryptographically secure random token (128-bit)
- **Message:** Frontend → Frontend: `sessionStorage.setItem('oauth_state', csrfToken)`
- **Purpose:** Prevent CSRF attacks during OAuth callback

**Step 3: Construct GitHub Authorization URL**

- **Message:** Frontend → Frontend: `buildGitHubAuthURL(clientId, redirectUri, scope, state)`
- **URL Format:**

```
  <https://github.com/login/oauth/authorize>
    ?client_id=<client_id>
    &redirect_uri=https://platform.com/auth/github/callback
    &scope=user:email,read:user
    &state=<csrf_token>

```

**Step 4: Redirect to GitHub**

- **Message:** Frontend → User: `redirect to GitHub OAuth URL`
- **Description:** Browser navigates away to [GitHub.com](http://github.com/)

**Step 5: User Authenticates on GitHub**

- **Message:** User → GitHub OAuth Provider: `authenticate(credentials)`
- **Description:** User logs into GitHub (if not already authenticated) and authorizes the application
- **GitHub Internal Steps:**
    1. Validate user credentials
    2. Display consent screen with requested permissions
    3. User clicks "Authorize [Application]"

**Step 6: GitHub Issues Authorization Code**

- **Message:** GitHub OAuth Provider → GitHub OAuth Provider: `generateAuthorizationCode()`
- **Description:** GitHub creates single-use authorization code (valid for 10 minutes)

**Step 7: GitHub Redirects to Callback URL**

- **Message:** GitHub OAuth Provider → Frontend: `redirect to callback URL with code and state`
- **Callback URL:**

```
  <https://platform.com/auth/github/callback>
    ?code=<authorization_code>
    &state=<csrf_token>

```

**Step 8: Frontend Receives Callback**

- **Message:** Frontend → Frontend: `parseCallbackParameters(url)`
- **Description:** Extract `code` and `state` from URL query parameters

**Step 9: Validate CSRF State**

- **Message:** Frontend → Frontend: `validateCSRFToken(receivedState, storedState)`
- **Description:** Compare received state with stored value
- **Decision Point (alt fragment):**
    - **[state mismatch]:**
        - Frontend → User: `display error: "Authentication failed - security validation error"`
        - **Sequence terminates**
    - **[state valid]:**
        - Proceed to Step 10

**Step 10: Send Callback Data to Backend**

- **Message:** Frontend → Backend API: `POST /api/auth/github/callback {code, state}`
- **HTTP Details:**
    - **Method:** POST
    - **Endpoint:** `/api/auth/github/callback`
    - **Payload:**

json

    `{
      "code": "<authorization_code>",
      "state": "<csrf_token>"
    }`

**Step 11: Backend Validates State**

- **Message:** Backend API → Backend API: `validateState(state)`
- **Decision Point (alt fragment):**
    - **[state invalid]:**
        - Backend API → Frontend: `403 Forbidden {error: "Invalid authentication request"}`
        - **Sequence terminates**
    - **[state valid]:**
        - Proceed to Step 12

**Step 12: Exchange Code for Access Token**

- **Message:** Backend API → GitHub OAuth Provider: `POST /login/oauth/access_token {client_id, client_secret, code}`
- **Request Payload:**

json

  `{
    "client_id": "<github_client_id>",
    "client_secret": "<github_client_secret>",
    "code": "<authorization_code>",
    "redirect_uri": "https://platform.com/auth/github/callback"
  }`

- **Security Note:** `client_secret` retrieved from Azure Key Vault

**Step 13: GitHub Returns Access Token**

- **Message:** GitHub OAuth Provider → Backend API: `200 OK {access_token, token_type, scope}`
- **Response:**

json

  `{
    "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
    "token_type": "bearer",
    "scope": "user:email,read:user"
  }`

- **Decision Point (alt fragment):**
    - **[token exchange failed]:**
        - **Retry:** Backend waits 1 second and retries once
        - **If retry fails:**
            - Backend API → Frontend: `500 Internal Server Error {error: "GitHub authentication failed"}`
            - **Sequence terminates**
    - **[token received]:**
        - Proceed to Step 14

**Step 14: Fetch User Profile from GitHub**

- **Message:** Backend API → GitHub API: `GET /user (Authorization: Bearer <access_token>)`
- **Request Headers:**
    - `Authorization: Bearer <github_access_token>`
    - `Accept: application/vnd.github+json`

**Step 15: GitHub Returns User Profile**

- **Message:** GitHub API → Backend API: `200 OK {userProfile}`
- **Response:**

json

  `{
    "id": 12345678,
    "login": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678"
  }`

- **Decision Point (alt fragment):**
    - **[profile fetch failed]:**
        - **Retry:** Backend retries once
        - **If retry fails:**
            - Backend API → Frontend: `500 Internal Server Error`
            - **Sequence terminates**
    - **[profile received]:**
        - Proceed to Step 16

**Step 16: Query User by GitHub Email or ID**

- **Message:** Backend API → SQL Server: `SELECT * FROM Users WHERE Email = @GitHubEmail OR GitHubId = @GitHubId`
- **Message:** SQL Server → Backend API: `return userRecord (or null)`

**Step 17: User Existence Decision**

- **Decision Point (alt fragment):[user exists]:[user does not exist]:**
    - **Step 17a:** Backend API → SQL Server: `UPDATE Users SET LastLoginAt = GETUTCDATE(), GitHubLogin = @Login, GitHubAvatarUrl = @Avatar WHERE Id = @UserId`
    - **Step 17b:** Backend API → Backend API: `encryptGitHubToken(access_token)`
        - Use ASP.NET Data Protection API
    - **Step 17c:** Backend API → SQL Server: `UPDATE Users SET GitHubAccessToken = @EncryptedToken WHERE Id = @UserId`
    - Proceed to Step 18
    - **Step 17a:** Backend API → Backend API: `encryptGitHubToken(access_token)`
    - **Step 17b:** Backend API → SQL Server: `INSERT INTO Users (Id, Email, Name, GitHubId, GitHubLogin, GitHubAvatarUrl, GitHubAccessToken, EmailVerified, IsActive, CreatedVia) VALUES (NEWID(), @Email, @Name, @GitHubId, @Login, @Avatar, @EncryptedToken, 1, 1, 'GitHub')`
    - **Note:** `EmailVerified = 1` (GitHub confirms email ownership), `PasswordHash = NULL` (OAuth-only account)
    - Proceed to Step 18

**Step 18: Generate JWT Access Token**

- **Same as Step 10 in Email/Password Flow**
- **Message:** Backend API → Backend API: `generateJWT(user)`

**Step 19: Generate Refresh Token**

- **Same as Step 11 in Email/Password Flow**
- **Message:** Backend API → SQL Server: `INSERT INTO RefreshTokens`

**Step 20: Create Session in Redis**

- **Same as Step 12 in Email/Password Flow**
- **Message:** Backend API → Redis: `SET session:{userId}:{sessionId}`

**Step 21: Return Authentication Response**

- **Same as Step 13 in Email/Password Flow**
- **Message:** Backend API → Frontend: `200 OK {accessToken, refreshToken, user}`

**Step 22: Store Tokens and Update State**

- **Same as Step 14 in Email/Password Flow**
- **Message:** Frontend → Frontend: `storeTokens() + updateAuthState()`

**Step 23: Navigate to Destination**

- **Message:** Frontend → Frontend: `determineDestination(user, returnUrl)`
- **Routing Logic (includes new user detection):**
    - If `returnUrl` exists → navigate to originally requested page
    - Else if `user.isNewUser` → navigate to `/onboarding` (GitHub users see welcome flow)
    - Else if `!user.hasCompletedAssessment` → navigate to `/assessment/start`
    - Else → navigate to `/dashboard`
- **Message:** Frontend → User: `redirect to destination`

**End of GitHub OAuth Authentication Flow**

### Fragment Specifications

The sequence diagram uses the following UML 2.5 combined fragments to model conditional and optional behavior:

**1. alt (Alternative) Fragments**

**Purpose:** Model mutually exclusive conditional paths based on guards (boolean conditions).

**Instances in this Diagram:**

**Alt 1: Client-Side Validation**

- **Guard [validation fails]:** Display errors and wait for user correction
- **Guard [validation succeeds]:** Proceed with API call

**Alt 2: Rate Limit Check**

- **Guard [attemptCount > 5]:** Return 429 error and terminate
- **Guard [attemptCount ≤ 5]:** Continue authentication process

**Alt 3: Server-Side Payload Validation**

- **Guard [validation fails]:** Return 400 error
- **Guard [validation succeeds]:** Query database

**Alt 4: User Existence Check**

- **Guard [user not found]:** Return 401 error
- **Guard [user found]:** Check account status

**Alt 5: Account Status Validation (Multiple Guards)**

- **Guard [IsActive = false]:** Return 403 "Account deactivated"
- **Guard [LockoutEnd > NOW()]:** Return 403 "Account locked"
- **Guard [EmailVerified = false]:** Return 403 "Email not verified"
- **Guard [account valid]:** Proceed to password verification

**Alt 6: Password Verification**

- **Guard [password incorrect]:** Execute failed login sub-sequence
- **Guard [password correct]:** Proceed to token generation

**Alt 7: CSRF State Validation (OAuth Flow)**

- **Guard [state mismatch]:** Display security error and terminate
- **Guard [state valid]:** Send callback data to backend

**Alt 8: GitHub Token Exchange**

- **Guard [exchange failed]:** Retry once, then return 500 error
- **Guard [token received]:** Fetch user profile

**Alt 9: User Existence (OAuth)**

- **Guard [user exists]:** Update user record
- **Guard [user does not exist]:** Create new user record

**2. opt (Optional) Fragments**

**Purpose:** Model optional behavior that may or may not execute based on conditions.

**Instances in this Diagram:**

**Opt 1: Account Lockout After Failed Attempts**

- **Condition:** `FailedLoginAttempts >= 5`
- **Behavior:** Update `LockoutEnd` timestamp in database
- **Location:** Within the failed password verification alt branch

**Opt 2: Retry Logic for GitHub API Calls**

- **Condition:** Initial API call fails
- **Behavior:** Wait 1 second and retry once
- **Location:** After token exchange and profile fetch calls

**3. loop (Iteration) Fragments**

**Not applicable in this diagram.** Authentication is a single-pass operation without explicit loops.

---

### Synchronous vs. Asynchronous Communication

**Synchronous Messages (Solid Arrows with Filled Arrowheads)**

Sender waits for response before proceeding. Used for:

- **Frontend → Backend API:** All HTTP requests (POST /api/auth/login, POST /api/auth/github/callback)
- **Backend API → SQL Server:** All database queries (SELECT, INSERT, UPDATE)
- **Backend API → Redis:** All cache operations (INCR, SET)
- **Backend API → ASP.NET Core Identity:** Password verification
- **Backend API → GitHub OAuth Provider:** Token exchange
- **Backend API → GitHub API:** User profile fetch

**Rationale:** These operations require immediate responses to determine next steps in the authentication flow.

**Asynchronous Messages (Dashed Arrows)**

**Not prominently used in this diagram** because authentication requires sequential validation steps. However, certain operations could be optimized asynchronously in implementation (e.g., session creation in Redis could be fire-and-forget), but they are modeled synchronously here for clarity and to reflect the critical path.

**Return Messages (Dashed Arrows with Open Arrowheads)**

Used to show responses returning from called components:

- **SQL Server → Backend API:** Query results
- **Redis → Backend API:** Counter values, confirmation
- **ASP.NET Core Identity → Backend API:** Verification result
- **Backend API → Frontend:** HTTP responses (200 OK, 401, 403, 429, 500)
- **GitHub OAuth Provider → Backend API:** Access token
- **GitHub API → Backend API:** User profile

---

### Error Handling and Exception Paths

The sequence diagram explicitly models the following error scenarios:

**1. Client-Side Validation Failures**

- **Trigger:** Invalid email format or empty password
- **Response:** Display inline errors
- **Recovery:** User corrects input and resubmits

**2. Rate Limit Exceeded**

- **Trigger:** More than 5 login attempts from same IP in 15 minutes
- **Response:** 429 Too Many Requests with `Retry-After` header
- **Recovery:** User waits for cooldown period

**3. Server-Side Payload Validation Failures**

- **Trigger:** Malformed request or missing required fields
- **Response:** 400 Bad Request with detailed validation errors
- **Recovery:** Frontend should prevent this; if occurs, indicates client bug

**4. User Not Found**

- **Trigger:** Email does not exist in database
- **Response:** 401 Unauthorized with generic message ("Invalid email or password")
- **Security:** Generic message prevents email enumeration

**5. Account Status Issues**

- **Trigger:** Account deactivated, locked, or email not verified
- **Response:** 403 Forbidden with specific reason
- **Recovery:** User must contact support (deactivated), wait (locked), or verify email

**6. Incorrect Password**

- **Trigger:** Provided password does not match stored hash
- **Response:** 401 Unauthorized with attempts remaining counter
- **Side Effect:** Increment failed login counter; lock account if threshold reached
- **Recovery:** User retries with correct password

**7. CSRF Token Mismatch (OAuth)**

- **Trigger:** State parameter in callback does not match stored value
- **Response:** 403 Forbidden with security error message
- **Security:** Prevents CSRF attacks
- **Recovery:** User must restart OAuth flow

**8. GitHub Token Exchange Failure**

- **Trigger:** Invalid or expired authorization code
- **Response:** 500 Internal Server Error after retry
- **Recovery:** User must restart OAuth flow

**9. GitHub Profile Fetch Failure**

- **Trigger:** GitHub API unavailable or access token invalid
- **Response:** 500 Internal Server Error after retry
- **Recovery:** User must restart OAuth flow

---

### Alignment with Activity Diagram 4.4.2

This sequence diagram directly implements the authentication flows defined in Activity Diagram 4.4.2:

**Structural Alignment:**

- **Phase 1 (Login Initiation):** Steps 1-2 (user submits credentials, client validation)
- **Phase 2A (Email/Password):** Steps 3-15 (API call through token generation and navigation)
- **Phase 2B (GitHub OAuth):** Steps 1-23 (OAuth initiation through token generation and navigation)

**Decision Points:**

- All decision nodes in the activity diagram (validation checks, account status, password verification) are represented as `alt` fragments in the sequence diagram

**Error Paths:**

- Failed login attempt handling (activity sub-path 2A.13) → Alt fragment with failed password guard
- OAuth token exchange failures → Alt fragments with retry logic

**Temporal Ordering:**

- The sequence diagram adds precise message ordering not shown in activity diagram (e.g., rate limit check occurs before database query)

---

### Alignment with Functional Requirements

**FR-AUTH-01: User Registration**

- Not shown in this diagram (separate registration sequence)
- However, OAuth flow demonstrates auto-registration for new GitHub users

**FR-AUTH-02: GitHub OAuth Login**

- ✅ Complete OAuth 2.0 flow modeled (Steps 1-23 in Flow 2)
- ✅ CSRF protection via state parameter
- ✅ Profile data retrieval and user creation/update

**FR-AUTH-03: Email Verification**

- ✅ Enforced in account status check (Step 7, Alt 5)
- ✅ OAuth users bypass verification (GitHub confirms email ownership)

**FR-AUTH-04: User Login**

- ✅ Email/password flow (Steps 1-15 in Flow 1)
- ✅ JWT token generation and issuance
- ✅ Session management with Redis

**FR-AUTH-05: Password Reset**

- Not shown in this diagram (separate password reset sequence)

**FR-AUTH-07: Role-Based Access Control**

- ✅ JWT includes role claim (Step 10)
- Used by downstream services for authorization

**FR-AUTH-08: Session Management**

- ✅ Redis session creation (Step 12)
- ✅ Refresh token storage in database (Step 11)

---

### Non-Functional Requirements Alignment

**NFR-SEC-01: Authentication Security**

- ✅ PBKDF2 password hashing (Step 8)
- ✅ JWT with RS256 signing (Step 10)
- ✅ Refresh token generation (Step 11)

**NFR-SEC-06: Rate Limiting**

- ✅ Redis-based sliding window counter (Step 4)
- ✅ 5 attempts per 15 minutes enforced

**NFR-SEC-07: OAuth Token Protection**

- ✅ GitHub tokens encrypted using ASP.NET Data Protection API (Step 17b in OAuth flow)

**NFR-SEC-08: Security Logging**

- Implied in database updates (LastLoginAt, LastLoginIP, FailedLoginAttempts)
- Full audit logging implemented but not explicitly shown in sequence diagram for clarity

**NFR-PERF-01: API Response Time**

- Target: < 500ms for email/password authentication
- Sequence shows optimizations:
    - Rate limit check via fast Redis lookup
    - Single database query for user retrieval
    - Minimal processing steps

**NFR-AVAIL-02: Graceful Degradation**

- ✅ GitHub API failures handled with retry logic (Opt fragments in OAuth flow)
- ✅ Generic error messages prevent information leakage

---

### Notes for Implementation

**1. Token Storage Security:**

- Access tokens: Store in memory (Redux store), never in localStorage (XSS risk)
- Refresh tokens: Use httpOnly secure cookies or encrypted localStorage with key rotation

**2. CSRF Protection:**

- State parameter must be cryptographically random (128-bit minimum)
- Store with same-site cookie attribute to prevent cross-site submission

**3. Rate Limiting Optimization:**

- Use Redis INCR with EXPIRE for atomic operations
- Consider IP + email combination for more granular control
- Add CAPTCHA challenge after 3 failed attempts (not shown in diagram)

**4. Database Connection Pooling:**

- Sequence shows multiple sequential DB calls
- Implementation should use connection pooling to minimize overhead

**5. Monitoring and Alerting:**

- Track authentication success/failure rates
- Alert on anomalous login patterns (e.g., sudden spike in 401 responses)
- Monitor GitHub API latency and error rates

**6. Future Enhancements:**

- Multi-factor authentication (MFA) for admin accounts
- Biometric authentication for mobile apps
- Additional OAuth providers (Google, Microsoft)

**Sequence Diagram**

**Workflow**

**Email/Password Path**

1. User submits email + password
2. Backend validates payload
3. DB lookup → user exists?
4. Password verified using PBKDF2
5. Account status checked
6. JWT access & refresh tokens generated
7. Client stores tokens and redirects

**Error Cases:**

- Invalid input → 400
- Wrong password → 401 + rate limiting counter
- Inactive account → 403
- User not found → generic 401

**GitHub OAuth Path**

1. Frontend redirects to GitHub OAuth
2. User authorizes the app
3. GitHub returns authorization code
4. Backend exchanges code for access token
5. Backend fetches user profile
6. Create/update user record in DB
7. Return JWT tokens

**Benefits:**

- No password handling
- Secure via OAuth 2.0
- Faster onboarding
    
    ### **4.5.2 Sequence Diagram: Adaptive Assessment & Learning Path Generation**
    
    ### Overview
    
    This sequence diagram models the complete adaptive assessment workflow and the subsequent automated generation of personalized learning paths. The diagram illustrates how the system dynamically adjusts question difficulty based on real-time performance, evaluates multi-dimensional skill proficiency, and algorithmically constructs customized learning trajectories tailored to identified strengths and weaknesses.
    
    **Purpose:**
    
    - Visualize the temporal flow of the adaptive assessment from initiation through completion
    - Demonstrate real-time difficulty adjustment algorithm interactions
    - Show the integration between assessment scoring and learning path generation
    - Illustrate multi-dimensional skill evaluation across 20+ categories
    - Model the personalized recommendation engine workflow
    
    **Scope:**
    
    - Assessment initialization with track selection
    - Dynamic question selection based on current difficulty level
    - Answer evaluation and difficulty adjustment logic
    - Question loop execution (30 questions or timeout)
    - Comprehensive multi-category scoring calculation
    - Skill level determination (Beginner/Intermediate/Advanced)
    - Algorithmic learning path generation with prerequisite management
    - Task recommendation engine based on identified weaknesses
    - Result presentation with personalized path preview
    
    **Alignment with Previous Diagrams:**
    
    - **Activity Diagram 4.4.3:** Provides the logical flow including fork/join for timer; this sequence diagram shows temporal message ordering
    - **Use Case UC_Assess:** Implements the adaptive assessment use case with detailed interactions
    - **Functional Requirements:** FR-ASSESS-01 through FR-ASSESS-07, FR-PATH-01
    
    ---
    
    ### Lifelines (Participants)
    
    The sequence diagram includes the following lifelines:
    
    **1. User (Learner)**
    
    - **Type:** Human Actor
    - **Role:** Takes the assessment by answering questions
    - **Interactions:** Selects track, reads questions, submits answers, reviews results
    
    **2. Frontend (React Application)**
    
    - **Type:** Client Application
    - **Role:** Renders assessment UI, manages timer, tracks progress
    - **Technology:** React with TypeScript, real-time countdown timer
    - **Responsibilities:**
        - Display track selection screen
        - Render questions with multiple-choice options
        - Manage 40-minute countdown timer
        - Show progress indicators
        - Display results dashboard with visualizations
    
    **3. Backend API (ASP.NET Core)**
    
    - **Type:** Application Server
    - **Role:** Orchestrates assessment logic, manages state, coordinates analysis
    - **Technology:** ASP.NET Core 8
    - **Responsibilities:**
        - Validate assessment requests
        - Manage assessment state (difficulty, score, answered count)
        - Execute adaptive question selection algorithm
        - Evaluate answer correctness
        - Calculate final scores and skill levels
        - Coordinate learning path generation
    
    **4. Redis Cache**
    
    - **Type:** In-Memory Data Store
    - **Role:** Store assessment state for fast access during active sessions
    - **Responsibilities:**
        - Cache current assessment state (difficulty, category scores, shown questions)
        - Enable rapid state retrieval between questions
        - Auto-expire state after assessment completion
    
    **5. SQL Server Database**
    
    - **Type:** Relational Database
    - **Role:** Persistent storage for questions, answers, assessments, learning paths
    - **Responsibilities:**
        - Store question bank with metadata (difficulty, category, correct answer)
        - Store assessment records and user answers
        - Store skill profiles and category scores
        - Store learning paths and task assignments
    
    **6. Learning Path Service**
    
    - **Type:** Business Logic Component (within Backend API or microservice)
    - **Role:** Generate personalized learning paths using algorithmic curriculum design
    - **Responsibilities:**
        - Analyze assessment results to identify skill gaps
        - Query task database for curriculum-appropriate tasks
        - Apply path generation algorithm (prerequisite ordering, difficulty balancing)
        - Create ordered task sequences
    
    **7. Recommendation Engine**
    
    - **Type:** Business Logic Component (within Backend API)
    - **Role:** Generate targeted task recommendations based on weaknesses
    - **Responsibilities:**
        - Identify top 3-5 weak skill categories
        - Select high-impact tasks that address specific gaps
        - Prioritize recommendations by urgency and learning value
    
    ---
    
    ### Interaction Flow Description
    
    The sequence diagram is organized into five primary phases:
    
    ---
    
    **Phase 1: Assessment Initialization**
    
    **Precondition:** User is authenticated and navigates to assessment start page.
    
    **Step 1: User Initiates Assessment**
    
    - **Message:** User → Frontend: `navigateToAssessment()`
    - **Description:** User clicks "Start Assessment" from dashboard or onboarding flow
    
    **Step 2: Display Track Selection**
    
    - **Message:** Frontend → User: `displayTrackSelection()`
    - **Description:** Frontend renders track selection screen with options:
        - Full Stack Development
        - Backend Specialist
        - Frontend Specialist
        - Python Developer
        - C# / .NET Developer
        - Computer Science Fundamentals
    
    **Step 3: User Selects Track**
    
    - **Message:** User → Frontend: `selectTrack(trackType)`
    - **Description:** User clicks on desired specialization card (e.g., "Full Stack Development")
    
    **Step 4: Send Assessment Start Request**
    
    - **Message:** Frontend → Backend API: `POST /api/assessments/start {trackId, selectedTrack}`
    - **HTTP Details:**
        - **Endpoint:** `/api/assessments/start`
        - **Payload:**
    
    json
    
        `{
          "trackId": "<guid>",
          "selectedTrack": "FullStack"
        }`
    
    - **Headers:** `Authorization: Bearer <JWT>`
    
    **Step 5: Validate JWT Token**
    
    - **Message:** Backend API → Backend API: `validateJWT(token)`
    - **Description:** Extract and verify token signature and expiration
    - **Decision Point (alt fragment):**
        - **[token invalid]:**
            - Backend API → Frontend: `401 Unauthorized`
            - Frontend → User: Redirect to login
            - **Sequence terminates**
        - **[token valid]:**
            - Extract `userId` from claims
            - Proceed to Step 6
    
    **Step 6: Check for Active Assessment**
    
    - **Message:** Backend API → SQL Server: `SELECT Id, Status FROM Assessments WHERE UserId = @UserId AND Status = 'InProgress'`
    - **Message:** SQL Server → Backend API: `return activeAssessment (or null)`
    - **Decision Point (alt fragment):**
        - **[active assessment exists]:**
            - Backend API → Frontend: `409 Conflict {assessmentId, message: "Resume existing assessment"}`
            - Frontend → User: Display dialog with "Resume" or "Start New" options
            - **Sequence terminates** (resume flow not shown in this diagram)
        - **[no active assessment]:**
            - Proceed to Step 7
    
    **Step 7: Check 30-Day Reattempt Policy**
    
    - **Message:** Backend API → SQL Server: `SELECT TOP 1 CompletedAt FROM Assessments WHERE UserId = @UserId AND Status = 'Completed' ORDER BY CompletedAt DESC`
    - **Message:** SQL Server → Backend API: `return lastCompletionDate (or null)`
    - **Decision Point (alt fragment):**
        - **[lastCompletionDate < 30 days ago]:**
            - Backend API → Frontend: `429 Too Many Requests {retryDate}`
            - Frontend → User: "You can retake the assessment on [date]"
            - **Sequence terminates**
        - **[eligible for assessment]:**
            - Proceed to Step 8
    
    **Step 8: Create Assessment Session**
    
    - **Message:** Backend API → SQL Server: `INSERT INTO Assessments (Id, UserId, TrackType, Status, StartedAt) VALUES (NEWID(), @UserId, @TrackType, 'InProgress', GETUTCDATE())`
    - **Message:** SQL Server → Backend API: `return assessmentId`
    - **Decision Point (alt fragment):**
        - **[insert fails]:**
            - Backend API → Frontend: `500 Internal Server Error`
            - **Sequence terminates**
        - **[insert succeeds]:**
            - Proceed to Step 9
    
    **Step 9: Initialize Assessment State in Redis**
    
    - **Message:** Backend API → Redis: `SET assessment_state:{assessmentId} {state} EX 7200`
    - **State Structure:**
    
    json
    
      `{
        "assessmentId": "<guid>",
        "userId": "<guid>",
        "trackType": "FullStack",
        "currentDifficulty": 3,
        "questionsAnswered": 0,
        "totalQuestions": 30,
        "overallScore": 0,
        "categoryScores": {},
        "shownQuestionIds": [],
        "startTime": "ISO8601",
        "status": "InProgress"
      }`
    
    - **Expiration:** 2 hours (7200 seconds)
    - **Message:** Redis → Backend API: `OK`
    
    **Step 10: Return Initialization Response**
    
    - **Message:** Backend API → Frontend: `201 Created {assessmentId, trackType, totalQuestions, timeLimit, instructions}`
    - **Response:**
    
    json
    
      `{
        "assessmentId": "<guid>",
        "trackType": "FullStack",
        "trackTitle": "Full Stack Development",
        "totalQuestions": 30,
        "timeLimit": 2400,
        "instructions": "Answer 30 questions. Difficulty adjusts based on performance.",
        "categories": ["React", "Node.js", "Databases", "Security", ...]
      }`
    
    **Step 11: Display Instructions and Start Timer**
    
    - **Message:** Frontend → User: `displayInstructions()`
    - **Description:** Show assessment rules, time limit, and "Start" button
    
    **Step 12: User Starts Assessment**
    
    - **Message:** User → Frontend: `clickStart()`
    - **Message:** Frontend → Frontend: `startCountdownTimer(2400 seconds)`
    - **Description:** Begin 40-minute countdown; timer updates every second
    
    **Note:** Timer runs asynchronously and triggers auto-submit when reaching 00:00 (modeled as parallel activity in Activity Diagram 4.4.3, but shown sequentially here for clarity)
    
    ---
    
    **Phase 2: Adaptive Question Loop (Repeats 30 Times)**
    
    **This phase represents the core adaptive assessment logic. The sequence repeats for each of the 30 questions.**
    
    **Step 13: Request Next Question**
    
    - **Message:** Frontend → Backend API: `GET /api/assessments/{assessmentId}/next-question`
    - **Description:** Frontend requests the next question in the sequence
    
    **Step 14: Load Assessment State**
    
    - **Message:** Backend API → Redis: `GET assessment_state:{assessmentId}`
    - **Message:** Redis → Backend API: `return state`
    - **Description:** Retrieve current difficulty level, answered count, shown questions, category scores
    
    **Step 15: Execute Adaptive Question Selection Algorithm**
    
    - **Message:** Backend API → Backend API: `selectNextQuestion(state, trackType)`
    - **Algorithm Logic:**
        1. Determine `targetDifficulty = state.currentDifficulty` (1-5 scale)
        2. Identify underrepresented categories (categories with < 2 questions shown)
        3. Build selection criteria:
            - TrackType matches
            - Difficulty matches target
            - IsActive = true
            - QuestionId not in shownQuestionIds
            - Prefer underrepresented categories
    
    **Step 16: Query Question Database**
    
    - **Message:** Backend API → SQL Server: `SELECT TOP 1 * FROM Questions WHERE TrackType = @Track AND Difficulty = @TargetDifficulty AND IsActive = 1 AND Id NOT IN @ShownQuestions ORDER BY [category_balance_priority], NEWID()`
    - **Message:** SQL Server → Backend API: `return questionData`
    - **Question Data:**
    
    json
    
      `{
        "id": "<guid>",
        "questionText": "What is the correct way to handle async operations in React?",
        "options": [
          {"id": "A", "text": "Using useEffect with async/await"},
          {"id": "B", "text": "Using async function directly in component"},
          {"id": "C", "text": "Using .then() in render method"},
          {"id": "D", "text": "Using callback functions only"}
        ],
        "correctOption": "A",
        "difficulty": 3,
        "category": "React",
        "topic": "Hooks",
        "points": 10
      }`
    
    **Step 17: Mark Question as Shown**
    
    - **Message:** Backend API → Backend API: `updateStateWithShownQuestion(state, questionId)`
    - **Description:** Add questionId to shownQuestionIds array to prevent repetition
    
    **Step 18: Update State in Redis**
    
    - **Message:** Backend API → Redis: `SET assessment_state:{assessmentId} {updatedState} EX 7200`
    - **Message:** Redis → Backend API: `OK`
    
    **Step 19: Return Question to Frontend**
    
    - **Message:** Backend API → Frontend: `200 OK {questionData}`
    - **Response (excludes correct answer):**
    
    json
    
      `{
        "questionId": "<guid>",
        "questionNumber": 5,
        "totalQuestions": 30,
        "questionText": "What is the correct way to handle async operations in React?",
        "options": [
          {"id": "A", "text": "Using useEffect with async/await"},
          {"id": "B", "text": "Using async function directly in component"},
          {"id": "C", "text": "Using .then() in render method"},
          {"id": "D", "text": "Using callback functions only"}
        ],
        "difficulty": 3,
        "category": "React",
        "topic": "Hooks",
        "timeStarted": "ISO8601"
      }`
    
    **Step 20: Display Question**
    
    - **Message:** Frontend → User: `renderQuestion(questionData)`
    - **Description:** Display question text, options (radio buttons), progress bar (5/30), timer countdown
    
    **Step 21: User Selects Answer**
    
    - **Message:** User → Frontend: `selectOption(optionId)`
    - **Description:** User clicks radio button for chosen answer (e.g., "A")
    
    **Step 22: User Submits Answer**
    
    - **Message:** User → Frontend: `submitAnswer()`
    - **Description:** User clicks "Submit Answer" button
    
    **Step 23: Validate Selection**
    
    - **Message:** Frontend → Frontend: `validateSelection()`
    - **Decision Point (alt fragment):**
        - **[no option selected]:**
            - Frontend → User: Display inline error "Please select an answer"
            - **Return to Step 21**
        - **[option selected]:**
            - Proceed to Step 24
    
    **Step 24: Send Answer Submission**
    
    - **Message:** Frontend → Backend API: `POST /api/assessments/{assessmentId}/answer {questionId, selectedOption, timeSpent}`
    - **Payload:**
    
    ```json
    
      {
        "questionId": "<guid>",
        "selectedOption": "A",
        "timeSpent": 23
      }
    
    ```
    
    **Step 25: Validate Request Payload**
    
    - **Message:** Backend API → Backend API: `validateAnswerPayload(request)`
    - **Decision Point (alt fragment):**
        - **[invalid payload]:**
            - Backend API → Frontend: `400 Bad Request {errors}`
            - **Sequence terminates for this answer**
        - **[valid payload]:**
            - Proceed to Step 26
    
    **Step 26: Retrieve Correct Answer**
    
    - **Message:** Backend API → SQL Server: `SELECT CorrectOption, Points, Category, Topic FROM Questions WHERE Id = @QuestionId`
    - **Message:** SQL Server → Backend API: `return correctAnswerData`
    
    **Step 27: Evaluate Correctness**
    
    - **Message:** Backend API → Backend API: `evaluateAnswer(selectedOption, correctOption)`
    - **Result:** `isCorrect = (selectedOption == correctOption)`
    
    **Step 28: Update Assessment State Based on Correctness**
    
    - **Message:** Backend API → Backend API: `updateStateAfterAnswer(state, isCorrect, points, category)`
    - **Decision Point (alt fragment):**
        
        **[answer correct]:**
        
        - **Logic:**
    
    ```
        state.overallScore += question.points
        state.currentDifficulty = min(state.currentDifficulty + 1, 5)
        state.categoryScores[category] += question.points
    
    ```
    
    - **Description:** Increase score, increase difficulty (cap at 5), update category score
    
    **[answer incorrect]:**
    
    - **Logic:**
    
    ```
        state.currentDifficulty = max(state.currentDifficulty - 1, 1)
        state.categoryWeaknesses[category] = true```
    ```
    
    - **Description:** Decrease difficulty (floor at 1), mark category as weak; do not increase score
    
    **Step 29: Increment Answered Counter**
    
    - **Message:** Backend API → Backend API: `state.questionsAnswered += 1`
    
    **Step 30: Store Answer Record**
    
    - **Message:** Backend API → SQL Server: `INSERT INTO AssessmentAnswers (Id, AssessmentId, QuestionId, SelectedOption, IsCorrect, TimeSpent, Category, Topic, CreatedAt)`
    - **Message:** SQL Server → Backend API: `OK`
    
    **Step 31: Update State in Redis**
    
    - **Message:** Backend API → Redis: `SET assessment_state:{assessmentId} {updatedState} EX 7200`
    - **Message:** Redis → Backend API: `OK`
    
    **Step 32: Return Answer Response**
    
    - **Message:** Backend API → Frontend: `200 OK {isCorrect, correctOption, explanation, nextDifficulty, questionsRemaining}`
    - **Response:**
    
    ```json
    
      {
        "isCorrect": true,
        "correctOption": "A",
        "explanation": "useEffect with async/await is the recommended pattern for handling async operations in React functional components.",
        "nextDifficulty": 4,
        "questionsRemaining": 25,
        "currentScore": 45
      }
    
    ```
    
    **Step 33: Display Answer Feedback**
    
    - **Message:** Frontend → User: `displayFeedback(responseData)`
    - **Description:**
        - Show checkmark (correct) or X (incorrect)
        - Display correct answer if wrong
        - Show educational explanation
        - Update progress bar (5/30 → 6/30)
        - Auto-advance to next question after 3 seconds
    
    **Step 34: Loop Continuation Decision**
    
    - **Message:** Frontend → Frontend: `checkLoopCondition()`
    - **Decision Point (alt fragment):**
        - **[questionsAnswered < 30 AND timer active]:**
            - **Loop:** Return to Step 13 (request next question)
        - **[questionsAnswered == 30 OR timer expired]:**
            - Proceed to Phase 3 (Final Scoring)
    
    **End of Question Loop Phase**
    
    ---
    
    **Phase 3: Final Scoring and Skill Analysis**
    
    **Precondition:** User has answered 30 questions or timer has expired.
    
    **Step 35: Retrieve All Assessment Answers**
    
    - **Message:** Backend API → SQL Server: `SELECT * FROM AssessmentAnswers WHERE AssessmentId = @AssessmentId ORDER BY CreatedAt`
    - **Message:** SQL Server → Backend API: `return answerRecords[]`
    
    **Step 36: Calculate Overall Score**
    
    - **Message:** Backend API → Backend API: `calculateOverallScore(answerRecords)`
    - **Formula:**
    
    ```
      totalPointsEarned = SUM(points WHERE isCorrect = true)
      maxPossiblePoints = SUM(all_question_points)
      overallScore = (totalPointsEarned / maxPossiblePoints) * 100
    
    ```
    
    - **Result:** e.g., `overallScore = 74.3%`
    
    **Step 37: Calculate Per-Category Scores**
    
    - **Message:** Backend API → Backend API: `calculateCategoryScores(answerRecords)`
    - **Logic:** For each of 20+ categories:
    
    ```
      categoryScore[cat] = (
        SUM(points WHERE isCorrect AND category = cat) /
        SUM(all_points WHERE category = cat)
      ) * 100`
    
    ```
    
    - **Result:**
    
    ```json
    
      {
        "ReactHooks": 85,
        "StateManagement": 70,
        "SecurityPractices": 55,
        "RESTAPIs": 80,
        "DatabaseDesign": 65,
        "Testing": 50,
        ...
      }
    
    ```
    
    **Step 38: Determine Skill Level**
    
    - **Message:** Backend API → Backend API: `determineSkillLevel(overallScore)`
    - **Mapping:**
    
    ```
      if (overallScore >= 80) → "Advanced"
      else if (overallScore >= 60) → "Intermediate"
      else → "Beginner"```
    ```
    
    - **Result:** e.g., `skillLevel = "Intermediate"`
    
    **Step 39: Analyze Strengths and Weaknesses**
    
    - **Message:** Backend API → Backend API: `analyzePerformance(categoryScores)`
    - **Logic:**
        - **Strengths:** Categories with scores ≥ 80% (top 3)
        - **Weaknesses:** Categories with scores < 60% (top 3-5)
    - **Result:**
    
    json
    
      `{
        "strengths": [
          {"category": "ReactHooks", "score": 85},
          {"category": "RESTAPIs", "score": 80}
        ],
        "weaknesses": [
          {"category": "SecurityPractices", "score": 55},
          {"category": "Testing", "score": 50},
          {"category": "DatabaseDesign", "score": 65}
        ]
      }`
    
    **Step 40: Update Assessment Record**
    
    - **Message:** Backend API → SQL Server: `UPDATE Assessments SET Status = 'Completed', OverallScore = @Score, SkillLevel = @Level, CategoryScoresJSON = @Scores, CompletedAt = GETUTCDATE(), Duration = DATEDIFF(second, StartedAt, GETUTCDATE()) WHERE Id = @AssessmentId`
    - **Message:** SQL Server → Backend API: `OK`
    
    **Step 41: Create/Update User Skill Profile**
    
    - **Message:** Backend API → SQL Server: `(For each category) INSERT INTO UserSkills (Id, UserId, SkillCategory, Score, Level, LastUpdated) VALUES (NEWID(), @UserId, @Category, @CategoryScore, @SkillLevel, GETUTCDATE()) ON DUPLICATE KEY UPDATE Score = @CategoryScore, LastUpdated = GETUTCDATE()`
    - **Message:** SQL Server → Backend API: `OK`
    - **Purpose:** Create baseline for tracking skill progression over time
    
    ---
    
    **Phase 4: Personalized Learning Path Generation**
    
    **Precondition:** Assessment scoring completed; skill profile established.
    
    **Step 42: Initiate Path Generation**
    
    - **Message:** Backend API → Learning Path Service: `generateLearningPath(userId, assessmentId, trackType, skillLevel, weakCategories)`
    - **Input Parameters:**
    
    ```json
    
      {
        "userId": "<guid>",
        "assessmentId": "<guid>",
        "trackType": "FullStack",
        "skillLevel": "Intermediate",
        "weakCategories": ["SecurityPractices", "Testing", "DatabaseDesign"]
      }
    
    ```
    
    ### **Step 43: Select Path Template**
    
    - **Message:** Learning Path Service → Learning Path Service: `selectTemplate(trackType, skillLevel)`
    - **Logic:**
    
    ```
      if (trackType == "FullStack" AND skillLevel == "Intermediate")
        templateId = "FullStack_Intermediate_Template"```
    ```
    
    - **Templates Define:**
        - Core curriculum tasks
        - Recommended sequence
        - Prerequisite dependencies
        - Difficulty progression
    
    **Step 44: Query Task Database for Candidates**
    
    - **Message:** Learning Path Service → SQL Server: `SELECT T.Id, T.Title, T.Category, T.Difficulty, T.EstimatedTime, T.Prerequisites, T.ImpactScore FROM Tasks T WHERE T.TrackType = @TrackType AND T.IsActive = 1 AND (T.Category IN @WeakCategories OR T.Id IN (SELECT TaskId FROM TrackTemplates WHERE TemplateId = @TemplateId)) ORDER BY CASE WHEN T.Category IN @WeakCategories THEN 0 ELSE 1 END, T.ImpactScore DESC`
    - **Message:** SQL Server → Learning Path Service: `return taskCandidates[]`
    
    **Step 45: Apply Learning Path Generation Algorithm**
    
    - **Message:** Learning Path Service → Learning Path Service: `applyPathAlgorithm(taskCandidates, weakCategories, skillLevel, template)`
    - **Algorithm Steps:**
        1. **Initialize:** Start with empty ordered task list; target 15-20 tasks
        2. **Add Foundation:** Include prerequisite tasks from template
        3. **Address Weaknesses:** For each weak category, select 2-3 tasks matching skill level
        4. **Fill Curriculum:** Add remaining template tasks up to 15-20 total
        5. **Topological Sort:** Order tasks to respect prerequisites (e.g., "React Basics" before "React Hooks")
        6. **Balance Difficulty:** Ensure gradual progression (no steep jumps)
        7. **Optimize Sequence:** Final ordering by:
            - Prerequisites (mandatory first)
            - Skill impact (high-impact prioritized)
            - Difficulty (gradual increase)
            - Time balance (mix short and long tasks)
    - **Output:** Ordered array of 15-20 task IDs
    
    **Step 46: Create Learning Path Record**
    
    - **Message:** Learning Path Service → SQL Server: `INSERT INTO LearningPaths (Id, UserId, TrackType, SkillLevel, TotalTasks, CreatedAt, IsActive) VALUES (NEWID(), @UserId, @TrackType, @SkillLevel, @TotalTasks, GETUTCDATE(), 1)`
    - **Message:** SQL Server → Learning Path Service: `return learningPathId`
    
    **Step 47: Insert Path Tasks in Order**
    
    - **Message:** Learning Path Service → SQL Server: `(For each task in sequence) INSERT INTO PathTasks (Id, PathId, TaskId, OrderIndex, Status, Source, CreatedAt) VALUES (NEWID(), @PathId, @TaskId, @OrderIndex, 'NotStarted', 'Assessment', GETUTCDATE())`
    - **Message:** SQL Server → Learning Path Service: `OK`
    - **OrderIndex:** Sequential (1, 2, 3, ..., 18)
    - **Status:** 'NotStarted' for all initially
    - **Source:** 'Assessment' indicates path generated from assessment
    
    **Step 48: Return Path Generation Result**
    
    - **Message:** Learning Path Service → Backend API: `return {learningPathId, totalTasks, firstTaskId}`
    
    ---
    
    **Phase 5: Task Recommendations and Result Presentation**
    
    **Step 49: Generate Top 5 Immediate Recommendations**
    
    - **Message:** Backend API → Recommendation Engine: `generateRecommendations(userId, assessmentId, weakCategories, skillLevel, learningPathId)`
    - **Input:**
    
    json
    
      `{
        "weakCategories": ["SecurityPractices", "Testing", "DatabaseDesign"],
        "skillLevel": "Intermediate",
        "learningPathId": "<guid>"
      }`
    
    **Step 50: Query Recommended Tasks**
    
    - **Message:** Recommendation Engine → SQL Server: `SELECT TOP 5 T.Id, T.Title, T.Description, T.Category, T.Difficulty, T.EstimatedTime, T.ImpactScore FROM Tasks T INNER JOIN PathTasks PT ON T.Id = PT.TaskId WHERE PT.PathId = @PathId AND T.Category IN @WeakCategories AND T.Difficulty <= @SkillLevelDifficulty ORDER BY T.ImpactScore DESC, T.EstimatedTime ASC`
    - **Message:** SQL Server → Recommendation Engine: `return recommendedTasks[]`
    
    **Step 51: Create Recommendation Records**
    
    - **Message:** Recommendation Engine → SQL Server: `(For each task) INSERT INTO Recommendations (Id, UserId, AssessmentId, TaskId, Reason, Priority, CreatedAt) VALUES (NEWID(), @UserId, @AssessmentId, @TaskId, @Reason, @Priority, GETUTCDATE())`
    - **Message:** SQL Server → Recommendation Engine: `OK`
    - **Reason Examples:**
        - "Addresses weakness in Security Practices (55% score)"
        - "High-impact task for Full Stack developers"
    
    **Step 52: Return Recommendations**
    
    - **Message:** Recommendation Engine → Backend API: `return recommendations[]`
    
    **Step 53: Construct Comprehensive Results Response**
    
    - **Message:** Backend API → Backend API: `buildResultsResponse(assessment, scores, strengths, weaknesses, learningPath, recommendations)`
    - **Response Structure:**
    
    ```json
    
      {
        "assessmentId": "<guid>",
        "completedAt": "ISO8601",
        "duration": 2325,
        "overallScore": 74,
        "skillLevel": "Intermediate",
        "grade": "B",
        "categoryScores": {
          "ReactHooks": 85,
          "StateManagement": 70,
          "SecurityPractices": 55,
          ...
        },
        "strengths": [
          {"category": "ReactHooks", "score": 85, "message": "Strong understanding of React Hooks patterns"},
          {"category": "RESTAPIs", "score": 80, "message": "Solid API design skills"}
        ],
        "weaknesses": [
          {"category": "SecurityPractices", "score": 55, "message": "Needs improvement in authentication"},
          {"category": "Testing", "score": 50, "message": "Limited testing experience"}
        ],
        "learningPath": {
          "pathId": "<guid>",
          "trackType": "FullStack",
          "skillLevel": "Intermediate",
          "totalTasks": 18,
          "estimatedCompletionTime": "6-8 weeks",
          "firstTask": {
            "taskId": "<guid>",
            "title": "Implement JWT Authentication",
            "category": "Security",
            "estimatedTime": 3
          }
        },
        "recommendations": [
          {
            "taskId": "<guid>",
            "title": "Implement JWT Authentication",
            "reason": "Addresses weakness in Security Practices",
            "priority": "high",
            "estimatedTime": 3
          },
          ...
        ]
      }
    
    ```
    
    **Step 54: Return Results to Frontend**
    
    - **Message:** Backend API → Frontend: `200 OK {comprehensiveResults}`
    
    **Step 55: Render Results Dashboard**
    
    - **Message:** Frontend → User: `displayResultsDashboard(results)`
    - **UI Components:**
        - **Header:** Overall score (74%), skill level badge (Intermediate), grade (B)
        - **Radar Chart:** Visualize 20+ category scores
        - **Progress Bars:** Individual bars for each category with color coding
        - **Strengths Card:** Top 3 with checkmarks and positive messaging
        - **Weaknesses Card:** Top 3-5 with constructive guidance
        - **Learning Path Preview:** Track info, total tasks (18), estimated time (6-8 weeks), first 5 tasks
        - **Recommendations Section:** Top 5 recommended tasks with reasons and priority
    
    **Step 56: User Reviews Results**
    
    - **Message:** User → Frontend: `reviewResults()`
    - **Description:** User explores radar chart, reads strengths/weaknesses, reviews recommendations
    
    **Step 57: User Clicks "Start Learning"**
    
    - **Message:** User → Frontend: `clickStartLearning()`
    
    **Step 58: Navigate to First Task or Learning Path**
    
    - **Message:** Frontend → Frontend: `determineDestination(user, learningPath)`
    - **Routing Logic:**
    
    ```
      if (user clicks "Start Learning") → navigate to /tasks/{firstTaskId}
      else if (user clicks "View Full Path") → navigate to /dashboard/learning-path```
    ```
    
    - **Message:** Frontend → User: `navigateTo(destination)`
    
    **End of Assessment and Path Generation Flow**
    
    ---
    
    ### **Fragment Specifications**
    
    **1. alt (Alternative) Fragments**
    
    **Alt 1: JWT Token Validation (Step 5)**
    
    - **Guard [token invalid]:** Return 401, redirect to login
    - **Guard [token valid]:** Extract userId, continue
    
    **Alt 2: Active Assessment Check (Step 6)**
    
    - **Guard [active assessment exists]:** Return 409 with resume option
    - **Guard [no active assessment]:** Continue initialization
    
    **Alt 3: Reattempt Policy Check (Step 7)**
    
    - **Guard [too soon to retake]:** Return 429 with retry date
    - **Guard [eligible]:** Create new assessment
    
    **Alt 4: Assessment Creation (Step 8)**
    
    - **Guard [insert fails]:** Return 500 error
    - **Guard [insert succeeds]:** Initialize state
    
    **Alt 5: Answer Selection Validation (Step 23)**
    
    - **Guard [no option selected]:** Display error, wait for selection
    - **Guard [option selected]:** Submit to backend
    
    **Alt 6: Answer Payload Validation (Step 25)**
    
    - **Guard [invalid]:** Return 400 error
    - **Guard [valid]:** Retrieve correct answer
    
    **Alt 7: Answer Correctness Evaluation (Step 28)**
    
    - **Guard [correct]:** Increase score and difficulty
    - **Guard [incorrect]:** Decrease difficulty, mark weakness
    
    **Alt 8: Loop Continuation (Step 34)**
    
    - **Guard [questions < 30 AND timer active]:** Repeat from Step 13
    - **Guard [30 questions OR timer expired]:** Proceed to final scoring
    
    **2. loop (Iteration) Fragments**
    
    **Loop 1: Question Loop (Steps 13-34)**
    
    - **Condition:** `questionsAnswered < 30 AND timerActive`
    - **Body:** Request question, display, answer, evaluate, update state
    - **Termination:** 30 questions completed OR timer expires
    
    **Loop 2: Path Task Insertion (Step 47)**
    
    - **Condition:** `for each task in orderedTaskSequence`
    - **Body:** INSERT INTO PathTasks with incremental OrderIndex
    - **Termination:** All tasks inserted
    
    **Loop 3: Recommendation Creation (Step 51)**
    
    - **Condition:** `for each recommended task (up to 5)`
    - **Body:** INSERT INTO Recommendations with reason and priority
    - **Termination:** All recommendations stored
    
    **3. opt (Optional) Fragments**
    
    **Not prominently used in this diagram.** All major operations are mandatory within their respective phases. However, implementation may include optional retry logic for database operations (not shown for clarity).
    
    ---
    
    ### Synchronous vs. Asynchronous Communication
    
    **Synchronous Messages (Solid Arrows)**
    
    - **Frontend ↔ Backend API:** All HTTP requests (POST, GET) are synchronous
    - **Backend API ↔ Redis:** Cache operations (GET, SET) are synchronous with fast response
    - **Backend API ↔ SQL Server:** All database queries are synchronous
    - **Backend API ↔ Learning Path Service:** Path generation is synchronous (blocking)
    - **Backend API ↔ Recommendation Engine:** Recommendation generation is synchronous
    
    **Rationale:** Assessment workflow requires sequential validation and state management. Each step depends on previous results.
    
    **Asynchronous Messages (Dashed Arrows)**
    
    **Timer Operation (Implicit):**
    
    - While not explicitly shown as async messages in this sequence, the 40-minute countdown timer runs asynchronously in the frontend
    - Timer expiration triggers auto-finalize (would be shown as async message if modeled)
    
    **State Updates:**
    
    - Redis SET operations could be fire-and-forget in implementation, but shown as synchronous here for clarity
    
    **Return Messages (Dashed Arrows with Open Arrowheads)**
    
    All database queries, cache operations, and API calls show explicit return messages to demonstrate data flow.
    
    ---
    
    ### Alignment with Activity Diagram 4.4.3
    
    **Structural Alignment:**
    
    - **Phase 1 (Initialization):** Steps 1-12 implement activity diagram initialization phase
    - **Phase 2 (Question Loop):** Steps 13-34 implement the 30-question adaptive loop with fork/join for timer (timer shown implicitly here)
    - **Phase 3 (Scoring):** Steps 35-41 implement final scoring and analysis
    - **Phase 4 (Path Generation):** Steps 42-48 implement learning path algorithm
    - **Phase 5 (Results):** Steps 49-58 implement recommendation engine and result presentation
    
    **Decision Points:**
    
    - All activity diagram decision nodes are represented as alt fragments
    - Loop termination condition (30 questions OR timeout) matches activity diagram
    
    **Temporal Ordering:**
    
    - Sequence diagram adds precise message ordering not visible in activity diagram
    - Shows that state updates occur immediately after each answer evaluation
    
    ---
    
    ### Alignment with Functional Requirements
    
    **FR-ASSESS-01: Assessment Start**
    
    - ✅ Track selection (Steps 1-3)
    - ✅ Session creation (Steps 4-10)
    
    **FR-ASSESS-02: Question Bank**
    
    - ✅ Dynamic question retrieval (Steps 16-17)
    
    **FR-ASSESS-03: Adaptive Algorithm**
    
    - ✅ Difficulty adjustment based on correctness (Step 28)
    - ✅ Real-time state updates (Steps 29-31)
    
    **FR-ASSESS-04: Timer and Auto-Submit**
    
    - ✅ 40-minute countdown (Step 12)
    - ✅ Loop termination on timeout (Step 34 alt fragment)
    
    **FR-ASSESS-05: Score Calculation**
    
    - ✅ Overall and category scores (Steps 36-37)
    - ✅ Skill level determination (Step 38)
    
    **FR-ASSESS-07: Results Visualization**
    
    - ✅ Comprehensive results dashboard (Step 55)
    
    **FR-PATH-01: Learning Path Generation**
    
    - ✅ Algorithmic path creation (Steps 42-48)
    - ✅ Prerequisite ordering and difficulty balancing
    
    ---
    
    ### Non-Functional Requirements Alignment
    
    **NFR-PERF-01: API Response Time**
    
    - Target: < 200ms for next question retrieval
    - Achieved through Redis state caching (Step 14)
    
    **NFR-PERF-02: Analysis Processing Time**
    
    - Target: < 3 seconds for final scoring and path generation
    - Parallel query execution could optimize (not shown explicitly)
    
    **NFR-UX-03: Intuitive Navigation**
    
    - Progressive disclosure: questions → feedback → results → path preview
    
    **NFR-UX-04: Onboarding Experience**
    
    - Instructions displayed (Step 11)
    - Progress indicators (Step 20)
    
    ---
    
    ### Notes for Implementation
    
    1. **State Management:**
        - Use Redis for assessment state with 2-hour TTL
        - Persist to SQL Server after each answer for durability
        - Consider write-through cache pattern
    2. **Question Selection Optimization:**
        - Pre-compute category distribution at assessment start
        - Use indexed queries on TrackType, Difficulty, IsActive
        - Consider caching question metadata
    3. **Timer Implementation:**
        - Client-side timer with server-side validation
        - Send heartbeat every 5 minutes to detect disconnections
        - Auto-save state periodically
    4. **Path Generation Performance:**
        - Cache track templates for fast retrieval
        - Pre-compute prerequisite dependency graphs
        - Consider async job queue if generation > 3 seconds
    5. **Testing:**
        - Unit tests for adaptive algorithm logic
        - Integration tests for full assessment flow
        - Load tests for concurrent assessments
        - Verify prerequisite ordering in generated paths

### **4.5.3 — Full Code Submission (Static + AI Analysis Pipeline)**

### Overview

This sequence diagram models the complete code submission workflow, illustrating the temporal flow from user-initiated submission through the multi-layered analysis pipeline. The diagram demonstrates how submitted code is ingested, queued, and processed through both static analysis tools and AI-powered code review, culminating in comprehensive feedback generation.

**Purpose:**

- Visualize the end-to-end code submission and analysis pipeline
- Demonstrate asynchronous job processing architecture
- Show integration between synchronous API interactions and background workers
- Illustrate the multi-layered analysis approach (static tools + AI)
- Model error handling, retry logic, and graceful degradation

**Scope:**

- Code submission via GitHub repository or file upload
- Submission validation and metadata capture
- Job queueing with Azure Service Bus
- Background worker job consumption
- Code retrieval (GitHub clone or blob download)
- Parallel execution of static analysis and AI review
- Result aggregation and feedback persistence
- Status updates and user notification

**Alignment with Previous Diagrams:**

- **Activity Diagrams 4.4.4 & 4.4.5:** Provides logical flow; this sequence diagram adds temporal ordering and shows API/Worker separation
- **Use Case UC_SubmitCode:** Implements the code submission use case with detailed component interactions
- **Functional Requirements:** FR-SUB-01 through FR-SUB-12, FR-FEED-01, FR-FEED-09

---

### Lifelines (Participants)

The sequence diagram includes the following lifelines:

**1. User (Learner)**

- **Type:** Human Actor
- **Role:** Initiates code submission by linking repository or uploading file
- **Interactions:** Navigates to task, provides GitHub URL or selects file, monitors status

**2. Frontend (React Application)**

- **Type:** Client Application
- **Role:** Submission UI, file handling, status polling
- **Technology:** React with TypeScript, file upload component
- **Responsibilities:**
    - Render submission form with GitHub/upload options
    - Validate GitHub URL format or file size/type
    - Display submission status and progress
    - Poll for completion and display feedback

**3. Backend API (ASP.NET Core)**

- **Type:** Application Server
- **Role:** Submission ingestion, validation, queueing
- **Technology:** ASP.NET Core 8 Web API
- **Responsibilities:**
    - Validate submission requests
    - Check for duplicate submissions
    - Store submission metadata
    - Enqueue jobs to Azure Service Bus
    - Provide status endpoints for polling

**4. SQL Server Database**

- **Type:** Relational Database
- **Role:** Persistent storage for submissions, tasks, feedback
- **Responsibilities:**
    - Store submission records with metadata
    - Track submission status lifecycle
    - Store static analysis results
    - Store AI analysis results
    - Store aggregated feedback

**5. Azure Blob Storage**

- **Type:** Cloud Object Storage
- **Role:** Store uploaded code files
- **Responsibilities:**
    - Accept ZIP file uploads
    - Store cloned GitHub repositories
    - Provide blob URLs for worker access

**6. Azure Service Bus**

- **Type:** Message Queue Service
- **Role:** Durable job queue for asynchronous processing
- **Responsibilities:**
    - Receive job messages from API
    - Deliver messages to background workers
    - Handle retries and dead-letter queue
    - Ensure message durability

**7. Background Worker (.NET Worker Service)**

- **Type:** Background Processing Service
- **Role:** Orchestrate code analysis pipeline
- **Technology:** .NET 8 Worker Service (hosted service)
- **Responsibilities:**
    - Consume messages from queue
    - Coordinate code retrieval and analysis
    - Execute static and AI analysis
    - Aggregate results and persist feedback

**8. GitHub API**

- **Type:** External REST API
- **Role:** Source code repository access
- **Responsibilities:**
    - Validate repository accessibility
    - Provide repository contents for cloning

**9. Docker Engine**

- **Type:** Container Runtime
- **Role:** Execute static analysis tools in isolated environments
- **Responsibilities:**
    - Run ESLint, SonarQube, Bandit, Roslyn in containers
    - Enforce resource limits and timeouts
    - Capture tool output

**10. AI Service (Python FastAPI)**

- **Type:** Microservice
- **Role:** AI-powered code review using LLM
- **Technology:** Python FastAPI with LLM integration
- **Responsibilities:**
    - Receive code and context for analysis
    - Generate structured feedback using LLM
    - Return scores, insights, and recommendations

---

### Interaction Flow Description

The sequence diagram is organized into two major sections with multiple phases:

---

### **SECTION A: Synchronous Submission Ingestion (Frontend → Backend API)**

**Phase 1: Submission Initiation**

**Precondition:** User is authenticated, has selected a task, and navigates to submission page.

**Step 1: User Navigates to Task Submission**

- **Message:** User → Frontend: `navigateToTask(taskId)`
- **Description:** User clicks on a task from their learning path

**Step 2: Display Submission Form**

- **Message:** Frontend → User: `displaySubmissionForm()`
- **Description:** Frontend renders submission interface with two options:
    - **Option A:** Link GitHub Repository
    - **Option B:** Upload ZIP File

**Step 3: User Selects Submission Method**

- **Decision Point (alt fragment):**
    - **[GitHub Repository]:** Proceed to Phase 2A
    - **[File Upload]:** Proceed to Phase 2B

---

**Phase 2A: GitHub Repository Submission**

**Step 4A: User Provides GitHub URL**

- **Message:** User → Frontend: `enterGitHubURL(repositoryUrl)`
- **Description:** User pastes repository URL (e.g., `https://github.com/username/project`)

**Step 5A: Client-Side URL Validation**

- **Message:** Frontend → Frontend: `validateGitHubURL(url)`
- **Validation:** Regex check for valid GitHub URL format
- **Decision Point (alt fragment):**
    - **[invalid format]:**
        - Frontend → User: Display inline error "Invalid GitHub URL format"
        - **Return to Step 4A**
    - **[valid format]:**
        - Proceed to Step 6A

**Step 6A: User Submits GitHub Repository**

- **Message:** User → Frontend: `submitGitHubRepo()`
- **Description:** User clicks "Submit" button

**Step 7A: Send Submission Request**

- **Message:** Frontend → Backend API: `POST /api/submissions {taskId, submissionType: "GitHub", repositoryUrl, branch}`
- **HTTP Details:**
    - **Endpoint:** `/api/submissions`
    - **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
    - **Payload:**

json

    `{
      "taskId": "<guid>",
      "submissionType": "GitHub",
      "repositoryUrl": "https://github.com/username/project",
      "branch": "main"
    }`

**→ Jump to Phase 3 (Common Validation and Queueing)**

---

**Phase 2B: File Upload Submission**

**Step 4B: User Selects ZIP File**

- **Message:** User → Frontend: `selectFile(zipFile)`
- **Description:** User clicks "Upload ZIP" and selects file from filesystem

**Step 5B: Client-Side File Validation**

- **Message:** Frontend → Frontend: `validateFile(file)`
- **Validation:**
    - File extension is `.zip`
    - File size < 50 MB
    - File not empty
- **Decision Point (alt fragment):**
    - **[validation fails]:**
        - Frontend → User: Display error "Invalid file type or size exceeds 50 MB"
        - **Return to Step 4B**
    - **[validation succeeds]:**
        - Proceed to Step 6B

**Step 6B: User Submits File**

- **Message:** User → Frontend: `submitFile()`
- **Description:** User clicks "Submit" button

**Step 7B: Upload File to Backend**

- **Message:** Frontend → Backend API: `POST /api/submissions/upload (multipart/form-data) {taskId, submissionType: "Upload", file}`
- **HTTP Details:**
    - **Endpoint:** `/api/submissions/upload`
    - **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: multipart/form-data`
    - **Payload:** Multipart form with `taskId`, `submissionType`, and binary file data

**→ Proceed to Phase 3**

---

**Phase 3: Backend Validation and Metadata Persistence**

**Step 8: Validate JWT Token**

- **Message:** Backend API → Backend API: `validateJWT(token)`
- **Decision Point (alt fragment):**
    - **[token invalid]:**
        - Backend API → Frontend: `401 Unauthorized`
        - Frontend → User: Redirect to login
        - **Sequence terminates**
    - **[token valid]:**
        - Extract `userId` from claims
        - Proceed to Step 9

**Step 9: Validate Request Payload**

- **Message:** Backend API → Backend API: `validatePayload(request)`
- **Validation:**
    - `taskId` exists and is active
    - For GitHub: `repositoryUrl` is well-formed
    - For Upload: File size < 50 MB, MIME type is `application/zip`
    - User has not exceeded rate limits (e.g., 10 submissions per hour)
- **Decision Point (alt fragment):**
    - **[validation fails]:**
        - Backend API → Frontend: `400 Bad Request {errors}`
        - Frontend → User: Display validation errors
        - **Sequence terminates**
    - **[validation succeeds]:**
        - Proceed to Step 10

**Step 10: Check for Duplicate Submission**

- **Message:** Backend API → SQL Server: `SELECT Id FROM Submissions WHERE UserId = @UserId AND TaskId = @TaskId AND (RepositoryUrl = @Url OR Status IN ('Pending', 'Processing')) AND CreatedAt > DATEADD(minute, -15, GETUTCDATE())`
- **Message:** SQL Server → Backend API: `return existingSubmission (or null)`
- **Decision Point (alt fragment):**
    - **[duplicate found]:**
        - Backend API → Frontend: `409 Conflict {message: "Duplicate submission detected"}`
        - Frontend → User: "You have already submitted this recently"
        - **Sequence terminates**
    - **[no duplicate]:**
        - Proceed to Step 11

**Step 11 (GitHub only): Verify GitHub OAuth Token**

- **Message:** Backend API → SQL Server: `SELECT GitHubAccessToken FROM Users WHERE Id = @UserId`
- **Message:** SQL Server → Backend API: `return encryptedToken`
- **Decision Point (alt fragment):**
    - **[token missing/expired]:**
        - Backend API → Frontend: `403 Forbidden {message: "Please reconnect GitHub account"}`
        - **Sequence terminates**
    - **[token valid]:**
        - Backend API → Backend API: `decryptToken(encryptedToken)`
        - Proceed to Step 12

**Step 12 (GitHub only): Validate Repository Access**

- **Message:** Backend API → GitHub API: `GET /repos/{owner}/{repo} (Authorization: Bearer <token>)`
- **Message:** GitHub API → Backend API: `200 OK {repositoryMetadata}` or error
- **Decision Point (alt fragment):**
    - **[404 Not Found]:**
        - Backend API → Frontend: `404 Not Found {message: "Repository does not exist or is private"}`
        - **Sequence terminates**
    - **[403 Forbidden]:**
        - Backend API → Frontend: `403 Forbidden {message: "No access to repository"}`
        - **Sequence terminates**
    - **[429 Rate Limited]:**
        - Backend API → Frontend: `429 Too Many Requests {message: "GitHub rate limit exceeded"}`
        - **Sequence terminates**
    - **[200 Success]:**
        - Validate repository size < 50 MB
        - Proceed to Step 13

**Step 13 (Upload only): Upload File to Blob Storage**

- **Message:** Backend API → Azure Blob Storage: `PUT /containers/submissions/blobs/{userId}/{submissionId}/code.zip`
- **Message:** Azure Blob Storage → Backend API: `201 Created {blobUrl}`
- **Decision Point (alt fragment):**
    - **[upload fails]:**
        - Backend API → Frontend: `500 Internal Server Error {message: "Failed to store file"}`
        - **Sequence terminates**
    - **[upload succeeds]:**
        - Proceed to Step 14

**Step 14: Create Submission Record**

- **Message:** Backend API → SQL Server: `INSERT INTO Submissions (Id, UserId, TaskId, SubmissionType, RepositoryUrl, Branch, BlobUrl, Status, CreatedAt) VALUES (NEWID(), @UserId, @TaskId, @Type, @Url, @Branch, @BlobUrl, 'Pending', GETUTCDATE())`
- **Message:** SQL Server → Backend API: `return submissionId`
- **Decision Point (alt fragment):**
    - **[insert fails]:**
        - Backend API → Frontend: `500 Internal Server Error`
        - **Sequence terminates**
    - **[insert succeeds]:**
        - Proceed to Step 15

**Step 15: Enqueue Submission Job**

- **Message:** Backend API → Azure Service Bus: `Send message to queue: code-ingestion-queue`
- **Message Content:**

json

  `{
    "submissionId": "<guid>",
    "userId": "<guid>",
    "taskId": "<guid>",
    "submissionType": "GitHub" | "Upload",
    "repositoryUrl": "...",
    "branch": "main",
    "blobUrl": "...",
    "timestamp": "ISO8601"
  }`

- **Message Properties:**
    - `MessageId`: `submissionId`
    - `TimeToLive`: 24 hours
    - `MaxDeliveryCount`: 3 (retries)
- **Message:** Azure Service Bus → Backend API: `202 Accepted {messageId}`
- **Decision Point (alt fragment):**
    - **[queue unavailable]:**
        - Backend API → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
        - Backend API → Frontend: `503 Service Unavailable {message: "Queue system temporarily unavailable"}`
        - **Sequence terminates**
    - **[message enqueued]:**
        - Proceed to Step 16

**Step 16: Return Acceptance Response**

- **Message:** Backend API → Frontend: `202 Accepted {submissionId, status: "Pending", message, estimatedTime}`
- **Response:**

json

  `{
    "submissionId": "<guid>",
    "status": "Pending",
    "message": "Your code submission has been received and is being processed.",
    "estimatedProcessingTime": "3-5 minutes"
  }`

**Step 17: Display Success Notification**

- **Message:** Frontend → User: `displaySuccessToast("Code submitted successfully")`
- **Message:** Frontend → Frontend: `navigateToStatusPage(submissionId)`
- **Description:** Navigate to `/submissions/{submissionId}/status` for real-time updates

**End of Section A: Synchronous Submission Ingestion**

---

### **SECTION B: Asynchronous Background Processing (Background Worker)**

**Note:** This section executes independently and asynchronously after the submission has been queued. The user's frontend can poll for status updates.

**Phase 4: Job Consumption and Code Retrieval**

**Step 18: Worker Polls Queue**

- **Message:** Background Worker → Azure Service Bus: `ReceiveMessages(queueName: "code-ingestion-queue", maxMessages: 1, timeout: 30s)`
- **Description:** Worker continuously polls queue with long-polling pattern

**Step 19: Receive Message**

- **Message:** Azure Service Bus → Background Worker: `return message {submissionData}`
- **Description:** Worker receives next job from queue

**Step 20: Validate Message Schema**

- **Message:** Background Worker → Background Worker: `validateMessageSchema(message)`
- **Decision Point (alt fragment):**
    - **[invalid schema]:**
        - Background Worker → Azure Service Bus: `DeadLetter(message, reason: "Invalid schema")`
        - Background Worker logs error
        - **Sequence terminates for this message**
    - **[valid schema]:**
        - Extract `submissionId`, `submissionType`, etc.
        - Proceed to Step 21

**Step 21: Update Submission Status to "Processing"**

- **Message:** Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Processing', UpdatedAt = GETUTCDATE() WHERE Id = @SubmissionId`
- **Message:** SQL Server → Background Worker: `OK`

**Step 22: Retrieve Task Metadata**

- **Message:** Background Worker → SQL Server: `SELECT Id, Title, Description, ExpectedLanguage, Difficulty FROM Tasks WHERE Id = @TaskId AND IsActive = 1`
- **Message:** SQL Server → Background Worker: `return taskMetadata`
- **Decision Point (alt fragment):**
    - **[task not found]:**
        - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
        - Background Worker → Azure Service Bus: `DeadLetter(message, reason: "Task not found")`
        - **Sequence terminates**
    - **[task found]:**
        - Store task context for analysis
        - Proceed to Step 23

**Step 23: Code Retrieval Decision**

- **Decision Point (alt fragment based on submissionType):**
    - **[GitHub]:** Proceed to Phase 4A
    - **[Upload]:** Proceed to Phase 4B

---

**Phase 4A: GitHub Repository Retrieval**

**Step 24A: Decrypt GitHub Token**

- **Message:** Background Worker → SQL Server: `SELECT GitHubAccessToken FROM Users WHERE Id = @UserId`
- **Message:** SQL Server → Background Worker: `return encryptedToken`
- **Message:** Background Worker → Background Worker: `decryptToken(encryptedToken)`

**Step 25A: Clone GitHub Repository**

- **Message:** Background Worker → GitHub API: `git clone {repositoryUrl} --branch {branch} --depth 1`
- **Description:** Shallow clone to temporary directory `/tmp/submissions/{submissionId}/`
- **Decision Point (alt fragment):**
    - **[clone fails]:**
        - **Retry Logic:** Background Worker waits 1s, 5s, 15s and retries up to 3 times
        - **If all retries fail:**
            - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
            - Background Worker logs error
            - **Sequence terminates**
    - **[clone succeeds]:**
        - Proceed to Step 26A

**Step 26A: Validate Repository Structure**

- **Message:** Background Worker → Background Worker: `validateCodeStructure(directory)`
- **Validation:**
    - Directory not empty
    - Contains recognizable code files (based on `ExpectedLanguage`)
    - Total size < 50 MB
- **Decision Point (alt fragment):**
    - **[invalid structure]:**
        - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
        - **Sequence terminates**
    - **[valid structure]:**
        - Proceed to Step 27A

**Step 27A: Archive Repository to Blob Storage**

- **Message:** Background Worker → Azure Blob Storage: `PUT /containers/submissions/blobs/{userId}/{submissionId}/retrieved-code.zip`
- **Purpose:** Preserve exact analyzed version for auditing
- **Decision Point (opt fragment):**
    - **[upload fails]:**
        - Background Worker logs warning (non-critical)
    - **[upload succeeds]:**
        - Continue

**→ Jump to Phase 5 (Parallel Analysis)**

---

**Phase 4B: Uploaded File Retrieval**

**Step 24B: Download ZIP from Blob Storage**

- **Message:** Background Worker → Azure Blob Storage: `GET /containers/submissions/blobs/{blobUrl}`
- **Description:** Download file to temporary directory `/tmp/submissions/{submissionId}/code.zip`
- **Decision Point (alt fragment):**
    - **[download fails]:**
        - **Retry Logic:** Background Worker retries up to 3 times
        - **If all retries fail:**
            - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
            - **Sequence terminates**
    - **[download succeeds]:**
        - Proceed to Step 25B

**Step 25B: Extract ZIP File**

- **Message:** Background Worker → Background Worker: `extractZip(zipPath, targetDirectory)`
- **Target:** `/tmp/submissions/{submissionId}/extracted/`
- **Security Check:** Validate no directory traversal attacks (e.g., `../` in paths)
- **Decision Point (alt fragment):**
    - **[extraction fails]:**
        - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
        - **Sequence terminates**
    - **[extraction succeeds]:**
        - Proceed to Step 26B

**Step 26B: Validate Extracted Contents**

- **Message:** Background Worker → Background Worker: `validateCodeStructure(extractedDir)`
- **Validation:** Same as Step 26A
- **Decision Point (alt fragment):**
    - **[invalid]:**
        - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
        - **Sequence terminates**
    - **[valid]:**
        - Proceed to Phase 5

---

**Phase 5: Parallel Analysis Execution (Fork)**

**Note:** This section demonstrates parallel processing. Static analysis and AI review execute concurrently to minimize total processing time.

**Step 28: Preparation**

- **Message:** Background Worker → Background Worker: `setCodeDirectory(codeDir)`
- **Message:** Background Worker → Background Worker: `initializeResultContainers()`

**Fork into Two Parallel Branches:**

---

**Branch A: Static Code Analysis**

**Step 29A: Determine Applicable Static Tools**

- **Message:** Background Worker → Background Worker: `selectStaticTools(expectedLanguage)`
- **Logic:** Based on `ExpectedLanguage` from task:
    - **JavaScript/TypeScript:** ESLint + Prettier + SonarQube
    - **Python:** Bandit + SonarQube
    - **C#/.NET:** Roslyn Analyzers + SonarQube
    - **Java:** SonarQube

**Step 30A: Launch Docker Containers for Static Analysis**

- **Message:** Background Worker → Docker Engine: `docker run --rm -v {codeDir}:/code:ro static-analysis/eslint:latest eslint /code --format json --output-file /output/eslint.json`
- **Resource Limits:**
    - CPU: 1 core
    - Memory: 512 MB
    - Timeout: 3 minutes per tool
- **Repeat for each selected tool**

**Step 31A: Monitor Container Execution**

- **Message:** Background Worker → Docker Engine: `monitorContainerExecution(containerId, timeout: 180s)`
- **Decision Point (per tool, alt fragment):**
    - **[execution succeeds]:**
        - Background Worker → Background Worker: `captureOutput(/output/{tool}.json)`
        - Parse JSON output
    - **[execution fails or times out]:**
        - Background Worker logs error with tool name
        - Mark tool result as `unavailable`
        - Continue with other tools (partial degradation)

**Step 32A: Normalize Static Analysis Results**

- **Message:** Background Worker → Background Worker: `normalizeStaticResults(toolOutputs[])`
- **Description:** Convert each tool's output to unified schema:

json

  `{
    "tool": "ESLint",
    "issues": [
      {
        "severity": "error",
        "category": "security",
        "message": "SQL injection vulnerability detected",
        "file": "src/db.js",
        "line": 42,
        "column": 15,
        "rule": "security/detect-sql-injection"
      }
    ],
    "summary": {
      "totalIssues": 15,
      "errors": 3,
      "warnings": 10,
      "info": 2
    }
  }`

**Step 33A: Aggregate Static Results**

- **Message:** Background Worker → Background Worker: `aggregateStaticResults(normalizedResults[])`
- **Actions:**
    - Combine results from all tools
    - Remove duplicate issues (same file/line reported by multiple tools)
    - Categorize by severity and type
    - Calculate scores:
        - Maintainability Score
        - Security Score
        - Style Score

**Step 34A: Store Static Analysis Record**

- **Message:** Background Worker → SQL Server: `INSERT INTO StaticAnalysis (Id, SubmissionId, ToolResults, MaintainabilityScore, SecurityScore, StyleScore, ExecutionTime, CreatedAt) VALUES (NEWID(), @SubmissionId, @ToolResultsJSON, @MaintScore, @SecScore, @StyleScore, @ExecTime, GETUTCDATE())`
- **Message:** SQL Server → Background Worker: `return staticAnalysisId`
- **Decision Point (alt fragment):**
    - **[insert fails]:**
        - Background Worker logs error but continues (results cached in memory)
    - **[insert succeeds]:**
        - Static analysis complete

**→ Wait at Join Node**

---

**Branch B: AI Code Review**

### **Step 29B: Prepare Context for AI Service**

- **Message:** Background Worker → Background Worker: `buildAIContext(codeFiles, taskMetadata, staticSummary)`
- **Context Structure:**

json

  `{
    "submissionId": "<guid>",
    "taskContext": {
      "title": "Build REST API with Authentication",
      "description": "Implement JWT-based auth...",
      "expectedLanguage": "JavaScript",
      "difficulty": "Intermediate"
    },
    "codeFiles": [
      {
        "path": "src/app.js",
        "content": "<file_content>",
        "language": "javascript"
      }
    ],
    "staticAnalysisSummary": {
      "issues": 15,
      "criticalIssues": 3,
      "topCategories": ["security", "code-smell"]
    }
  }`

- **Optimization:**
    - Limit total code content to 15,000 tokens
    - Prioritize main files; summarize large dependencies

**Step 30B: Invoke AI Service**

- **Message:** Background Worker → AI Service (FastAPI): `POST /api/review {context}`
- **HTTP Details:**
    - **Endpoint:** `https://ai-service.internal/api/review`
    - **Headers:** `Content-Type: application/json`, `X-API-Key: <internal_key>`
    - **Timeout:** 120 seconds
- **Circuit Breaker:**
    - **Closed (Normal):** Allow requests
    - **Open (Failing):** Stop requests after 5 consecutive failures for 60 seconds
    - **Half-Open:** Test with single request after cooldown

**Step 31B: AI Service Processes Request**

- **Message:** AI Service → AI Service: `validateRequestSchema(context)`
- **Message:** AI Service → AI Service: `selectLLMProvider()` (OpenAI GPT-4 / Claude / Ollama)
- **Message:** AI Service → AI Service: `executePromptEngineering(context)`
- **Message:** AI Service → AI Service: `generateStructuredFeedback()`
- **Description:** AI service internal processing (not fully detailed in this diagram)

**Step 32B: AI Service Returns Response**

- **Message:** AI Service → Background Worker: `200 OK {aiAnalysisData}`
- **Response Structure:**

json

  `{
    "overallScore": 78,
    "scores": {
      "functionality": 85,
      "readability": 75,
      "security": 70,
      "performance": 80,
      "bestPractices": 75
    },
    "strengths": [
      "Good separation of concerns in authentication module",
      "Proper error handling with try-catch blocks"
    ],
    "weaknesses": [
      "Password hashing uses MD5 (insecure)",
      "Missing input validation on user endpoints"
    ],
    "recommendations": [
      {
        "priority": "high",
        "category": "security",
        "message": "Replace MD5 with bcrypt for password hashing",
        "suggestedFix": "const bcrypt = require('bcrypt');\nconst hash = await bcrypt.hash(password, 10);"
      }
    ],
    "detailedFeedback": "...",
    "modelUsed": "gpt-4-turbo",
    "tokensUsed": 3450
  }`

**Step 33B: Worker Receives and Validates AI Response**

- **Message:** Background Worker → Background Worker: `validateAIResponseSchema(response)`
- **Decision Point (alt fragment):**
    - **[timeout 120s exceeded]:**
        - Background Worker logs timeout error
        - Set AI result as `unavailable`
        - **Continue workflow** (graceful degradation - use static only)
    - **[AI service error 500/503]:**
        - Check circuit breaker state
        - **Retry once after 5-second delay**
        - **If retry fails:**
            - Set AI result as `unavailable`
            - Continue
    - **[200 Success]:**
        - **If schema invalid:**
            - Log validation error
            - Set AI result as `unavailable`
            - Continue
        - **If schema valid:**
            - Proceed to Step 34B

**Step 34B: Store AI Analysis Record**

- **Message:** Background Worker → SQL Server: `INSERT INTO AIAnalysis (Id, SubmissionId, OverallScore, ScoresJSON, StrengthsJSON, WeaknessesJSON, RecommendationsJSON, DetailedFeedback, ModelUsed, TokensUsed, ExecutionTime, CreatedAt) VALUES (NEWID(), @SubmissionId, @OverallScore, @ScoresJSON, @StrengthsJSON, @WeaknessesJSON, @RecommendationsJSON, @DetailedFeedback, @Model, @Tokens, @ExecTime, GETUTCDATE())`
- **Message:** SQL Server → Background Worker: `return aiAnalysisId`
- **Decision Point (alt fragment):**
    - **[insert fails]:**
        - Background Worker logs error but continues (results cached)
    - **[insert succeeds]:**
        - AI analysis complete

**→ Wait at Join Node**

---

**Phase 6: Result Aggregation and Feedback Persistence (Join)**

**Step 35: Synchronize Analysis Results**

- **Message:** Background Worker → Background Worker: `waitForBothBranches()` or `waitForTimeout(600s)`
- **Join Condition:** At least one analysis completed successfully
- **Decision Point (alt fragment):**
    - **[both analyses failed]:**
        - Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
        - Background Worker logs critical error
        - **Sequence terminates**
    - **[at least one succeeded]:**
        - Proceed to Step 36

**Step 36: Aggregate Comprehensive Feedback**

- **Message:** Background Worker → Background Worker: `aggregateFeedback(staticResults, aiResults)`
- **Aggregation Logic:**
    - **If Both Available:** Merge static + AI insights, prioritize AI for high-level feedback
    - **If Only Static:** Use static results; note AI unavailability
    - **If Only AI:** Use AI results; note static tools failed
- **Output Structure:**

```json

  {
    "submissionId": "<guid>",
    "overallScore": 76,
    "categoryScores": {
      "functionality": 85,
      "codeQuality": 72,
      "security": 68,
      "performance": 80,
      "maintainability": 75
    },
    "staticAnalysisSummary": {
      "totalIssues": 15,
      "critical": 3,
      "high": 5,
      "medium": 7`

},
"aiInsights": {
"strengths": [...],
"weaknesses": [...],
"recommendations": [...]
},
"analysisMetadata": {
"staticToolsUsed": ["ESLint", "SonarQube"],
"aiModelUsed": "gpt-4-turbo",
"totalProcessingTime": 142,
"aiAvailable": true,
"staticAvailable": true
}
}

```

**Step 37: Calculate Final Submission Score**

- **Message:** Background Worker → Background Worker: `calculateFinalScore(categoryScores)`
- **Formula:**

```
FinalScore = (
Functionality × 0.30 +
CodeQuality × 0.25 +
Security × 0.20 +
Performance × 0.15 +
Maintainability × 0.10
)

```

- **Grade Assignment:**
- Excellent: ≥ 90
- Good: 80-89
- Satisfactory: 70-79
- Needs Improvement: 60-69
- Poor: < 60

**Step 38: Create Feedback Record**

**Message:** Background Worker → SQL Server: `BEGIN TRANSACTION; INSERT INTO Feedback (Id, SubmissionId, OverallScore, Grade, CategoryScoresJSON, AggregatedFeedbackJSON, StaticAnalysisId, AIAnalysisId, CreatedAt) VALUES (NEWID(), @SubmissionId, @FinalScore, @Grade, @CategoryScoresJSON, @FeedbackJSON, @StaticId, @AIId, GETUTCDATE())`

**Transaction:** Use database transaction to ensure atomicity
**Decision Point (alt fragment):**

- **[insert fails]:**
- Background Worker: `ROLLBACK TRANSACTION`
- Retry once
- **If retry fails:**
- Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Failed' WHERE Id = @SubmissionId`
- **Sequence terminates**
- **[insert succeeds]:**
- Proceed to Step 39

**Step 39: Update Submission Status to "Completed"**

**Message:** Background Worker → SQL Server: `UPDATE Submissions SET Status = 'Completed', FinalScore = @FinalScore, CompletedAt = GETUTCDATE(), ProcessingTime = DATEDIFF(second, CreatedAt, GETUTCDATE()) WHERE Id = @SubmissionId; COMMIT TRANSACTION`

**Message:** SQL Server → Background Worker: `OK`

**Step 40: Generate Task Recommendations**

**Message:** Background Worker → Background Worker: `generateRecommendations(weaknesses, userId, taskId)`**Logic:** Based on identified weaknesses, query `Tasks` table for relevant learning tasks
**Message:** Background Worker → SQL Server: `INSERT INTO Recommendations (Id, UserId, SubmissionId, TaskId, Reason, Priority, CreatedAt) SELECT NEWID(), @UserId, @SubmissionId, T.Id, @Reason, @Priority, GETUTCDATE() FROM Tasks T WHERE T.Category IN @WeakCategories AND T.Difficulty = @UserSkillLevel ORDER BY T.ImpactScore DESC LIMIT 5`

**Message:** SQL Server → Background Worker: `OK`

**Step 41: Update User Skill Profile**

**Message:** Background Worker → SQL Server: `UPDATE UserSkills SET Score = (Score * 0.7 + @NewCategoryScore * 0.3), LastUpdated = GETUTCDATE() WHERE UserId = @UserId AND SkillCategory = @Category`**Description:** Weighted average to update skill scores based on submission performance

**Step 42: Complete Message Processing**

**Message:** Background Worker → Azure Service Bus: `Complete(message)`**Description:** Acknowledge successful processing; message removed from queue

---

**Phase 7: Notification and Cleanup**

**Step 43: Trigger Email Notification**

**Message:** Background Worker → Notification Service (SendGrid): `POST /api/notifications/submission-completed {userId, submissionId, finalScore, grade, feedbackUrl}`**Email Content:**

- Subject: "Your Code Submission Results Are Ready"
- Body: Summary of score, key insights, link to full feedback
**Decision Point (opt fragment):**
- **[notification fails]:**
- Background Worker logs error (non-critical)
- **[notification sent]:**
- Continue

**Step 44: Clean Up Temporary FilesMessage:** Background Worker → Background Worker: `cleanupTempFiles(submissionId)`**Actions:**

- Delete cloned repository from `/tmp/submissions/{submissionId}/`
- Remove extracted ZIP files
- Clear Docker container artifacts
**Purpose:** Free disk space; maintain worker hygiene
**Step 45: Log Completion MetricsMessage:** Background Worker → Azure Application Insights: `logMetrics({processingTime, staticDuration, aiDuration, finalScore, toolsUsed, status})`**Metrics Logged:**
- Total processing time
- Static analysis duration
- AI analysis duration
- Final score
- Tools used
- Success/failure status
**Purpose:** Performance monitoring, cost tracking, quality assurance
*End of Section B: Asynchronous Background Processing*

---

### **SECTION C: Status Polling (Parallel to Section B)**

*Note:** While background processing occurs, the frontend polls for status updates.
**Step 46 (Parallel): Frontend Polls for StatusMessage:** Frontend → Backend API: `GET /api/submissions/{submissionId}/status`**Frequency:** Every 5 seconds
**Description:** Frontend periodically checks submission status
**Step 47: Backend Retrieves Current StatusMessage:** Backend API → SQL Server: `SELECT Status, FinalScore, CompletedAt FROM Submissions WHERE Id = @SubmissionId`**Message:** SQL Server → Backend API: `return statusData`**Step 48: Return Status ResponseMessage:** Backend API → Frontend: `200 OK {status, progress, estimatedRemaining}`**Response:**

```json
 {
 "status": "Processing" | "Completed" | "Failed",
 "progress": 65, // percentage
 "estimatedRemainingTime": 90, // seconds
 "finalScore": 76, // if completed
 "message": "Analyzing code quality..."
 }

```

**Step 49: Update Status UIMessage:** Frontend → User: `updateStatusDisplay(statusData)`**UI Elements:**

- Progress bar
- Status message
- Estimated time remaining
**Step 50: Check CompletionDecision Point (alt fragment):**
- **[status == "Completed"]:**
- Frontend → Frontend: `stopPolling()`
- Frontend → User: Display "Analysis complete!" notification
- Frontend → User: Show "View Feedback" button
- **Polling stops**
- **[status == "Failed"]:**
- Frontend → Frontend: `stopPolling()`
- Frontend → User: Display error message with retry option
- **Polling stops**
- **[status == "Processing" or "Pending"]:**
- Frontend waits 5 seconds
- **Loop:** Return to Step 46
*End of Sequence*

---

### Fragment Specifications

**1. alt (Alternative) Fragments***Alt 1: Submission Method Selection**
**Guard [GitHub]:** GitHub repository submission flow
**Guard [File Upload]:** ZIP file upload flow
*Alt 2: GitHub URL Validation**
**Guard [invalid]:** Display error, wait for correction
**Guard [valid]:** Submit to backend
*Alt 3: File Validation**
**Guard [invalid]:** Display error
**Guard [valid]:** Upload file
*Alt 4: JWT Validation**
**Guard [invalid]:** 401, redirect to login
**Guard [valid]:** Continue
*Alt 5: Payload Validation**
**Guard [invalid]:** 400 Bad Request
**Guard [valid]:** Check duplicate
*Alt 6: Duplicate Check**
**Guard [duplicate found]:** 409 Conflict
**Guard [no duplicate]:** Verify GitHub token or upload file
*Alt 7: GitHub Repository Access**
**Guard [404/403/429]:** Return appropriate error
**Guard [200 Success]:** Clone repository
*Alt 8: Blob Upload**
**Guard [fails]:** 500 error
**Guard [succeeds]:** Create submission record
*Alt 9: Database Insert**
**Guard [fails]:** 500 error
**Guard [succeeds]:** Enqueue job
*Alt 10: Queue Message**
**Guard [unavailable]:** 503 error
**Guard [enqueued]:** 202 Accepted
*Alt 11: Message Schema Validation**
**Guard [invalid]:** DeadLetter message
**Guard [valid]:** Update status
*Alt 12: Task Retrieval**
**Guard [not found]:** Mark failed, DeadLetter
**Guard [found]:** Retrieve code
*Alt 13: Code Retrieval Type**
**Guard [GitHub]:** Clone repository
**Guard [Upload]:** Download and extract ZIP
*Alt 14: Clone/Download Success**
**Guard [fails after retries]:** Mark failed
**Guard [succeeds]:** Validate structure
*Alt 15: Code Validation**
**Guard [invalid]:** Mark failed
**Guard [valid]:** Proceed to analysis
*Alt 16: Static Tool Execution** (per tool)
**Guard [succeeds]:** Parse output
**Guard [fails]:** Mark unavailable, continue
*Alt 17: AI Service Response**
**Guard [timeout]:** Set unavailable, continue
**Guard [error with retry]:** Retry once
**Guard [success]:** Validate schema
*Alt 18: Both Analyses Result**
**Guard [both failed]:** Mark submission failed
**Guard [at least one succeeded]:** Aggregate feedback
*Alt 19: Feedback Insert**
**Guard [fails]:** Rollback, retry
**Guard [succeeds]:** Update status
*Alt 20: Status Polling Result**
**Guard [Completed]:** Stop polling, show feedback
**Guard [Failed]:** Stop polling, show error
**Guard [Processing]:** Continue polling

**2. opt (Optional) FragmentsOpt 1: Blob ArchivalCondition:** After successful GitHub clone
**Behavior:** Upload to Blob Storage for auditing
**Location:** Step 27A
**Opt 2: Notification FailureCondition:** Email notification fails
**Behavior:** Log error but don't fail workflow
**Location:** Step 43
**3. par (Parallel) FragmentsPar 1: Static and AI AnalysisBranch A:** Static analysis (Steps 29A-34A)
**Branch B:** AI analysis (Steps 29B-34B)
**Synchronization:** Join at Step 35
**Par 2: Background Processing and Status PollingBranch A:** Worker processes submission (Section B)
**Branch B:** Frontend polls for status (Section C)
**Note:** These execute truly in parallel; no explicit join

### Synchronous vs. Asynchronous Communication

**Synchronous Messages (Solid Arrows)***Section A (API Ingestion):**
Frontend → Backend API: All HTTP requests synchronous
Backend API → SQL Server: All database queries synchronous
Backend API → GitHub API: Repository validation synchronous
Backend API → Azure Blob Storage: File upload synchronous
Backend API → Azure Service Bus: Message send synchronous (returns acknowledgment)
*Section B (Worker Processing):**
Background Worker → SQL Server: All DB operations synchronous
Background Worker → Azure Blob Storage: Download synchronous
Background Worker → Docker Engine: Container execution synchronous (with timeout)
Background Worker → AI Service: HTTP request synchronous (with timeout)
*Section C (Polling):**
Frontend → Backend API: Status polling requests synchronous
**Asynchronous Messages (Dashed Arrows)***Key Async Boundary:**
Backend API → Azure Service Bus → Background Worker: Message delivery is asynchronous

- API returns immediately after queueing (202 Accepted)
- Worker processes independently
- No direct return path from Worker to API
*Parallel Execution:*Static Analysis and AI Analysis execute concurrently (shown with `par` fragment)
Status polling happens independently of background processing

### Alignment with Functional Requirements

*FR-SUB-01:*GitHub repository submission ✅
*FR-SUB-02:*File upload submission ✅
*FR-SUB-03:*Submission metadata capture ✅
*FR-SUB-04:*Repository fetching service ✅
*FR-SUB-05:*Static analysis execution ✅
*FR-SUB-06:*Static results storage ✅
*FR-SUB-07:*AI analysis invocation ✅
*FR-SUB-08:*AI results storage ✅
*FR-SUB-09:*Feedback aggregation ✅
*FR-SUB-10:*Job queue management ✅
*FR-SUB-11:*Version control support ✅
*FR-SUB-12:*Status tracking ✅
*FR-FEED-01:*Structured feedback generation ✅
*FR-FEED-03:*Task recommendations ✅

### Non-Functional Requirements Alignment

*NFR-PERF-01:*API response time < 500ms (submission accepted immediately) ✅
*NFR-PERF-02:*Processing time < 5 min typical, < 10 min max ✅
*NFR-AVAIL-02:*Graceful degradation (AI failure → static only) ✅
*NFR-AVAIL-04:*Job retry logic ✅
*NFR-AVAIL-06:*Queue persistence (no job loss) ✅
*NFR-SEC-05:*Secure file handling (Docker isolation) ✅

### Notes for Implementation

1. **Queue Configuration:**
- Enable dead-letter queue for failed messages
- Set appropriate TTL (24 hours)
- Configure MaxDeliveryCount = 3
1. **Docker Security:**
- Run containers as non-root
- Apply resource limits (CPU, memory, timeout)
- Use read-only mounts for code directory
1. **Circuit Breaker for AI Service:**
- Use Polly library (.NET) for resilience patterns
- Track failure rate and open circuit automatically
1. **Status Polling Optimization:**
- Consider WebSockets for real-time updates (alternative to polling)
- Implement exponential backoff if extended processing
1. **Monitoring:**
- Track queue depth in real-time
- Alert on processing time > 10 minutes
- Monitor AI service latency and error rates

### **4.5.4 Sequence Diagram: Submission Processing — Static + AI Analysis**

### Overview

This sequence diagram models the **asynchronous backend processing workflow** that occurs after a learner submits code for review. It illustrates the multi-layered analysis pipeline that combines **static code analysis tools** (ESLint, SonarQube, Bandit, Roslyn) with **AI-powered contextual review** to generate comprehensive, educational feedback.

This diagram focuses specifically on the **Background Worker's orchestration** of the analysis pipeline, from job dequeue through final result aggregation and notification delivery. It demonstrates the system's asynchronous processing architecture, which decouples submission ingestion from resource-intensive analysis operations to maintain API responsiveness and enable horizontal scalability.

### Scope and Boundaries

**In Scope:**

- Background Worker job processing lifecycle
- Static analysis tool execution in isolated Docker containers
- AI microservice invocation for contextual code review
- Feedback aggregation and scoring algorithms
- Database persistence of analysis results
- Learner notification upon completion
- Error handling and retry mechanisms

**Out of Scope:**

- Initial submission ingestion (covered in 4.5.3)
- User viewing feedback (covered in 4.5.5)
- Administrative monitoring dashboards
- Detailed internal logic of individual static analysis tools

**Related Artifacts:**

- **Activity Diagram 4.4.5**: Submission Processing — Static & AI Analysis Activity
- **Use Cases**: UC_Static (Run Static Code Analysis), UC_AICR (Run AI Code Review)
- **Functional Requirements**: FR-SUB-05 through FR-SUB-09
- **Non-Functional Requirements**: NFR-PERF-02, NFR-SCAL-02, NFR-AVAIL-04

---

### Participants (Lifelines)

1. **Azure Service Bus Queue** — Durable message queue containing submission jobs
2. **Background Worker** — .NET Worker Service orchestrating the analysis pipeline
3. **Database (SQL Server)** — Persistent storage for submission records, analysis results, and metadata
4. **Blob Storage** — Azure Blob Storage containing submitted code files
5. **Docker Engine** — Container orchestration for isolated static analysis execution
6. **Static Analysis Tools** — Containerized tools (ESLint, SonarQube, Bandit, Roslyn)
7. **AI Microservice (FastAPI)** — Python service performing LLM-based code review
8. **LLM Provider** — External AI service (OpenAI GPT-4, Anthropic Claude, or local Ollama)
9. **Notification Service** — Email/push notification service (SendGrid, FCM)
10. **Redis Cache** — Distributed cache for intermediate results and rate limiting

---

### Detailed Interaction Flow

### Phase 1: Job Dequeue and Initialization

**Step 1.1: Worker Polls Queue**

- **Actor**: Background Worker
- **Action**: Continuously polls Azure Service Bus for pending submission jobs
- **Message**: `PeekLock()` on queue
- **Condition**: Worker is idle and queue contains messages
- **Result**: Job message acquired with visibility lock (5-minute timeout)

**Step 1.2: Load Submission Metadata**

- **Actor**: Background Worker → Database
- **Action**: Retrieves submission record by `submission_id` from Queue message
- **Query**: `SELECT * FROM Submissions WHERE SubmissionId = @id`
- **Response**: Submission entity including `TaskId`, `UserId`, `RepositoryUrl`, `FileStoragePath`, `Status`, `CreatedAt`
- **Validation**: Confirms submission exists and status is `Queued` or `Retrying`

**Step 1.3: Update Submission Status**

- **Actor**: Background Worker → Database
- **Action**: Updates submission status to signal processing start
- **Command**: `UPDATE Submissions SET Status = 'Processing', ProcessingStartedAt = GETUTCDATE() WHERE SubmissionId = @id`
- **Purpose**: Prevents duplicate processing and enables status tracking in UI

**Step 1.4: Retrieve Code Files**

- **Actor**: Background Worker → Blob Storage
- **Action**: Downloads submitted code archive from Azure Blob Storage
- **Request**: `GET {blobUrl}/{FileStoragePath}` with SAS token
- **Response**: ZIP archive or directory structure
- **Local Action**: Extracts files to isolated temporary directory with unique path `/tmp/submissions/{submission_id}/`

**Step 1.5: Load Task Context**

- **Actor**: Background Worker → Database
- **Action**: Retrieves task requirements and evaluation criteria
- **Query**: `SELECT Title, Description, RequiredFiles, EvaluationCriteria, SkillCategories FROM Tasks WHERE TaskId = @taskId`
- **Purpose**: Provides context for AI review and determines expected file structure
- **Result**: Task metadata object passed to analysis engines

---

Phase 2: Static Analysis Execution

**Step 2.1: Language Detection**

- **Actor**: Background Worker (local logic)
- **Action**: Analyzes file extensions to determine programming languages
- **Logic**: Inspects extracted files for `.js`, `.ts`, `.py`, `.cs`, `.java`, etc.
- **Result**: Language array (e.g., `["JavaScript", "TypeScript"]`)
- **Decision**: Selects appropriate static analysis tools based on detected languages

**Step 2.2: Docker Container Initialization**

- **Actor**: Background Worker → Docker Engine
- **Action**: Spawns isolated Docker containers for each required static analysis tool
- **Containers**:
    - **ESLint** (for JavaScript/TypeScript)
    - **Prettier** (code formatting validation)
    - **SonarQube Scanner** (code quality, complexity, duplication)
    - **Bandit** (Python security scanning)
    - **Roslyn Analyzers** (C#/.NET analysis)
- **Configuration**:
    - Mount code directory as read-only volume
    - Apply CPU/memory limits (2 vCPU, 2GB RAM per container)
    - Set timeout (3-minute maximum per tool)
    - Isolate network access (no external internet)

**Step 2.3: Parallel Static Analysis Execution**

- **Actor**: Docker Containers (Static Analysis Tools)
- **Action**: Each tool analyzes code concurrently within its container
- **Process**:
    - **ESLint**: Linting JavaScript/TypeScript for style, errors, potential bugs
    - **SonarQube**: Calculating cyclomatic complexity, code smells, maintainability index
    - **Bandit**: Scanning Python code for security vulnerabilities (SQL injection, hardcoded secrets)
    - **Roslyn**: Analyzing C# for code quality, performance anti-patterns, security issues
    - **Prettier**: Checking code formatting consistency
- **Output Format**: Each tool generates JSON report with:
    - Issue location (file, line, column)
    - Severity (error, warning, info)
    - Rule ID and description
    - Suggested fix (if applicable)

**Step 2.4: Collect Static Analysis Results**

- **Actor**: Background Worker ← Docker Containers
- **Action**: Retrieves JSON output from each completed container
- **Timeout Handling**:
    - **alt [Tool exceeds timeout]**
        - Kill container
        - Log warning
        - Mark tool result as `incomplete` but continue processing
    - **alt [Tool completes successfully]**
        - Parse JSON output
        - Validate schema
        - Merge into aggregated results array

**Step 2.5: Docker Cleanup**

- **Actor**: Background Worker → Docker Engine
- **Action**: Terminates and removes all containers
- **Commands**: `docker stop` and `docker rm` for each container ID
- **Purpose**: Frees resources for subsequent jobs

**Step 2.6: Normalize Static Analysis Data**

- **Actor**: Background Worker (local processing)
- **Action**: Transforms heterogeneous tool outputs into unified schema
- **Normalization**:
    - Standardize severity levels (`critical`, `high`, `medium`, `low`, `info`)
    - Categorize issues by type (`security`, `performance`, `maintainability`, `style`, `correctness`)
    - Calculate aggregate metrics:
        - Total issues by severity
        - Code quality score (0-100 scale, weighted by severity)
        - Files analyzed count
        - Lines of code analyzed
- **Result**: `StaticAnalysisResult` object ready for database storage

**Step 2.7: Persist Static Analysis Results**

- **Actor**: Background Worker → Database
- **Action**: Inserts static analysis record
- **Command**:

sql

  `INSERT INTO StaticAnalysis 
    (SubmissionId, ToolName, IssuesFound, Severity, ResultJson, CompletedAt)
  VALUES 
    (@submissionId, 'ESLint', @issueCount, @severity, @json, GETUTCDATE())`

- **Stored Data**:
    - Full JSON reports from each tool
    - Aggregated metrics
    - Execution timestamps
    - Tool versions for reproducibility

---

Phase 3: AI-Powered Contextual Review

**Step 3.1: Prepare AI Analysis Request**

- **Actor**: Background Worker (local logic)
- **Action**: Constructs comprehensive context object for AI microservice
- **Context Includes**:
    - **Submitted code**: Full source files (sanitized)
    - **Static analysis results**: Normalized JSON from Phase 2
    - **Task requirements**: Expected functionality, constraints, learning objectives
    - **User skill level**: Current proficiency tier (Beginner/Intermediate/Advanced)
    - **Previous submissions**: Historical performance on same task (if retry)
    - **Evaluation rubric**: Scoring criteria for functionality, quality, security, performance
- **Prompt Engineering Variables**: Dynamically populated template placeholders

**Step 3.2: Check AI Service Availability**

- **Actor**: Background Worker → Redis Cache
- **Action**: Checks circuit breaker state for AI microservice
- **Cache Key**: `circuit_breaker:ai_service`
- **Logic**:
    - **alt [Circuit Open — Service Degraded]**
        - Skip AI analysis
        - Mark submission as `StaticOnly`
        - Log incident
        - Notify admin if pattern detected
        - Jump to Phase 4
    - **alt [Circuit Closed — Service Healthy]**
        - Proceed with AI invocation

**Step 3.3: Invoke AI Microservice**

- **Actor**: Background Worker → AI Microservice (FastAPI)
- **Protocol**: HTTPS POST
- **Endpoint**: `POST https://ai-service.internal/api/v1/review`
- **Headers**:
    - `Authorization: Bearer {internal_api_key}`
    - `Content-Type: application/json`
    - `X-Request-ID: {submission_id}` (for tracing)
- **Request Body**:

json

  `{
    "submission_id": "uuid",
    "code_files": [ { "path": "src/app.js", "content": "..." } ],
    "static_analysis": { ... },
    "task_context": { ... },
    "user_level": "Intermediate",
    "evaluation_criteria": [ ... ]
  }`

- **Timeout**: 2-minute maximum (configurable)

**Step 3.4: AI Microservice Processes Request**

- **Actor**: AI Microservice → LLM Provider
- **Action**: Constructs optimized prompt and invokes language model
- **Internal Steps**:
    1. **Prompt Assembly**: Combines code, static results, and task context into structured prompt
    2. **Token Optimization**: Truncates or summarizes if context exceeds model limit
    3. **LLM API Call**:
        - **Provider**: OpenAI GPT-4-Turbo / Anthropic Claude 3.5 / Local Ollama
        - **Parameters**: `temperature=0.3` (deterministic), `max_tokens=2048`
    4. **Response Parsing**: Extracts structured JSON from model completion
    5. **Validation**: Ensures response matches expected schema

**Step 3.5: AI Microservice Returns Feedback**

- **Actor**: AI Microservice → Background Worker
- **Response**: HTTP 200 OK with JSON body
- **Response Schema**:

json

  `{
    "analysis_id": "uuid",
    "scores": {
      "functionality": 85,
      "code_quality": 78,
      "security": 92,
      "performance": 70,
      "maintainability": 88
    },
    "overall_score": 82,
    "strengths": [ "Clear error handling", "Good separation of concerns" ],
    "weaknesses": [ "Missing input validation", "Inefficient database queries" ],
    "detailed_feedback": [
      {
        "file": "src/app.js",
        "line": 45,
        "severity": "high",
        "category": "security",
        "issue": "User input not sanitized before database query",
        "recommendation": "Use parameterized queries or ORM methods",
        "code_suggestion": "const user = await User.findOne({ email: sanitize(email) });"
      }
    ],
    "recommended_tasks": [ "task_uuid_1", "task_uuid_2", "task_uuid_3" ],
    "learning_resources": [
      { "title": "SQL Injection Prevention", "url": "...", "type": "article" }
    ],
    "model_metadata": {
      "provider": "openai",
      "model": "gpt-4-turbo",
      "tokens_used": 3240,
      "processing_time_ms": 4800
    }
  }`

**Step 3.6: Handle AI Service Errors**

- **Scenario**: AI request fails (timeout, rate limit, service error)
- **alt [Transient Failure — HTTP 429, 503, or timeout]**
    - **Action**: Background Worker increments retry counter
    - **Logic**: If retry count < 3, re-queue job with exponential backoff (1m → 5m → 15m)
    - **Database Update**: `UPDATE Submissions SET RetryCount += 1, Status = 'Retrying'`
    - **Exit**: Stop current processing; job will be reprocessed later
- **alt [Permanent Failure — HTTP 400, 500]**
    - **Action**: Mark AI analysis as failed
    - **Fallback**: Submission marked `StaticOnly` — static analysis results still available
    - **Notification**: Email learner explaining partial analysis completion
    - **Logging**: Detailed error logged to Azure Application Insights

**Step 3.7: Persist AI Analysis Results**

- **Actor**: Background Worker → Database
- **Action**: Inserts AI feedback record
- **Command**:

sql

  `INSERT INTO AIAnalysis 
    (SubmissionId, ModelProvider, ModelVersion, OverallScore, ScoresJson, 
     FeedbackJson, TokensUsed, ProcessingTimeMs, CompletedAt)
  VALUES 
    (@submissionId, 'openai', 'gpt-4-turbo', @overallScore, @scores, 
     @feedback, @tokens, @processingTime, GETUTCDATE())`

- **Indexing**: `SubmissionId` indexed for fast retrieval

---

Phase 4: Feedback Aggregation and Finalization

**Step 4.1: Aggregate Multi-Source Feedback**

- **Actor**: Background Worker (local logic)
- **Action**: Merges static and AI analysis into unified report
- **Aggregation Logic**:
    - **Issue Deduplication**: If AI and static tools identify same issue, merge descriptions
    - **Severity Reconciliation**: If severities differ, use highest (e.g., AI says "critical", ESLint says "warning" → mark "critical")
    - **Categorization**: Group feedback by category (security, performance, maintainability, etc.)
    - **Prioritization**: Sort issues by impact on learning objectives
    - **Score Calculation**: Weighted average of static metrics (40%) and AI scores (60%)

**Step 4.2: Generate Task Recommendations**

- **Actor**: Background Worker (local logic or ML service)
- **Action**: Analyzes identified weaknesses to recommend next tasks
- **Algorithm**:
    1. Extract weak skill categories from feedback (e.g., "input validation", "async programming")
    2. Query `Tasks` table for tasks targeting those categories
    3. Filter by user's skill level (ensure appropriate difficulty)
    4. Respect prerequisite dependencies
    5. Rank by relevance score
    6. Select top 3-5 tasks
- **Result**: Array of recommended `TaskId`s with justification text

**Step 4.3: Store Recommendations**

- **Actor**: Background Worker → Database
- **Action**: Inserts recommendation records
- **Command**:

sql

  `INSERT INTO Recommendations 
    (SubmissionId, TaskId, Reason, Priority, CreatedAt)
  VALUES 
    (@submissionId, @taskId, @reason, @priority, GETUTCDATE())`

- **Purpose**: Enables "Add to Learning Path" feature in UI

**Step 4.4: Update Submission Status to Completed**

- **Actor**: Background Worker → Database
- **Action**: Marks submission as successfully analyzed
- **Command**:

sql

  `UPDATE Submissions 
  SET 
    Status = 'Completed',
    OverallScore = @finalScore,
    ProcessingCompletedAt = GETUTCDATE(),
    FeedbackAvailable = 1
  WHERE SubmissionId = @id`

- **Trigger**: Database trigger may update `LearningPath` progress percentage

**Step 4.5: Update User Skill Profile**

- **Actor**: Background Worker → Database
- **Action**: Incrementally updates user's skill scores based on performance
- **Logic**:
    - Retrieve current skill levels from `UserSkills` table
    - Apply delta based on submission scores (e.g., +2 points for security if scored 90+)
    - Update skill tier if threshold crossed (e.g., Beginner → Intermediate at 60 points)
- **Command**:

sql

  `UPDATE UserSkills 
  SET Score = Score + @delta, UpdatedAt = GETUTCDATE()
  WHERE UserId = @userId AND SkillCategory = @category`

**Step 4.6: Cache Aggregated Feedback**

- **Actor**: Background Worker → Redis Cache
- **Action**: Stores complete feedback report in cache for fast UI retrieval
- **Cache Key**: `feedback:{submission_id}`
- **TTL**: 24 hours
- **Purpose**: Avoids database joins when learner views feedback immediately after completion

### Phase 5: Notification and Cleanup

**Step 5.1: Send Completion Notification**

- **Actor**: Background Worker → Notification Service
- **Action**: Notifies learner that feedback is ready
- **Channels**:
    - **Email**: Via SendGrid with "Your code review is ready!" template
    - **In-App Notification**: WebSocket push to active sessions
    - **Mobile Push**: Via Firebase Cloud Messaging (if mobile app installed)
- **Email Content**:
    - Overall score
    - Summary of key strengths/weaknesses
    - Direct link to detailed feedback page
    - Call-to-action: "View Your Feedback"
- **Error Handling**:
    - **opt [Notification fails]**
        - Log failure but do not block job completion
        - User can still access feedback via dashboard

**Step 5.2: Cleanup Temporary Files**

- **Actor**: Background Worker (local filesystem)
- **Action**: Deletes extracted code files from `/tmp/submissions/{submission_id}/`
- **Purpose**: Prevents disk space exhaustion on worker nodes
- **Verification**: Confirms directory removal to avoid orphaned files

**Step 5.3: Complete Queue Message**

- **Actor**: Background Worker → Azure Service Bus
- **Action**: Acknowledges successful processing
- **Message**: `CompleteAsync(lockToken)`
- **Effect**: Removes job from queue; no retry will occur
- **Timing**: Only called after all database updates committed

**Step 5.4: Update Monitoring Metrics**

- **Actor**: Background Worker → Azure Application Insights
- **Action**: Logs telemetry for observability
- **Metrics Tracked**:
    - Processing duration (total and per-phase)
    - Static analysis tool success rates
    - AI service response time
    - Token consumption (for cost tracking)
    - Error rates by type
- **Custom Events**:
    - `SubmissionProcessed` with dimensions: `userId`, `taskId`, `overallScore`, `processingTimeMs`

---

Phase 6: Error Handling and Retry Logic

**Scenario A: Transient Database Error**

- **Trigger**: SQL timeout or deadlock during any database operation
- **Action**:
    1. Catch `SqlException`
    2. Log error with full stack trace
    3. Do NOT complete queue message (leave lock active)
    4. Allow message visibility timeout (5 min) to expire
    5. Azure Service Bus automatically re-delivers message
    6. Background Worker retries entire job from Phase 1
- **Retry Limit**: Maximum 3 attempts via `DeliveryCount` property
- **Dead Letter**: After 3 failures, message moved to Dead Letter Queue for manual investigation

**Scenario B: Blob Storage Download Failure**

- **Trigger**: Network error retrieving code files
- **Action**:
    1. Retry download up to 3 times with exponential backoff
    2. If all retries fail:
        - Update submission status to `Failed`
        - Store error message in `ErrorDetails` column
        - Complete queue message (permanent failure)
        - Notify learner via email with troubleshooting steps

**Scenario C: Docker Container Crash**

- **Trigger**: Static analysis tool segfaults or exceeds resource limits
- **Action**:
    1. Detect container exit code ≠ 0
    2. Log error including container logs
    3. Mark that specific tool's result as `incomplete`
    4. Continue processing with remaining tools
    5. AI analysis proceeds with partial static results
    6. Flag submission with warning: "Some static analysis tools failed"

**Scenario D: AI Service Circuit Breaker Open**

- **Trigger**: >50% AI requests failing in past 5 minutes
- **Action**:
    1. Circuit breaker pattern detects degradation
    2. Temporarily skip AI analysis for all submissions
    3. Process static analysis only
    4. Mark submissions as `StaticOnly` status
    5. Send admin alert
    6. Attempt circuit reset after 15-minute cooldown

---

### Alternative Flows

Alt Flow 1: Resubmission / Version Comparison

- **Condition**: Learner submits updated code for same task (`IsResubmission = true`)
- **Modifications**:
    - Step 3.1 includes **previous submission's feedback** in AI context
    - AI prompt instructs model to compare versions and highlight improvements/regressions
    - Feedback report includes "Changes Since Last Submission" section
    - Skill profile updates calculate delta from previous score (prevent gaming by resubmitting)

Alt Flow 2: High-Priority Submission (Premium Users)

- **Condition**: User has `SubscriptionTier = Premium`
- **Modifications**:
    - Queue message has elevated priority flag
    - Worker dequeues premium jobs first (priority queue pattern)
    - AI analysis uses faster model (e.g., GPT-4o-mini for reduced latency)
    - No artificial delays; process immediately

Alt Flow 3: Large Codebase (Multi-File Project)

- **Condition**: Submission contains >50 files or >10,000 lines of code
- **Modifications**:
    - Static analysis runs in batches (20 files per batch)
    - AI context includes file summaries instead of full code
    - Worker may spawn multiple AI requests (one per module)
    - Aggregation step merges multi-module feedback
    - Processing time extended to 10-15 minutes

---

### Non-Functional Characteristics

**Performance:**

- **Target Processing Time**: 5 minutes (p95: static 3min + AI 2min)
- **Concurrent Job Capacity**: 5 parallel jobs per worker instance
- **Horizontal Scaling**: Auto-scale workers when queue depth >20

**Reliability:**

- **Job Durability**: Azure Service Bus guarantees at-least-once delivery
- **Idempotency**: Processing logic tolerates duplicate deliveries (checks submission status)
- **Graceful Degradation**: Static-only results if AI unavailable

**Security:**

- **Code Isolation**: Each submission processed in unique temporary directory
- **Container Sandboxing**: Docker containers have no network access, limited CPU/memory
- **Input Sanitization**: Code sanitized before sending to AI (remove API keys, secrets)
- **AI Output Validation**: Feedback validated against schema; malicious content filtered

**Cost Optimization:**

- **Token Usage Tracking**: AI tokens logged per submission for billing analysis
- **Caching**: Repeated submissions (unchanged code) retrieve cached results
- **Resource Limits**: Containers limited to 2GB RAM each; prevents runaway costs

---

### Database Schema Impact

**Tables Modified:**

1. **Submissions**: `Status`, `ProcessingStartedAt`, `ProcessingCompletedAt`, `OverallScore`, `FeedbackAvailable`
2. **StaticAnalysis**: New row inserted per tool per submission
3. **AIAnalysis**: New row inserted with LLM feedback
4. **Recommendations**: 3-5 rows inserted per submission
5. **UserSkills**: Scores incrementally updated
6. **Notifications**: New row for completion notification

**Indexes Used:**

- `Submissions.SubmissionId` (primary key)
- `StaticAnalysis.SubmissionId` (foreign key, indexed)
- `AIAnalysis.SubmissionId` (foreign key, indexed)
- `Recommendations.SubmissionId` (foreign key, indexed)

---

### Integration Points Summary

| External System | Interaction Type | Purpose | Error Handling |
| --- | --- | --- | --- |
| Azure Service Bus | Pull (PeekLock) | Job queue management | Dead letter queue |
| SQL Server | CRUD | Persistent storage | Retry transient errors |
| Blob Storage | Read | Code file retrieval | 3 retries with backoff |
| Docker Engine | Execute | Static analysis sandboxing | Timeout + cleanup |
| AI Microservice | HTTP POST | LLM-based code review | Circuit breaker |
| Redis Cache | Read/Write | Feedback caching, rate limiting | Fallback to DB |
| Notification Service | HTTP POST | Email/push notifications | Log failure; non-blocking |
| Azure App Insights | Telemetry | Monitoring and diagnostics | Best-effort logging |

---

### Alignment with Activity Diagram 4.4.5

This sequence diagram directly implements the workflow defined in **Activity Diagram 4.4.5: Submission Processing — Static & AI Analysis Activity**:

- **Phase 1** corresponds to "Dequeue Job" and "Load Submission" activities
- **Phase 2** implements "Execute Static Analysis Tools" parallel activities
- **Phase 3** implements "Invoke AI Microservice" and "Process AI Review" activities
- **Phase 4** implements "Aggregate Feedback" and "Calculate Scores" activities
- **Phase 5** implements "Send Notification" and "Cleanup" activities
- **Error paths** match decision nodes for retry logic and failure handling

---

### Academic Rigor and Standards Compliance

This sequence diagram adheres to:

- **UML 2.5 Specification**: Correct use of lifelines, synchronous/asynchronous messages, fragments (alt, opt, loop)
- **IEEE 29148-2018**: Requirements traceability to FR-SUB and NFR-PERF specifications
- **Separation of Concerns**: Clear boundaries between API, Worker, Storage, and AI services
- **Asynchronous Processing Pattern**: Queue-based decoupling for scalability and fault tolerance
- **Defensive Programming**: Explicit error handling for all external dependencies
- **Observability**: Comprehensive logging and monitoring integration

### **4.5.5 Sequence Diagram: Viewing AI Feedback & Adding Recommended Tasks**

### Overview

This sequence diagram models the **learner-facing workflow** that occurs after code submission processing is complete. It illustrates how users retrieve comprehensive feedback reports, interact with AI-generated insights, and optionally add recommended tasks to their personalized learning path.

This diagram represents the **consumption phase** of the learning feedback loop, where learners:

1. Navigate to their submission history
2. Request detailed feedback for a completed submission
3. Review multi-layered analysis (static + AI insights)
4. Explore task recommendations generated from identified weaknesses
5. Add relevant tasks to their learning path for targeted skill improvement

The workflow emphasizes **educational value delivery** through structured, actionable feedback presentation while maintaining system performance through intelligent caching and lazy-loading strategies.

---

### Scope and Boundaries

**In Scope:**

- Authenticated learner accessing their own submissions
- Feedback retrieval with authorization validation
- Aggregated report display (static + AI combined)
- Task recommendation browsing
- Adding recommended tasks to learning path with prerequisite validation
- Real-time learning path updates
- User interaction analytics tracking

**Out of Scope:**

- Feedback generation process (covered in 4.5.4)
- Initial code submission (covered in 4.5.3)
- Administrative feedback moderation
- Peer feedback or community discussion features
- Detailed code annotation rendering (frontend implementation detail)

**Related Artifacts:**

- **Activity Diagram 4.4.6**: Feedback Review & Learning Path Update Activity
- **Use Cases**: UC_Feedback (View Feedback Report), UC_ViewRecs (View AI Recommendations), UC_AddRecTask (Add Recommended Task to Learning Path)
- **Functional Requirements**: FR-FEED-01 through FR-FEED-06, FR-PATH-04
- **Non-Functional Requirements**: NFR-PERF-01, NFR-UX-01, NFR-SEC-02

---

### Participants (Lifelines)

1. **Learner (User)** — Authenticated user reviewing their submission feedback
2. **Frontend (React)** — Client-side application rendering feedback UI
3. **Backend API (ASP.NET Core)** — RESTful API handling business logic and authorization
4. **Database (SQL Server)** — Persistent storage for submissions, feedback, recommendations, and learning paths
5. **Redis Cache** — Distributed cache for performance optimization
6. **Recommendation Engine** — Service generating personalized task suggestions (may be internal logic or separate microservice)
7. **Azure Application Insights** — Telemetry and analytics tracking

---

### Detailed Interaction Flow

### Phase 1: Navigation and Feedback Retrieval

**Step 1.1: User Navigates to Submission Dashboard**

- **Actor**: Learner
- **Action**: Clicks "My Submissions" or "Progress Dashboard" in navigation menu
- **Result**: Frontend displays list of all user submissions with status indicators

**Step 1.2: Request Submission List**

- **Actor**: Frontend → Backend API
- **Protocol**: HTTP GET
- **Endpoint**: `GET /api/submissions?userId={userId}&page=1&pageSize=20`
- **Headers**:
    - `Authorization: Bearer {jwt_token}`
    - `Content-Type: application/json`
- **Query Parameters**:
    - `userId`: Current authenticated user ID (extracted from JWT)
    - `page`: Pagination page number
    - `pageSize`: Results per page (default: 20)
    - Optional filters: `status`, `taskId`, `dateRange`

**Step 1.3: Validate Authorization**

- **Actor**: Backend API (Authorization Middleware)
- **Action**: Validates JWT token and extracts claims
- **Validation Checks**:
    - Token signature valid
    - Token not expired
    - User ID in token matches requested `userId`
- **alt [Token Invalid or Expired]**
    - Return `401 Unauthorized`
    - Frontend redirects to login page
    - Process terminates

**Step 1.4: Query Submissions**

- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT 
    s.SubmissionId, s.TaskId, t.Title AS TaskTitle,
    s.Status, s.OverallScore, s.CreatedAt, s.ProcessingCompletedAt,
    s.FeedbackAvailable, s.IsResubmission
  FROM Submissions s
  INNER JOIN Tasks t ON s.TaskId = t.TaskId
  WHERE s.UserId = @userId
  ORDER BY s.CreatedAt DESC
  OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`

- **Response**: Array of submission summary objects

**Step 1.5: Return Submission List**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK` with JSON body
- **Response Schema**:

json

  `{
    "submissions": [
      {
        "submissionId": "uuid",
        "taskId": "uuid",
        "taskTitle": "Build RESTful API with Authentication",
        "status": "Completed",
        "overallScore": 82,
        "createdAt": "2025-12-15T10:30:00Z",
        "processingCompletedAt": "2025-12-15T10:35:47Z",
        "feedbackAvailable": true,
        "isResubmission": false
      }
    ],
    "totalCount": 15,
    "page": 1,
    "pageSize": 20
  }`

**Step 1.6: Display Submission List**

- **Actor**: Frontend
- **Action**: Renders submissions in card/table format
- **UI Elements**:
    - Task title
    - Submission date
    - Status badge (Completed, Processing, Failed)
    - Overall score with color-coded indicator
    - "View Feedback" button (enabled only if `feedbackAvailable = true`)

**Step 1.7: User Selects Submission**

- **Actor**: Learner
- **Action**: Clicks "View Feedback" button on a completed submission
- **Result**: Frontend navigates to feedback detail page `/feedback/{submissionId}`

---

Phase 2: Comprehensive Feedback Retrieval

**Step 2.1: Check Cached Feedback**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/submissions/{submissionId}/feedback`
- **Headers**: `Authorization: Bearer {jwt_token}`
- **Purpose**: Retrieve aggregated feedback report

**Step 2.2: Validate Ownership**

- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT UserId, Status, FeedbackAvailable
  FROM Submissions
  WHERE SubmissionId = @submissionId`

- **Authorization Check**:
    - **alt [Submission Not Found]**
        - Return `404 Not Found`
        - Frontend displays "Submission not found"
    - **alt [User Not Owner]**
        - Return `403 Forbidden`
        - Frontend displays "Access denied"
    - **alt [Feedback Not Available]**
        - Return `202 Accepted` with message "Analysis in progress"
        - Frontend displays processing indicator with estimated completion time

**Step 2.3: Attempt Cache Retrieval**

- **Actor**: Backend API → Redis Cache
- **Cache Key**: `feedback:{submissionId}`
- **Action**: `GET feedback:{submissionId}`
- **Result**:
    - **Cache Hit**: Returns full feedback JSON
    - **Cache Miss**: Proceeds to database query

**Step 2.4: Retrieve from Database (Cache Miss)**

- **Actor**: Backend API → Database
- **Queries** (executed in parallel or as single complex join):
**Query 1: Submission Details**

sql

  `SELECT s.*, t.Title, t.Description, t.EvaluationCriteria
  FROM Submissions s
  INNER JOIN Tasks t ON s.TaskId = t.TaskId
  WHERE s.SubmissionId = @submissionId`

**Query 2: Static Analysis Results**

sql

  `SELECT ToolName, IssuesFound, Severity, ResultJson, CompletedAt
  FROM StaticAnalysis
  WHERE SubmissionId = @submissionId
  ORDER BY CompletedAt DESC`

**Query 3: AI Analysis Results**

sql

  `SELECT ModelProvider, ModelVersion, OverallScore, ScoresJson,
         FeedbackJson, TokensUsed, ProcessingTimeMs, CompletedAt
  FROM AIAnalysis
  WHERE SubmissionId = @submissionId
  ORDER BY CompletedAt DESC
  LIMIT 1`

**Query 4: Recommendations**

sql

  `SELECT r.RecommendationId, r.TaskId, r.Reason, r.Priority,
         t.Title, t.Description, t.Difficulty, t.EstimatedDuration
  FROM Recommendations r
  INNER JOIN Tasks t ON r.TaskId = t.TaskId
  WHERE r.SubmissionId = @submissionId
  ORDER BY r.Priority ASC`

**Step 2.5: Aggregate Feedback Data**

- **Actor**: Backend API (Business Logic Layer)
- **Action**: Combines multi-source data into unified report structure
- **Aggregation Logic**:
    1. **Merge Static + AI Issues**: Deduplicate overlapping findings
    2. **Categorize Feedback**: Group by type (security, performance, maintainability, functionality)
    3. **Calculate Weighted Scores**: Static analysis (40%) + AI review (60%)
    4. **Prioritize Action Items**: Sort by severity and learning impact
    5. **Generate Summary Statistics**: Total issues, score breakdowns, time metrics

**Step 2.6: Store in Cache**

- **Actor**: Backend API → Redis Cache
- **Action**: `SETEX feedback:{submissionId} 86400 {feedbackJson}`
- **TTL**: 24 hours (86400 seconds)
- **Purpose**: Optimize subsequent retrievals; invalidated on resubmission

**Step 2.7: Return Feedback Report**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK` with comprehensive JSON
- **Response Schema**:

json

  `{
    "submissionId": "uuid",
    "taskTitle": "Build RESTful API with Authentication",
    "submittedAt": "2025-12-15T10:30:00Z",
    "overallScore": 82,
    "scores": {
      "functionality": 85,
      "codeQuality": 78,
      "security": 92,
      "performance": 70,
      "maintainability": 88
    },
    "summary": {
      "totalIssues": 42,
      "critical": 3,
      "high": 8,
      "medium": 18,
      "low": 13,
      "linesOfCode": 2340,
      "filesAnalyzed": 15,
      "processingTime": "4m 47s"
    },
    "strengths": [
      "Excellent error handling with custom exceptions",
      "Clear separation of concerns (controller/service/repository)",
      "Comprehensive input validation using FluentValidation"
    ],
    "weaknesses": [
      "Missing authentication middleware on sensitive endpoints",
      "Database queries vulnerable to SQL injection (raw queries)",
      "No rate limiting on authentication endpoints"
    ],
    "detailedFeedback": [
      {
        "category": "security",
        "severity": "critical",
        "file": "src/controllers/UserController.cs",
        "line": 45,
        "issue": "SQL injection vulnerability: User input directly concatenated into query",
        "explanation": "Raw SQL queries with string interpolation allow attackers to inject malicious SQL code...",
        "recommendation": "Use parameterized queries or Entity Framework LINQ",
        "codeSuggestion": "var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);",
        "learningResources": [
          {"title": "OWASP SQL Injection Prevention", "url": "...", "type": "article"}
        ]
      }
      // ... more feedback items
    ],
    "recommendations": [
      {
        "recommendationId": "uuid",
        "taskId": "uuid",
        "taskTitle": "Implementing Secure Authentication Patterns",
        "reason": "Address identified security weaknesses in authentication flow",
        "priority": 1,
        "difficulty": "Intermediate",
        "estimatedDuration": "3-4 hours"
      }
      // ... 2-4 more recommendations
    ],
    "metadata": {
      "aiModel": "gpt-4-turbo",
      "staticTools": ["ESLint", "SonarQube", "Bandit", "Roslyn"],
      "tokensUsed": 3240
    }
  }`

**Step 2.8: Track Analytics**

- **Actor**: Backend API → Azure Application Insights
- **Event**: `FeedbackViewed`
- **Properties**:
    - `userId`, `submissionId`, `taskId`
    - `overallScore`, `viewDuration`
    - `timestamp`
- **Purpose**: Track engagement, identify confusing feedback patterns, measure learning velocity

---

Phase 3: Feedback Display and Interaction

**Step 3.1: Render Feedback Overview**

- **Actor**: Frontend
- **Action**: Displays high-level summary with visual components
- **UI Components**:
    - **Score Card**: Overall score with circular progress indicator
    - **Radar Chart**: Dimensional scores (functionality, quality, security, performance, maintainability)
    - **Summary Statistics**: Total issues by severity with color-coded badges
    - **Processing Metrics**: Analysis duration, lines of code, files analyzed

**Step 3.2: Display Strengths and Weaknesses**

- **Actor**: Frontend
- **Action**: Renders bullet lists with expandable details
- **UI Layout**:
    - **Strengths Section**: Green checkmark icons, encouraging tone
    - **Weaknesses Section**: Warning icons, actionable improvement areas
    - Collapsible panels for detailed explanations

**Step 3.3: Render Detailed Feedback List**

- **Actor**: Frontend
- **Action**: Displays categorized, filterable feedback items
- **Features**:
    - **Filters**: By category (security, performance, etc.), severity, file
    - **Sorting**: By severity, line number, category
    - **Code Viewer**: Syntax-highlighted code snippets with issue annotations
    - **Inline Suggestions**: Side-by-side comparison of problematic vs. improved code

**Step 3.4: User Explores Feedback**

- **Actor**: Learner
- **Interactions**:
    - Click issue to expand full explanation
    - View "Why this matters" educational content
    - Click code suggestion to see refactored version
    - Access linked learning resources (articles, documentation)
    - **opt [User Rates Feedback Quality]**
        - Click thumbs up/down on individual feedback items
        - **Frontend → Backend API**: `POST /api/feedback/{itemId}/rating`
        - **Purpose**: Collect quality signals for AI prompt improvement

---

Phase 4: Exploring Task Recommendations

**Step 4.1: Navigate to Recommendations Section**

- **Actor**: Learner
- **Action**: Scrolls to "Recommended Next Steps" section or clicks dedicated tab
- **Frontend**: Displays recommendations already included in cached feedback response (no additional request needed)

**Step 4.2: Display Recommendation Cards**

- **Actor**: Frontend
- **Action**: Renders task recommendations in priority order
- **Card Components**:
    - Task title with difficulty badge
    - Justification text (why recommended based on weaknesses)
    - Estimated duration
    - Skill categories addressed
    - Preview of learning objectives
    - "Add to Learning Path" button

**Step 4.3: User Reviews Recommendations**

- **Actor**: Learner
- **Action**: Reads task descriptions and decides which to pursue
- **Interactions**:
    - Hover over card for detailed tooltip
    - Click "View Full Task" to open task detail modal
    - Compare multiple recommendations

**Step 4.4: User Decides to Add Task**

- **Actor**: Learner
- **Action**: Clicks "Add to Learning Path" button on a recommended task
- **Frontend**: Displays confirmation modal with task details

---

Phase 5: Adding Task to Learning Path

**Step 5.1: Confirm Task Addition**

- **Actor**: Learner
- **Action**: Clicks "Confirm" in modal dialog
- **Frontend**: Shows loading spinner on button

**Step 5.2: Send Add Task Request**

- **Actor**: Frontend → Backend API
- **Endpoint**: `POST /api/learning-paths/{pathId}/tasks`
- **Headers**: `Authorization: Bearer {jwt_token}`
- **Request Body**:

json

  `{
    "taskId": "uuid",
    "source": "recommendation",
    "recommendationId": "uuid",
    "insertPosition": "next" // or "end"
  }`

**Step 5.3: Validate Authorization**

- **Actor**: Backend API
- **Validation**:
    - JWT valid and not expired
    - User owns the learning path specified by `pathId`
- **alt [Unauthorized]**
    - Return `403 Forbidden`
    - Frontend displays error message

**Step 5.4: Retrieve Learning Path**

- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT UserId, TrackId, Status
  FROM LearningPaths
  WHERE PathId = @pathId`

- **alt [Path Not Found]**
    - Return `404 Not Found`
    - Frontend displays "Learning path not found"

**Step 5.5: Check for Duplicate**

- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT COUNT(*) 
  FROM PathTasks
  WHERE PathId = @pathId AND TaskId = @taskId`

- **alt [Task Already in Path]**
    - Return `409 Conflict` with message "Task already in your learning path"
    - Frontend displays notification: "This task is already in your path"
    - Process terminates (not an error)

**Step 5.6: Validate Prerequisites**

- **Actor**: Backend API (Business Logic or Recommendation Engine)
- **Action**: Checks if task prerequisites are satisfied
- **Logic**:
    1. **Query Task Prerequisites**:

sql

     `SELECT PrerequisiteTaskId
     FROM TaskPrerequisites
     WHERE TaskId = @taskId`

1. **Check Completion Status**:

sql

     `SELECT TaskId
     FROM PathTasks pt
     INNER JOIN Submissions s ON pt.TaskId = s.TaskId
     WHERE pt.PathId = @pathId 
       AND pt.TaskId IN (@prerequisiteIds)
       AND s.Status = 'Completed'
       AND s.OverallScore >= 70`

1. **Compare**: All prerequisites completed?
- **alt [Prerequisites Not Met]**
    - Return `400 Bad Request` with detailed response:

json

    `{
      "error": "PrerequisitesNotMet",
      "message": "This task requires completing prerequisite tasks first",
      "missingPrerequisites": [
        {
          "taskId": "uuid",
          "title": "Introduction to Authentication",
          "status": "not_started"
        }
      ]
    }`

- Frontend displays modal: "Complete these tasks first: [list]"
- **opt [User Wants to Add Prerequisites]**
    - Frontend offers "Add Prerequisites" button
    - Recursively adds prerequisite tasks to path in correct order

**Step 5.7: Determine Insert Position**

- **Actor**: Backend API
- **Logic**:
    - If `insertPosition = "next"`: Insert after current task
    - If `insertPosition = "end"`: Append to end of path
    - Calculate new `OrderIndex` for PathTasks table

**Step 5.8: Insert Task into Learning Path**

- **Actor**: Backend API → Database
- **Transaction** (ensures atomicity):

sql

  `BEGIN TRANSACTION
  
  -- Shift existing tasks if inserting in middle
  UPDATE PathTasks
  SET OrderIndex = OrderIndex + 1
  WHERE PathId = @pathId AND OrderIndex >= @insertPosition
  
  -- Insert new task
  INSERT INTO PathTasks (PathId, TaskId, OrderIndex, AddedAt, Source)
  VALUES (@pathId, @taskId, @insertPosition, GETUTCDATE(), 'recommendation')
  
  -- Update recommendation as accepted
  UPDATE Recommendations
  SET AcceptedAt = GETUTCDATE(), Status = 'Accepted'
  WHERE RecommendationId = @recommendationId
  
  COMMIT TRANSACTION`

**Step 5.9: Invalidate Cached Path**

- **Actor**: Backend API → Redis Cache
- **Action**: `DEL learning_path:{pathId}`
- **Purpose**: Ensure next path retrieval reflects updated task list

**Step 5.10: Return Success Response**

- **Actor**: Backend API → Frontend
- **Response**: `201 Created`
- **Response Body**:

json

  `{
    "success": true,
    "message": "Task added to your learning path",
    "updatedPath": {
      "pathId": "uuid",
      "totalTasks": 18,
      "completedTasks": 12,
      "progressPercentage": 67
    },
    "addedTask": {
      "taskId": "uuid",
      "title": "Implementing Secure Authentication Patterns",
      "orderIndex": 13
    }
  }`

**Step 5.11: Update UI**

- **Actor**: Frontend
- **Actions**:
    - Display success toast notification: "✓ Task added to your learning path"
    - Update recommendation card state: "Added to Path" badge, disable button
    - **opt [Show Learning Path Preview]**
        - Display modal: "View your updated learning path?"
        - Button: "Go to Learning Path"
    - Update progress indicators in sidebar/header

**Step 5.12: Track Analytics**

- **Actor**: Backend API → Azure Application Insights
- **Event**: `RecommendationAccepted`
- **Properties**:
    - `userId`, `recommendationId`, `taskId`, `submissionId`
    - `acceptedAt`, `source: "feedback_page"`
    - `prerequisitesCount`, `insertPosition`
- **Purpose**: Measure recommendation acceptance rate, improve algorithm

---

Phase 6: Optional Actions

**Step 6.1: Export Feedback Report (Optional)**

- **Actor**: Learner
- **Action**: Clicks "Export as PDF" button
- **Frontend → Backend API**: `POST /api/submissions/{submissionId}/export-pdf`
- **Backend**: Generates PDF report using templating library
- **Response**: PDF file download or blob storage URL
- **Use Case**: Learner wants offline reference or portfolio documentation

**Step 6.2: Share Feedback with Mentor (Optional)**

- **Actor**: Learner
- **Action**: Clicks "Share with Mentor" button
- **Frontend**: Opens modal to enter mentor email
- **Frontend → Backend API**: `POST /api/submissions/{submissionId}/share`
- **Backend**: Generates secure, time-limited share link
- **Email Sent**: Invitation with read-only feedback access
- **Use Case**: Learner seeks additional guidance from external mentor

**Step 6.3: View Previous Submissions for Same Task (Optional)**

- **Actor**: Learner
- **Action**: Clicks "Compare with Previous Attempts" link
- **Frontend → Backend API**: `GET /api/submissions?taskId={taskId}&userId={userId}`
- **Backend**: Returns historical submissions with score trends
- **Frontend**: Displays progress chart showing improvement over time
- **Use Case**: Learner tracks skill growth through resubmissions

### Alternative Flows

Alt Flow 1: Feedback Not Yet Available (Async Processing)

**Trigger**: User requests feedback while submission status is `Processing`

**Modified Flow**:

- **Step 2.2 Alternative**: Backend returns `202 Accepted`
- **Response**:

json

  `{
    "status": "Processing",
    "message": "Your submission is being analyzed",
    "estimatedCompletion": "2025-12-15T10:40:00Z",
    "progress": {
      "staticAnalysis": "completed",
      "aiAnalysis": "in_progress"
    }
  }`

- **Frontend Action**:
    - Display animated processing indicator
    - Show progress breakdown (static complete, AI pending)
    - Enable auto-refresh every 30 seconds
    - WebSocket connection for real-time updates (if available)

Alt Flow 2: Adding Multiple Recommended Tasks

**Trigger**: User wants to add all top 3 recommendations at once

**Modified Flow**:

- **Frontend**: "Add All to Path" button
- **Request**: `POST /api/learning-paths/{pathId}/tasks/bulk`
- **Request Body**:

json

  `{
    "taskIds": ["uuid1", "uuid2", "uuid3"],
    "source": "recommendation_bulk"
  }`

- **Backend Logic**:
    - Validate prerequisites for entire task set
    - Insert tasks in dependency-respecting order
    - Return aggregated success/failure for each task
- **Frontend**: Display summary: "3 tasks added, 0 failed"

Alt Flow 3: Prerequisite Auto-Addition

**Trigger**: User adds task with unmet prerequisites and opts for auto-add

**Modified Flow**:

- **Backend**: Recursive prerequisite resolution
- **Algorithm**:
    1. Identify all transitive prerequisites
    2. Filter out already-completed tasks
    3. Sort by dependency depth (foundational tasks first)
    4. Insert entire dependency chain
- **Response**: List of all added tasks with order explanation
- **Frontend**: Display dependency tree visualization

Alt Flow 4: Task Already Completed

**Trigger**: User tries to add task they've already completed in a previous submission

**Modified Flow**:

- **Backend Validation**:

sql

  `SELECT COUNT(*) FROM Submissions
  WHERE UserId = @userId AND TaskId = @taskId 
    AND Status = 'Completed' AND OverallScore >= 70`

- **Response**: `409 Conflict`

json

  `{
    "error": "TaskAlreadyCompleted",
    "message": "You've already completed this task successfully",
    "completedAt": "2025-12-10T14:22:00Z",
    "score": 88
  }`

- **Frontend**: Suggest alternative: "View your previous submission" or "Skip to next recommendation"

---

### Error Handling Scenarios

Error 1: Network Failure During Feedback Retrieval

**Symptom**: Frontend HTTP request times out or fails
**Handling**:

- Frontend: Display retry button with exponential backoff
- Cache last successful response in localStorage for offline viewing
- Show partial cached data with "outdated" warning

Error 2: Concurrent Path Modification

**Symptom**: Another session modifies learning path simultaneously
**Handling**:

- Database: Use optimistic concurrency with `RowVersion` column
- Backend: Detect version mismatch, return `409 Conflict`
- Frontend: Refresh path and retry with updated version

Error 3: Recommendation Service Unavailable

**Symptom**: Recommendation generation fails during feedback aggregation
**Handling**:

- Backend: Return feedback without recommendations
- Display: "Recommendations temporarily unavailable"
- Background job: Retry recommendation generation and notify when ready

Error 4: Cache Corruption

**Symptom**: Cached feedback JSON malformed or incomplete
**Handling**:

- Backend: Catch deserialization exception
- Invalidate corrupted cache entry
- Fallback to database query
- Log incident for investigation

---

### Non-Functional Characteristics

**Performance:**

- **Feedback Retrieval**: < 200ms (p95) with cache hit, < 1s with database query
- **Task Addition**: < 500ms (p95) including prerequisite validation
- **Lazy Loading**: Detailed feedback items loaded on-demand (pagination/virtualization)

**Usability:**

- **Progressive Disclosure**: Summary → Details → Code-level annotations
- **Clear Visual Hierarchy**: Score cards, charts, categorized lists
- **Actionable Insights**: Every weakness paired with specific recommendation
- **Educational Tone**: Encouraging, non-judgmental language in feedback

**Security:**

- **Authorization**: Every API call validates JWT and resource ownership
- **Input Validation**: Task IDs validated against allowed user actions
- **Rate Limiting**: 60 requests/minute per user on feedback endpoints
- **Data Privacy**: Feedback never exposed to other users without explicit sharing

**Analytics:**

- **Engagement Tracking**: Time spent on feedback, sections viewed, recommendations clicked
- **Quality Metrics**: Feedback rating collection for AI prompt improvement
- **Learning Velocity**: Time from feedback view to next submission

---

### Database Schema Impact

**Tables Queried:**

1. **Submissions**: Status, scores, metadata
2. **StaticAnalysis**: Tool results, issue counts
3. **AIAnalysis**: LLM feedback, scores, tokens
4. **Recommendations**: Task suggestions with justifications
5. **Tasks**: Titles, descriptions, prerequisites
6. **LearningPaths**: User's active learning path
7. **PathTasks**: Tasks in path with order

**Tables Modified:**

1. **PathTasks**: New row inserted for added task
2. **Recommendations**: `AcceptedAt`, `Status` updated when task added
3. **UserActivity**: Feedback view event logged (optional analytics table)

**Indexes Used:**

- `Submissions.SubmissionId` (primary key lookup)
- `Submissions.UserId` (authorization check)
- `StaticAnalysis.SubmissionId` (join for aggregation)
- `AIAnalysis.SubmissionId` (join for aggregation)
- `Recommendations.SubmissionId` (join for recommendations)
- `PathTasks.PathId_TaskId` (duplicate check)
- `TaskPrerequisites.TaskId` (prerequisite validation)

---

### Integration Points Summary

| External System | Interaction Type | Purpose | Error Handling |
| --- | --- | --- | --- |
| Redis Cache | Read/Write | Feedback caching, session state | Fallback to database |
| SQL Server | Read/Write | Primary data retrieval, path updates | Retry transient errors |
| Azure App Insights | Telemetry | User interaction analytics | Best-effort logging |
| Notification Service | HTTP POST | Optional email sharing | Non-blocking failure |
| PDF Generation Service | HTTP POST | Optional report export | User-facing error msg |

---

### Alignment with Activity Diagram 4.4.6

This sequence diagram directly implements the workflow defined in **Activity Diagram 4.4.6: Feedback Review & Learning Path Update Activity**:

- **Phase 1-2** correspond to "Navigate to Submissions" and "Request Feedback" activities
- **Phase 3** implements "Review Feedback" and "Explore Details" activities
- **Phase 4** implements "View Recommendations" activity
- **Phase 5** implements "Add Task to Path" activity with prerequisite validation
- **Decision nodes** match alt fragments for authorization, duplicates, prerequisites
- **Error paths** align with exception handling branches

---

### Academic Rigor and Standards Compliance

This sequence diagram adheres to:

- **UML 2.5 Specification**: Correct use of lifelines, synchronous messages, fragments (alt, opt), return messages
- **REST API Best Practices**: Proper HTTP verbs, status codes, idempotent operations
- **Authorization Patterns**: JWT validation, resource ownership checks at every endpoint
- **Caching Strategy**: Read-through cache pattern with TTL and invalidation
- **User Experience Standards**: Progressive disclosure, clear error messages, optimistic UI updates
- **IEEE 29148-2018**: Requirements traceability to FR-FEED and FR-PATH specifications

### **4.5.6** Sequence Diagram: Admin Management Flow

### Overview

This sequence diagram models the **administrative management workflows** that enable platform administrators to oversee and maintain the AI-Powered Learning & Code Review Platform. It illustrates how admins perform critical operations including user management, task library curation, learning track configuration, and platform analytics monitoring.

This diagram represents the **platform governance and content management layer**, where administrators:

1. Authenticate with elevated privileges
2. Manage user accounts and roles
3. Create, edit, and organize learning tasks
4. Configure learning tracks and prerequisites
5. Monitor platform analytics and system health
6. Moderate content and handle reported issues

The workflow emphasizes **administrative control, audit logging, and separation of concerns** between learner-facing features and platform management operations.

---

### Scope and Boundaries

**In Scope:**

- Admin authentication with role-based access control (RBAC)
- User management operations (view, edit, deactivate, role assignment)
- Task library management (CRUD operations, versioning, prerequisites)
- Learning track configuration (create tracks, assign tasks, reorder)
- Platform analytics dashboard (user metrics, engagement, performance)
- Content moderation queue
- System configuration management

**Out of Scope:**

- Learner-facing workflows (covered in 4.5.1 - 4.5.5)
- Low-level database administration (backups, indexes)
- Infrastructure monitoring (Azure portal, container orchestration)
- Financial/billing management (payment processing)
- Detailed analytics algorithm implementation

**Related Artifacts:**

- **Activity Diagram 4.4.7**: Admin Task & Analytics Management Activity
- **Use Cases**: UC_Users (Manage Users), UC_AdminTasks (Manage Tasks & Learning Tracks), UC_AdminAnalytics (View Platform Analytics)
- **Functional Requirements**: FR-ADMIN-01 through FR-ADMIN-07
- **Non-Functional Requirements**: NFR-SEC-02 (Authorization), NFR-MAIN-07 (Logging & Observability)

---

### Participants (Lifelines)

1. **Admin (User)** — Platform administrator with elevated privileges
2. **Frontend (React Admin Panel)** — Administrative interface (separate from learner UI)
3. **Backend API (ASP.NET Core)** — RESTful API with admin-specific endpoints
4. **Authorization Middleware** — Role-based access control enforcement
5. **Database (SQL Server)** — Persistent storage for all platform data
6. **Audit Log Service** — Dedicated service for tamper-proof audit logging
7. **Cache (Redis)** — Distributed cache for admin dashboard data
8. **Analytics Aggregation Service** — Service computing platform metrics
9. **Azure Application Insights** — Monitoring and alerting system

---

### Detailed Interaction Flow

### Phase 1: Admin Authentication and Dashboard Access

**Step 1.1: Admin Navigates to Admin Panel**

- **Actor**: Admin
- **Action**: Accesses admin panel URL (`/admin` or dedicated subdomain `admin.platform.com`)
- **Result**: Frontend checks authentication status

**Step 1.2: Check Existing Session**

- **Actor**: Frontend (local storage check)
- **Action**: Verifies presence of valid JWT token with admin claims
- **Validation**:
    - Token exists in localStorage/sessionStorage
    - Token not expired (check `exp` claim)
    - Token contains `role: Admin` claim
- **alt [No Valid Admin Token]**
    - Redirect to admin login page `/admin/login`

**Step 1.3: Admin Login**

- **Actor**: Admin → Frontend
- **Action**: Enters admin credentials (email + password + optional MFA code)
- **Security Enhancement**: Admin accounts require Multi-Factor Authentication (MFA)

**Step 1.4: Submit Login Request**

- **Actor**: Frontend → Backend API
- **Endpoint**: `POST /api/admin/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:

json

  `{
    "email": "admin@platform.com",
    "password": "SecurePassword123!",
    "mfaCode": "123456",
    "rememberMe": false
  }`

**Step 1.5: Validate Admin Credentials**

- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT UserId, Email, PasswordHash, Role, MFAEnabled, MFASecret, AccountStatus
  FROM Users
  WHERE Email = @email AND Role = 'Admin'`

- **Validation Steps**:
    1. **User Exists**: Admin account found
    2. **Password Verification**: PBKDF2 hash comparison
    3. **Account Status**: Active (not suspended/deactivated)
    4. **MFA Validation**: Verify TOTP code if MFA enabled
- **alt [Invalid Credentials]**
    - Increment failed login counter
    - Return `401 Unauthorized`
    - Frontend displays "Invalid credentials"
    - **Security**: Generic error message (no user enumeration)
- **alt [MFA Code Invalid]**
    - Return `401 Unauthorized` with specific error: "Invalid MFA code"
    - Allow 3 attempts before temporary lockout (15 minutes)
- **alt [Account Suspended]**
    - Return `403 Forbidden` with message "Account suspended - contact support"
    - Log security event

**Step 1.6: Generate Admin JWT Token**

- **Actor**: Backend API
- **Action**: Creates JWT with admin-specific claims
- **Token Payload**:

json

  `{
    "sub": "admin_user_id",
    "email": "admin@platform.com",
    "role": "Admin",
    "permissions": ["user.manage", "task.manage", "analytics.view", "system.configure"],
    "iat": 1734480000,
    "exp": 1734483600
  }`

- **Token Properties**:
    - **Algorithm**: RS256 (asymmetric signing)
    - **Expiration**: 1 hour (shorter than learner tokens for security)
    - **Issuer**: `platform.api`
    - **Audience**: `platform.admin`

**Step 1.7: Log Admin Login Event**

- **Actor**: Backend API → Audit Log Service
- **Event**: `AdminLogin`
- **Properties**:

json

  `{
    "adminId": "uuid",
    "email": "admin@platform.com",
    "ipAddress": "203.0.113.42",
    "userAgent": "Mozilla/5.0...",
    "loginMethod": "email_mfa",
    "timestamp": "2025-12-17T14:30:00Z",
    "success": true
  }`

- **Purpose**: Security audit trail, anomaly detection, compliance

**Step 1.8: Return Admin Token**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`
- **Response Body**:

json

  `{
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "adminUser": {
      "userId": "uuid",
      "email": "admin@platform.com",
      "fullName": "Admin User",
      "permissions": ["user.manage", "task.manage", "analytics.view"]
    }
  }`

**Step 1.9: Store Token and Navigate to Dashboard**

- **Actor**: Frontend
- **Actions**:
    - Store JWT in secure storage (HttpOnly cookie preferred, or sessionStorage)
    - Update application state with admin context
    - Navigate to admin dashboard `/admin/dashboard`

---

Phase 2: Admin Dashboard Overview

**Step 2.1: Request Dashboard Data**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/dashboard/overview`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`

**Step 2.2: Authorize Admin Access**

- **Actor**: Authorization Middleware
- **Action**: Validates JWT and checks role claim
- **Validation**:
    - Token signature valid
    - Token not expired
    - `role` claim equals `Admin`
    - Required permission: `analytics.view`
- **alt [Insufficient Permissions]**
    - Return `403 Forbidden`
    - Frontend displays "Access denied - admin privileges required"
    - Log security event (potential privilege escalation attempt)

**Step 2.3: Check Cached Dashboard Data**

- **Actor**: Backend API → Redis Cache
- **Cache Key**: `admin_dashboard:overview`
- **Action**: `GET admin_dashboard:overview`
- **Result**:
    - **Cache Hit**: Return cached metrics (refreshed every 5 minutes)
    - **Cache Miss**: Proceed to aggregation

**Step 2.4: Aggregate Platform Metrics (Cache Miss)**

- **Actor**: Backend API → Analytics Aggregation Service
- **Action**: Invokes service to compute real-time metrics
- **Internal Process**:
**Parallel Query Execution**:
**Query 1: User Metrics**

sql

  `SELECT 
    COUNT(*) AS TotalUsers,
    COUNT(CASE WHEN Role = 'Learner' THEN 1 END) AS TotalLearners,
    COUNT(CASE WHEN CreatedAt >= DATEADD(day, -30, GETUTCDATE()) THEN 1 END) AS NewUsersLast30Days,
    COUNT(CASE WHEN LastLoginAt >= DATEADD(day, -7, GETUTCDATE()) THEN 1 END) AS ActiveUsersLast7Days
  FROM Users`

**Query 2: Submission Metrics**

sql

  `SELECT 
    COUNT(*) AS TotalSubmissions,
    COUNT(CASE WHEN Status = 'Completed' THEN 1 END) AS CompletedSubmissions,
    COUNT(CASE WHEN Status = 'Processing' THEN 1 END) AS ProcessingSubmissions,
    AVG(CASE WHEN Status = 'Completed' THEN OverallScore END) AS AvgScore,
    COUNT(CASE WHEN CreatedAt >= DATEADD(day, -1, GETUTCDATE()) THEN 1 END) AS SubmissionsLast24Hours
  FROM Submissions`

**Query 3: Task Library Stats**

sql

  `SELECT 
    COUNT(*) AS TotalTasks,
    COUNT(CASE WHEN IsPublished = 1 THEN 1 END) AS PublishedTasks,
    COUNT(DISTINCT TrackId) AS TotalTracks
  FROM Tasks`

**Query 4: System Health Metrics**

sql

  `SELECT 
    AVG(ProcessingTimeMs) AS AvgProcessingTime,
    COUNT(CASE WHEN Status = 'Failed' THEN 1 END) AS FailedSubmissionsLast24Hours
  FROM Submissions
  WHERE CreatedAt >= DATEADD(day, -1, GETUTCDATE())`

**Step 2.5: Return Dashboard Overview**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`
- **Response Schema**:

json

  `{
    "users": {
      "total": 2847,
      "learners": 2820,
      "admins": 27,
      "newLast30Days": 342,
      "activeLast7Days": 1523
    },
    "submissions": {
      "total": 15683,
      "completed": 14521,
      "processing": 47,
      "failed": 115,
      "avgScore": 78.3,
      "last24Hours": 289
    },
    "tasks": {
      "total": 156,
      "published": 142,
      "draft": 14,
      "tracks": 8
    },
    "systemHealth": {
      "avgProcessingTime": 287000,
      "failureRateLast24Hours": 2.4,
      "status": "healthy"
    },
    "alerts": [
      {
        "severity": "warning",
        "message": "AI service response time increased by 15%",
        "timestamp": "2025-12-17T14:15:00Z"
      }
    ]
  }`

**Step 2.6: Cache Dashboard Data**

- **Actor**: Backend API → Redis Cache
- **Action**: `SETEX admin_dashboard:overview 300 {metricsJson}`
- **TTL**: 5 minutes (300 seconds)
- **Rationale**: Balance freshness vs. database load

**Step 2.7: Render Admin Dashboard**

- **Actor**: Frontend
- **UI Components**:
    - **Metric Cards**: Total users, submissions, active learners
    - **Line Charts**: User growth trend, submission volume over time
    - **System Status Indicators**: Green/yellow/red badges for health metrics
    - **Recent Activity Feed**: Latest submissions, new users, flagged content
    - **Quick Actions**: "Manage Users", "Create Task", "View Analytics"
    - **Alert Panel**: System warnings and notifications

---

Phase 3: User Management Operations

**Step 3.1: Navigate to User Management**

- **Actor**: Admin
- **Action**: Clicks "Manage Users" in admin navigation
- **Frontend**: Navigates to `/admin/users`

**Step 3.2: Request User List**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/users?page=1&pageSize=50&search=&role=&status=`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`
- **Query Parameters**:
    - `page`: Pagination page (default: 1)
    - `pageSize`: Results per page (default: 50, max: 100)
    - `search`: Optional search term (email, name)
    - `role`: Filter by role (Learner, Admin)
    - `status`: Filter by status (Active, Suspended, Deactivated)
    - `sortBy`: Sort field (createdAt, lastLoginAt, email)
    - `sortOrder`: asc/desc

**Step 3.3: Authorize and Query Users**

- **Actor**: Backend API (Authorization Middleware)
- **Validation**: Check `user.manage` permission
- **alt [No Permission]**
    - Return `403 Forbidden`
- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT 
    u.UserId, u.Email, u.FullName, u.Role, u.AccountStatus,
    u.CreatedAt, u.LastLoginAt, u.EmailVerified,
    COUNT(s.SubmissionId) AS TotalSubmissions,
    AVG(s.OverallScore) AS AvgScore
  FROM Users u
  LEFT JOIN Submissions s ON u.UserId = s.UserId
  WHERE 
    (@search IS NULL OR u.Email LIKE '%' + @search + '%' OR u.FullName LIKE '%' + @search + '%')
    AND (@role IS NULL OR u.Role = @role)
    AND (@status IS NULL OR u.AccountStatus = @status)
  GROUP BY u.UserId, u.Email, u.FullName, u.Role, u.AccountStatus, u.CreatedAt, u.LastLoginAt, u.EmailVerified
  ORDER BY u.CreatedAt DESC
  OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`

**Step 3.4: Return User List**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`
- **Response Body**:

json

  `{
    "users": [
      {
        "userId": "uuid",
        "email": "learner@example.com",
        "fullName": "John Doe",
        "role": "Learner",
        "accountStatus": "Active",
        "createdAt": "2025-11-15T10:00:00Z",
        "lastLoginAt": "2025-12-17T09:30:00Z",
        "emailVerified": true,
        "totalSubmissions": 24,
        "avgScore": 82.5
      }
      // ... more users
    ],
    "totalCount": 2847,
    "page": 1,
    "pageSize": 50
  }`

**Step 3.5: Display User Table**

- **Actor**: Frontend
- **UI Features**:
    - **Sortable Columns**: Email, Name, Role, Status, Created Date, Last Login
    - **Filters**: Role dropdown, Status dropdown, Search box
    - **Row Actions**: View Details, Edit, Deactivate, Assign Role
    - **Bulk Actions**: Select multiple users, bulk deactivate/activate

**Step 3.6: Admin Selects User to Edit**

- **Actor**: Admin
- **Action**: Clicks "Edit" button on user row
- **Frontend**: Opens user edit modal or navigates to `/admin/users/{userId}/edit`

**Step 3.7: Request User Details**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/users/{userId}`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`

**Step 3.8: Return Full User Profile**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK` with complete user data including:
    - Personal information
    - Account settings
    - Learning path details
    - Submission history summary
    - Recent activity log

**Step 3.9: Admin Modifies User**

- **Actor**: Admin
- **Actions Available**:
    - Change role (Learner → Admin, or vice versa)
    - Deactivate/reactivate account
    - Reset password (sends reset email to user)
    - Verify email manually
    - Add admin notes
- **Frontend**: Admin edits fields in form

**Step 3.10: Submit User Update**

- **Actor**: Frontend → Backend API
- **Endpoint**: `PUT /api/admin/users/{userId}`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`
- **Request Body**:

json

  `{
    "role": "Admin",
    "accountStatus": "Active",
    "emailVerified": true,
    "adminNotes": "Promoted to admin for content moderation"
  }`

**Step 3.11: Validate and Apply Changes**

- **Actor**: Backend API
- **Validation**:
    - Admin has `user.manage` permission
    - Target user exists
    - Role change is valid (cannot demote last remaining admin)
    - Status change complies with business rules
- **alt [Invalid Operation - Last Admin]**
    - Return `400 Bad Request`: "Cannot demote the last admin account"
    - Frontend displays error message

**Step 3.12: Update User Record**

- **Actor**: Backend API → Database
- **Command**:

sql

  `UPDATE Users
  SET 
    Role = @role,
    AccountStatus = @status,
    EmailVerified = @emailVerified,
    ModifiedAt = GETUTCDATE(),
    ModifiedBy = @adminUserId
  WHERE UserId = @userId`

**Step 3.13: Log Admin Action**

- **Actor**: Backend API → Audit Log Service
- **Event**: `UserModified`
- **Properties**:

json

  `{
    "adminId": "uuid",
    "adminEmail": "admin@platform.com",
    "targetUserId": "uuid",
    "targetEmail": "learner@example.com",
    "changes": {
      "role": {"old": "Learner", "new": "Admin"},
      "accountStatus": {"old": "Active", "new": "Active"}
    },
    "reason": "Promoted to admin for content moderation",
    "ipAddress": "203.0.113.42",
    "timestamp": "2025-12-17T14:45:00Z"
  }`

- **Purpose**: Complete audit trail for compliance, security investigation

**Step 3.14: Invalidate User Cache**

- **Actor**: Backend API → Redis Cache
- **Action**: `DEL user:{userId}`, `DEL user_sessions:{userId}`
- **Effect**: Force re-authentication if role changed

**Step 3.15: Return Success**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`
- **Response Body**:

json

  `{
    "success": true,
    "message": "User updated successfully",
    "user": {
      "userId": "uuid",
      "role": "Admin",
      "accountStatus": "Active"
    }
  }`

**Step 3.16: Update UI**

- **Actor**: Frontend
- **Actions**:
    - Display success notification: "User updated successfully"
    - Refresh user list to reflect changes
    - Close edit modal
    - Update row in user table with new values

---

Phase 4: Task Library Management

**Step 4.1: Navigate to Task Management**

- **Actor**: Admin
- **Action**: Clicks "Manage Tasks" in admin panel
- **Frontend**: Navigates to `/admin/tasks`

**Step 4.2: Request Task List**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/tasks?page=1&pageSize=20&track=&difficulty=&status=`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`

**Step 4.3: Authorize and Query Tasks**

- **Actor**: Backend API (Authorization Middleware)
- **Validation**: Check `task.manage` permission
- **Actor**: Backend API → Database
- **Query**:

sql

  `SELECT 
    t.TaskId, t.Title, t.Description, t.Difficulty, t.EstimatedDuration,
    t.TrackId, tr.TrackName, t.IsPublished, t.CreatedAt, t.ModifiedAt,
    COUNT(s.SubmissionId) AS TotalSubmissions,
    AVG(s.OverallScore) AS AvgScore
  FROM Tasks t
  LEFT JOIN Tracks tr ON t.TrackId = tr.TrackId
  LEFT JOIN Submissions s ON t.TaskId = s.TaskId
  WHERE 
    (@track IS NULL OR t.TrackId = @track)
    AND (@difficulty IS NULL OR t.Difficulty = @difficulty)
    AND (@status IS NULL OR 
         (@status = 'published' AND t.IsPublished = 1) OR
         (@status = 'draft' AND t.IsPublished = 0))
  GROUP BY t.TaskId, t.Title, t.Description, t.Difficulty, t.EstimatedDuration,
           t.TrackId, tr.TrackName, t.IsPublished, t.CreatedAt, t.ModifiedAt
  ORDER BY t.CreatedAt DESC
  OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`

**Step 4.4: Return Task List**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK` with task array

**Step 4.5: Admin Creates New Task**

- **Actor**: Admin
- **Action**: Clicks "Create New Task" button
- **Frontend**: Opens task creation form

**Step 4.6: Submit New Task**

- **Actor**: Frontend → Backend API
- **Endpoint**: `POST /api/admin/tasks`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`
- **Request Body**:

json

  `{
    "title": "Implement JWT Authentication Middleware",
    "description": "Build secure authentication middleware using JWT...",
    "difficulty": "Intermediate",
    "estimatedDuration": "4-5 hours",
    "trackId": "uuid",
    "skillCategories": ["Security", "Backend", "Authentication"],
    "prerequisites": ["uuid_of_prerequisite_task"],
    "evaluationCriteria": [
      "Correct JWT validation implementation",
      "Proper error handling",
      "Security best practices followed"
    ],
    "starterCode": "// Optional starter code template",
    "requiredFiles": ["middleware/auth.js", "tests/auth.test.js"],
    "learningObjectives": [
      "Understand JWT structure and validation",
      "Implement secure token-based authentication"
    ],
    "isPublished": false
  }`

**Step 4.7: Validate Task Data**

- **Actor**: Backend API (Business Logic Layer)
- **Validation**:
    - Title unique within track
    - Track exists
    - Prerequisites are valid task IDs
    - Skill categories match predefined list
    - Difficulty level valid (Beginner, Intermediate, Advanced)
    - No circular prerequisite dependencies
- **alt [Validation Fails]**
    - Return `400 Bad Request` with specific validation errors
    - Frontend displays inline error messages

**Step 4.8: Insert Task Record**

- **Actor**: Backend API → Database
- **Transaction**:

sql

  `BEGIN TRANSACTION
  
  -- Insert main task
  INSERT INTO Tasks 
    (TaskId, Title, Description, Difficulty, EstimatedDuration, TrackId,
     EvaluationCriteria, RequiredFiles, LearningObjectives, IsPublished,
     CreatedAt, CreatedBy)
  VALUES 
    (NEWID(), @title, @description, @difficulty, @duration, @trackId,
     @criteria, @files, @objectives, @isPublished, GETUTCDATE(), @adminId)
  
  -- Insert skill category associations
  INSERT INTO TaskSkills (TaskId, SkillCategory)
  SELECT @newTaskId, category FROM @skillCategories
  
  -- Insert prerequisites
  INSERT INTO TaskPrerequisites (TaskId, PrerequisiteTaskId)
  SELECT @newTaskId, prereqId FROM @prerequisites
  
  COMMIT TRANSACTION`

**Step 4.9: Log Task Creation**

- **Actor**: Backend API → Audit Log Service
- **Event**: `TaskCreated`
- **Properties**: Admin ID, task ID, task title, track, timestamp

**Step 4.10: Invalidate Task Cache**

- **Actor**: Backend API → Redis Cache
- **Action**: `DEL tasks:list:*`, `DEL track:{trackId}:tasks`

**Step 4.11: Return Created Task**

- **Actor**: Backend API → Frontend
- **Response**: `201 Created`
- **Response Body**: Complete task object with generated `TaskId`

**Step 4.12: Update UI**

- **Actor**: Frontend
- **Actions**:
    - Display success notification: "Task created successfully"
    - Refresh task list to include new task
    - Close creation form
    - Optionally navigate to task detail view for further editing

---

**Phase 5: Learning Track Configuration**

**Step 5.1: Navigate to Track Management**

- **Actor**: Admin
- **Action**: Clicks "Manage Learning Tracks"
- **Frontend**: Navigates to `/admin/tracks`

**Step 5.2: Request Track List**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/tracks`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`

**Step 5.3: Return Tracks with Task Counts**

- **Actor**: Backend API → Frontend
- **Query**:

sql

  `SELECT 
    t.TrackId, t.TrackName, t.Description, t.Level, t.IsActive,
    COUNT(tt.TaskId) AS TotalTasks,
    COUNT(DISTINCT u.UserId) AS TotalLearners
  FROM Tracks t
  LEFT JOIN Tasks tt ON t.TrackId = tt.TrackId
  LEFT JOIN LearningPaths lp ON t.TrackId = lp.TrackId
  LEFT JOIN Users u ON lp.UserId = u.UserId
  GROUP BY t.TrackId, t.TrackName, t.Description, t.Level, t.IsActive
  ORDER BY t.CreatedAt DESC`

- **Response**: Track list with metadata

**Step 5.4: Admin Edits Track**

- **Actor**: Admin
- **Action**: Clicks "Edit Track" or "Manage Tasks in Track"
- **Frontend**: Opens track editor with drag-and-drop task ordering

**Step 5.5: Reorder Tasks in Track**

- **Actor**: Admin
- **Action**: Drags tasks to new positions in track sequence
- **Frontend**: Updates local state with new order

**Step 5.6: Submit Track Update**

- **Actor**: Frontend → Backend API
- **Endpoint**: `PUT /api/admin/tracks/{trackId}/tasks/reorder`
- **Request Body**:

json

  `{
    "taskOrder": [
      {"taskId": "uuid1", "orderIndex": 1},
      {"taskId": "uuid2", "orderIndex": 2},
      {"taskId": "uuid3", "orderIndex": 3}
    ]
  }`

**Step 5.7: Validate and Update Order**

- **Actor**: Backend API
- **Validation**:
    - All tasks belong to specified track
    - No duplicate order indices
    - Order indices are sequential
    - Prerequisite dependencies respected (prerequisites come before dependent tasks)
- **alt [Prerequisite Violation]**
    - Return `400 Bad Request`: "Task X requires Task Y to be completed first, but Y appears after X in the order"
    - Frontend highlights conflicting tasks in red

**Step 5.8: Update Task Order**

- **Actor**: Backend API → Database
- **Command**:

sql

  `UPDATE Tasks
  SET OrderIndex = t.NewOrder
  FROM Tasks
  INNER JOIN @taskOrder t ON Tasks.TaskId = t.TaskId
  WHERE Tasks.TrackId = @trackId`

**Step 5.9: Log Configuration Change**

- **Actor**: Backend API → Audit Log Service
- **Event**: `TrackConfigured`

**Step 5.10: Invalidate Track Cache**

- **Actor**: Backend API → Redis Cache
- **Action**: `DEL track:{trackId}:*`, `DEL learning_paths:*`

**Step 5.11: Return Success**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`

---

**Phase 6: Platform Analytics Monitoring**

**Step 6.1: Navigate to Analytics Dashboard**

- **Actor**: Admin
- **Action**: Clicks "Analytics" in admin navigation
- **Frontend**: Navigates to `/admin/analytics`

**Step 6.2: Request Detailed Analytics**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/analytics/detailed?dateRange=last30days&metrics=all`
- **Headers**: `Authorization: Bearer {admin_jwt_token}`

**Step 6.3: Authorize Analytics Access**

- **Actor**: Authorization Middleware
- **Validation**: Check `analytics.view` permission

**Step 6.4: Invoke Analytics Aggregation**

- **Actor**: Backend API → Analytics Aggregation Service
- **Process**: Service executes complex analytical queries

**Parallel Metric Computation**:

**Metric Set 1: User Engagement**

sql

- `- Daily Active Users (DAU) trendSELECT CAST(LastLoginAt AS DATE) AS Date, COUNT(DISTINCT UserId) AS DAU
FROM Users
WHERE LastLoginAt >= DATEADD(day, 30, GETUTCDATE())GROUP BY CAST(LastLoginAt AS DATE)ORDER BY Date- Average session durationSELECT AVG(SessionDurationMinutes) AS AvgSessionDuration
FROM UserSessions
WHERE CreatedAt >= DATEADD(day, 30, GETUTCDATE())`

**Metric Set 2: Learning Progress**

sql

- `- Task completion rates by difficultySELECT t.Difficulty, COUNT(s.SubmissionId) AS TotalAttempts, COUNT(CASE WHEN s.Status = 'Completed' AND s.OverallScore >= 70 THEN 1 END) AS SuccessfulCompletions, AVG(s.OverallScore) AS AvgScore
FROM Submissions s
INNER JOIN Tasks t ON s.TaskId = t.TaskId
WHERE s.CreatedAt >= DATEADD(day, 30, GETUTCDATE())GROUP BY t.Difficulty
- Average time to completionSELECT t.Difficulty, AVG(DATEDIFF(hour, pt.AddedAt, s.ProcessingCompletedAt)) AS AvgHoursToComplete
FROM PathTasks pt
INNER JOIN Tasks t ON pt.TaskId = t.TaskId
INNER JOIN Submissions s ON pt.TaskId = s.TaskId
WHERE s.Status = 'Completed'GROUP BY t.Difficulty`

**Metric Set 3: AI Service Performance**

```sql

-- AI feedback quality ratingsSELECT AVG(CASE WHEN Rating = 'helpful' THEN 100 WHEN Rating = 'not_helpful' THEN 0 END) AS HelpfulnessScore, COUNT() AS TotalRatings
FROM FeedbackRatings
WHERE CreatedAt >= DATE

ADD(day, -30, GETUTCDATE())

- - Token usage and cost
SELECT
ModelProvider,
SUM(TokensUsed) AS TotalTokens,
AVG(ProcessingTimeMs) AS AvgLatency,
COUNT(*) AS TotalRequests
FROM AIAnalysis
WHERE CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY ModelProvider

```

**Metric Set 4: System Health**

```sql
-- Error rates by type
SELECT
  Status,
  COUNT(*) AS Count,
  AVG(RetryCount) AS AvgRetries
FROM Submissions
WHERE CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY Status

-- Processing time distribution
SELECT
  CASE
    WHEN DATEDIFF(minute, CreatedAt, ProcessingCompletedAt) < 5 THEN '<5min'
    WHEN DATEDIFF(minute, CreatedAt, ProcessingCompletedAt) < 10 THEN '5-10min'
    ELSE '>10min'
  END AS TimeRange,
  COUNT(*) AS Count
FROM Submissions
WHERE Status = 'Completed'
  AND CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY CASE
    WHEN DATEDIFF(minute, CreatedAt, ProcessingCompletedAt) < 5 THEN '<5min'
    WHEN DATEDIFF(minute, CreatedAt, ProcessingCompletedAt) < 10 THEN '5-10min'
    ELSE '>10min'
  END

```

**Step 6.5: Return Comprehensive Analytics**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`
- **Response Schema**: Multi-dimensional analytics object with:
    - Time-series data for charts (user growth, submission volume)
    - Aggregate metrics (totals, averages, percentages)
    - Segmented data (by difficulty, track, skill level)
    - System performance indicators
    - Cost metrics (AI token usage, infrastructure spend estimates)

**Step 6.6: Render Analytics Visualizations**

- **Actor**: Frontend
- **UI Components**:
    - **Line Charts**: DAU trend, submission volume over time
    - **Bar Charts**: Task completion rates by difficulty, track popularity
    - **Pie Charts**: User distribution by skill level, submission status breakdown
    - **Heatmaps**: Activity by day of week and hour
    - **Tables**: Top tasks by engagement, highest-scoring users, problematic tasks (high failure rate)
    - **KPI Cards**: Total revenue (if applicable), avg LTV, churn rate

**Step 6.7: Admin Exports Analytics Report**

- **Actor**: Admin
- **Action**: Clicks "Export Report" button
- **Options**: CSV, Excel, PDF

**Step 6.8: Generate Export**

- **Actor**: Frontend → Backend API
- **Endpoint**: `POST /api/admin/analytics/export`
- **Request Body**:

```json
  {
    "format": "pdf",
    "dateRange": "last30days",
    "metrics": ["user_engagement", "learning_progress", "system_health"]
  }

```

**Step 6.9: Create Export File**

- **Actor**: Backend API
- **Process**:
    - Retrieve analytics data from cache or database
    - Render report using templating engine (e.g., Razor, Handlebars)
    - Generate PDF using library (e.g., iTextSharp, Puppeteer)
    - Upload to Blob Storage
    - Generate secure download link (SAS token, 1-hour expiry)

**Step 6.10: Return Download Link**

- **Actor**: Backend API → Frontend
- **Response**: `200 OK`
- **Response Body**:

```json
  {
    "downloadUrl": "<https://storage.blob.core.windows.net/reports/analytics_2025-12-17.pdf?sv=>...",
    "expiresAt": "2025-12-17T15:45:00Z",
    "fileSize": 2457600
  }

```

**Step 6.11: Trigger Download**

- **Actor**: Frontend
- **Action**: Opens download URL in new tab or triggers browser download

---

Phase 7: Content Moderation (Optional)

**Step 7.1: View Moderation Queue**

- **Actor**: Admin
- **Action**: Clicks "Moderation Queue" (if community features enabled)
- **Frontend**: Displays flagged content (future feature placeholder)

**Step 7.2: Request Flagged Items**

- **Actor**: Frontend → Backend API
- **Endpoint**: `GET /api/admin/moderation/queue`
- **Response**: List of user-reported content, AI-flagged submissions

**Step 7.3: Admin Reviews Flagged Content**

- **Actor**: Admin
- **Actions**: Approve, Remove, Warn User, Ban User

**Step 7.4: Submit Moderation Decision**

- **Actor**: Frontend → Backend API
- **Endpoint**: `POST /api/admin/moderation/{itemId}/action`
- **Request Body**:

```json
  {
    "action": "remove",
    "reason": "Inappropriate content",
    "notifyUser": true
  }

```

**Step 7.5: Apply Moderation Action**

- **Actor**: Backend API → Database
- **Actions**:
    - Update content status
    - Log moderation decision
    - Send notification to user (if applicable)
    - Update user's warning count (if policy violation)

**Step 7.6: Log Moderation Event**

- **Actor**: Backend API → Audit Log Service
- **Event**: `ContentModerated`

---

### Alternative Flows

Alt Flow 1: Bulk User Operations

**Trigger**: Admin selects multiple users and performs bulk action

**Modified Flow**:

- **Frontend**: Checkboxes enable multi-select
- **Admin**: Selects 50 users, clicks "Bulk Deactivate"
- **Frontend → API**: `POST /api/admin/users/bulk-action`
- **Request Body**:

```json
  {
    "userIds": ["uuid1", "uuid2", ..., "uuid50"],
    "action": "deactivate",
    "reason": "Policy violation - inactive accounts"
  }

```

- **Backend**: Processes in transaction, logs each action
- **Response**: Summary (45 succeeded, 5 failed with reasons)

Alt Flow 2: Task Duplication

**Trigger**: Admin wants to create similar task based on existing one

**Modified Flow**:

- **Admin**: Clicks "Duplicate" on existing task
- **Frontend → API**: `POST /api/admin/tasks/{taskId}/duplicate`
- **Backend**: Copies task with new title suffix "(Copy)"
- **Response**: New task ID
- **Frontend**: Opens edit form for duplicated task

Alt Flow 3: Emergency System Configuration

**Trigger**: AI service degradation requires immediate circuit breaker activation

**Modified Flow**:

- **Admin**: Navigates to "System Configuration"
- **Admin**: Toggles "AI Service Circuit Breaker" to "Open"
- **Frontend → API**: `PUT /api/admin/system/config`
- **Request Body**:

```json
  {
    "ai_circuit_breaker": "open",
    "reason": "High failure rate - investigating"
  }

```

- **Backend**: Updates configuration in database and Redis
- **Effect**: All submissions process with static analysis only
- **Notification**: Banner displayed to all admins

---

### Error Handling Scenarios

Error 1: Concurrent Admin Modification

**Symptom**: Two admins edit same user/task simultaneously
**Handling**:

- Database: Use `RowVersion` for optimistic concurrency
- Backend: Detect version mismatch, return `409 Conflict`
- Frontend: Display "This record was modified by another admin. Refresh and try again."
- Admin: Refreshes page, sees latest changes, re-applies their edits

Error 2: Analytics Query Timeout

**Symptom**: Complex analytics query exceeds 30-second timeout
**Handling**:

- Backend: Catch `SqlException` timeout
- Return `202 Accepted`: "Analytics generation in progress"
- Background job: Complete query asynchronously
- Frontend: Poll for completion or use WebSocket for notification
- Alternative: Serve slightly stale cached data with "Last updated: 10 minutes ago" notice

Error 3: Audit Log Service Unavailable

**Symptom**: Audit service cannot be reached
**Handling**:

- Backend: Catch connection exception
- Fallback: Write audit entry to local queue (database table or file)
- Background worker: Retry sending to audit service
- Admin action: Proceeds successfully (audit is important but non-blocking)
- Alert: DevOps team notified of audit service degradation

---

### Non-Functional Characteristics

**Security:**

- **MFA Required**: All admin accounts must enable multi-factor authentication
- **Session Timeout**: Admin sessions expire after 1 hour (shorter than learner sessions)
- **IP Whitelisting**: Optional restriction of admin access to specific IP ranges
- **Audit Logging**: Every admin action logged with timestamp, IP, user agent
- **Role Separation**: Fine-grained permissions (not all admins have all privileges)

**Performance:**

- **Dashboard Load**: < 1 second for cached data, < 5 seconds for fresh aggregation
- **User List Query**: < 500ms for 50 users with filters
- **Task List Query**: < 300ms for 20 tasks
- **Analytics Report**: < 10 seconds for 30-day summary

**Usability:**

- **Confirmation Dialogs**: Destructive actions (delete, deactivate) require confirmation
- **Undo Capability**: Recent actions (last 5 minutes) can be undone where applicable
- **Keyboard Shortcuts**: Power users can navigate with keyboard (Ctrl+K command palette)
- **Responsive Design**: Admin panel works on tablets (1024px width minimum)

**Auditability:**

- **Complete Audit Trail**: Every modification tracked with who/what/when/why
- **Tamper-Proof Logs**: Audit logs stored in append-only service
- **Retention**: Audit logs retained for 7 years (compliance requirement)
- **Search & Filter**: Audit logs searchable by admin, action type, date range

---

### Database Schema Impact

**Tables Queried (Read Operations)**:

1. **Users**: User management queries
2. **Submissions**: Analytics, user activity
3. **Tasks**: Task library management
4. **Tracks**: Learning track configuration
5. **AIAnalysis**: AI performance metrics
6. **FeedbackRatings**: Quality metrics
7. **AuditLogs**: Historical action review

**Tables Modified (Write Operations)**:

1. **Users**: Role changes, status updates
2. **Tasks**: CRUD operations
3. **Tracks**: Configuration updates
4. **TaskPrerequisites**: Dependency management
5. **TaskSkills**: Skill category associations
6. **AuditLogs**: All admin action logging

**Indexes Critical for Admin Performance**:

- `Users.Role` (admin filtering)
- `Users.AccountStatus` (status filtering)
- `Users.CreatedAt` (sorting)
- `Tasks.TrackId` (track filtering)
- `Tasks.IsPublished` (published/draft filtering)
- `Submissions.CreatedAt` (analytics time ranges)
- `AuditLogs.AdminId_Timestamp` (audit trail queries)

---

### Integration Points Summary

| External System | Interaction Type | Purpose | Error Handling |
| --- | --- | --- | --- |
| SQL Server | Read/Write | All CRUD operations | Transaction rollback, retry |
| Redis Cache | Read/Write | Dashboard caching, config storage | Fallback to database |
| Audit Log Service | Write (append) | Tamper-proof action logging | Local queue fallback |
| Analytics Aggregation | Invoke | Complex metric computation | Cached/stale data fallback |
| Azure App Insights | Telemetry | Admin action tracking | Best-effort logging |
| Notification Service | HTTP POST | Email notifications to users | Queue for retry |
| Blob Storage | Write | Report exports, backups | Retry with backoff |

---

### Alignment with Activity Diagram 4.4.7

This sequence diagram directly implements the workflow defined in **Activity Diagram 4.4.7: Admin Task & Analytics Management**:

- **Phase 1** corresponds to "Admin Login" and "Dashboard Load" activities
- **Phase 2** implements "View Dashboard Metrics" activity
- **Phase 3** implements "Manage Users" activity with edit/deactivate flows
- **Phase 4** implements "Manage Tasks" activity including CRUD operations
- **Phase 5** implements "Configure Learning Tracks" activity
- **Phase 6** implements "View Analytics" and "Export Report" activities
- **Error handling** matches exception branches in activity diagram
- **Authorization checks** align with "Validate Permissions" decision nodes

---

### Academic Rigor and Standards Compliance

This sequence diagram adheres to:

- **UML 2.5 Specification**: Correct use of lifelines, synchronous messages, fragments (alt, opt, par)
- **REST API Best Practices**: Proper HTTP verbs (GET, POST, PUT, DELETE), status codes (200, 201, 400, 401, 403, 404, 409)
- **RBAC Implementation**: Fine-grained permission checking at every protected endpoint
- **Audit Logging Standards**: Complete who/what/when/why tracking for compliance (SOC 2, ISO 27001)
- **Secure Admin Patterns**: MFA enforcement, session timeout, IP restrictions
- **Separation of Concerns**: Clear boundaries between presentation, business logic, data access
- **IEEE 29148-2018**: Requirements traceability to FR-ADMIN specifications

## **4.7 Data Flow Diagrams (DFD)**

### **4.7.1 Overview**

The **Data Flow Diagrams (DFDs)** illustrate how data moves through the AI-Powered Learning & Code Review Platform.

DFDs represent the system from a functional perspective, showing how information is processed, stored, and exchanged with external entities.

**Objectives of Using DFDs**

| Objective | Description |
| --- | --- |
| Process Decomposition | Break complex operations into understandable functional steps |
| Data Store Identification | Highlight where data is stored and how processes use it |
| Information Flow Mapping | Show how user input transforms into system output |
| Integration Visibility | Identify touchpoints between internal processes and external services |
| Requirements Validation | Ensure that all functional requirements have corresponding processes |

### **4.7.2 DFD Hierarchy**

The system follows a **three-level hierarchical decomposition**, allowing progressive detail exposure:

| DFD Level | Scope | Purpose | Processes Included |
| --- | --- | --- | --- |
| Level 0 | Entire System | Matches Context Diagram | Single process (0.0 Platform) |
| Level 1 | Major Subsystems | Exposes top-level architecture | 6 processes |
| Level 2 | Complex Sub-Processes | Deep decomposition of key processes | 3.1–3.7 and 4.1–4.4 |

### **4.7.4 Level 0 DFD – Context-Level Overview**

This Level 0 DFD is functionally identical to the **Context Diagram**.

It treats the entire platform as a single process interacting with external entities.

**Level 0 Simplified**

```
@startuml
title Level 0 DFD – System Context

actor "Learner" as Learner
actor "Administrator" as Admin
actor "GitHub" as GitHub
actor "LLM Provider" as LLM
actor "Email Service" as Email
actor "Azure Cloud" as Azure

circle "0.0\nAI-Powered Learning & Code Review Platform" as System

Learner --> System : Credentials, Assessments, Submissions
System --> Learner : Tokens, Learning Path, Feedback

Admin --> System : Task/User Management, Analytics Requests
System --> Admin : Dashboards, Reports, Audit Logs

System --> GitHub : OAuth, Repo Requests
GitHub --> System : Tokens, Source Code

System --> LLM : Code + Context
LLM --> System : AI Feedback (JSON)

System --> Email : Notifications
Email --> System : Delivery Status

System --> Azure : Storage, Queue Jobs, Telemetry
Azure --> System : SAS URLs, Triggers, Cached Data

@enduml

```

### **4.7.5 Level 1 DFD – Major Subsystem Decomposition**

This level breaks the main system into **six functional subsystems**, each represented as a process.

**4.9.5.1 Level 1 Processes**

| Process ID | Name | Purpose |
| --- | --- | --- |
| 1.0 | Authenticate & Manage Users | Registration, login, role checks, session management |
| 2.0 | Assess Skills & Generate Path | Adaptive assessments + personalized learning paths |
| 3.0 | Process Code Submissions | Code ingestion, static analysis, AI analysis |
| 4.0 | Deliver Feedback & Recommendations | Unified feedback reports + task recommendations |
| 5.0 | Manage Community Platform | Discussions, answers, votes, reputation updates |
| 6.0 | Administer System & Analytics | CRUD tasks, user management, analytics, audits |

**4.7.5.2 Data Stores Introduced at Level 1**

| ID | Data Store | Description |
| --- | --- | --- |
| D1 | Users | Accounts, roles, subscription status |
| D2 | Assessments | Assessment sessions & responses |
| D3 | Learning Paths | Paths assigned per user |
| D4 | Tasks | Task definitions & metadata |
| D5 | Submissions | Code submissions metadata |
| D6 | Static Analysis | Tool outputs (ESLint, SonarQube…) |
| D7 | AI Analysis | AI structured feedback |
| D8 | Recommendations | Suggested tasks & resources |
| D9 | Community Posts | Q&A content, votes, answers |
| D10 | Audit Logs | Admin actions history |

**4.7.5.3 Level 1 DFD (Cleaned & Simplified)**

Note:

Compared to your original, this version is **clearer**, **less dense**, and **better balanced**, while keeping the same content.

```
@startuml 
title Level 1 DFD – Major Subsystem Decomposition 
 
actor Learner 
actor Admin 
actor GitHub 
actor LLM 
actor Email 
actor Azure 
 
storage D1 
storage D2 
storage D3 
storage D4 
storage D5 
storage D6 
storage D7 
storage D8 
storage D9 
storage D10 
 
circle "1.0 Authenticate\n& Manage Users" as P1
circle "2.0 Assess Skills\n& Generate Path" as P2
circle "3.0 Process Code\nSubmissions" as P3
circle "4.0 Deliver Feedback\n& Recommendations" as P4
circle "5.0 Manage Community" as P5
circle "6.0 Administer System\n& Analytics" as P6
 
' Learner 
Learner --> P1 : Credentials, OAuth 
P1 --> Learner : JWT Tokens 
Learner --> P2 : Assessment Start 
Learner --> P3 : Code Submission 
Learner --> P4 : View Feedback 
Learner --> P5 : Posts, Answers, Votes 
 
' Admin 
Admin --> P6 : Admin Actions 
P6 --> Admin : Reports, Audit Logs 
 
' GitHub/LLM/Email/Azure 
P1 --> Email : Verification Email 
P3 --> GitHub : Repo Request 
P3 --> LLM : AI Request 
P3 --> Azure : Queue Job 
P4 --> Email : Feedback Ready 
 
' Data Stores 
P1 <--> D1 
P2 <--> D2 
P2 <--> D3 
P2 <--> D4 
P3 <--> D5 
P3 <--> D6 
P3 <--> D7 
P4 <--> D8 
P5 <--> D9 
P6 <--> D10 
 
@enduml
```

### **4.7.6 Level 1 Process Explanations**

Each process below is summarized **professionally**, aligned with your architecture.

**Process 1.0 — Authenticate & Manage Users**

**Responsibilities**

- Registration
- Email/password authentication
- GitHub OAuth
- Session/Cookie/JWT management
- Profile updates
- Password reset
- Role & subscription management

**Primary Data Stores**: D1 (Users)

**Process 2.0 — Assess Skills & Generate Learning Path**

**Responsibilities**

- Deliver adaptive assessments
- Score user responses
- Determine skill level
- Generate personalized learning path

**Primary Data Stores**: D2, D3, D4

**Process 3.0 — Process Code Submissions**

**Responsibilities**

- Accept GitHub/ZIP submissions
- Queue asynchronous jobs
- Static analysis (ESLint, SonarQube, Bandit)
- AI analysis via Python microservice
- Store results and notify learner

**Primary Data Stores**: D5, D6, D7

**Process 4.0 — Deliver Feedback & Recommendations**

**Responsibilities**

- Aggregate static + AI analysis
- Generate improvement recommendations
- Provide curated external resources

**Primary Data Stores**: D8, D4, D6, D7

**Process 5.0 — Manage Community Platform**

**Responsibilities**

- Q&A discussions
- Voting system
- Reputation scoring
- Moderation support

**Primary Data Stores**: D9

**Process 6.0 — Administer System & Analytics**

**Responsibilities**

- CRUD on users, tasks
- Analytics reporting
- Audit logging
- Moderation actions

**Primary Data Stores**: D10 + analytical access to D1, D5, D7

### **4.7.7 Level 2 DFD – Detailed Process Decomposition**

**Important Improvement:**

I kept **all your original logic**, but reorganized it into neat, readable, academically structured subsections.

We provide Level 2 diagrams for:

- **Process 3.0** (most complex)
- **Process 4.0** (feedback generation)

**4.7.7.1 Level 2 – Process 3.0: Code Submission Pipeline**

**Sub-Process Overview**

| **ID** | **Sub-Process Name** |
| --- | --- |
| 3.1 | Ingest Submission |
| 3.2 | Enqueue Background Job |
| 3.3 | Retrieve Code |
| 3.4 | Execute Static Analysis |
| 3.5 | Invoke AI Analysis |
| 3.6 | Aggregate Results |
| 3.7 | Store & Notify |

**Level 2**

```
@startuml 
title Level 2 DFD – 3.0 Process Code Submissions 
 
actor Learner 
actor GitHub 
actor Azure 
actor LLM 
 
storage D4 
storage D5 
storage D6 
storage D7 
 
circle "3.1 Ingest Submission" as P31
circle "3.2 Enqueue Job" as P32
circle "3.3 Retrieve Code" as P33
circle "3.4 Static Analysis" as P34
circle "3.5 AI Analysis" as P35
circle "3.6 Aggregate Results" as P36
circle "3.7 Store & Notify" as P37
 
' Ingest 
Learner --> P31 : GitHub URL / ZIP Upload 
P31 <--> D4 : Validate Task 
P31 --> D5 : Create Submission (Pending) 
P31 --> P32 : Validated Metadata 
 
' Enqueue 
P32 --> Azure : Queue Message 
P32 --> D5 : Update Status (Queued) 
 
' Retrieve Code 
Azure --> P33 : Job Trigger 
P33 --> GitHub : Clone Repo 
P33 --> Azure : Download ZIP 
P33 --> P34 : Code Directory 
P33 --> D5 : Update Status (Processing) 
 
' Static Analysis 
P34 --> Azure : Run ESLint/Sonar/Bandit 
Azure --> P34 : Tool Outputs 
P34 --> D6 : Store Static Results 
P34 --> P35 : Analysis Summary 
 
' AI Analysis 
P35 --> LLM : AI Request (Code + Summary) 
LLM --> P35 : AI Feedback 
P35 --> D7 : Store AI Results 
P35 --> P36 : AI Complete 
 
' Aggregation 
P36 <--> D6 
P36 <--> D7 
P36 --> P37 : Aggregated Feedback 
 
' Store & Notify 
P37 --> D5 : Mark Completed 
P37 --> Azure : Notify User 
P37 --> Learner : Feedback Ready 
 
@enduml
```

## **4.8 Database Design**

```
@startuml
!define Table(name,desc) class name as "desc" << (T,#FFAAAA) >>
!define primary_key(x) <b><u>x</u></b>
!define foreign_key(x) <i>x</i>
!define unique(x) <color:blue>x</color>

skinparam linetype ortho
skinparam class {
    BackgroundColor<<T>> LightYellow
    BorderColor Black
    ArrowColor Black
}

' ============================================
' DOMAIN 1: USER & AUTHENTICATION
' ============================================

class Users {
  primary_key(UserId) : UNIQUEIDENTIFIER
  unique(Email) : NVARCHAR(256)
  PasswordHash : NVARCHAR(MAX)
  FullName : NVARCHAR(200)
  Role : VARCHAR(20)
  AccountStatus : VARCHAR(20)
  EmailVerified : BIT
  MFAEnabled : BIT
  MFASecret : NVARCHAR(255)
  FailedLoginAttempts : INT
  LastFailedLoginAt : DATETIME2
  LockoutEnd : DATETIME2
  LastLoginAt : DATETIME2
  LastLoginIP : NVARCHAR(50)
  CreatedAt : DATETIME2
  CreatedVia : VARCHAR(20)
  ModifiedAt : DATETIME2
  foreign_key(ModifiedBy) : UNIQUEIDENTIFIER
}

class RefreshTokens {
  primary_key(RefreshTokenId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  unique(Token) : NVARCHAR(512)
  ExpiresAt : DATETIME2
  CreatedAt : DATETIME2
  CreatedByIP : NVARCHAR(50)
  RevokedAt : DATETIME2
  RevokedByIP : NVARCHAR(50)
  ReplacedByToken : NVARCHAR(512)
}

class OAuthProviders {
  primary_key(OAuthProviderId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  ProviderName : VARCHAR(50)
  ProviderUserId : NVARCHAR(255)
  ProviderUsername : NVARCHAR(255)
  AccessToken : NVARCHAR(MAX)
  RefreshToken : NVARCHAR(MAX)
  TokenExpiresAt : DATETIME2
  AvatarUrl : NVARCHAR(500)
  ProfileData : NVARCHAR(MAX)
  CreatedAt : DATETIME2
  UpdatedAt : DATETIME2
}
note right of OAuthProviders : UNIQUE(UserId, ProviderName)

' ============================================
' DOMAIN 2: ASSESSMENTS & SKILL PROFILING
' ============================================

class Tracks {
  primary_key(TrackId) : UNIQUEIDENTIFIER
  unique(TrackName) : NVARCHAR(100)
  Description : NVARCHAR(1000)
  Level : VARCHAR(20)
  IsActive : BIT
  CreatedAt : DATETIME2
  foreign_key(CreatedBy) : UNIQUEIDENTIFIER
}

class Questions {
  primary_key(QuestionId) : UNIQUEIDENTIFIER
  foreign_key(TrackId) : UNIQUEIDENTIFIER
  Category : VARCHAR(50)
  Topic : VARCHAR(100)
  Difficulty : INT
  QuestionText : NVARCHAR(1000)
  OptionsJSON : NVARCHAR(MAX)
  CorrectOption : CHAR(1)
  Explanation : NVARCHAR(1000)
  Points : INT
  IsActive : BIT
  CreatedAt : DATETIME2
  foreign_key(CreatedBy) : UNIQUEIDENTIFIER
}

class Assessments {
  primary_key(AssessmentId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(TrackId) : UNIQUEIDENTIFIER
  Status : VARCHAR(20)
  StartedAt : DATETIME2
  CompletedAt : DATETIME2
  Duration : INT
  OverallScore : DECIMAL(5,2)
  SkillLevel : VARCHAR(20)
  CategoryScoresJSON : NVARCHAR(MAX)
  CreatedAt : DATETIME2
}

class AssessmentAnswers {
  primary_key(AnswerId) : UNIQUEIDENTIFIER
  foreign_key(AssessmentId) : UNIQUEIDENTIFIER
  foreign_key(QuestionId) : UNIQUEIDENTIFIER
  SelectedOption : CHAR(1)
  IsCorrect : BIT
  TimeSpent : INT
  Category : VARCHAR(50)
  Topic : VARCHAR(100)
  CreatedAt : DATETIME2
}

class UserSkills {
  primary_key(UserSkillId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  SkillCategory : VARCHAR(50)
  Score : DECIMAL(5,2)
  Level : VARCHAR(20)
  LastUpdated : DATETIME2
}
note right of UserSkills : UNIQUE(UserId, SkillCategory)

' ============================================
' DOMAIN 3: LEARNING PATHS & TASKS
' ============================================

class LearningPaths {
  primary_key(LearningPathId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(TrackId) : UNIQUEIDENTIFIER
  SkillLevel : VARCHAR(20)
  TotalTasks : INT
  CompletedTasks : INT
  CurrentTaskIndex : INT
  CompletionPercentage : DECIMAL(5,2)
  IsActive : BIT
  Version : INT
  CreatedAt : DATETIME2
  UpdatedAt : DATETIME2
  CompletedAt : DATETIME2
  ArchivedAt : DATETIME2
}

class Tasks {
  primary_key(TaskId) : UNIQUEIDENTIFIER
  foreign_key(TrackId) : UNIQUEIDENTIFIER
  Title : NVARCHAR(200)
  Description : NVARCHAR(2000)
  DetailedInstructions : NVARCHAR(MAX)
  Difficulty : VARCHAR(20)
  EstimatedDuration : INT
  ExpectedLanguage : VARCHAR(50)
  RequiredFiles : NVARCHAR(MAX)
  StarterCode : NVARCHAR(MAX)
  TestCases : NVARCHAR(MAX)
  ReferenceSolution : NVARCHAR(MAX)
  EvaluationCriteria : NVARCHAR(MAX)
  LearningObjectives : NVARCHAR(MAX)
  ImpactScore : INT
  IsPublished : BIT
  Status : VARCHAR(20)
  Version : INT
  foreign_key(PreviousVersionId) : UNIQUEIDENTIFIER
  OrderIndex : INT
  CreatedAt : DATETIME2
  foreign_key(CreatedBy) : UNIQUEIDENTIFIER
  ModifiedAt : DATETIME2
  foreign_key(ModifiedBy) : UNIQUEIDENTIFIER
  ArchivedAt : DATETIME2
  foreign_key(ArchivedBy) : UNIQUEIDENTIFIER
}

class TaskSkills {
  primary_key(TaskSkillId) : UNIQUEIDENTIFIER
  foreign_key(TaskId) : UNIQUEIDENTIFIER
  SkillCategory : VARCHAR(50)
}
note right of TaskSkills : UNIQUE(TaskId, SkillCategory)

class TaskPrerequisites {
  primary_key(PrerequisiteId) : UNIQUEIDENTIFIER
  foreign_key(TaskId) : UNIQUEIDENTIFIER
  foreign_key(PrerequisiteTaskId) : UNIQUEIDENTIFIER
}
note right of TaskPrerequisites : UNIQUE(TaskId, PrerequisiteTaskId)\\nCHECK (TaskId != PrerequisiteTaskId)

class TaskResources {
  primary_key(ResourceId) : UNIQUEIDENTIFIER
  foreign_key(TaskId) : UNIQUEIDENTIFIER
  Title : NVARCHAR(200)
  Url : NVARCHAR(1000)
  Type : VARCHAR(50)
  Relevance : INT
  CreatedAt : DATETIME2
}

class PathTasks {
  primary_key(PathTaskId) : UNIQUEIDENTIFIER
  foreign_key(LearningPathId) : UNIQUEIDENTIFIER
  foreign_key(TaskId) : UNIQUEIDENTIFIER
  OrderIndex : INT
  Status : VARCHAR(20)
  AddedAt : DATETIME2
  Source : VARCHAR(50)
  CompletedAt : DATETIME2
}
note right of PathTasks : UNIQUE(LearningPathId, OrderIndex)

' ============================================
' DOMAIN 4: CODE SUBMISSIONS & ANALYSIS
' ============================================

class Submissions {
  primary_key(SubmissionId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(TaskId) : UNIQUEIDENTIFIER
  SubmissionType : VARCHAR(20)
  RepositoryUrl : NVARCHAR(500)
  Branch : NVARCHAR(100)
  BlobUrl : NVARCHAR(1000)
  Status : VARCHAR(20)
  FinalScore : INT
  Grade : VARCHAR(20)
  FeedbackAvailable : BIT
  IsResubmission : BIT
  RetryCount : INT
  CreatedAt : DATETIME2
  ProcessingStartedAt : DATETIME2
  ProcessingCompletedAt : DATETIME2
  ProcessingTime : INT
  ErrorDetails : NVARCHAR(MAX)
  UpdatedAt : DATETIME2
}

class StaticAnalysis {
  primary_key(StaticAnalysisId) : UNIQUEIDENTIFIER
  foreign_key(SubmissionId) : UNIQUEIDENTIFIER
  ToolName : VARCHAR(50)
  ToolVersion : VARCHAR(50)
  ExecutionTime : INT
  IssuesFound : INT
  Severity : VARCHAR(20)
  ResultJSON : NVARCHAR(MAX)
  MaintainabilityScore : INT
  SecurityScore : INT
  StyleScore : INT
  CompletedAt : DATETIME2
  Status : VARCHAR(20)
}

class AIAnalysis {
  primary_key(AIAnalysisId) : UNIQUEIDENTIFIER
  foreign_key(SubmissionId) : UNIQUEIDENTIFIER
  ModelProvider : VARCHAR(50)
  ModelVersion : VARCHAR(50)
  OverallScore : INT
  ScoresJSON : NVARCHAR(MAX)
  StrengthsJSON : NVARCHAR(MAX)
  WeaknessesJSON : NVARCHAR(MAX)
  RecommendationsJSON : NVARCHAR(MAX)
  DetailedFeedback : NVARCHAR(MAX)
  TokensUsed : INT
  ExecutionTime : INT
  Status : VARCHAR(20)
  ErrorMessage : NVARCHAR(1000)
  CompletedAt : DATETIME2
}

class Feedback {
  primary_key(FeedbackId) : UNIQUEIDENTIFIER
  unique(foreign_key(SubmissionId)) : UNIQUEIDENTIFIER
  foreign_key(StaticAnalysisId) : UNIQUEIDENTIFIER
  foreign_key(AIAnalysisId) : UNIQUEIDENTIFIER
  OverallScore : INT
  Grade : VARCHAR(20)
  CategoryScoresJSON : NVARCHAR(MAX)
  AggregatedFeedbackJSON : NVARCHAR(MAX)
  AverageRating : DECIMAL(3,2)
  RatingCount : INT
  LastRatedAt : DATETIME2
  CreatedAt : DATETIME2
}

class FeedbackRatings {
  primary_key(RatingId) : UNIQUEIDENTIFIER
  foreign_key(FeedbackId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  Rating : INT
  Comment : NVARCHAR(500)
  CategoryRatings : NVARCHAR(MAX)
  CreatedAt : DATETIME2
}
note right of FeedbackRatings : UNIQUE(FeedbackId, UserId)

class Recommendations {
  primary_key(RecommendationId) : UNIQUEIDENTIFIER
  foreign_key(SubmissionId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(TaskId) : UNIQUEIDENTIFIER
  Reason : NVARCHAR(500)
  Priority : INT
  Status : VARCHAR(20)
  AcceptedAt : DATETIME2
  CreatedAt : DATETIME2
}

' ============================================
' DOMAIN 5: PROGRESS & GAMIFICATION
' ============================================

class UserProgress {
  primary_key(UserProgressId) : UNIQUEIDENTIFIER
  unique(foreign_key(UserId)) : UNIQUEIDENTIFIER
  TotalSubmissions : INT
  CompletedSubmissions : INT
  AverageScore : DECIMAL(5,2)
  CurrentStreak : INT
  LongestStreak : INT
  TotalXP : INT
  Level : INT
  LastActivityAt : DATETIME2
  UpdatedAt : DATETIME2
}

class Badges {
  primary_key(BadgeId) : UNIQUEIDENTIFIER
  unique(BadgeName) : NVARCHAR(100)
  Description : NVARCHAR(500)
  IconUrl : NVARCHAR(500)
  Category : VARCHAR(50)
  Criteria : NVARCHAR(MAX)
  Points : INT
  IsActive : BIT
  CreatedAt : DATETIME2
}

class UserAchievements {
  primary_key(UserAchievementId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(BadgeId) : UNIQUEIDENTIFIER
  UnlockedAt : DATETIME2
  NotificationSent : BIT
}
note right of UserAchievements : UNIQUE(UserId, BadgeId)

class Leaderboards {
  primary_key(LeaderboardId) : UNIQUEIDENTIFIER
  LeaderboardType : VARCHAR(50)
  foreign_key(TrackId) : UNIQUEIDENTIFIER
  Period : DATE
  RankingsJSON : NVARCHAR(MAX)
  GeneratedAt : DATETIME2
}

' ============================================
' DOMAIN 6: COMMUNITY FEATURES
' ============================================

class Posts {
  primary_key(PostId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  PostType : VARCHAR(20)
  Title : NVARCHAR(200)
  Content : NVARCHAR(MAX)
  Tags : NVARCHAR(500)
  ViewCount : INT
  UpvoteCount : INT
  DownvoteCount : INT
  AnswerCount : INT
  foreign_key(AcceptedAnswerId) : UNIQUEIDENTIFIER
  Status : VARCHAR(20)
  CreatedAt : DATETIME2
  UpdatedAt : DATETIME2
  foreign_key(EditedBy) : UNIQUEIDENTIFIER
}

class Answers {
  primary_key(AnswerId) : UNIQUEIDENTIFIER
  foreign_key(PostId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  Content : NVARCHAR(MAX)
  UpvoteCount : INT
  DownvoteCount : INT
  IsAccepted : BIT
  Status : VARCHAR(20)
  CreatedAt : DATETIME2
  UpdatedAt : DATETIME2
  foreign_key(EditedBy) : UNIQUEIDENTIFIER
}

class Comments {
  primary_key(CommentId) : UNIQUEIDENTIFIER
  ParentType : VARCHAR(20)
  ParentId : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  Content : NVARCHAR(1000)
  UpvoteCount : INT
  Status : VARCHAR(20)
  CreatedAt : DATETIME2
}
note right of Comments : Polymorphic:\\nParentType ∈ {Post, Answer}

class Votes {
  primary_key(VoteId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  TargetType : VARCHAR(20)
  TargetId : UNIQUEIDENTIFIER
  VoteType : VARCHAR(10)
  CreatedAt : DATETIME2
}
note right of Votes : UNIQUE(UserId, TargetType, TargetId)\\nPolymorphic:\\nTargetType ∈ {Post, Answer, Comment}

class Reports {
  primary_key(ReportId) : UNIQUEIDENTIFIER
  foreign_key(ReportedBy) : UNIQUEIDENTIFIER
  TargetType : VARCHAR(20)
  TargetId : UNIQUEIDENTIFIER
  Reason : VARCHAR(100)
  Description : NVARCHAR(1000)
  Status : VARCHAR(20)
  foreign_key(ReviewedBy) : UNIQUEIDENTIFIER
  ReviewedAt : DATETIME2
  Resolution : NVARCHAR(500)
  CreatedAt : DATETIME2
}
note right of Reports : Polymorphic:\\nTargetType ∈ {Post, Answer, Comment}

' ============================================
' DOMAIN 7: ADMINISTRATIVE & ANALYTICS
' ============================================

class AdminAuditLogs {
  primary_key(AuditLogId) : UNIQUEIDENTIFIER
  foreign_key(AdminUserId) : UNIQUEIDENTIFIER
  Action : VARCHAR(50)
  EntityType : VARCHAR(50)
  EntityId : UNIQUEIDENTIFIER
  ChangeDetails : NVARCHAR(MAX)
  IpAddress : NVARCHAR(50)
  UserAgent : NVARCHAR(500)
  Timestamp : DATETIME2
}
note right of AdminAuditLogs : Append-only (immutable)

class PathRecalculationLogs {
  primary_key(RecalculationLogId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(OldPathId) : UNIQUEIDENTIFIER
  foreign_key(NewPathId) : UNIQUEIDENTIFIER
  Reason : VARCHAR(100)
  ChangeSummary : NVARCHAR(MAX)
  CreatedAt : DATETIME2
}

class ResourceAccessLogs {
  primary_key(AccessLogId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  foreign_key(ResourceId) : UNIQUEIDENTIFIER
  foreign_key(SubmissionId) : UNIQUEIDENTIFIER
  AccessedAt : DATETIME2
}

class UserSessions {
  primary_key(SessionId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  unique(SessionToken) : NVARCHAR(512)
  IpAddress : NVARCHAR(50)
  UserAgent : NVARCHAR(500)
  SessionDurationMinutes : INT
  CreatedAt : DATETIME2
  ExpiresAt : DATETIME2
  LastActivityAt : DATETIME2
  TerminatedAt : DATETIME2
}

class Notifications {
  primary_key(NotificationId) : UNIQUEIDENTIFIER
  foreign_key(UserId) : UNIQUEIDENTIFIER
  Type : VARCHAR(50)
  Title : NVARCHAR(200)
  Message : NVARCHAR(1000)
  ActionUrl : NVARCHAR(500)
  IsRead : BIT
  ReadAt : DATETIME2
  CreatedAt : DATETIME2
}

class SystemConfiguration {
  primary_key(ConfigId) : UNIQUEIDENTIFIER
  unique(ConfigKey) : VARCHAR(100)
  ConfigValue : NVARCHAR(MAX)
Description : NVARCHAR(500)
Category : VARCHAR(50)
IsEncrypted : BIT
UpdatedAt : DATETIME2
foreign_key(UpdatedBy) : UNIQUEIDENTIFIER
}
' ============================================
' RELATIONSHIPS
' ============================================
' Domain 1: User & Authentication
Users "1" -- "0.." RefreshTokens : has
Users "1" -- "0.." OAuthProviders : links
Users "1" -- "0..*" Users : modifies (ModifiedBy)
' Domain 2: Assessments & Skill Profiling
Users "1" -- "0.." Assessments : takes
Tracks "1" -- "0.." Assessments : defines
Tracks "1" -- "0.." Questions : contains
Assessments "1" -- "30" AssessmentAnswers : has
Questions "1" -- "0.." AssessmentAnswers : answered_in
Users "1" -- "0..*" UserSkills : develops
' Domain 3: Learning Paths & Tasks
Users "1" -- "0.." LearningPaths : owns
Tracks "1" -- "0.." LearningPaths : guides
Tracks "1" -- "0.." Tasks : organizes
Tasks "1" -- "0.." TaskSkills : develops
Tasks "1" -- "0.." TaskPrerequisites : requires (TaskId)
Tasks "1" -- "0.." TaskPrerequisites : prerequisite_for (PrerequisiteTaskId)
Tasks "1" -- "0.." TaskResources : links_to
LearningPaths "1" -- "0.." PathTasks : contains
Tasks "1" -- "0..*" PathTasks : included_in
Tasks "1" -- "0..1" Tasks : versioned_from (PreviousVersionId)
' Domain 4: Code Submissions & Analysis
Users "1" -- "0.." Submissions : submits
Tasks "1" -- "0.." Submissions : receives
Submissions "1" -- "0.." StaticAnalysis : analyzed_by
Submissions "1" -- "0.." AIAnalysis : reviewed_by
Submissions "1" -- "1" Feedback : generates
StaticAnalysis "0..1" -- "0.." Feedback : contributes_to
AIAnalysis "0..1" -- "0.." Feedback : contributes_to
Feedback "1" -- "0.." FeedbackRatings : rated_by
Users "1" -- "0.." FeedbackRatings : rates
Submissions "1" -- "0.." Recommendations : generates
Users "1" -- "0.." Recommendations : receives
Tasks "1" -- "0..*" Recommendations : recommends
' Domain 5: Progress & Gamification
Users "1" -- "1" UserProgress : tracks
Users "1" -- "0.." UserAchievements : earns
Badges "1" -- "0.." UserAchievements : earned_by
Tracks "0..1" -- "0..*" Leaderboards : scopes
' Domain 6: Community Features
Users "1" -- "0.." Posts : authors
Users "1" -- "0.." Answers : writes
Posts "1" -- "0.." Answers : has
Posts "0..1" -- "0..1" Answers : accepts (AcceptedAnswerId)
Users "1" -- "0.." Comments : writes
Users "1" -- "0.." Votes : casts
Users "1" -- "0.." Reports : reports (ReportedBy)
Users "0..1" -- "0..*" Reports : reviews (ReviewedBy)
' Domain 7: Administrative & Analytics
Users "1" -- "0.." AdminAuditLogs : performs
Users "1" -- "0.." PathRecalculationLogs : triggers
LearningPaths "0..1" -- "0.." PathRecalculationLogs : old_version (OldPathId)
LearningPaths "1" -- "0.." PathRecalculationLogs : new_version (NewPathId)
Users "1" -- "0.." ResourceAccessLogs : accesses
TaskResources "1" -- "0.." ResourceAccessLogs : accessed_via
Submissions "0..1" -- "0.." ResourceAccessLogs : context
Users "1" -- "0.." UserSessions : establishes
Users "1" -- "0.." Notifications : receives
Users "0..1" -- "0.." SystemConfiguration : updates
' Cross-Domain: Administrative Authorship
Users "1" -- "0.." Tracks : creates (CreatedBy)
Users "1" -- "0.." Tasks : creates (CreatedBy)
Users "0..1" -- "0.." Tasks : modifies (ModifiedBy)
Users "0..1" -- "0.." Tasks : archives (ArchivedBy)
Users "1" -- "0.." Questions : creates (CreatedBy)
Users "0..1" -- "0.." Posts : edits (EditedBy)
Users "0..1" -- "0..*" Answers : edits (EditedBy)
@enduml

```