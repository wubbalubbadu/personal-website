import "./back-button.css";

/**
 * The back arrow, drawn rather than typed: a "‹" character sits on the text
 * baseline and floats above or below the label beside it depending on the
 * font, so back links read as loose text. See back-button.css.
 */
export default function BackChevron(){
  return <svg className="back-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4.5 6.5 10l5.5 5.5"/></svg>;
}
