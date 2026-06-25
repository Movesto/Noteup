import { useEffect, useRef, useState } from "react";

interface NoteStub {
  id: string;
  title: string;
  aliases: string[];
}

interface SuggestState {
  query: string;
  x: number;
  y: number;
  from: number;
  to: number;
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: (title: string, from: number, to: number) => void;
}

export function WikiSuggest({ containerRef, onSelect }: Props) {
  const [stubs, setStubs] = useState<NoteStub[]>([]);
  const [suggest, setSuggest] = useState<SuggestState | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    fetch("/api/note-titles")
      .then((r) => r.json())
      .then((d) => setStubs(d.notes ?? []));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handler(e: Event) {
      const detail = (e as CustomEvent<SuggestState | null>).detail;
      setSuggest(detail);
      setActiveIdx(0);
    }
    el.addEventListener("wiki-suggest", handler);
    return () => el.removeEventListener("wiki-suggest", handler);
  }, [containerRef]);

  const q = suggest?.query.toLowerCase() ?? "";
  const filtered = suggest
    ? stubs
        .filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.aliases.some((a) => a.toLowerCase().includes(q))
        )
        .slice(0, 8)
    : [];

  // Keyboard navigation — capture phase so we intercept before ProseMirror
  useEffect(() => {
    if (!suggest || filtered.length === 0) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered[activeIdx]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(filtered[activeIdx].title, suggest!.from, suggest!.to);
          setSuggest(null);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSuggest(null);
      }
    }
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [suggest, activeIdx, filtered, onSelect]);

  if (!suggest || filtered.length === 0) return null;

  return (
    <ul
      style={{ position: "fixed", left: suggest.x, top: suggest.y + 6, zIndex: 9999 }}
      className="w-64 bg-notion-surface border border-notion-border rounded-lg shadow-xl py-1 overflow-hidden"
    >
      {filtered.map((stub, i) => (
        <li key={stub.id}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(stub.title, suggest.from, suggest.to);
              setSuggest(null);
            }}
            className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors flex items-center gap-2 ${
              i === activeIdx
                ? "bg-notion-hover text-notion-text"
                : "text-notion-muted hover:bg-notion-hover hover:text-notion-text"
            }`}
          >
            <span className="text-notion-faint text-[10px] shrink-0">&#9632;</span>
            <span className="truncate">{stub.title}</span>
            {stub.aliases.length > 0 && (
              <span className="ml-auto text-[11px] text-notion-faint shrink-0 truncate max-w-[80px]">
                {stub.aliases[0]}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
