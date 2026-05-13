/* Pillar 8 — App entry */

function AdApp() {
  const { AdPageSwitcherPill } = window.AdShared;
  const [page, setPage] = React.useState("dashboard");
  const [dark, setDark] = useTheme();
  void dark; void setDark;

  const pages = {
    "dashboard":  () => <AdminDashboard_Ad/>,
    "users":      () => <UsersPage_Ad/>,
    "tasks":      () => <TasksPage_Ad/>,
    "questions":  () => <QuestionsPage_Ad/>,
    "analytics":  () => <AnalyticsPage_Ad/>,
  };

  return (
    <>
      {(pages[page] || pages.dashboard)()}
      <AdPageSwitcherPill active={page} setActive={setPage}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdApp/>);
