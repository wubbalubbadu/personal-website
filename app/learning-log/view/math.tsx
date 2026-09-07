import katex from "katex";

/**
 * KaTeX wrapper. `renderToString` is isomorphic (works in SSR and the browser),
 * so a plain component with dangerouslySetInnerHTML is the simplest safe option.
 * `throwOnError: false` makes a malformed formula render in red rather than
 * crash the page.
 */
export function Math({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: false,
    output: "html",
  });
  return (
    <span
      className={display ? "ll-math-block" : "ll-math-inline"}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
