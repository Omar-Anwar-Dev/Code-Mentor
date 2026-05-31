# Diagrams — Code Mentor First Term Documentation

This folder holds the **Mermaid source** for every figure in `project_docmentation.md` (Chapters 2 and 4). The same source is also embedded inline in the markdown file — these standalone copies exist so the diagrams can be rendered to PNG/SVG without parsing the prose file.

## Files

| File | Figure | Section |
|---|---|---|
| `fig-2.1-wbs.mmd` | Fig 2.1 — Work Breakdown Structure (M0 → M4) | §2.4.2 |
| `fig-2.2-network.mmd` | Fig 2.2 — PERT Activity Network (with critical path) | §2.5.2 |
| `fig-2.3-gantt.mmd` | Fig 2.3 — Gantt Chart Oct 2025 – Jun 2026 | §2.5.3 |
| `fig-4.1-block.mmd` | Fig 4.1 — System Block Diagram | §4.2.2 |
| `fig-4.2a-usecase-simple.mmd` | Fig 4.2a — Simplified Use Case Diagram | §4.3.1 |
| `fig-4.3-context.mmd` | Fig 4.3 — C4 Level 1 System Context | §4.6.2 |
| `fig-4.4-dfd-level0.mmd` | Fig 4.4 — DFD Level 0 | §4.7.3 |
| `fig-4.5-dfd-level1.mmd` | Fig 4.5 — DFD Level 1 (P1 → P6) | §4.7.4 |
| `fig-4.6-erd-simplified.mmd` | Fig 4.6 — Simplified ERD | §4.8.2 |

## Rendering to PNG / SVG (for the .docx pass)

Install [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) once:

```bash
npm install -g @mermaid-js/mermaid-cli
```

Render a single diagram:

```bash
mmdc -i fig-2.1-wbs.mmd -o fig-2.1-wbs.png -t dark -b transparent --scale 2
```

Render all diagrams in one go (PowerShell):

```powershell
Get-ChildItem *.mmd | ForEach-Object {
    $png = $_.BaseName + ".png"
    mmdc -i $_.FullName -o $png -t dark -b transparent --scale 2
}
```

The rendered PNGs are what the team embeds into the .docx output when the second pass is run.

## Updating a diagram

1. Edit the relevant `.mmd` file in this folder
2. Copy the updated source back into `docs/project_docmentation.md` so the inline view stays in sync
3. Re-render the PNG (when the .docx pass is run)
