import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { destroyAuthSession } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  return destroyAuthSession(request);
}

// Also handle GET: the GraphQL client redirects here when a stale session is
// detected, so visiting it must clear the cookie and land on the login page.
export async function loader({ request }: LoaderFunctionArgs) {
  return destroyAuthSession(request);
}
