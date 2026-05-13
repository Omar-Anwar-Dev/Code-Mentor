# Sprint 14 — جولة التحقق المتكاملة (Integration Walkthrough)

**السبرنت:** 14 (UserSettings to MVP — التنبيهات + الخصوصية + الحسابات المربوطة + تصدير البيانات + حذف الحساب)
**المهمة:** S14-T11 — جولة التحقق على مستوى السبرنت
**المسؤول:** عمر أنور
**آخر تحديث:** 2026-05-13
**الحالة:** ✅ **مكتمل — الجولة الحية اتمت 2026-05-14** · صاحب المشروع وقّع على جميع الأقسام · 3 hotfixes اتعمل-وانصلحوا داخل الجلسة (GitHub link redirect_uri + bell click for absolute SAS URLs + GitHub callback unified for OAuth-app single-URL constraint)

---

## التجهيز قبل التشغيل (Pre-flight)

الـ dev stack نازل من بداية Sprint 14 (T1 قتل عملية الـ API علشان يفتح القفل على ملف الـ EF migration). فيه ٢ migration معلقتين لازم يتطبقوا:

| الـ Migration | اتضافت في |
|---|---|
| `20260512222834_AddUserSettings` | T1 — تضيف جداول `UserSettings` و `EmailDeliveries` و `UserAccountDeletionRequests` + أعمدة `IsDeleted` / `DeletedAt` / `HardDeleteAt` على `Users` + ٥ indexes + تسجل default row لـ `UserSettings` لكل user موجود |
| `20260513085915_MakeUserIdNullableForAnonymization` | T9 — تخلي `Submissions.UserId` و `ProjectAudits.UserId` nullable علشان الـ cascade بتاع الحذف النهائي يقدر يعمل anonymize حسب ADR-046 Q1 |

الاتنين بيتطبقوا تلقائياً لما الـ stack يقوم عن طريق `DbInitializer.MigrateAsync`. أعد التشغيل بـ:

```powershell
pwsh start-dev.ps1
```

بعد إعادة التشغيل، تأكد إن الـ bootstrap log فيه:
- "Applying migration '20260512222834_AddUserSettings'."
- "Applying migration '20260513085915_MakeUserIdNullableForAnonymization'."
- مفيش أي exceptions أثناء `DbInitializer`.

### متغيرات بيئة اختيارية

| Env var | الافتراضي | إمتى تظبطه |
|---|---|---|
| `EmailDelivery__Provider` | `LoggedOnly` | اضبطه لـ `SendGrid` علشان تفعّل الإرسال الحقيقي. من غيره الإيميلات بتتسجل + بتتحفظ في `EmailDelivery` rows لكن مش بتطلع برة الجهاز. |
| `EmailDelivery__SendGridApiKey` | _(فاضي)_ | مطلوب لما `Provider=SendGrid`. هيرمي exception عند أول DI resolution لو مش متظبط. |
| `EmailDelivery__FromAddress` | `noreply@code-mentor.local` | تخصيص عنوان الـ "من" بتاع SendGrid. |
| `EmailDelivery__FromName` | `Code Mentor` | الاسم اللي بيظهر للمستلم. |
| `EmailDelivery__AppBaseUrl` | `http://localhost:5173` | الـ base URL المطلق للينكات اللي بتتبعت في الإيميل. |

تقدر تعمل الجولة كاملة من غير ما تظبط `SENDGRID_API_KEY` — الـ `LoggedOnly` provider بيسجل body الإيميل كامل في `EmailDelivery` rows اللي تقدر تشوفها من SSMS أو `dotnet ef dbcontext info`.

---

## ١. قسم التنبيهات (Notifications)

**الرابط:** `/settings`
**النزول لـ:** كارت "Notifications"

### ١.١ فحص الـ Render

- [ ] عنوان الكارت + النص التعريفي ظاهرين
- [ ] ٥ صفوف للأحداث: Submission feedback · Audit complete · Recurring weakness · Badge / Level-up · Account security
- [ ] كل صف فيه ٢ checkboxes (عمود Email بأيقونة `Mail`، عمود In-app بأيقونة `Bell`)
- [ ] صف Account security الـ checkboxes فيه disabled بصرياً + النص التوضيحي بيقول "Always on for safety"
- [ ] الحالة الافتراضية لـ user جديد: كلها مفعّلة (ما عدا PublicCvDefault في قسم الخصوصية تحت)
- [ ] الـ Light mode: علامة الـ check بلون brand-violet · هيدر الأعمدة uppercase tracking · الكارت بـ glass-card backdrop-blur
- [ ] الـ Dark mode: dark-text-light variant · نفس ألوان البراند

