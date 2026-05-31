# 10 - Architecture & Tech Stack
> الحالة: ✅ مكتمل

---

## ملخص (للـ Presentation)

نظام ثلاثي الطبقات يتبع **Clean Architecture** مع فصل كامل بين Frontend و Backend و AI Service.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│  TypeScript │ React 18 │ Redux Toolkit │ React Router v6        │
│  Axios │ React Query │ Framer Motion │ Recharts                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API (HTTPS)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (.NET 10 / C#)                         │
│  Clean Architecture:                                             │
│    Domain → Application → Infrastructure → Api                   │
│  ASP.NET Identity │ JWT (RS256) │ EF Core │ Hangfire            │
│  MediatR │ FluentValidation │ Serilog                           │
└────────┬──────────────────────┬─────────────────────────────────┘
         │ REST API             │ SQL + Qdrant
         ▼                     ▼
┌────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  AI Service        │  │  SQL Server      │  │  Qdrant         │
│  Python 3.14       │  │  (EF Core)       │  │  (Vector DB)    │
│  FastAPI           │  │  45+ tables      │  │  Embeddings     │
│  OpenAI API        │  │  Hangfire jobs   │  │  RAG chunks     │
│  scipy │ numpy     │  └──────────────────┘  └─────────────────┘
│  6 Static          │
│  Analyzers         │
└────────────────────┘
```

---

## الطبقات الأربعة (Clean Architecture)

### 1. Domain Layer (الأعمق)
- **Entities**: 45+ entity (Users, Assessments, Tasks, Questions, LearningPaths, Submissions, etc.)
- **Value Objects**: Score types, enums
- **لا تعتمد على أي شيء** — pure business logic

### 2. Application Layer
- **Use Cases**: كل عملية تجارية مغلفة
- **MediatR**: CQRS pattern (Commands + Queries)
- **FluentValidation**: تحقق من المدخلات
- **Interfaces**: العقود (لا تنفيذ)

### 3. Infrastructure Layer
- **EF Core**: ORM + Migrations
- **AIServiceClient**: HTTP client للـ AI Service
- **Identity**: ASP.NET Identity + JWT
- **Hangfire**: Background jobs
- **Qdrant Client**: Vector operations

### 4. API Layer (الأخارج)
- **Controllers**: REST endpoints
- **Middleware**: Auth, Error handling, Rate limiting
- **DI Container**: Dependency Injection configuration

---

## Tech Stack الكامل

### Frontend
| التقنية | الغرض |
|---------|-------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool (سريع جداً) |
| **Redux Toolkit** | State Management |
| **React Router v6** | Routing |
| **Axios** | HTTP Client |
| **Framer Motion** | Animations |
| **Recharts** | Charts & Graphs |
| **Prism.js** | Code Syntax Highlighting |

### Backend
| التقنية | الغرض |
|---------|-------|
| **.NET 10** | Runtime |
| **C#** | Language |
| **ASP.NET Core** | Web Framework |
| **Entity Framework Core** | ORM |
| **SQL Server** | Database |
| **Hangfire** | Background Jobs |
| **MediatR** | CQRS |
| **FluentValidation** | Input Validation |
| **ASP.NET Identity** | Auth |
| **JWT (RS256)** | Token Auth |
| **Serilog** | Structured Logging |
| **xUnit** | Unit Testing |

### AI Service
| التقنية | الغرض |
|---------|-------|
| **Python 3.14** | Runtime |
| **FastAPI** | Web Framework |
| **OpenAI API** | GPT-5.1-codex-mini |
| **text-embedding-3-small** | Embeddings (1536-dim) |
| **scipy.optimize** | IRT MLE |
| **numpy** | Linear algebra |
| **Pydantic** | Schema Validation |
| **Qdrant** | Vector Database |
| **pytest** | Testing |

### Infrastructure
| التقنية | الغرض |
|---------|-------|
| **Docker** | Containerization |
| **docker-compose** | Orchestration |
| **SQL Server** | Relational DB |
| **Qdrant** | Vector DB (RAG) |
| **Hangfire** | Job Scheduler |

---

## Background Jobs (Hangfire)

| Job | المحفز | ما يفعله |
|-----|--------|----------|
| `SubmissionAnalysisJob` | عند رفع كود | يشغّل Static Analysis + AI Review |
| `GenerateLearningPathJob` | بعد التقييم | يطلب مسار من AI Service |
| `GenerateAssessmentSummaryJob` | بعد التقييم | يطلب ملخص AI |
| `PathAdaptationJob` | Triggers | يطلب تكيّف المسار |
| `RecalibrateIRTJob` | Scheduled | يعيد معايرة أسئلة IRT |
| `EmbedEntityJob` | عند إنشاء Task/Question | يحسب embeddings |
| `GenerateTaskFramingJob` | عند فتح مهمة | يولّد AI Framing |
| `ProjectAuditJob` | عند رفع مشروع | يشغّل فحص المشروع |

---

## Docker Infrastructure

```yaml
services:
  backend:     .NET 10 API
  frontend:    React + Vite (dev server)
  ai-service:  Python FastAPI
  sqlserver:   SQL Server 2022
  qdrant:      Qdrant Vector DB
  hangfire:    (worker-in-process with backend)
```

---

## الملفات المرجعية
- ✅ `docs/architecture.md` — البنية الكاملة
- ✅ `docs/decisions.md` — 38+ ADR
- ✅ `docker-compose.yml` — Infrastructure
- ✅ `backend/src/` — 4 layers
- ✅ `ai-service/app/` — AI modules

---

## نقاط للعرض

### ✅ ركّز على:
- **Architecture Diagram**: واضح وملوّن (3 طبقات رئيسية)
- **Clean Architecture**: 4 circles مع التبعية الداخلية
- **Tech Stack**: table سريع (لا تطل)
- **Hangfire**: اعرض كيف الـ jobs تعمل في الخلفية
- **Numbers**: 45+ entities, 38+ ADRs, 488 tests

### ❌ تجنّب:
- شرح كل entity
- تفاصيل Docker volumes
- شرح MediatR بعمق
