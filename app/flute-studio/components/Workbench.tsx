import "./workbench.css";

/**
 * The "viewport + side panel + bottom scrubber" layout shared by hands-on tools
 * (the simulation today; sound analysis, play-along, the 3D body model later).
 * A feature supplies the three regions; the frame, borders, and responsive
 * collapse live here once.
 */
export default function Workbench({
  viewport,
  panel,
  scrubber,
}: {
  viewport: React.ReactNode;
  panel: React.ReactNode;
  scrubber?: React.ReactNode;
}) {
  return (
    <div className="workbench">
      <div className="workbench__surface">
        <div className="workbench__viewport">{viewport}</div>
        <aside className="workbench__panel">{panel}</aside>
      </div>
      {scrubber && <div className="workbench__scrubber">{scrubber}</div>}
    </div>
  );
}
