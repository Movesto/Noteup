import { createCookieSessionStorage, redirect } from "@remix-run/node";

const DEV_SESSION_SECRET = "amor-dev-secret-change-in-production";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET must be set in production (the development default is not allowed)."
  );
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "amor_session",
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET ?? DEV_SESSION_SECRET],
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
});

export interface AuthSession {
  token: string;
  email: string;
}

export async function requireAuth(request: Request): Promise<AuthSession> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const token = session.get("token") as string | undefined;
  const email = session.get("email") as string | undefined;
  if (!token || !email) {
    throw redirect("/auth/login");
  }
  return { token, email };
}

export async function getAuthOptional(request: Request): Promise<AuthSession | null> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const token = session.get("token") as string | undefined;
  const email = session.get("email") as string | undefined;
  if (!token || !email) return null;
  return { token, email };
}

export async function createAuthSession(
  token: string,
  email: string,
  redirectTo: string
): Promise<Response> {
  const session = await sessionStorage.getSession();
  session.set("token", token);
  session.set("email", email);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  });
}

export async function destroyAuthSession(request: Request): Promise<Response> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/auth/login", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
