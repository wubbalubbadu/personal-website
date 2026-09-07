import { Fragment, type ReactNode } from "react";
import { Math } from "./math";

/**
 * Minimal inline markup for content strings. Deliberately tiny — no block
 * parsing, no links. Supported, and nestable one useful level deep
 * (e.g. **bold with $math$** or *italic `code`*):
 *   **bold**    *italic*    `code`    $math$
 * `code` and `$math$` are leaves; bold/italic recurse.
 */

const TOKEN = /(\*\*[^*]+?\*\*|\*[^*\n]+?\*|`[^`]+?`|\$[^$\n]+?\$)/g;

export function RichText({ children }: { children: string }): ReactNode {
  const parts = children.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i}>
              <RichText>{part.slice(2, -2)}</RichText>
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          return <Math key={i} tex={part.slice(1, -1)} />;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i}>
              <RichText>{part.slice(1, -1)}</RichText>
            </em>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Prose with blank-line-separated paragraphs. */
export function Prose({ text }: { text: string }): ReactNode {
  return (
    <>
      {text.split(/\n{1,}/).map((para, i) => (
        <p key={i}>
          <RichText>{para}</RichText>
        </p>
      ))}
    </>
  );
}
