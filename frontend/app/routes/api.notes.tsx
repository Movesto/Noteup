import { type ActionFunctionArgs, json } from "@remix-run/node";
import { deleteNote } from "~/lib/api/notes.server";
import { requireAuth } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get("intent") as string;

  if (intent === "delete") {
    const id = form.get("id") as string;
    await deleteNote(token, id);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Unknown intent" }, { status: 400 });
}
