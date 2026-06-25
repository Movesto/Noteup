import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createNote, listNoteStubs } from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stubs = await listNoteStubs(token).catch(() => []);
  const existing = stubs.find((n) => n.title === today);
  if (existing) return redirect(`/notes/${existing.id}`);

  const created = await createNote(token, { title: today, content: "" });
  return redirect(`/notes/${created.id}`);
}

export default function DailyNote() {
  return null;
}
