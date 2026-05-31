# 07 - Feature: AI Mentor Chat — RAG (F12)
> الحالة: ✅ مكتمل

---

## ملخص (للـ Presentation)

شات ذكي يفهم الكود **الخاص بك** — ليس نصائح عامة بل إجابات مبنية على ملفاتك الفعلية وتقرير المراجعة.

---

## كيف يعمل (RAG Pipeline)

```
User Question → Embed → Qdrant Search (top-k chunks) → Build Prompt → Stream Response
```

### Step 1: Embedding
- يُحوَّل السؤال إلى vector بـ `text-embedding-3-small` (1536-dim)

### Step 2: Retrieval (Qdrant)
- يبحث في Qdrant عن أقرب chunks مرتبطة بـ:
  - `scope`: "submission" أو "audit"
  - `scopeId`: ID الـ submission/audit المحددة
- يعود بـ top-k chunks (كود، feedback، metadata)

### Step 3: Context Building
- **RAG Mode**: إذا عدد الـ chunks ≥ minimum → يبني prompt مع الـ chunks
- **Raw Fallback**: إذا Qdrant فارغ/متوقف → يستخدم الـ feedback payload مباشرة

### Step 4: Streaming
- يستخدم OpenAI Responses API مع `stream=True`
- يرسل SSE events للـ Frontend token-by-token

---

## المكونات التقنية

| المكون | التقنية | الدور |
|--------|---------|-------|
| **Qdrant** | Vector DB (Docker) | تخزين embeddings الكود والـ feedback |
| **text-embedding-3-small** | OpenAI | تحويل النص لـ vectors |
| **GPT-5.1-codex-mini** | OpenAI | توليد الإجابات |
| **SSE (Server-Sent Events)** | HTTP | بث الإجابة token-by-token |
| **FastAPI** | Python | Streaming endpoint |

---

## System Prompt

```
"You are Code Mentor — a senior software engineer guiding a learner 
through the code they just submitted. Answer their follow-up question 
grounded in the retrieved code/feedback context. Cite specific file 
paths and line numbers when relevant. If the context doesn't contain 
the information needed, say so plainly rather than speculating."
```

---

## ما يميزه عن ChatGPT العادي

| ChatGPT العادي | Code Mentor Chat |
|---------------|-----------------|
| لا يعرف كودك | يعرف كل ملف رفعته |
| نصائح عامة | يشير لسطر محدد في ملفك |
| لا يعرف تقرير المراجعة | يقرأ الـ feedback ويشرحه |
| لا يعرف المهمة | يفهم context المهمة |

---

## الملفات المرجعية
- ✅ `ai-service/app/services/mentor_chat.py` — 359 سطر
- ✅ `ai-service/app/services/qdrant_repo.py` — Qdrant integration
- ✅ `docs/architecture.md` §6.10 — RAG pipeline
- ✅ `docs/decisions.md` — ADR-036 (F12 design)

---

## نقاط للعرض

### ✅ ركّز على:
- **المقارنة**: عام vs مخصص (ChatGPT vs Mentor Chat)
- **الـ Demo المباشر**: اسأل سؤال عن الكود المرفوع واعرض الإجابة
- **RAG Diagram**: Embed → Search → Augment → Generate
- **SSE Streaming**: الإجابة تظهر كلمة كلمة (تجربة premium)
