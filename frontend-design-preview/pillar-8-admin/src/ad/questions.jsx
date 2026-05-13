/* Pillar 8 / Page 4 — Question Management (mirror QuestionManagement.tsx)
   Header + New Question · Search & filter card · Table (Prompt/Category/
   Difficulty/Type/Answers/Status/Uses/Actions) · Published vs Draft */

function QuestionsPage_Ad() {
  const { AD_QUESTIONS, AdTable } = window.AdShared;

  return (
    <AppLayout active="" title="Admin · Questions">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Icon name="HelpCircle" size={20} className="text-fuchsia-500"/> Question Management
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
              Assessment-question bank · {AD_QUESTIONS.filter(q=>q.published).length} published / {AD_QUESTIONS.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" leftIcon="Upload">Import CSV</Button>
            <Button variant="primary" size="md" leftIcon="Plus">New Question</Button>
          </div>
        </header>

        <Card variant="glass">
          <CardBody className="p-4">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex-1 min-w-[260px]">
                <TextInput placeholder="Search question prompts…" prefix="Search"/>
              </div>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All categories" },
                  { value:"ds", label:"DataStructures" },
                  { value:"algo", label:"Algorithms" },
                  { value:"oop", label:"OOP" },
                  { value:"db", label:"Databases" },
                  { value:"sec", label:"Security" },
                  { value:"net", label:"Networking" },
                ]}
                className="min-w-[160px]"/>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All types" },
                  { value:"mcq", label:"MCQ" },
                  { value:"short", label:"Short answer" },
                ]}
                className="min-w-[140px]"/>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All statuses" },
                  { value:"published", label:"Published" },
                  { value:"draft", label:"Draft" },
                ]}
                className="min-w-[140px]"/>
            </div>
          </CardBody>
        </Card>

        <AdTable
          columns={[
            { label: "Prompt" },
            { label: "Category" },
            { label: "Difficulty" },
            { label: "Type" },
            { label: "Answers", align: "right" },
            { label: "Status" },
            { label: "Uses", align: "right" },
            { label: "Actions", align: "right" },
          ]}
          footer={
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Showing {AD_QUESTIONS.length} of 142 questions in the bank</div>
          }
        >
          {AD_QUESTIONS.map(q => (
            <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
              <td className="px-4 py-3 max-w-[280px]">
                <p className="text-slate-900 dark:text-slate-50 font-medium line-clamp-2">{q.prompt}</p>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{q.category}</td>
              <td className="px-4 py-3">
                <div className="inline-flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={n <= q.difficulty ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}>★</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={q.type === "MCQ" ? "primary" : "cyan"}>{q.type}</Badge>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {q.answers > 0 ? q.answers : <span className="text-slate-400 dark:text-slate-500">—</span>}
              </td>
              <td className="px-4 py-3">
                {q.published
                  ? <Badge tone="success">Published</Badge>
                  : <Badge tone="neutral">Draft</Badge>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{q.uses}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button title="Edit" className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Pencil" size={14}/>
                  </button>
                  <button title="Duplicate" className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Copy" size={14}/>
                  </button>
                  <button title="Delete" className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 dark:text-slate-300 hover:text-red-500">
                    <Icon name="Trash2" size={14}/>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </AdTable>

      </div>
    </AppLayout>
  );
}

window.QuestionsPage_Ad = QuestionsPage_Ad;
