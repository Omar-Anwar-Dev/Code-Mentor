/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 2 — Profile Edit (mirror ProfileEditSection.tsx as
   a standalone focused form page). max-w-2xl, single card, 4 fields
   (full name / email-disabled / GitHub / picture URL) + Save action.
   Includes validation-state demos (error + helper) inline so the
   reviewer sees all states without typing.
   ───────────────────────────────────────────────────────────────── */

function ProfileEditPage_Pc({ onBackToProfile }) {
  const { PC_LAYLA, CvHeroAvatar } = window.PcShared;

  return (
    <AppLayout active="" title="Edit Profile">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">

        {/* Back link */}
        <a href="#" onClick={e=>{e.preventDefault(); onBackToProfile?.();}}
          className="inline-flex items-center gap-1 text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline">
          <Icon name="ArrowLeft" size={14}/> Back to Profile
        </a>

        {/* Page header */}
        <div>
          <h1 className="text-[26px] font-bold tracking-tight brand-gradient-text">Edit your profile</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            These changes hit <code className="font-mono text-[11.5px] text-cyan-700 dark:text-cyan-300">PATCH /api/auth/me</code> — your email is bound to your account and can&apos;t be changed here.
          </p>
        </div>

        {/* Form card */}
        <Card variant="glass">
          <CardBody className="p-6 space-y-5">

            {/* Avatar preview + replace */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <CvHeroAvatar size={64} name={PC_LAYLA.name}/>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Profile picture</div>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">PNG, JPG, or WebP. Recommended ≥256×256.</p>
              </div>
              <Button variant="outline" size="sm" leftIcon="Upload">Replace</Button>
            </div>

            {/* Fields */}
            <Field label="Full name" helper="Shown across the app and on your public CV.">
              <TextInput defaultValue={PC_LAYLA.name}/>
            </Field>

            <Field label="Email" helper="Email cannot be changed. Contact support if you need to migrate accounts.">
              <TextInput defaultValue={PC_LAYLA.email} disabled/>
            </Field>

            <Field label="GitHub username" helper="Used to verify repository submissions.">
              <TextInput defaultValue={PC_LAYLA.gitHub} prefix="Github"/>
            </Field>

            {/* Validation error demo */}
            <Field label="Profile picture URL" error="Must be a full https:// URL.">
              <TextInput defaultValue="layla-avatar.png" placeholder="https://..." error/>
            </Field>

            {/* Char counter demo */}
            <Field label="Short bio (optional)" helper="160 character limit. Shown on your public CV header.">
              <Textarea
                rows={3}
                defaultValue="Final-year CS student at Benha, currently focused on the Full Stack track. Open to backend internships in Cairo or remote-friendly EU teams."
                maxLength={160}
              />
            </Field>

            {/* Action row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">Last saved 2m ago</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="md">Discard</Button>
                <Button variant="primary" size="md" leftIcon="Save">Save changes</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Danger zone */}
        <Card variant="glass" className="border-red-200/60 dark:border-red-900/40">
          <CardBody className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="AlertTriangle" size={16} className="text-red-500"/>
              <h3 className="text-[14.5px] font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
            </div>
            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mb-3">
              Deleting your account also deletes your submissions, audits, and learning CV. This is permanent and cannot be undone.
            </p>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" leftIcon="Trash2" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                Delete account…
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

window.ProfileEditPage_Pc = ProfileEditPage_Pc;
