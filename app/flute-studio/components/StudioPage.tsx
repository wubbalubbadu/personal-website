import "./studio-page.css";

type StudioPageProps = {
  title: string;
  eyebrow?: string;
  intro?: React.ReactNode;
  /** No longer rendered (the top nav already covers navigation) — kept so existing callers don't need changing. */
  backHref?: string;
  backLabel?: string;
  /** Buttons / controls aligned to the title row. */
  actions?: React.ReactNode;
  /** "narrow" (~980px, reading) or "wide" (~1120px, workbenches). */
  width?: "narrow" | "wide";
  children: React.ReactNode;
};

/**
 * The shared frame every studio detail page sits in: scroll container, header
 * (eyebrow · title · intro · actions), and a centered content column. Pages
 * compose their body as children — no page re-implements the frame.
 */
export default function StudioPage({
  title,
  eyebrow,
  intro,
  actions,
  width = "narrow",
  children,
}: StudioPageProps) {
  return (
    <main className="studio-page" data-width={width}>
      <div className="studio-page__inner">
        <header className="studio-page__head">
          <div className="studio-page__titlerow">
            <div>
              {eyebrow && <p className="studio-page__eyebrow">{eyebrow}</p>}
              <h1>{title}</h1>
            </div>
            {actions && <div className="studio-page__actions">{actions}</div>}
          </div>
          {intro && <p className="studio-page__intro">{intro}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}
