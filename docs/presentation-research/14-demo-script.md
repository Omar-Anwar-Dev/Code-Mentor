# 14 - Demo Script
> الحالة: ✅ مكتمل

---

## سيناريو الـ Demo (8 دقائق)

### الدقيقة 1-2: التسجيل والتقييم
1. فتح المنصة → Landing Page
2. Register بحساب جديد (أو Login)
3. Dashboard → "Start Assessment"
4. إجابة 3-5 أسئلة (إظهار أن الصعوبة تتغير!)
5. عرض نتائج التقييم:
   - Radar Chart (5 محاور)
   - AI Summary (3 فقرات)

### الدقيقة 3-4: مسار التعلم
6. AI يولّد Learning Path
7. عرض المسار: 5-10 مهام مرتبة
8. فتح مهمة → AI Framing (لماذا مهمة + Focus areas)
9. عرض أن كل مهمة لها reasoning

### الدقيقة 4-6: مراجعة الكود
10. رفع كود جاهز (GitHub URL)
11. انتظار Processing (Static + AI)
12. عرض Feedback Report:
    - Overall Score + 6 محاور
    - Strengths & Weaknesses
    - Detailed Issues (file + line)
    - Learning Resources
13. عرض Multi-Agent mode (3 agents بالتوازي)

### الدقيقة 6-7: Mentor Chat + Audit
14. فتح Mentor Chat → سؤال عن issue محدد
15. إظهار أن الإجابة مبنية على الكود الفعلي
16. (اختياري) عرض Project Audit سريع

### الدقيقة 7-8: النتائج
17. عرض Learning CV → Public URL
18. عرض Analytics (progress chart)
19. عرض Admin Dashboard (سريع)

---

## تحضيرات الـ Demo

### ✅ جهّز مسبقاً:
- [ ] حساب مسجل ومفعّل مع assessment مكتمل
- [ ] Learning Path جاهز مع مهام مكتملة
- [ ] Submission جاهز مع feedback كامل
- [ ] Mentor Chat session مع تاريخ
- [ ] Project Audit مكتمل
- [ ] Learning CV مع بيانات حقيقية
- [ ] **Backup video** مسجل مسبقاً (في حال فشل الـ live demo)

### ❌ تجنّب:
- الاعتماد على Internet speed (كل شيء local via docker-compose)
- فتح الكود المصدري أثناء الـ Demo (هذا ليس code walkthrough)
- الإسهاب في شرح الشاشات (اجعل الـ Demo يتكلم عن نفسه)

---

## نقاط رئيسية للإظهار أثناء الـ Demo

| النقطة | ما يثبتها |
|--------|----------|
| IRT adaptive | الأسئلة تتغير حسب الأداء |
| AI personalization | المسار مختلف لكل متعلم |
| Multi-layered review | Static + AI في تقرير واحد |
| RAG grounding | Chat يذكر file paths وline numbers |
| Real-time | SSE streaming للـ chat |
| Completeness | من Assessment → Path → Submit → Feedback → CV |
