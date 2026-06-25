import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_IME_MAP,
  getImeMap,
  getImeOverrides,
  resetImeOverrides,
  saveImeOverride,
} from "~/lib/arabicIme";

// Standard QWERTY rows (alpha only)
const ROWS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];
// Special characters that also have mappings
const SPECIALS = ["'"];

// For a given base key, returns the shifted variant (e.g. 'h' → 'H')
function shiftOf(k: string) {
  return k.toUpperCase() === k ? k : k.toUpperCase();
}

// Combining harakat (tashkeel) have no width on their own, so anchor them to a
// dotted circle (◌) for display — otherwise they render as a floating mark.
function displayGlyph(glyph: string) {
  if (!glyph) return glyph;
  return /^[ً-ْٰ]$/.test(glyph) ? `◌${glyph}` : glyph;
}

interface KeyProps {
  baseKey: string;
  map: Record<string, string>;
  editing: string | null;
  onStartEdit: (k: string) => void;
}

function Key({ baseKey, map, editing, onStartEdit }: KeyProps) {
  const shifted = shiftOf(baseKey);
  const hasShift = shifted !== baseKey; // only alpha keys have distinct shifted forms
  const lower = map[baseKey] ?? "";
  const upper = hasShift ? (map[shifted] ?? "") : "";
  const hasMapping = !!lower || !!upper;
  const isEditing = editing === baseKey;

  return (
    <button
      type="button"
      onClick={() => onStartEdit(baseKey)}
      title={`Click to edit mapping for '${baseKey}'${hasShift ? ` / '${shifted}'` : ""}`}
      className={`relative w-11 h-14 rounded-lg border text-center transition-colors select-none shrink-0
        ${isEditing
          ? "border-emerald-500 bg-emerald-900/20 ring-1 ring-emerald-500"
          : hasMapping
          ? "border-emerald-800/60 bg-notion-surface hover:border-emerald-600 hover:bg-notion-hover"
          : "border-notion-border bg-notion-hover hover:border-notion-muted"
        }
      `}
    >
      {/* Shifted Arabic (top) */}
      {upper && (
        <span className="absolute top-1 left-0 right-0 text-center text-[12px] text-notion-muted leading-none">
          {displayGlyph(upper)}
        </span>
      )}
      {/* Lowercase Arabic (center/bottom) */}
      <span
        className={`absolute ${upper ? "bottom-2" : "inset-0 flex items-center justify-center"} left-0 right-0 text-center text-[15px] leading-none`}
        style={{ bottom: upper ? "6px" : undefined }}
      >
        {lower ? displayGlyph(lower) : (
          <span className="text-[10px] text-notion-faint">—</span>
        )}
      </span>
      {/* English key label */}
      <span className="absolute top-0.5 right-1 text-[8px] text-notion-faint font-mono leading-none">
        {baseKey}
      </span>
    </button>
  );
}

interface EditPanelProps {
  baseKey: string;
  map: Record<string, string>;
  onSave: (key: string, value: string) => void;
  onClose: () => void;
}

