# 09 - Feature: Learning CV & Other Features (F10 + stretch)
> الحالة: ✅ مكتمل

---

## 1. Learning CV (F10)

### ملخص
سيرة ذاتية تعليمية **قابلة للمشاركة** تثبت مهاراتك بالبيانات — ليس بشهادات إتمام.

### ما تحتويه:
- **Skills Radar Chart** — رادار بصري لمهاراتك (5 محاور)
- **Assessment History** — نتائج تقييماتك مع التقدم عبر الزمن
- **Completed Tasks** — المهام التي أكملتها وتقييمك فيها
- **Achievements & Badges** — إنجازاتك ونقاطك
- **Code Review Stats** — إحصائيات المراجعات

### الميزات:
- **Public URL**: `/cv/:slug` — يمكن مشاركته مع أي شخص (بدون login)
- **Customizable Slug**: يختار المستخدم الرابط (مثل: `/cv/ahmed-dev`)
- **PDF Export**: تصدير كـ PDF

---

## 2. Analytics Dashboard (Learner)

### الشاشة: `/analytics`
- **Skill Progress Over Time** — خط بياني لتقدم كل مهارة
- **Submission Stats** — عدد المحاولات، معدل النجاح
- **Category Breakdown** — أداء كل فئة

---

## 3. Achievements & Badges (SF1-SF2)

### الشاشة: `/achievements`
- Badges للإنجازات (أول submission, first 100, perfect score, etc.)
- Progress bars للأهداف المقبلة

---

## 4. Admin Dashboard

### الشاشات:
| Route | الغرض |
|-------|-------|
| `/admin` | لوحة إحصائيات عامة |
| `/admin/users` | إدارة المستخدمين |
| `/admin/tasks` | إدارة المهام (CRUD) |
| `/admin/questions` | إدارة أسئلة التقييم |
| `/admin/questions/generate` | توليد أسئلة بالـ AI |
| `/admin/tasks/generate` | توليد مهام بالـ AI |
| `/admin/calibration` | معايرة IRT (heatmap) |
| `/admin/analytics` | تحليلات إدارية |
| `/admin/adaptations` | مراقبة تكيّفات المسارات |

---

## 5. Notifications System (F8)

- إشعارات in-app للأحداث المهمة
- Pref-aware: المستخدم يتحكم في أنواع الإشعارات

---

## 6. Settings & Profile

- `/profile` + `/profile/edit` — تعديل الملف الشخصي
- `/settings` — إعدارات الحساب والإشعارات
- Dark/Light mode toggle

---

## الملفات المرجعية
- ✅ `frontend/src/features/learning-cv/` — Learning CV
- ✅ `frontend/src/features/analytics/` — Analytics
- ✅ `frontend/src/features/achievements/` — Achievements
- ✅ `frontend/src/features/admin/` — Admin Dashboard
- ✅ `frontend/src/features/settings/` — Settings

---

## نقاط للعرض

### ✅ ركّز على:
- **Learning CV**: هذا هو الـ "output" النهائي — ما يشاركه المتعلم مع صاحب العمل
- **Public URL**: يمكن فتحه في Browser أثناء الـ Demo
- **Admin Dashboard**: Screenshots سريعة