### ١.٢ سلوك الـ Toggle

- [ ] دوس على checkbox → الحالة بتتغير فوراً (optimistic update)
- [ ] الـ Network panel بيظهر `PATCH /api/user/settings` بالحقل الواحد اللي اتغير
- [ ] لو 200: بيفضل متغير
- [ ] لو 500 مصطنع (اقتل الـ backend في نص الـ PATCH): بيرجع للحالة القديمة + toast أحمر يظهر فوق يمين

### ١.٣ تنبيه End-to-End

شغّل submission من المسار الموجود:

1. روح `/tasks/{id}` لأي task من اللي اتزرعت
2. ابعت كود (أي مسار من الـ ٣: لصق كود أو GitHub URL أو ZIP)
3. استنى الـ AI analysis pipeline يخلص (~30-60 ثانية)
4. تأكد إن:
   - [ ] badge أيقونة الجرس في الـ navbar بيزود
   - [ ] تنبيه in-app جديد بنوع `FeedbackReady` يظهر في dropdown الجرس
   - [ ] فيه `EmailDelivery` row في الـ DB بـ `Type='feedback-ready'` و `Status='Sent'` (أو `Suppressed` لو كنت قافل خيار الإيميل لتنبيه الـ submission قبل الاختبار)
   - [ ] لو `EmailDelivery__Provider=SendGrid` متظبط: بيوصل إيميل على عنوان الاختبار بتاعك في خلال ~30 ثانية

### ١.٤ فحص التعطيل (Suppression)

1. في Settings، اقفل "Submission feedback" على قناة in-app
2. شغّل submission تاني
3. تأكد إن:
   - [ ] مفيش `Notification` row جديد اتكتب لـ UserId بتاع الـ submission ده
   - [ ] الـ `EmailDelivery` row لسة بيتكتب (تفضيل in-app مش بيعطل الإيميل)
4. اقفل قناة الإيميل كمان + شغّل submission تالت
5. تأكد إن:
   - [ ] الـ `EmailDelivery` row فيه `Status='Suppressed'` (مش `Sent`)

---

## ٢. قسم الخصوصية (Privacy)

### ٢.١ فحص الـ Render

- [ ] ٣ صفوف toggles: Profile discoverable · New CVs default to public · Show in leaderboard
- [ ] كل صف فيه نص تعريفي بيشرح الأثر
- [ ] نص "Show in leaderboard" بيقول "Reserved for the post-MVP leaderboard surface. No current effect."
- [ ] الحالة الافتراضية لـ user جديد: ProfileDiscoverable=مفعّل · PublicCvDefault=مقفول · ShowInLeaderboard=مفعّل

### ٢.٢ سلوك PublicCvDefault

1. فعّل "New CVs default to public"
2. افتح `/cv/me` لأول مرة لليوزر ده (يعني LearningCV row لسة مش موجودة)
3. تأكد إن:
   - [ ] الـ Hero بيظهر CV اليوزر بـ PublicSlug متولّد
   - [ ] toggle "Make Public" مفعّل بالفعل
   - [ ] badge "First Learning CV" اتمنح
4. افتح `/cv/{slug}` في نافذة privacy جديدة
5. تأكد إن:
   - [ ] الزائر المجهول بيشوف الـ CV (مع تخفية الإيميل)

### ٢.٣ كيل سويتش ProfileDiscoverable

1. شرط مسبق: اليوزر عنده public CV بـ slug (من ٢.٢ أو من toggle "Make Public" في صفحة LearningCV)
2. في Settings، اقفل "Profile discoverable"
3. في نافذة privacy جديدة، روح `/cv/{slug}`
4. تأكد إن:
   - [ ] الـ PublicCVPage بيعرض حالة الـ 404 ("This CV is not public" أو ما يشبهها)
5. ارجع فعّل "Profile discoverable"
6. اعمل reload لـ `/cv/{slug}` — الوصول العام رجع

---

## ٣. قسم الحسابات المربوطة (Connected Accounts)

### ٣.١ فحص الـ Render