function EditPanel({ baseKey, map, onSave, onClose }: EditPanelProps) {
  const shifted = shiftOf(baseKey);
  const hasShift = shifted !== baseKey;

  const [lowerVal, setLowerVal] = useState(map[baseKey] ?? "");
  const [upperVal, setUpperVal] = useState(hasShift ? (map[shifted] ?? "") : "");
  const lowerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lowerRef.current?.focus();
  }, [baseKey]);

  function commit() {
    onSave(baseKey, lowerVal);
    if (hasShift) onSave(shifted, upperVal);
    onClose();
  }

  return (
    <div className="mt-4 p-4 bg-notion-surface border border-notion-border rounded-lg max-w-xs">
      <p className="text-[12px] font-semibold text-notion-text mb-3">
        Edit mapping for{" "}
        <kbd className="bg-notion-hover px-1.5 py-0.5 rounded text-[11px] font-mono">
          {baseKey}
        </kbd>
        {hasShift && (
          <>
            {" "}and{" "}
            <kbd className="bg-notion-hover px-1.5 py-0.5 rounded text-[11px] font-mono">
              {shifted}
            </kbd>
          </>
        )}
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] text-notion-faint block mb-1">
            <kbd className="font-mono">{baseKey}</kbd> → Arabic character
          </span>
          <input
            ref={lowerRef}
            value={lowerVal}
            onChange={(e) => setLowerVal(e.target.value.slice(-1))}
            maxLength={2}
            dir="rtl"
            placeholder={DEFAULT_IME_MAP[baseKey] ?? "—"}
            className="w-full bg-notion-hover border border-notion-border rounded px-3 py-1.5 text-[16px] text-notion-text text-center focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
          />
        </label>

        {hasShift && (
          <label className="block">
            <span className="text-[11px] text-notion-faint block mb-1">
              <kbd className="font-mono">Shift+{baseKey}</kbd> → Arabic character
            </span>
            <input
              value={upperVal}
              onChange={(e) => setUpperVal(e.target.value.slice(-1))}
              maxLength={2}
              dir="rtl"
              placeholder={DEFAULT_IME_MAP[shifted] ?? "—"}
              className="w-full bg-notion-hover border border-notion-border rounded px-3 py-1.5 text-[16px] text-notion-text text-center focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </label>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={commit}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded text-[12px] font-medium text-white transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded text-[12px] text-notion-muted hover:bg-notion-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [map, setMap] = useState<Record<string, string>>({ ...DEFAULT_IME_MAP });
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  // Load from localStorage after mount (SSR-safe)
  useEffect(() => {
    setMap(getImeMap());
    setOverrides(getImeOverrides());
  }, []);

  function handleSave(key: string, value: string) {
    saveImeOverride(key, value);
    setMap(getImeMap());
    setOverrides(getImeOverrides());
  }

  function handleReset() {
    resetImeOverrides();
    setMap({ ...DEFAULT_IME_MAP });
    setOverrides({});
    setEditing(null);
  }

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="max-w-prose mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold text-notion-text mb-1">Settings</h1>
      <p className="text-[13px] text-notion-faint mb-10">
        Customize how Second Brain behaves.
      </p>

      {/* ── Arabic IME section ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[15px] font-semibold text-notion-text">
            Arabic IME Keyboard
          </h2>
          {overrideCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[12px] text-red-400 hover:text-red-300 transition-colors"
            >
              Reset to defaults ({overrideCount} override{overrideCount > 1 ? "s" : ""})
            </button>
          )}
        </div>
        <p className="text-[13px] text-notion-faint mb-5">
          When Arabic IME is enabled in the editor (ع button), typing these
          keys inserts the mapped Arabic character. Click any key to change its
          mapping.
        </p>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-[11px] text-notion-faint">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-emerald-800/60 bg-notion-surface inline-block" />
            Has mapping
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-notion-border bg-notion-hover inline-block" />
            No mapping
          </span>
          <span className="text-emerald-500">
            Top = Shift+key &nbsp;·&nbsp; Bottom = key
          </span>
        </div>

        {/* Keyboard rows */}
        <div className="space-y-1.5 overflow-x-auto pb-2">
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1.5" style={{ paddingLeft: ri === 1 ? "22px" : ri === 2 ? "44px" : 0 }}>
              {row.map((k) => (
                <Key
                  key={k}
                  baseKey={k}
                  map={map}
                  editing={editing}
                  onStartEdit={setEditing}
                />
              ))}
            </div>
          ))}

          {/* Special keys row */}
          <div className="flex gap-1.5 pt-1">
            {SPECIALS.map((k) => (
              <Key
                key={k}
                baseKey={k}
                map={map}
                editing={editing}
                onStartEdit={setEditing}
              />
            ))}
            <span className="text-[11px] text-notion-faint self-center ml-2">
              apostrophe (ء)
            </span>
          </div>
        </div>

        {/* Edit panel */}
        {editing !== null && (
          <EditPanel
            key={editing}
            baseKey={editing}
            map={map}
            onSave={handleSave}
            onClose={() => setEditing(null)}
          />
        )}

        {/* Full reference table */}
        <details className="mt-8">
          <summary className="text-[12px] text-notion-muted cursor-pointer hover:text-notion-text transition-colors select-none">
            Full mapping table
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="text-[12px] w-full border-collapse">
              <thead>
                <tr className="text-notion-faint">
                  <th className="text-left pb-2 pr-4 font-medium">Key</th>
                  <th className="text-left pb-2 pr-4 font-medium">Arabic</th>
                  <th className="text-left pb-2 pr-8 font-medium">Default</th>
                  <th className="text-left pb-2 pr-4 font-medium">Shift+Key</th>
                  <th className="text-left pb-2 pr-4 font-medium">Arabic</th>
                  <th className="text-left pb-2 font-medium">Default</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.flat().concat(SPECIALS).map((k) => {
                  const shifted = shiftOf(k);
                  const hasShift = shifted !== k;
                  const overridden = overrides[k] !== undefined || (hasShift && overrides[shifted] !== undefined);
                  return (
                    <tr
                      key={k}
                      className={`border-t border-notion-border ${overridden ? "text-emerald-400" : "text-notion-muted"}`}
                    >
                      <td className="py-1 pr-4 font-mono">{k}</td>
                      <td className="py-1 pr-4 text-[15px]">{map[k] ? displayGlyph(map[k]) : "—"}</td>
                      <td className="py-1 pr-8 text-notion-faint">{DEFAULT_IME_MAP[k] ? displayGlyph(DEFAULT_IME_MAP[k]) : "—"}</td>
                      <td className="py-1 pr-4 font-mono">{hasShift ? shifted : "—"}</td>
                      <td className="py-1 pr-4 text-[15px]">{hasShift && map[shifted] ? displayGlyph(map[shifted]) : "—"}</td>
                      <td className="py-1 text-notion-faint">{hasShift && DEFAULT_IME_MAP[shifted] ? displayGlyph(DEFAULT_IME_MAP[shifted]) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
