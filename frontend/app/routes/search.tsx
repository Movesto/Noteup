import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useLoaderData, useNavigation } from "@remix-run/react";
import { SearchResults } from "~/components/SearchResults";
import { listOrphans, searchNotes } from "~/lib/api/search.server";
import { requireAuth } from "~/lib/session.server";
import type { OrphanNote, SearchResult } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAuth(request);
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") ?? "";
  const viewOrphans = url.searchParams.get("view") === "orphans";

  const [results, orphans] = await Promise.all([
    keyword
      ? searchNotes(token, keyword).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
    listOrphans(token).catch(() => [] as OrphanNote[]),
  ]);

  return json({ keyword, results, orphans, viewOrphans });
}

export default function SearchPage() {
  const { keyword, results, orphans, viewOrphans } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const searching = nav.state === "loading";

  return (
    <div className="max-w-prose mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold text-notion-text mb-1">
        {viewOrphans ? "Unlinked Notes" : "Search"}
      </h1>
      <p className="text-[13px] text-notion-faint mb-10">
        {viewOrphans
          ? "Notes with no incoming or outgoing wiki-links."
          : "Traces your note graph and surfaces every matching sentence. Use the search box in the top bar (or the sidebar on small screens)."}
      </p>

      {searching ? (
        <p className="text-[13px] text-notion-faint">Searching…</p>
      ) : (
        <>
          {keyword && (
            <section className="mb-10">
              <p className="text-[11px] font-semibold text-notion-faint uppercase tracking-wider mb-3">
                Results for &ldquo;{keyword}&rdquo;
              </p>
              <SearchResults keyword={keyword} results={results} />
            </section>
          )}

          <section>
            <p className="text-[11px] font-semibold text-notion-faint uppercase tracking-wider mb-3">
              Unlinked Pages
            </p>
            {orphans.length === 0 ? (
              <p className="text-[13px] text-emerald-600">
                All notes are connected — no isolated pages.
              </p>
            ) : (
              <div className="space-y-0.5">
                {orphans.map((note) => (
                  <Link
                    key={note.id}
                    to={`/notes/${note.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-notion-hover transition-colors group"
                  >
                    <span className="text-notion-faint text-[10px] shrink-0">
                      &#9632;
                    </span>
                    <span className="text-[13px] text-notion-muted group-hover:text-notion-text transition-colors">
                      {note.title}
                    </span>
                    {note.aliases.length > 0 && (
                      <span className="text-[11px] text-notion-faint ml-1">
                        {note.aliases.join(" · ")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
