import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import * as Sentry from "@sentry/remix";

declare global {
  interface Window {
    ENV?: { SENTRY_DSN?: string | null; NODE_ENV?: string };
  }
}

// Browser error + performance monitoring. The DSN is injected at runtime by the
// root loader (window.ENV.SENTRY_DSN); when unset, Sentry stays inactive.
const dsn = window.ENV?.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: window.ENV?.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
  });
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>,
  );
});
