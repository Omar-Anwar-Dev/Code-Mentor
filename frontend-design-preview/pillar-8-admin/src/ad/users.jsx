/* Pillar 8 / Page 2 — User Management (mirror UserManagement.tsx)
   Header + count · Search card · Table (Email/Name/Roles/Status/
   LastSeen/Submissions/Actions) · Empty state · Pagination */

function UsersPage_Ad() {
  const { AD_USERS, AdTable } = window.AdShared;

  return (
    <AppLayout active="" title="Admin · Users">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Icon name="Users" size={20} className="text-primary-500"/> User Management
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
              {AD_USERS.length} of 1,247 users · last sync 2m ago
            </p>
          </div>
          <Button variant="outline" size="md" leftIcon="Download">Export CSV</Button>
        </header>

        {/* Search + filter card */}
        <Card variant="glass">
          <CardBody className="p-4">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <TextInput placeholder="Search by email or name…" prefix="Search" defaultValue=""/>
              </div>
              <Select
                value="all"
                onChange={()=>{}}
                options={[
                  { value: "all",     label: "All roles"   },
                  { value: "learner", label: "Learner"     },
                  { value: "admin",   label: "Admin"       },
                ]}
                className="min-w-[140px]"
              />
              <Select
                value="active"
                onChange={()=>{}}
                options={[
                  { value: "all",      label: "All statuses"   },
                  { value: "active",   label: "Active only"    },
                  { value: "inactive", label: "Deactivated"    },
                ]}
                className="min-w-[140px]"
              />
              <Button variant="primary" size="md" leftIcon="Search">Search</Button>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <AdTable
          columns={[
            { label: "Email" },
            { label: "Name" },
            { label: "Roles" },
            { label: "Status" },
            { label: "Last seen" },
            { label: "Subs.",   align: "right" },
            { label: "Actions", align: "right" },
          ]}
          footer={
            <div className="flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
              <span>Showing 1 – {AD_USERS.length} of 1,247</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" leftIcon="ChevronLeft" disabled>Prev</Button>
                <span className="font-mono">1 / 25</span>
                <Button variant="ghost" size="sm" rightIcon="ChevronRight">Next</Button>
              </div>
            </div>
          }
        >
          {AD_USERS.map(u => (
            <tr key={u.id} className={"hover:bg-slate-50 dark:hover:bg-white/5 " + (u.active ? "" : "opacity-60")}>
              <td className="px-4 py-3 font-mono text-[12.5px] text-slate-700 dark:text-slate-200">{u.email}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full brand-gradient-bg text-white inline-flex items-center justify-center text-[10.5px] font-bold">
                    {u.name.split(" ").map(w=>w[0]).slice(0,2).join("")}
                  </span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium">{u.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.roles.map(r => (
                    <Badge key={r} tone={r === "Admin" ? "fuchsia" : "neutral"}>{r}</Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                {u.active
                  ? <Badge tone="success">Active</Badge>
                  : <Badge tone="failed">Deactivated</Badge>}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.lastSeen}</td>
              <td className="px-4 py-3 text-right font-mono">{u.submissions}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button title={u.roles.includes("Admin") ? "Demote to Learner" : "Promote to Admin"}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Shield" size={14} className={u.roles.includes("Admin") ? "text-fuchsia-500" : ""}/>
                  </button>
                  <button title={u.active ? "Deactivate" : "Reactivate"}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name={u.active ? "UserX" : "UserCheck"} size={14} className={u.active ? "text-red-500" : "text-emerald-500"}/>
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

window.UsersPage_Ad = UsersPage_Ad;
