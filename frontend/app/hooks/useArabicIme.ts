import { useEffect, useState } from "react";
import { getImeMap } from "~/lib/arabicIme";

/**
 * Global Arabic IME. When enabled, intercepts keystrokes on plain inputs and
 * textareas (not the rich-text editor) and substitutes the mapped Arabic glyph.
 * Persists to localStorage and broadcasts an `arabic-ime-change` event.
 */
export function useArabicIme() {
  const [imeEnabled, setImeEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("arabic_ime_enabled") === "true"
  );

  useEffect(() => {
    if (!imeEnabled) return;
    function handleKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const isPlainInput =
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
        !el.closest(".ProseMirror") &&
        !(el as HTMLInputElement).dataset.noIme;
      if (!isPlainInput) return;
      const arabic = getImeMap()[e.key];
      if (!arabic) return;
      e.preventDefault();
      const input = el as HTMLInputElement;
      const s = input.selectionStart ?? input.value.length;
      const en = input.selectionEnd ?? input.value.length;
      // Use the native setter so React's synthetic events fire correctly.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(input, input.value.slice(0, s) + arabic + input.value.slice(en));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.setSelectionRange(s + arabic.length, s + arabic.length);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [imeEnabled]);

  function toggleIme() {
    const next = !imeEnabled;
    setImeEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("arabic_ime_enabled", String(next));
      window.dispatchEvent(
        new CustomEvent("arabic-ime-change", { detail: { enabled: next } })
      );
    }
  }

  return { imeEnabled, toggleIme };
}
