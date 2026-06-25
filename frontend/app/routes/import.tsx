import { type ActionFunctionArgs, json } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import {
  importNotion,
  importPdf,
  type ImportSummary,
  type PdfImportMode,
} from "~/lib/api/import.server";
import { requireAuth } from "~/lib/session.server";

type ActionData = { summary: ImportSummary } | { error: string };

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isZip(file: File): boolean {
  return /zip/i.test(file.type) || /\.zip$/i.test(file.name);
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return json<ActionData>(
      { error: "Please choose a Notion export .zip or a PDF file." },
      { status: 400 }
    );
  }

  // Route by file type: PDFs go to the PDF importer, .zip to the Notion importer.
  if (!isPdf(file) && !isZip(file)) {
    return json<ActionData>(
      { error: "Unsupported file. Upload a Notion export (.zip) or a PDF (.pdf)." },
      { status: 400 }
    );
  }

  const rawMode = String(form.get("pdfMode") ?? "text");
  const pdfMode: PdfImportMode =
    rawMode === "ocr" || rawMode === "embed" ? rawMode : "text";

  try {
    const summary = isPdf(file)
      ? await importPdf(token, file, pdfMode)
      : await importNotion(token, file);
    return json<ActionData>({ summary });
  } catch (e) {
    return json<ActionData>({ error: (e as Error).message }, { status: 400 });
  }
}

export default function ImportPage() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const importing = nav.state !== "idle";
  const summary = actionData && "summary" in actionData ? actionData.summary : null;
  const error = actionData && "error" in actionData ? actionData.error : null;

  return (
    <div className="max-w-prose mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold text-notion-text mb-1">Import</h1>
      <p className="text-[13px] text-notion-faint mb-4">
        Bring in a <span className="text-notion-muted">Notion export (.zip)</span> or any{" "}
        <span className="text-notion-muted">PDF (.pdf)</span>.
      </p>
      <ul className="text-[13px] text-notion-faint mb-8 space-y-1.5 list-disc pl-5">
        <li>
          <strong className="text-notion-muted">Notion</strong>: Settings → Export content →
          Export all workspace content, choose <span className="text-notion-muted">Markdown &amp; CSV</span>,
          then upload the <code className="bg-notion-hover px-1 rounded">.zip</code>. Sub-pages become
          folders and internal links become wiki-links.
        </li>
        <li>
          <strong className="text-notion-muted">PDF</strong>: a short document becomes a single
          note. A long or structured one (with a table of contents or chapter headings) becomes a
          folder, split into one note per section.
        </li>
      </ul>

      {summary ? (
        <div className="bg-notion-surface border border-emerald-800 rounded-lg px-5 py-4">
          <p className="text-[14px] font-semibold text-emerald-400 mb-1">Import complete</p>
          <p className="text-[13px] text-notion-muted">
            Added <strong>{summary.notes}</strong> {summary.notes === 1 ? "note" : "notes"} and{" "}
            <strong>{summary.folders}</strong> {summary.folders === 1 ? "folder" : "folders"}.
          </p>
          {(summary.notesSkipped > 0 || summary.foldersSkipped > 0) && (
            <p className="text-[12px] text-notion-faint mt-1">
              Skipped {summary.notesSkipped} already-imported{" "}
              {summary.notesSkipped === 1 ? "note" : "notes"}
              {summary.foldersSkipped > 0 && (
                <>
                  {" "}and {summary.foldersSkipped}{" "}
                  {summary.foldersSkipped === 1 ? "folder" : "folders"}
                </>
              )}
              .
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <Link
              to="/"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-md text-sm font-medium text-white transition-colors"
            >
              View workspace
            </Link>
            <Link
              to="/import"
              reloadDocument
              className="px-4 py-2 bg-notion-hover hover:bg-notion-border rounded-md text-sm font-medium text-notion-muted hover:text-notion-text transition-colors"
            >
              Import another
            </Link>
          </div>
        </div>
      ) : (
        <Form method="post" encType="multipart/form-data" className="flex flex-col gap-5">
          <div>
            <label className="block text-[12px] font-medium text-notion-muted mb-1.5">
              Notion export (.zip) or PDF <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              name="file"
              accept=".zip,application/zip,.pdf,application/pdf"
              required
              className="block w-full text-[13px] text-notion-muted file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-700 file:text-white hover:file:bg-emerald-600 file:cursor-pointer"
            />
          </div>

          <fieldset className="border border-notion-border rounded-lg p-3.5">
            <legend className="px-1.5 text-[12px] font-medium text-notion-muted">
              PDF options <span className="text-notion-faint">(ignored for Notion .zip)</span>
            </legend>
            <div className="space-y-2.5">
              {[
                {
                  value: "text",
                  title: "Extract text",
                  desc: "Default. Reads the text — a short PDF becomes one note, a long/structured one a folder of notes.",
                },
                {
                  value: "embed",
                  title: "Keep as PDF — embed the whole file as one note",
                  desc: "No conversion. The original PDF is saved into a single note you can open and read. Best for Arabic or scanned PDFs whose text can't be extracted.",
                },
                {
                  value: "ocr",
                  title: "OCR (read text from page images)",
                  desc: "Scans each page as an image to pull out text. Slower; accuracy varies, especially for Arabic.",
                },
              ].map((opt, i) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="pdfMode"
                    value={opt.value}
                    defaultChecked={i === 0}
                    className="mt-0.5 accent-emerald-600 w-3.5 h-3.5 shrink-0"
                  />
                  <span className="leading-snug">
                    <span className="block text-[12px] text-notion-muted">{opt.title}</span>
                    <span className="block text-[11px] text-notion-faint">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-[13px] text-red-400">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={importing}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-md text-sm font-medium text-white transition-colors"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          <p className="text-[11px] text-notion-faint">
            Large exports can take a moment. Don&apos;t close the tab while importing.
          </p>
        </Form>
      )}
    </div>
  );
}
