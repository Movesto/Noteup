import { Outlet } from "@remix-run/react";
import { useEffect, useState } from "react";
import { SearchBar } from "~/components/SearchBar";
import { Sidebar } from "~/components/layout/Sidebar";
import { ChevronsRightIcon } from "~/components/icons";
import { useArabicIme } from "~/hooks/useArabicIme";
import type { Folder, SidebarNote } from "~/types";

interface Props {
  notes: SidebarNote[];
  folders: Folder[];
  email: string;
}

/** The authenticated shell: sidebar + top navbar + routed content. */
export function AppLayout({ notes, folders, email }: Props) {
  // Open by default (desktop); collapse on small screens after mount so the
  // sidebar doesn't overlay content on phones. Server renders open to avoid a
  // hydration mismatch.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { imeEnabled, toggleIme } = useArabicIme();

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        notes={notes}
        folders={folders}
        email={email}
        open={sidebarOpen}
        imeEnabled={imeEnabled}
        onToggleIme={toggleIme}
        onCollapse={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-notion-bg min-w-0">
        {/* Desktop top navbar — holds the single global search on large screens */}
        <header className="hidden md:flex items-center px-4 py-2 border-b border-notion-border bg-notion-surface sticky top-0 z-10">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-1.5 mr-2 rounded-md text-notion-muted hover:bg-notion-hover hover:text-notion-text transition-colors shrink-0"
            >
              <ChevronsRightIcon className="w-4 h-4" />
            </button>
          )}
          <SearchBar className="w-full max-w-md mx-auto" />
        </header>

        {/* Mobile header bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-notion-border bg-notion-surface">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-notion-muted hover:bg-notion-hover transition-colors"
            aria-label="Open sidebar"
          >
            <ChevronsRightIcon className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-semibold text-notion-text">Second Brain</span>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
