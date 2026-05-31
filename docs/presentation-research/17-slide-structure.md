# 17 - Slide Structure & References
> الحالة: ✅ مكتمل

---

## هيكل الـ Slides المقترح (25-30 سلايد)

### الجزء 1: المقدمة (5 slides)
| # | العنوان | المحتوى | المصدر |
|---|---------|---------|--------|
| 1 | Title Slide | Code Mentor — AI-Powered Code Review & Learning Platform | — |
| 2 | Team | أسماء الفريق (7) + المشرفين (3) | — |
| 3 | Agenda | أجندة العرض | — |
| 4 | The Problem | الفجوة بين التعلم والعمل + Personas | `01` |
| 5 | Existing Solutions | LeetCode, YouTube, Bootcamps — ما ينقص كل منها | `01` |

### الجزء 2: الحل (3 slides)
| # | العنوان | المحتوى | المصدر |
|---|---------|---------|--------|
| 6 | Code Mentor — The Solution | الجملة المفتاحية + Core Loop | `01` |
| 7 | User Journey | Flow diagram تدريجي | `02` |
| 8 | Key Features Overview | Cards سريعة لكل feature | `01` |

### الجزء 3: Features العميقة (8-10 slides)
| # | العنوان | المحتوى | المصدر |
|---|---------|---------|--------|
| 9 | Authentication | Email + GitHub OAuth + JWT | `03` |
| 10 | Adaptive Assessment — IRT | S-Curve + كيف يعمل | `04` |
| 11 | AI Question Bank | 250+ سؤال + 3 مراحل معايرة | `04` |
| 12 | AI Learning Path | Hybrid Recall + Rerank | `05` |
| 13 | Continuous Adaptation | Triggers + Signal levels | `05` |
| 14 | Code Review Pipeline | Static + AI + Multi-Agent | `06` |
| 15 | Multi-Agent Architecture | 3 agents بالتوازي | `06` |
| 16 | Mentor Chat (RAG) | RAG pipeline + مقارنة بـ ChatGPT | `07` |
| 17 | Project Audit | 8 أقسام + Completeness | `08` |
| 18 | Learning CV & Other | CV + Analytics + Admin | `09` |

### الجزء 4: Implementation (4 slides)
| # | العنوان | المحتوى | المصدر |
|---|---------|---------|--------|
| 19 | System Architecture | 3 layers diagram | `10` |
| 20 | Tech Stack | Table مقسم (Frontend/Backend/AI) | `10` |
| 21 | AI & Prompt Engineering | 12+ endpoints + strategy | `12` |
| 22 | Testing & Quality | 488 tests + ADRs + Monte-Carlo | `11` |

### الجزء 5: Demo (1 slide + live)
| # | العنوان | المحتوى | المصدر |
|---|---------|---------|--------|
| 23 | Demo | "Let's see it in action" → Live demo | `14` |

### الجزء 6: الختام (4-5 slides)
| # | العنوان | المحتوى | المصدر |
|---|---------|---------|--------|
| 24 | Results & Numbers | جدول Features + أرقام | `15` |
| 25 | Evaluation | IRT accuracy + Review quality | `15` |
| 26 | Limitations | صراحة عن القيود | `16` |
| 27 | Future Work | خطة التطوير | `16` |
| 28 | Conclusion | خلاصة + شكر | — |
| 29 | Q&A | أسئلة | — |
| 30 | References | مراجع | هذا الملف |

---

## المراجع الأكاديمية المقترحة

### IRT (Item Response Theory)
1. Baker, F. B., & Kim, S. H. (2004). *Item Response Theory: Parameter Estimation Techniques*. CRC Press.
2. van der Linden, W. J., & Hambleton, R. K. (Eds.). (1997). *Handbook of Modern Item Response Theory*. Springer.

### Adaptive Assessment
3. Wainer, H. (Ed.). (2000). *Computerized Adaptive Testing: A Primer*. Lawrence Erlbaum Associates.

### AI in Education
4. Zawacki-Richter, O., et al. (2019). "Systematic review of research on artificial intelligence applications in higher education." *International Journal of Educational Technology in Higher Education*, 16(1).

### Code Review
5. McIntosh, S., et al. (2016). "An empirical study of the impact of modern code review practices on software quality." *Empirical Software Engineering*, 21(5).

### RAG (Retrieval-Augmented Generation)
6. Lewis, P., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS 2020*.

### Clean Architecture
7. Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.

### LLM Prompt Engineering
8. Wei, J., et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." *NeurIPS 2022*.

---

## الملفات المرجعية الداخلية

| الملف | المحتوى |
|-------|---------|
| `docs/PRD.md` | مواصفات المنتج الكاملة |
| `docs/architecture.md` | البنية المعمارية |
| `docs/decisions.md` | 38+ ADR |
| `docs/assessment-learning-path.md` | تصميم F15+F16 |
| `README.md` | نظرة عامة |

---

## ملاحظات نهائية

### ✅ نصائح عامة:
- **لا تقرأ من السلايدات** — اعرف المحتوى واتكلم عنه
- **استخدم Morph animations** — تنتقل من slide لآخر بسلاسة
- **ابدأ كل section بسؤال** — "هل تساءلت كيف...?"
- **الـ Demo يتكلم عن نفسه** — لا تشرح ما يراه المشاهد
- **كن مستعداً للأسئلة**: IRT math, why not fine-tuned model, Azure deferred
- **الـ Backup video**: ضروري — لا تعتمد على live demo 100%