- [ ] صف GitHub ظاهر بأيقونة GitHub mark
- [ ] لو مش مربوط: نص "Not connected." + زر "Connect" (primary brand-gradient)
- [ ] لو مربوط: نص أخضر "Linked as @{username}" + زر "Disconnect" outline

### ٣.٢ مسار الربط (Link)

> تخطى لو متغيرات `GITHUB_OAUTH_CLIENT_ID/SECRET` مش متظبطة — الـ backend بيرجع 503 بـ `title=GitHubOAuthNotConfigured` والـ FE toast بيقول "GitHub OAuth isn't configured on this environment."

1. دوس "Connect"
2. المتصفح يروح لـ `github.com/login/oauth/authorize?...`
3. اعمل authorize للتطبيق
4. GitHub يحوّلك لـ `/api/user/connected-accounts/github/callback?code=...&state=...`
5. الـ backend يحوّلك لـ `/settings#github-link=ok&detail=<username>`
6. تأكد إن:
   - [ ] الـ FE بيعرض toast/banner نجاح
   - [ ] الصف بيتحدث لـ "Linked as @{username}"
   - [ ] الـ DB فيه `OAuthToken` row + `ApplicationUser.GitHubUsername = '{username}'`
   - [ ] فيه `Notification` row بنوع `SecurityAlert` ورسالة فيها "GitHub account linked"

### ٣.٣ فك الربط (Unlink) — المسار العادي

1. دوس "Disconnect"
2. browser `confirm()` يظهر → دوس OK
3. تأكد إن:
   - [ ] toast نجاح "GitHub disconnected"
   - [ ] الصف يرجع لـ "Not connected" بزر "Connect"
   - [ ] `OAuthToken` row اتمسحت لليوزر ده
   - [ ] فيه ثاني `SecurityAlert` notification بـ "GitHub account disconnected"

### ٣.٤ فك الربط — حارس الأمان (Safety Guard)

1. شرط مسبق: سجل دخول كـ OAuth-only user (اتعمل عن طريق GitHub OAuth login من غير password). طريقة: اعمل user جديد عن طريق GitHub flow على DB seed نضيفة.
2. دوس "Disconnect" → confirm
3. تأكد إن:
   - [ ] الـ `ConfirmOverlay` modal بتاع الـ safety-guard يفتح بعنوان "Set a password first" + الرسالة الموثقة
   - [ ] مفيش تغيير في الـ DB — `OAuthToken` row + `ApplicationUser.GitHubUsername` متاثرش الاتنين
   - [ ] مفيش security notification اترفعت

---

## ٤. تصدير البيانات (Data Export)

### ٤.١ بدء التصدير

1. دوس "Download my data"
2. تأكد إن:
   - [ ] toast نجاح: "Data export started — we'll email you when ready"
   - [ ] الزر بيظهر "Preparing…" لمدة قصيرة

### ٤.٢ التحقق من الـ ZIP

الـ background job بيخلص في ثواني مع الـ inline scheduler، أو ~30-60 ثانية لو شغال Hangfire حقيقي. لما يخلص:

- [ ] جرس الـ in-app بيعرض `DataExportReady` notification جديدة بالـ SAS download URL المطلق على `Notification.Link`
- [ ] دوس على الجرس → بيفتح الـ SAS URL → المتصفح بينزّل الـ ZIP
- [ ] أو افتح الرابط من body الإيميل لو `EmailDelivery__Provider=SendGrid` متظبط
- [ ] الـ ZIP فيه بالظبط **٧ entries**: `profile.json` · `submissions.json` · `audits.json` · `assessments.json` · `gamification.json` · `notifications.json` · `data-export.pdf`
- [ ] `profile.json` فيه id اليوزر + إيميله + الإعدادات الحالية
- [ ] `data-export.pdf` بيفتح في PDF viewer + بيظهر header البراند + "Personal data export · DOSSIER" + قسم البروفايل باسم اليوزر + ملخص النشاط بالعدادات

### ٤.٣ انتهاء صلاحية الـ SAS

- [ ] استنى ساعة و ٥ دقايق بعد التصدير → جرّب الـ SAS URL تاني → المتوقع 403 (الـ SAS انتهت صلاحيته)
- الخطوة دي اختيارية أثناء الجولة؛ ممكن تتعمل منفصلة.

---

## ٥. منطقة الخطر — حذف الحساب (Danger Zone — Account Delete)

### ٥.١ بدء الطلب

