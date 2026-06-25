const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export interface ImportSummary {
  folders: number;
  notes: number;
  foldersSkipped: number;
  notesSkipped: number;
}

/** Forwards an uploaded file to a backend import endpoint with the user's token. */
async function postImport(
  token: string,
  path: string,
  file: File,
  fields?: Record<string, string>
): Promise<ImportSummary> {
  const body = new FormData();
  body.set("file", file, file.name);
  for (const [k, v] of Object.entries(fields ?? {})) body.set(k, v);

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => d.detail as string | undefined)
      .catch(() => undefined);
    throw new Error(detail ?? `Import failed (${res.status})`);
  }

  return (await res.json()) as ImportSummary;
}

/** Forwards a Notion export .zip to the backend importer. */
export function importNotion(token: string, file: File): Promise<ImportSummary> {
  return postImport(token, "/import/notion", file);
}

export type PdfImportMode = "text" | "ocr" | "embed";

/** Forwards a PDF to the backend importer.
 *  - "text"  : extract the text layer (note, or folder of notes if large)
 *  - "ocr"   : rasterize + OCR pages (scanned / no-text-layer PDFs)
 *  - "embed" : store the whole PDF as one note's inline viewer (no extraction) */
export function importPdf(
  token: string,
  file: File,
  mode: PdfImportMode = "text"
): Promise<ImportSummary> {
  return postImport(token, "/import/pdf", file, { mode });
}
