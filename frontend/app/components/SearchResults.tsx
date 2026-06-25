import { Link } from "@remix-run/react";
import type { SearchResult } from "~/types";

interface Props {
  keyword: string;
  results: SearchResult[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlighted({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={i}
            className="bg-emerald-900/60 text-emerald-300 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function SearchResults({ keyword, results }: Props) {
  if (results.length === 0) {
    return (
      <p className="text-[13px] text-notion-faint">
        No matches found for &ldquo;{keyword}&rdquo;.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((r) => (
        <div
          key={r.noteId}
          className="bg-notion-surface border border-notion-border rounded-lg px-4 py-3"
        >
          <Link
            to={`/notes/${r.noteId}`}
            className="text-[13px] font-semibold text-notion-text hover:text-emerald-400 transition-colors block mb-2"
          >
            {r.noteTitle}
          </Link>
          <ul className="space-y-1.5">
            {r.sentences.map((s, i) => (
              <li
                key={i}
                className="text-[13px] text-notion-muted leading-relaxed border-l-2 border-notion-border pl-3"
              >
                <Highlighted text={s} keyword={keyword} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
