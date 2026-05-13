/* ─────────────────────────────────────────────────────────────────
   Pillar 6 — App entry: PAGES list + PageSwitcher pill + render
   ───────────────────────────────────────────────────────────────── */

function PcApp() {
  const { PcPageSwitcherPill } = window.PcShared;
  const [page, setPage] = React.useState("profile");
  const [dark, setDark] = useTheme();

  const pages = [
    { key: "profile",      render: () => <ProfilePage_Pc      onGotoLearningCv={() => setPage("learning-cv")} onGotoProfileEdit={() => setPage("profile-edit")}/> },
    { key: "profile-edit", render: () => <ProfileEditPage_Pc  onBackToProfile={() => setPage("profile")}/> },
    { key: "learning-cv",  render: () => <LearningCvPage_Pc   onGotoPublicCv={() => setPage("public-cv")}/> },
    { key: "public-cv",    render: () => <PublicCvPage_Pc     dark={dark} setDark={setDark}/> },
  ];

  const current = pages.find(p => p.key === page) || pages[0];

  return (
    <>
      {current.render()}
      <PcPageSwitcherPill active={page} setActive={setPage}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PcApp/>);
