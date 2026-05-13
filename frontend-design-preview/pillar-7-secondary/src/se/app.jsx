/* Pillar 7 — App entry */

function SeApp() {
  const { SePageSwitcherPill } = window.SeShared;
  const [page, setPage] = React.useState("analytics");
  const [dark, setDark] = useTheme();

  const pages = {
    "analytics":    () => <AnalyticsPage_Se/>,
    "achievements": () => <AchievementsPage_Se/>,
    "activity":     () => <ActivityPage_Se/>,
    "settings":     () => <SettingsPage_Se dark={dark} setDark={setDark}/>,
  };

  return (
    <>
      {(pages[page] || pages.analytics)()}
      <SePageSwitcherPill active={page} setActive={setPage}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SeApp/>);
