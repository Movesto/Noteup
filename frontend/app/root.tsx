import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import { getSidebarData } from "~/lib/api/sidebar.server";
import { getAuthOptional } from "~/lib/session.server";
import { AppLayout } from "~/components/layout/AppLayout";
import type { Folder, SidebarNote } from "~/types";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const meta: MetaFunction = () => [
  { title: "Second Brain" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const isAuthPath = url.pathname.startsWith("/auth");
  const auth = await getAuthOptional(request);

  if (!auth) {
    if (!isAuthPath) throw redirect("/auth/login");
    return json({ notes: [] as SidebarNote[], folders: [] as Folder[], email: null as string | null, token: null as string | null });
  }

  // Authenticated: redirect away from auth pages
  if (isAuthPath) throw redirect("/");

  try {
    const data = await getSidebarData(auth.token);
    return json({ notes: data.notes, folders: data.folders, email: auth.email as string | null, token: auth.token as string | null });
  } catch {
    return json({ notes: [] as SidebarNote[], folders: [] as Folder[], email: auth.email as string | null, token: auth.token as string | null });
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-notion-bg text-notion-text">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { notes, folders, email } = useLoaderData<typeof loader>();

  // Auth routes render without the shell — the loader redirects authenticated
  // users away from /auth/* and unauthenticated users away from everything else.
  if (!email) return <Outlet />;

  return <AppLayout notes={notes} folders={folders} email={email} />;
}
