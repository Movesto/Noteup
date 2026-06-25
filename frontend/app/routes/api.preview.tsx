import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { getNoteByTitle } from "~/lib/api/notes.server";
import { getAuthOptional } from "~/lib/session.server";

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentences(text: string, n: number): string[] {
  return text
    .split(/(?<=[.!?؟])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, n);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getAuthOptional(request);
  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? "";

  if (!title) return json({ target: "", sentences: [] });

  const noteByTitle = await getNoteByTitle(auth?.token, title);
  if (!noteByTitle) return json({ target: title, sentences: [] });

  const sentences = firstSentences(toPlainText(noteByTitle.content), 3);
  return json({ target: title, sentences });
}
