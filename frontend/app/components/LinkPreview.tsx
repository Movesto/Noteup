interface Props {
  target: string;
  sentences: string[] | null;
  x: number;
  y: number;
  onMouseLeave: () => void;
}

/**
 * Floating tooltip shown when hovering a [[WikiLink]] in the editor.
 * Receives the first 3 sentences of the target note (or null while loading).
 * Positioned with fixed coords so it appears over the editor without clipping.
 */
export function LinkPreview({ target, sentences, x, y, onMouseLeave }: Props) {
  return (
    <div
      className="wiki-preview fixed z-50 bg-notion-surface border border-notion-border rounded-lg p-3 shadow-2xl w-72 pointer-events-auto"
      style={{ left: Math.min(x, window.innerWidth - 300), top: y }}
      onMouseLeave={onMouseLeave}
    >
      <p className="text-[12px] font-semibold text-emerald-400 mb-2 truncate">{target}</p>

      {sentences === null ? (
        <p className="text-[12px] text-notion-faint italic">Loading…</p>
      ) : sentences.length === 0 ? (
        <p className="text-[12px] text-notion-faint italic">No preview available.</p>
      ) : (
        <ul className="space-y-1.5">
          {sentences.map((s, i) => (
            <li key={i} className="text-[12px] text-notion-muted leading-relaxed">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
