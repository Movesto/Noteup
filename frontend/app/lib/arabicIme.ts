export const DEFAULT_IME_MAP: Record<string, string> = {
  // ── Core consonants ──────────────────────────────────────────────
  a: "ا", b: "ب", t: "ت", v: "ث", j: "ج", H: "ح", x: "خ",
  d: "د", V: "ذ", r: "ر", z: "ز", s: "س", c: "ش", S: "ص",
  D: "ض", T: "ط", Z: "ظ", e: "ع", g: "غ", f: "ف", q: "ق",
  k: "ك", l: "ل", m: "م", n: "ن", w: "و", h: "ه", y: "ي",
  L: "لا",
  // ── Hamza & its carriers ─────────────────────────────────────────
  "'": "ء",   // bare hamza
  A: "أ",     // hamza on alef (above)
  I: "إ",     // hamza on alef (below)
  O: "آ",     // alef madda
  u: "ؤ",     // hamza on waw
  i: "ئ",     // hamza on ya
  // ── Other letter forms ───────────────────────────────────────────
  p: "ة",     // ta marbuta (Buckwalter convention)
  Y: "ى",     // alef maqsura
  o: "ٱ",     // alef wasla (e.g. ٱلْحَمْدُ)
  // ── Harakat / tashkeel (combine with the preceding letter) ───────
  F: "َ",      // fatha
  N: "ُ",      // damma
  K: "ِ",      // kasra
  J: "ْ",      // sukun
  W: "ّ",      // shadda
  X: "ً",      // fathatan (tanwin fath)
  C: "ٌ",      // dammatan (tanwin damm)
  R: "ٍ",      // kasratan (tanwin kasr)
  E: "ٰ",      // dagger / superscript alef (e.g. ٱلْعَـٰلَمِينَ)
};

/**
 * Characters offered by the editor's Tashkeel palette — clickable insertion for
 * everything that's awkward to reach by transliteration (diacritics, Arabic
 * punctuation, Arabic-Indic digits). Each group is a labelled row of glyphs.
 * The dotted-circle (◌) prefix on harakat shows where they attach to a letter.
 */
export const TASHKEEL_GROUPS: { label: string; chars: { glyph: string; name: string }[] }[] = [
  {
    label: "Harakat",
    chars: [
      { glyph: "َ", name: "Fatha" },
      { glyph: "ُ", name: "Damma" },
      { glyph: "ِ", name: "Kasra" },
      { glyph: "ْ", name: "Sukun" },
      { glyph: "ّ", name: "Shadda" },
      { glyph: "ً", name: "Tanwin fath" },
      { glyph: "ٌ", name: "Tanwin damm" },
      { glyph: "ٍ", name: "Tanwin kasr" },
      { glyph: "ٰ", name: "Dagger alef" },
    ],
  },
  {
    label: "Letters",
    chars: [
      { glyph: "ء", name: "Hamza" },
      { glyph: "أ", name: "Alef hamza above" },
      { glyph: "إ", name: "Alef hamza below" },
      { glyph: "آ", name: "Alef madda" },
      { glyph: "ٱ", name: "Alef wasla" },
      { glyph: "ؤ", name: "Waw hamza" },
      { glyph: "ئ", name: "Ya hamza" },
      { glyph: "ة", name: "Ta marbuta" },
      { glyph: "ى", name: "Alef maqsura" },
    ],
  },
  {
    label: "Punctuation",
    chars: [
      { glyph: "،", name: "Comma" },
      { glyph: "؛", name: "Semicolon" },
      { glyph: "؟", name: "Question mark" },
      { glyph: "«", name: "Open quote" },
      { glyph: "»", name: "Close quote" },
      { glyph: "ـ", name: "Tatweel" },
    ],
  },
  {
    label: "Digits",
    chars: "٠١٢٣٤٥٦٧٨٩".split("").map((g, i) => ({ glyph: g, name: `Digit ${i}` })),
  },
];

const STORAGE_KEY = "arabic_ime_overrides";

export function getImeMap(): Record<string, string> {
  if (typeof window === "undefined") return { ...DEFAULT_IME_MAP };
  try {
    const overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
    return { ...DEFAULT_IME_MAP, ...overrides };
  } catch {
    return { ...DEFAULT_IME_MAP };
  }
}

export function getImeOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveImeOverride(key: string, arabic: string): void {
  const overrides = getImeOverrides();
  if (!arabic || arabic === DEFAULT_IME_MAP[key]) {
    delete overrides[key];
  } else {
    overrides[key] = arabic;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function resetImeOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
}
