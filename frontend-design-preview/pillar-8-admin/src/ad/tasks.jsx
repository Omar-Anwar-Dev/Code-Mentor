/* Pillar 8 / Page 3 — Task Management (mirror TaskManagement.tsx)
   Header + New Task button · Toggle (include inactive) · Table
   (Title/Track/Difficulty/Language/Hours/Status/Submissions/Actions)
   · Edit modal rendered open at the bottom as state coverage */

function TasksPage_Ad() {
  const { AD_TASKS, AdTable } = window.AdShared;

  return (
    <AppLayout active="" title="Admin · Tasks">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Icon name="ClipboardList" size={20} className="text-cyan-500"/> Task Management
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">Create, edit, and deactivate tasks in the catalog.</p>
          </div>
          <Button variant="primary" size="md" leftIcon="Plus">New Task</Button>
        </header>

        {/* Filter card */}
        <Card variant="glass">
          <CardBody className="p-4 flex items-center justify-between flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"/>
              Include inactive tasks
            </label>
            <div className="flex items-center gap-2">
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All tracks" },
                  { value:"fullstack", label:"FullStack" },
                  { value:"backend", label:"Backend" },
                  { value:"python", label:"Python" },
                ]}
                className="min-w-[140px]"/>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All difficulty" },
                  { value:"1", label:"★" },
                  { value:"2", label:"★★" },
                  { value:"3", label:"★★★" },
                  { value:"4", label:"★★★★" },
                  { value:"5", label:"★★★★★" },
                ]}
                className="min-w-[140px]"/>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <AdTable
          columns={[
            { label: "Title" },
            { label: "Track" },
            { label: "Category" },
            { label: "Difficulty" },
            { label: "Language" },
            { label: "Hours", align: "right" },
            { label: "Status" },
            { label: "Subs.", align: "right" },
            { label: "Actions", align: "right" },
          ]}
          footer={
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Showing {AD_TASKS.length} tasks · 28 active in catalog</div>
          }
        >
          {AD_TASKS.map(t => (
            <tr key={t.id} className={"hover:bg-slate-50 dark:hover:bg-white/5 " + (t.active ? "" : "opacity-55")}>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{t.title}</td>
              <td className="px-4 py-3"><Badge tone="primary">{t.track}</Badge></td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.category}</td>
              <td className="px-4 py-3">
                <div className="inline-flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={n <= t.difficulty ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}>★</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-[12px] text-slate-600 dark:text-slate-300">{t.language}</td>
              <td className="px-4 py-3 text-right font-mono">{t.hours}</td>
              <td className="px-4 py-3">
                {t.active
                  ? <Badge tone="success">Active</Badge>
                  : <Badge tone="neutral">Inactive</Badge>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{t.submissions}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button title="Edit" className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Pencil" size={14}/>
                  </button>
                  {t.active ? (
                    <button title="Deactivate" className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 dark:text-slate-300 hover:text-red-500">
                      <Icon name="Trash2" size={14}/>
                    </button>
                  ) : (
                    <button title="Restore" className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 dark:text-slate-300 hover:text-emerald-500">
                      <Icon name="RotateCcw" size={14}/>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </AdTable>

        {/* Edit modal — rendered open as state preview */}
        <div className="text-center text-[10.5px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 pt-4">↓ Edit modal preview ↓</div>
        <Card variant="glass" className="max-w-2xl mx-auto">
          <CardBody className="p-0">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Icon name="Pencil" size={15} className="text-primary-500"/> Edit Task — React Form Validation
              </h3>
              <button className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10">
                <Icon name="X" size={14}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Title"><TextInput defaultValue="React Form Validation"/></Field>
              <Field label="Description"><Textarea rows={3} defaultValue="Build a multi-step form with Zod schema validation, error states tied to specific fields, async username-availability check, and accessible error messaging."/></Field>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Track">
                  <Select value="fullstack" onChange={()=>{}}
                    options={[{value:"fullstack",label:"FullStack"},{value:"backend",label:"Backend"},{value:"python",label:"Python"}]}/>
                </Field>
                <Field label="Category">
                  <Select value="oop" onChange={()=>{}}
                    options={[{value:"oop",label:"OOP"},{value:"algorithms",label:"Algorithms"},{value:"ds",label:"DataStructures"}]}/>
                </Field>
                <Field label="Language">
                  <Select value="ts" onChange={()=>{}}
                    options={[{value:"ts",label:"TypeScript"},{value:"js",label:"JavaScript"},{value:"py",label:"Python"}]}/>
                </Field>
                <Field label="Hours"><TextInput type="number" defaultValue={5}/></Field>
              </div>
              <Field label="Difficulty">
                <Select value="3" onChange={()=>{}}
                  options={[{value:"1",label:"★"},{value:"2",label:"★★"},{value:"3",label:"★★★"},{value:"4",label:"★★★★"},{value:"5",label:"★★★★★"}]}/>
              </Field>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/40 dark:bg-white/5">
              <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-primary-500"/>
                Active (visible in catalog)
              </label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="primary" size="sm" leftIcon="Save">Save changes</Button>
              </div>
            </div>
          </CardBody>
        </Card>

      </div>
    </AppLayout>
  );
}

window.TasksPage_Ad = TasksPage_Ad;