1. دوس "Delete my account"
2. الـ modal يفتح بشرح الـ 30-day cooling-off + input لإعادة إدخال الإيميل
3. اكتب إيميل غلط → زر "Delete account" يفضل disabled
4. اكتب الإيميل الصح → الزر يتفعّل
5. دوس "Delete account"
6. تأكد إن:
   - [ ] info toast: "Account scheduled for deletion"
   - [ ] القسم يتقلب لكارت العد التنازلي الأحمر: "Your account is scheduled for deletion. Hard-delete fires on {date} UTC unless you cancel."
   - [ ] الـ DB فيه `UserAccountDeletionRequest` row بـ `RequestedAt=now` + `HardDeleteAt=now+30d` + `ScheduledJobId` مش null
   - [ ] `ApplicationUser.IsDeleted=true` + `DeletedAt` + `HardDeleteAt` متظبطين
   - [ ] `Notification` من نوع `SecurityAlert` برسالة "Account deletion requested"

### ٥.٢ كيل سويتش الـ Public CV

أثناء فترة الـ cooling-off لليوزر:

- [ ] لو اليوزر كان عنده public CV slug: `/cv/{slug}` يرجع 404 (صفحة الـ 404 بتظهر، مش الـ CV)
- [ ] لو الـ admin استعلم `/api/admin/users` بدون `?includeDeleted=true`: اليوزر ده **مايظهرش**
- [ ] بـ `?includeDeleted=true`: اليوزر **يظهر**

### ٥.٣ الإلغاء عن طريق DELETE endpoint (زر يدوي)

1. دوس "Cancel deletion" على كارت العد التنازلي الأحمر
2. تأكد إن:
   - [ ] toast نجاح: "Deletion cancelled"
   - [ ] القسم يرجع لزر "Delete my account"
   - [ ] `UserAccountDeletionRequest.CancelledAt` متظبط
   - [ ] `ApplicationUser.IsDeleted=false` · `DeletedAt=null` · `HardDeleteAt=null`
   - [ ] لوحة Hangfire على `/hangfire` بتظهر إن الـ `HardDeleteUserJob` المجدول قبل كده **اختفى** (اتلغى)
   - [ ] ثاني `SecurityAlert` notification: "Account restored"

### ٥.٤ الإلغاء عن طريق Login (نموذج Spotify)

1. اطلب الحذف تاني (حسب ٥.١)
2. سجل خروج (`/api/auth/logout`)
3. سجل دخول تاني عن طريق `POST /api/auth/login`
4. تأكد إن:
   - [ ] الـ login بينجح حتى لو `User.IsDeleted=true` كانت متظبطة وقت تسجيل الخروج
   - [ ] بعد الـ login الناجح: نفس حالة الـ DB زي ٥.٣ (auto-cancelled · restored · security alert اترفعت)
   - [ ] الـ login JWT بيتم إصداره طبيعي — اليوزر يروح dashboard على طول

### ٥.٥ الحذف النهائي (Hard-delete) — تفعيل cascade يدوي اختياري

تقدر تتخطى انتظار الـ 30 يوم بالتفعيل المباشر للـ cascade من لوحة Hangfire عن طريق "Trigger now" على الـ `HardDeleteUserJob` المجدول. **مش مطلوبة** لإغلاق الجولة؛ الـ integration tests بتغطي الـ cascade.

لو فعّلته:
- [ ] بعد ما الـ job يشتغل: User row لسة موجودة لكن الـ PII مسحوت (`Email=null` · `FullName="(deleted user)"` · `UserName="deleted-{guid}@deleted.local"`)
- [ ] Submissions: الصفوف لسة موجودة لكن `UserId=null`
- [ ] ProjectAudits: نفس الشيء — anonymized
- [ ] Notifications · EmailDeliveries · UserBadges · XpTransactions · SkillScores · CodeQualityScores · UserSettings · OAuthTokens · RefreshTokens · LearningCV · Assessments · LearningPaths · MentorChatSessions: كلها 0 rows لليوزر ده
- [ ] `UserAccountDeletionRequest.HardDeletedAt` متظبط
- [ ] صفوف `AuditLogs` متحفوظة لكن `UserId=null` على الصفوف اللي كان اليوزر هو الـ actor فيها

---

## ٦. فحوصات شاملة (Cross-cutting)

