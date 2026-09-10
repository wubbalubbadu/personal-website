import "./resource-list.css";

type Tone = "sage" | "pink" | "slate" | "sand";

export type ResourceRowProps = {
  title: string;
  desc?: string;
  /** Smaller line under the description — status, difficulty, "3 saved". */
  meta?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
  /** Overrides the trailing slot (default: a chevron for interactive rows). */
  trailing?: React.ReactNode;
  disabled?: boolean;
};

/** A card of rows — the studio's one list surface (library, exercises, saved). */
export function ResourceList({
  heading,
  children,
}: {
  heading?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="resource-list-section">
      {heading && <div className="resource-list-section__heading">{heading}</div>}
      <div className="resource-list">{children}</div>
    </section>
  );
}

/** One row. Renders as <a> (href), <button> (onClick), or <div> (neither). */
export function ResourceRow({
  title,
  desc,
  meta,
  icon,
  tone = "sage",
  href,
  onClick,
  saved,
  onToggleSave,
  trailing,
  disabled,
}: ResourceRowProps) {
  const interactive = !disabled && (Boolean(href) || Boolean(onClick));

  const body = (
    <>
      {icon != null && (
        <span className={`resource-row__icon tone-${tone}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="resource-row__copy">
        <strong>{title}</strong>
        {desc && <span>{desc}</span>}
        {meta && <small>{meta}</small>}
      </span>
      <span className="resource-row__end">
        {onToggleSave && (
          <button
            type="button"
            className={saved ? "resource-row__star is-saved" : "resource-row__star"}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleSave();
            }}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M10 2.8l2.2 4.55 5 .73-3.6 3.53.85 4.99L10 14.2l-4.45 2.4.85-4.99L2.8 8.08l5-.73L10 2.8z" />
            </svg>
          </button>
        )}
        <span className="resource-row__trailing">
          {trailing ?? (interactive && !onToggleSave ? "›" : null)}
        </span>
      </span>
    </>
  );

  const className =
    "resource-row" + (disabled ? " is-disabled" : "") + (interactive ? " is-interactive" : "");

  if (href && !disabled) {
    return (
      <a className={className} href={href}>
        {body}
      </a>
    );
  }
  if (onClick && !disabled) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
