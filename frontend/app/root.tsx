import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
  useRouteLoaderData,
  useRouteError,
} from "@remix-run/react";
import { captureRemixErrorBoundaryError } from "@sentry/remix";
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

// Runtime config exposed to the browser via window.ENV (see Layout). Kept to
// non-secret values only.
const clientEnv = () => ({
  SENTRY_DSN: process.env.SENTRY_DSN ?? null,
  NODE_ENV: process.env.NODE_ENV ?? "production",
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const isAuthPath = url.pathname.startsWith("/auth");
  const auth = await getAuthOptional(request);
  const env = clientEnv();

  if (!auth) {
    if (!isAuthPath) throw redirect("/auth/login");
    return json({ notes: [] as SidebarNote[], folders: [] as Folder[], email: null as string | null, token: null as string | null, env });
  }

  // Authenticated: redirect away from auth pages
  if (isAuthPath) throw redirect("/");

  try {
    const data = await getSidebarData(auth.token);
    return json({ notes: data.notes, folders: data.folders, email: auth.email as string | null, token: auth.token as string | null, env });
  } catch {
    return json({ notes: [] as SidebarNote[], folders: [] as Folder[], email: auth.email as string | null, token: auth.token as string | null, env });
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const env = data?.env ?? {};
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
        {/* Runtime config for the client bundle — must run before <Scripts />. */}
        <script dangerouslySetInnerHTML={{ __html: `window.ENV=${JSON.stringify(env)}` }} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  captureRemixErrorBoundaryError(error);
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-notion-text">Something went wrong</h1>
      <p className="mt-1 text-notion-muted">Please refresh the page and try again.</p>
    </div>
  );
}

export default function App() {
  const { notes, folders, email } = useLoaderData<typeof loader>();

  // Auth routes render without the shell — the loader redirects authenticated
  // users away from /auth/* and unauthenticated users away from everything else.
  if (!email) return <Outlet />;

  return <AppLayout notes={notes} folders={folders} email={email} />;
}
