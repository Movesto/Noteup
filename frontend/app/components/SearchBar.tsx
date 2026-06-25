import { useNavigate, useSearchParams } from "@remix-run/react";
import { useState } from "react";

/**
 * The single global search. Rendered in the top navbar on large screens and in
 * the sidebar on small screens (see root.tsx). Submitting routes to the full
 * search page at /search.
 */
export function SearchBar({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(() => params.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-notion-faint pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        data-no-ime
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search… (Enter for full search)"
        className="w-full bg-notion-hover text-notion-muted placeholder:text-notion-faint text-[12px] pl-7 pr-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700 transition-all"
      />
    </form>
  );
}
