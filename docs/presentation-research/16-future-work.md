# 16 - Future Work & Limitations
> الحالة: ✅ مكتمل

---

## القيود الحالية (Limitations)

| القيد | الشرح |
|-------|-------|
| **Local-only deployment** | يعمل على docker-compose فقط — Azure deployment مؤجل لما بعد الدفاع |
| **IRT 2PL-lite** | نموذج مبسّط (لا 3PL, لا guessing parameter, لا Bayesian KT) |
| **تكلفة AI** | $50/month soft cap — لا يتحمل آلاف المستخدمين |
| **لغات محدودة** | 6 لغات فقط (لا Go, Rust, Swift, Kotlin...) |
| **Single OpenAI model** | معتمد على GPT-5.1-codex-mini — لا multi-model fallback |
| **No real-time collaboration** | لا يوجد pair programming أو live sessions |
| **Email verification** | موجود لكن لا يمنع الدخول (MVP decision) |

---

## التطوير المستقبلي (Future Work)

### المرحلة 1: Deployment & Scale
- [ ] **Azure deployment** — App Service + Azure SQL + ACR
- [ ] **CDN** — لتحسين أداء الـ Frontend عالمياً
- [ ] **Auto-scaling** — بناءً على عدد المستخدمين
- [ ] **CI/CD pipeline** — GitHub Actions → Azure

### المرحلة 2: AI Enhancement
- [ ] **3PL IRT** — إضافة guessing parameter
- [ ] **Bayesian Knowledge Tracing** — نموذج أعمق للمتعلم
- [ ] **Multi-model fallback** — GPT-4o + Claude كـ backup
- [ ] **Fine-tuned models** — تدريب نموذج مخصص للمراجعة
- [ ] **Per-question AI feedback** — ملاحظات على كل سؤال (أثناء التقييم)

### المرحلة 3: Content & Community
- [ ] **المزيد من اللغات** — Go, Rust, Swift, Kotlin
- [ ] **Community features** — مشاركة حلول, مراجعة بين المتعلمين (Peer review)
- [ ] **Gamification كاملة** — leaderboards, streaks, challenges
- [ ] **Job board integration** — ربط Learning CV مع منصات التوظيف
- [ ] **Mobile app** — تطبيق React Native

### المرحلة 4: Enterprise
- [ ] **Multi-tenancy** — مؤسسات تستخدم المنصة لتدريب موظفيها
- [ ] **Team dashboards** — مدير يرى تقدم فريقه
- [ ] **Custom task libraries** — مكتبات مهام خاصة بالشركة
- [ ] **SSO integration** — SAML, OpenID Connect

---

## Thesis Future Work
- **Evaluation study**: N=30+ controlled experiment comparing single vs multi-agent review quality
- **IRT upgrade**: 3PL model with production-grade item banking
- **RAG quality benchmark**: single-prompt baseline vs RAG-grounded chat accuracy
- **Curriculum generation evaluation**: expert panel rating of AI-generated paths

---

## نقاط للعرض

### ✅ ركّز على:
- **Limitations بصراحة**: يُظهر نضج علمي
- **Future Work واقعي**: لا وعود فارغة
- **Azure deferred**: اذكر أنه مخطط ومؤجل (ليس منسي)
- **Thesis chapters**: ربط بالبحث الأكاديمي
