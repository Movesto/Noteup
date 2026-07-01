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

const MIN_SCALE = 0.8;
const MAX_SCALE = 2.4;
const POS_KEY = "arabic_keyboard_pos";
const SCALE_KEY = "arabic_keyboard_scale";
const COLLAPSED_KEY = "arabic_keyboard_collapsed";

interface Props {
  /** Insert a glyph at the editor cursor (keeps focus). */
  onInsert: (glyph: string) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * On-screen Arabic keyboard shown while the transliteration IME is enabled.
 *
 * Teaches the Latin→Arabic mapping like a typing tutor: each key shows the
 * Arabic it produces and lights up as you type; keys are clickable to insert.
 * The panel can be dragged anywhere (grab the header) and resized (drag the
 * corner); position + size + collapsed state persist in localStorage. Desktop
 * only (hidden below `lg`). The map reflects custom overrides via getImeMap().
 */
export function ArabicKeyboard({ onInsert }: Props) {
  const [map, setMap] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const sizeRef = useRef<{ px: number; s: number } | null>(null);

  useEffect(() => {
    setMap(getImeMap());
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
    const savedScale = parseFloat(localStorage.getItem(SCALE_KEY) || "");
    if (!Number.isNaN(savedScale)) setScale(clamp(savedScale, MIN_SCALE, MAX_SCALE));
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      setPos(p && typeof p.x === "number" ? p : defaultPos());
    } catch {
      setPos(defaultPos());
    }
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

  function defaultPos() {
    return { x: Math.max(16, window.innerWidth / 2 - 230), y: window.innerHeight - 250 };
  }

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  // ── Drag to move (header) ──────────────────────────────────────────────
  function onDragDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    setPos({
      x: clamp(d.ox + (e.clientX - d.px), 0, window.innerWidth - 80),
      y: clamp(d.oy + (e.clientY - d.py), 0, window.innerHeight - 40),
    });
  }
  function onDragUp() {
    if (dragRef.current && pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
    dragRef.current = null;
  }

  // ── Drag to resize (corner grip) ───────────────────────────────────────
  function onSizeDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sizeRef.current = { px: e.clientX, s: scale };
  }
  function onSizeMove(e: React.PointerEvent) {
    const s = sizeRef.current;
    if (!s) return;
    setScale(clamp(s.s + (e.clientX - s.px) / 200, MIN_SCALE, MAX_SCALE));
  }
  function onSizeUp() {
    if (sizeRef.current) localStorage.setItem(SCALE_KEY, String(scale));
    sizeRef.current = null;
  }

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

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, transform: `scale(${scale})`, transformOrigin: "top left" }
    : { left: "50%", bottom: 16, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "bottom center" };

  return (
    <div className="hidden lg:block fixed z-40" style={style}>
      <div className="relative bg-notion-bg/95 backdrop-blur border border-notion-border rounded-xl shadow-2xl px-3 py-2">
        {/* Header — drag handle */}
        <div
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          className="flex items-center justify-between mb-1.5 cursor-move touch-none"
        >
          <span className="text-[11px] text-notion-faint select-none flex items-center gap-1.5">
            <span className="text-notion-faint/70">⠿</span>
            Arabic keyboard
          </span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggle}
            className="text-[11px] text-notion-muted hover:text-notion-text transition-colors px-1.5 py-0.5 rounded hover:bg-notion-hover"
          >
            {collapsed ? "Show ▴" : "Hide ▾"}
          </button>
        </div>

        {!collapsed && (
          <>
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

            {/* Resize grip — drag to scale */}
            <div
              onPointerDown={onSizeDown}
              onPointerMove={onSizeMove}
              onPointerUp={onSizeUp}
              title="Drag to resize"
              className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize touch-none text-notion-faint hover:text-notion-muted"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M15 11 11 15M15 6 6 15M15 1 1 15" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
