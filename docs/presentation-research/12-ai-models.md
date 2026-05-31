# 12 - AI Models & Prompt Engineering
> الحالة: ✅ مكتمل

---

## ملخص (للـ Presentation)

استخدام متطور للـ AI عبر **12+ endpoint** مع استراتيجية prompt engineering موحدة ونظام retry ذكي.

---

## النماذج المستخدمة

| النموذج | الاستخدام | التكلفة |
|---------|----------|---------|
| **GPT-5.1-codex-mini** | كل عمليات التوليد والمراجعة | الأساسي |
| **text-embedding-3-small** | Embeddings (1536-dim) | للـ RAG + Path recall |

---

## AI Endpoints (12+)

| # | Endpoint | الغرض | الطبقة |
|---|----------|-------|--------|
| 1 | `/api/review` | مراجعة كود (single-agent) | F6 |
| 2 | `/api/multi-review` | مراجعة كود (3 agents) | F13 |
| 3 | `/api/generate-questions` | توليد أسئلة MCQ | F15 |
| 4 | `/api/assessment-summary` | ملخص تقييم AI | F15 |
| 5 | `/api/irt/select-next` | اختيار سؤال IRT | F15 |
| 6 | `/api/irt/recalibrate` | إعادة معايرة IRT | F15 |
| 7 | `/api/generate-path` | توليد مسار تعلم | F16 |
| 8 | `/api/adapt-path` | تكيّف مسار | F16 |
| 9 | `/api/task-framing` | AI Framing للمهام | F16 |
| 10 | `/api/embed` | Embedding texts | F12/F16 |
| 11 | `/api/mentor-chat` | RAG chat (SSE) | F12 |
| 12 | `/api/audit` | Project Audit | F11 |
| 13 | `/api/generate-tasks` | توليد مهام | F16 |

---

## استراتيجية Prompt Engineering

### 1. Template-based Prompts
```
prompts/
├── generate_questions_v1.md
├── generate_path_v1.md
├── adapt_path_v1.md
├── assessment_summary_v1.md
├── agent_security.v1.txt
├── agent_performance.v1.txt
├── agent_architecture.v1.txt
└── ...
```
- كل prompt في ملف `.md` أو `.txt` منفصل
- يُحمّل ويُملأ بالمتغيرات عند الاستدعاء
- `{variables}` interpolation

### 2. Versioning
- كل prompt له `prompt_version` (مثال: `generate_questions_v1`)
- يُحفظ في DB مع كل نتيجة
- يسمح بالمقارنة بين versions في الـ thesis

### 3. Retry-with-Self-Correction
```
Attempt 1 → parse JSON → validate schema
  ↓ fail
Attempt 2 → original prompt + "RETRY: your error was: {error}"
  ↓ fail
Return 422 → backend falls back
```
- كل endpoint يتبع نفس النمط
- محاولة واحدة أو اثنتان إضافيتان
- لا يستمر في الحرق (token budget protection)

### 4. JSON Repair Pipeline
```
Raw response → strip code fences → parse JSON
  ↓ fail
Extract largest balanced {...} block → parse JSON
  ↓ fail
Retry with self-correction
```

### 5. Reasoning Effort Control (ADR-045)
```python
reasoning={"effort": "low"}
```
- GPT-5.1-codex-mini يستخدم reasoning budget
- بدون `effort: low` كان يستهلك كل الـ budget في reasoning ويعطي output فارغ
- `low` يترك أغلب الـ budget للـ visible JSON output

---

## التكلفة والـ Budgeting

| المقياس | القيمة |
|---------|--------|
| **Monthly budget** | $50 soft cap |
| **Per-learner cap** | $3/month |
| **Tracking** | `AIUsageLog` مع `Feature` column |
| **Per-endpoint tokens** | مسجل في كل response |

---

## نقاط للعرض

### ✅ ركّز على:
- **12+ AI endpoints** — ليس endpoint واحد بل منظومة كاملة
- **Prompt Versioning**: قابل للتكرار والمقارنة (research-grade)
- **Self-Correction**: ذكاء في التعامل مع أخطاء الـ AI
- **ADR-045**: حل مشكلة حقيقية (reasoning vs output budget)

### ❌ تجنّب:
- عرض الـ prompt الكامل (طويل ومملّ)
- تفاصيل JSON repair
