import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { listNoteStubs } from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  const notes = await listNoteStubs(token).catch(() => []);
  return json({ notes });
}