- [ ] **Dark mode**: كل قسم بيظهر نضيف. الـ glass-card backdrop-blur واضح ومقروء. مفيش نص مخفي (أبيض على أبيض أو أسود على أسود).
- [ ] **Mobile viewport (375×812)**: الأقسام بتركب فوق بعض في عمود واحد · الـ modal overlays قابلة للسحب · حقل re-entry الإيميل في الـ danger zone صديق للكيبورد.
- [ ] **Console errors**: صفر errors طول الجولة. تحذيرات React-Router future-flag deprecation + رسالة تثبيت React DevTools دوشة موجودة من قبل، مش blockers.
- [ ] **Reduced-motion**: macOS Settings → Accessibility → Display → Reduce motion. فعّله + اعمل reload للصفحة. الـ switches/modals بتتحرك من غير motion (الـ `prefers-reduced-motion: reduce` global reset من S13-T10 بيشتغل).
- [ ] **Keyboard navigation**: اعمل Tab على كل قسم. كل control قابل للتفاعل لازم يكون قابل للوصول + focus-visible.
- [ ] **Screen-reader**: كل switch + checkbox عنده `aria-label` (متضافة بالفعل في الـ T10 primitives).

---

## ٧. قرار نص الـ Banner

الـ cyan banner "What's wired today" من Sprint-13 اتشال في T10 ship (الأقسام الجديدة هي البرهان). صاحب المشروع يختار:

- **(أ) خليه مشيل** (الافتراضي اللي شحن في T10) — أنضف. مفيش banner زحمة.
- **(ب) banner نجاح قصير** — سطر واحد cyan: _"All settings here persist to the live backend (Sprint 14). Toggle, link/unlink, export, or delete — every action takes effect immediately."_
- **(ج) شكل banner السبرنت-13 محفوظ، النص متغير** — نفس الشكل البصري للـ cyan banner القديم، نص نجاح. استمرار للذاكرة العضلية لصاحب المشروع.

**ترشيحي: (أ) خليه مشيل**. البرهان البصري (٥ أقسام شغالة بالكامل) أقوى من أي banner.

**اختيار صاحب المشروع: (أ) خليه مشيل** — اتأكد في الجولة الحية 2026-05-14. الأقسام الجديدة هي البرهان؛ مفيش زحمة banner.

---

## ٨. الفروقات أثناء الجولة (Walkthrough Deltas)

| القسم | الحالة | ملاحظات |
|---|---|---|
| ١. التنبيهات (render) | ✅ | كل العناصر ظهرت زي ما اتصمّمت — صف Account security disabled، defaults all-on، Inter font + violet checks |
| ١.٢ سلوك الـ toggle | ✅ | optimistic flip + PATCH 200 + revert-on-error pattern verified |
| ١.٣ تنبيه end-to-end | ✅ | submission → FeedbackReady notification + EmailDelivery row (LoggedOnly mode) |
| ١.٤ فحص التعطيل | ✅ | اللي مقفول مايتكتبش، Status=Suppressed على email pref off |
| ٢.١ render الخصوصية | ✅ | ٣ toggles + helper text + leaderboard "no current effect" copy |
| ٢.٢ PublicCvDefault | ✅ | فعّل → CV public + slug + FirstLearningCVGenerated badge — اتأكد في الجولة |
| ٢.٣ كيل سويتش ProfileDiscoverable | ✅ | قفل → /cv/{slug} 404 في private window |
| ٣.١ render الحسابات المربوطة | ✅ | GitHub row + connect button rendered cleanly |
| ٣.٢ مسار ربط GitHub | ✅ | بعد hotfix round-3 (unified callback): authorize → /settings#github-link=ok&detail=Omar-Anwar-Dev → toast نجاح + row قلب لـ Linked |
| ٣.٣ فك الربط — مسار عادي | ✅ | DELETE 200 + OAuthToken row deleted + GitHubUsername cleared + SecurityAlert notification |
| ٣.٤ فك الربط — حارس الأمان | لم يُختبر يدوياً | password user عنده link؛ الـ OAuth-only edge case ما اتسبتش في الجولة لكن ٤ integration tests بيغطوها |
| ٤. تصدير البيانات | ✅ | ZIP 65 KB فيه ٧ entries (٦ JSON + 1 PDF) + dossier بـ Neon & Glass identity كامل + SAS URL فتح في tab جديد بعد bell-refresh hotfix |
| ٥.١ بدء طلب الحذف | ✅ | Hangfire job 150117 scheduled at 06/12/2026 + SecurityAlert email + Danger zone قلب لـ countdown card |
| ٥.٢ كيل سويتش Public CV + admin filter | ✅ | /api/admin/users بدون اليوزر ده (IsDeleted query filter شغّال) — قاله صاحب المشروع |
| ٥.٣ إلغاء يدوي | ✅ | اتأكد في الجولة (Cancel deletion button) |
| ٥.٤ إلغاء عن طريق login (Spotify) | ✅ | logout → login → auto-cancel + Account restored alert |
| ٥.٥ cascade الـ hard-delete (اختياري) | لم يُختبر | غير مطلوب للإغلاق؛ ١١ integration tests بيغطوا الـ cascade |
| ٦. فحوصات شاملة (dark / mobile / console / a11y) | ✅ | اتأكد في الجولة |

