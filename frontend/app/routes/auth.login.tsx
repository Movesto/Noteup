import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { createAuthSession, getAuthOptional } from "~/lib/session.server";
import { redirect } from "@remix-run/node";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await getAuthOptional(request);
  if (auth) throw redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = (form.get("email") as string)?.toLowerCase().trim();
  const password = form.get("password") as string;

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data.detail ?? "Login failed." }, { status: res.status });
    }
    return createAuthSession(data.token, data.email, "/");
  } catch {
    return json({ error: "Unable to reach the server. Please try again." }, { status: 503 });
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-notion-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg">
            SB
          </div>
          <span className="text-xl font-semibold text-notion-text">Second Brain</span>
        </div>

        {/* Card */}
        <div className="bg-notion-surface border border-notion-border rounded-xl p-8 shadow-xl">
          <h1 className="text-[22px] font-semibold text-notion-text mb-1">Welcome back</h1>
          <p className="text-[13px] text-notion-faint mb-7">Sign in to your account</p>

          <Form method="post" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[12px] font-medium text-notion-muted">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full bg-notion-hover border border-notion-border rounded-lg px-3.5 py-2.5 text-[13px] text-notion-text placeholder:text-notion-faint focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12px] font-medium text-notion-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full bg-notion-hover border border-notion-border rounded-lg px-3.5 py-2.5 text-[13px] text-notion-text placeholder:text-notion-faint focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
            </div>

            {actionData?.error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3.5 py-2.5 text-[12px] text-red-400">
                {actionData.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-[13px] transition-colors mt-1 shadow-sm"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </Form>
        </div>

        <p className="text-center text-[12px] text-notion-faint mt-5">
          Don&apos;t have an account?{" "}
          <Link to="/auth/signup" className="text-emerald-500 hover:text-emerald-400 transition-colors font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
