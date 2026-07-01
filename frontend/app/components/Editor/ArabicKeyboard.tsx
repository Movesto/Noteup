import { useEffect, useRef, useState } from "react";
import { getImeMap, TASHKEEL_GROUPS } from "~/lib/arabicIme";

// QWERTY rows — the letters cover the whole transliteration map; Shift variants
// (emphatics, hamza forms, harakat) show as the small glyph in each key's corner.
const ROWS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

// Harakat are combining marks — anchor them to a dotted circle so they render.
const HARAKAT = TASHKEEL_GROUPS.find((g) => g.label === "Harakat")?.chars ?? [];

interface Props {
  /** Insert a glyph at the editor cursor (keeps focus). */
  onInsert: (glyph: string) => void;
}

/**
 * On-screen Arabic keyboard shown while the transliteration IME is enabled.
 *
 * It teaches the Latin→Arabic mapping the way a typing tutor does: each key
 * shows the Arabic letter it produces, and the key lights up as you type. Keys
 * are also clickable to insert directly. Desktop-only (hidden below `lg`) and
 * collapsible; the map reflects the user's custom overrides via getImeMap().
 */
export function ArabicKeyboard({ onInsert }: Props) {
  const [map, setMap] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setMap(getImeMap());
    setCollapsed(localStorage.getItem("arabic_keyboard_collapsed") === "true");
    const refresh = () => setMap(getImeMap());
    window.addEventListener("arabic-ime-change", refresh);
    return () => window.removeEventListener("arabic-ime-change", refresh);
  }, []);

  // Flash the matching key as the user types (the "typing practice" feel).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      setActiveKey(e.key.toLowerCase());
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setActiveKey(null), 220);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(clearTimer.current);
    };
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("arabic_keyboard_collapsed", String(next));
      return next;
    });
  }

  // Insert without stealing the editor selection (mousedown default is blur).
  function press(glyph: string) {
    if (glyph) onInsert(glyph);
  }

  function KeyCap({ baseKey }: { baseKey: string }) {
    const shifted = baseKey.toUpperCase();
    const lower = map[baseKey] ?? "";
    const upper = shifted !== baseKey ? (map[shifted] ?? "") : "";
    const isActive = activeKey === baseKey;
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press(lower)}
        title={upper ? `${baseKey} → ${lower}   ·   Shift+${baseKey} → ${upper}` : `${baseKey} → ${lower}`}
        className={`relative w-9 h-10 rounded-md border text-center shrink-0 transition-colors select-none
          ${isActive
            ? "border-emerald-500 bg-emerald-600/30 text-white"
            : "border-notion-border bg-notion-surface hover:bg-notion-hover text-notion-text"}`}
      >
        {upper && (
          <span className="absolute top-0.5 left-0 right-0 text-center text-[9px] text-notion-faint leading-none">
            {upper}
          </span>
        )}
        <span className={`absolute left-0 right-0 text-center text-[15px] leading-none ${upper ? "bottom-1.5" : "top-1/2 -translate-y-1/2"}`}>
          {lower || <span className="text-[9px] text-notion-faint">·</span>}
        </span>
        <span className="absolute bottom-0.5 right-1 text-[8px] text-notion-faint font-mono leading-none">
          {baseKey}
        </span>
      </button>
    );
  }

  return (
    <div className="hidden lg:block fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="pointer-events-auto bg-notion-bg/95 backdrop-blur border border-notion-border rounded-xl shadow-2xl px-3 py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-notion-faint select-none">
            Arabic keyboard <span className="text-notion-faint/70">— keys light up as you type</span>
          </span>
          <button
            type="button"
            onClick={toggle}
            className="text-[11px] text-notion-muted hover:text-notion-text transition-colors px-1.5 py-0.5 rounded hover:bg-notion-hover"
          >
            {collapsed ? "Show keyboard ▴" : "Hide ▾"}
          </button>
        </div>

        {!collapsed && (
          <div dir="ltr" className="space-y-1">
            {ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1 justify-center" style={{ paddingLeft: ri === 1 ? 16 : ri === 2 ? 40 : 0 }}>
                {row.map((k) => <KeyCap key={k} baseKey={k} />)}
              </div>
            ))}

            {/* Hamza + harakat strip */}
            <div className="flex gap-1 justify-center pt-1 mt-1 border-t border-notion-border">
              <KeyCap baseKey="'" />
              {HARAKAT.map((h) => (
                <button
                  key={h.glyph}
                  type="button"
                  title={h.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => press(h.glyph)}
                  className="w-9 h-10 rounded-md border border-notion-border bg-notion-surface hover:bg-notion-hover text-notion-text text-[15px] shrink-0 transition-colors"
                >
                  {`◌${h.glyph}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
