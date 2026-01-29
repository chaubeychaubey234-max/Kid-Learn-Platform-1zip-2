// Server-side helper for calling the Tavily Search API
// - Keeps API key on server only (never exposed to client)
// - Adds "for kids" to the query to bias results towards kid-friendly content
// - Asks the API to not include images or answer completions
// - Returns a normalized list of { title, url, content }

export interface TavilyResult {
  title: string;
  url: string;
  content?: string;
}

export async function tavilySearch(q: string, limit = 6): Promise<{ results: TavilyResult[]; source: string; }> {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is not configured on the server");
  }

  const body = {
    q: `${q} for kids`,
    limit,
    // Being explicit about not asking for open-ended answers or images
    includeImages: false,
    includeAnswers: false,
  };

  const resp = await fetch("https://api.tavily.com/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  // Handle 404 (endpoint not found) by falling back to a safe, whitelisted
  // source (Wikipedia). This is defensive so the feature still works in
  // development if the Tavily endpoint or API key permissions differ.
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    // If endpoint not found, try a safe fallback (Wikipedia search).
    if (resp.status === 404) {
      console.warn("Tavily API returned 404; falling back to Wikipedia search");
      const wikiResults = await fallbackWikipediaSearch(q, limit);
      return { results: wikiResults, source: "wikipedia" };
    }
    throw new Error(`Tavily API error: ${resp.status} ${resp.statusText} - ${text}`);
  }

  const json = await resp.json().catch(() => ({}));

  // The API shape may vary; normalize common fields safely
  const items = json.results || json.items || json.data || [];

  if (!Array.isArray(items)) return [];

  const normalized: TavilyResult[] = items.map((it: any) => {
    return {
      title: it.title || it.headline || it.name || "Untitled",
      url: it.url || it.link || it.href || "",
      content: it.snippet || it.summary || it.description || "",
    };
  }).filter((r: TavilyResult) => r.url);

  return { results: normalized.slice(0, limit), source: "tavily" };
}

// Fallback: use Wikipedia's public search API to provide safe, educational results
// when the Tavily API endpoint isn't available. This helper is intentionally
// conservative and returns results only from wikipedia.org.
async function fallbackWikipediaSearch(q: string, limit: number): Promise<TavilyResult[]> {
  // Search using the raw query (appending "for kids" can reduce matches on Wikipedia)
  const wikiQuery = encodeURIComponent(q);
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${wikiQuery}&utf8=1&format=json&srlimit=${limit}`;

  try {
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) return [];
    const json = await resp.json().catch(() => ({}));
    const items = json?.query?.search || [];

    const results: TavilyResult[] = items.map((it: any) => {
      const title = it.title;
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      return {
        title,
        url: pageUrl,
        content: it.snippet ? it.snippet.replace(/<[^>]+>/g, '') : '',
      };
    });

    return results.slice(0, limit);
  } catch (err) {
    console.error("Wikipedia fallback failed:", err);
    return [];
  }
}
