import { json, type LoaderFunctionArgs } from "@remix-run/node";

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? "";
const BASE = "https://api.unsplash.com";

interface RawPhoto {
  id: string;
  urls: { regular: string; thumb: string };
  user: { name: string; links: { html: string } };
}

function toPhoto(p: RawPhoto) {
  return {
    id: p.id,
    url: p.urls.regular,
    thumb: p.urls.thumb,
    author: p.user.name,
    authorLink: p.user.links.html + "?utm_source=amor&utm_medium=referral",
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (!ACCESS_KEY) {
    return json({ error: "UNSPLASH_ACCESS_KEY not configured", photos: [] }, { status: 200 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "featured";
  const q = url.searchParams.get("q") ?? "";
  const headers = { Authorization: `Client-ID ${ACCESS_KEY}` };

  try {
    if (action === "random") {
      const res = await fetch(`${BASE}/photos/random?orientation=landscape&count=1`, { headers });
      const data = await res.json() as RawPhoto[];
      return json({ photos: Array.isArray(data) ? data.map(toPhoto) : [] });
    }

    if (action === "search" && q.trim()) {
      const res = await fetch(
        `${BASE}/search/photos?query=${encodeURIComponent(q)}&per_page=20&orientation=landscape`,
        { headers }
      );
      const data = await res.json() as { results: RawPhoto[] };
      return json({ photos: (data.results ?? []).map(toPhoto) });
    }

    // featured / default
    const res = await fetch(`${BASE}/photos?per_page=24&order_by=popular`, { headers });
    const data = await res.json() as RawPhoto[];
    return json({ photos: Array.isArray(data) ? data.map(toPhoto) : [] });
  } catch {
    return json({ error: "Failed to reach Unsplash", photos: [] });
  }
}