الدليل: ⬜ لسه · ✅ مطابق · 🟡 فرق بسيط · 🔴 regression / blocker

أي صف 🔴 يبلوك T12 commit. الصفوف 🟡 إما تتصلح في الجلسة أو تتسجل كـ carryover موثق.

---

## ٩. بوابة Sprint 14 exit-criteria (حسب `implementation-plan.md` Sprint 14 §exit criteria)

| # | المعيار | الحالة |
|---|---|---|
| 1 | كل الـ 12 task مكتملة ومتعلّمة [x] في `progress.md` | ✅ |
| 2 | 5 تفضيلات تنبيه قابلة للتبديل لكل قناة; إرسال SendGrid حقيقي متحقق على تفضيل واحد على الأقل (أو env-flip لـ `LoggedOnly` لو R18 حصل) | ✅ — اتشغّل على `LoggedOnly` provider (R18 fallback). الـ EmailDelivery rows فيها الـ payload كامل |
| 3 | 3 toggles خصوصية بتثبت + بتأثر بشكل ملحوظ على query paths مغلقة | ✅ |
| 4 | GitHub link/unlink شغال; حارس الأمان بيرجع 409 لو اليوزر مفيش عنده password | ✅ — link/unlink مختبرين live بعد round-3 hotfix; safety guard مغطى بـ ٤ integration tests |
| 5 | تصدير البيانات بيوصّل ZIP فيه 6 JSON + 1 PDF، signed link صالح لساعة | ✅ — مختبر live + ZIP 65 KB downloaded |
| 6 | طلب حذف الحساب بيعمل soft-delete + بيجدول Hangfire job على +30d; الـ login بيلغي تلقائياً | ✅ |
| 7 | نص الـ cyan banner في Settings استبدل بنص ما-بعد-Sprint-14 معتمد من صاحب المشروع | ✅ — اختار (أ) خليه مشيل |
| 8 | Backend test suite ≥465 passing (445 baseline + ≥20 جديدة) | ✅ **593 / 593** — متحقق في entries T1-T10 |
| 9 | `npm run build` نضيف; `tsc -b` نضيف; test suite الموجود لسه أخضر | ✅ T10 close: tsc + vite الاتنين نضاف |
| 10 | ملاحظات الجولة موثقة في `docs/demos/sprint-14-walkthrough.md` | ✅ المستند ده |
| 11 | `docs/progress.md` بيظهر Sprint 14 مكتمل | ✅ — T12 closure entry landed this session |
| 12 | ADR-046 في `docs/decisions.md`; PRD §`F-stub` 501 stub اتستبدل بـ live spec | ✅ — ADR-046 موجود؛ تحديث الـ PRD `F-stub` مدمج في T12's commit |

---

## ١٠. الخطوة التالية بعد الموافقة

لما كل أقسام §٨ تبقى ✅ أو 🟡 (مفيش 🔴)، انتقل لـ **S14-T12**:

1. حدّث `docs/progress.md` بـ T11 + entry إغلاق Sprint-14
2. شغّل `pwsh prepare-public-copy.ps1 -Force`
3. `cd ../Code-Mentor-V1-public`
4. `git add -A`
5. `git commit -m "feat(settings): Sprint 14 — UserSettings to MVP (notifs + privacy + GitHub link/unlink + data export + account delete)"` (عمر هو الـ author الوحيد، مفيش Co-Authored-By trailer)
6. `git push`

حسب `workflow_github_publish.md` + `feedback_commit_attribution.md`.
