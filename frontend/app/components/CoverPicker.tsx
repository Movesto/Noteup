import { useEffect, useRef, useState } from "react";

export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  author: string;
  authorLink: string;
}

interface Props {
  onSelect: (photo: UnsplashPhoto) => void;
  onClose: () => void;
}

export function CoverPicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [noKey, setNoKey] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; });

  async function load(action: string, q = "") {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action });
      if (q) params.set("q", q);
      const res = await fetch(`/api/unsplash?${params}`);
      const data: { photos: UnsplashPhoto[]; error?: string } = await res.json();
      if (data.error?.includes("not configured")) setNoKey(true);
      setPhotos(data.photos ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load("featured"); }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (q.trim()) load("search", q.trim());
      else load("featured");
    }, 420);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 z-50 bg-notion-surface border border-notion-border rounded-b-xl shadow-2xl"
      style={{ top: "100%" }}
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-notion-border">
        <svg className="w-4 h-4 text-notion-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          data-no-ime
          autoFocus
          value={query}
          onChange={handleQueryChange}
          placeholder="Search Unsplash…"
          className="flex-1 bg-transparent text-[13px] text-notion-text placeholder:text-notion-faint focus:outline-none"
        />
        <span className="text-[11px] text-notion-faint shrink-0">
          {query.trim() ? "Results" : "Featured"}
        </span>
      </div>

      {/* Photo grid */}
      <div className="p-3 max-h-72 overflow-y-auto">
        {noKey && (
          <div className="text-center py-6">
            <p className="text-[12px] text-notion-faint mb-1">Unsplash key not configured.</p>
            <p className="text-[11px] text-notion-faint">
              Set <code className="bg-notion-hover px-1 rounded">UNSPLASH_ACCESS_KEY</code> in your <code className="bg-notion-hover px-1 rounded">.env</code>, then restart.
            </p>
          </div>
        )}

        {!noKey && loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-notion-border border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {!noKey && !loading && photos.length === 0 && (
          <p className="text-center text-[12px] text-notion-faint py-8">No photos found</p>
        )}

        {!noKey && !loading && photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onSelect(photo)}
                className="group relative rounded-md overflow-hidden aspect-video focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <img
                  src={photo.thumb}
                  alt={`Photo by ${photo.author}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end">
                  <span className="w-full px-1.5 py-1 text-[9px] text-white/0 group-hover:text-white/80 transition-colors truncate leading-none pb-1.5">
                    {photo.author}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unsplash attribution */}
      <div className="px-4 py-2 border-t border-notion-border text-center">
        <a
          href="https://unsplash.com/?utm_source=amor&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-notion-faint hover:text-notion-muted transition-colors"
        >
          Photos from Unsplash
        </a>
      </div>
    </div>
  );
}
