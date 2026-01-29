import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KidsCard } from "@/components/kids-card";
import { Search, ExternalLink } from "lucide-react";

interface Result {
  title: string;
  url: string;
  content?: string;
}

export default function SafeExplore() {
  const { getAuthHeader } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [source, setSource] = useState<string | null>(null);

  // Perform a safe search; backend enforces safety rules and whitelist
  const doSearch = async () => {
    setLoading(true);
    setBlocked(false);
    setReason("");
    setError("");
    setResults([]);
    setSource(null);

    try {
      const res = await fetch(`/api/safe-search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeader(),
      });

      const sourceHeader = res.headers.get('x-safe-search-source');
      if (sourceHeader) setSource(sourceHeader);
      if (!res.ok) {
        setError("Server error while searching — try again later.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Response shape: { blocked: boolean, results: [{title,url,content}] }
      if (data.blocked) {
        setBlocked(true);
        setReason(data.reason || "Query blocked by safety filters");
      } else {
        setResults(Array.isArray(data.results) ? data.results : []);
      }
    } catch (err) {
      console.error("Safe search fetch failed:", err);
      setError("Network error while searching — check your connection.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
          Safe Explore
        </h1>
        <p className="text-muted-foreground">Search the web — kid-friendly and curated.</p>
      </div>

      <div className="flex gap-2 max-w-xl mx-auto">
        <Input
          placeholder="Search the safe web..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && doSearch()}
          className="text-lg"
        />
        <Button onClick={doSearch} size="lg">
          <Search className="w-5 h-5" />
        </Button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Searching safely...</p>
        </div>
      )}

      {blocked && !loading && (
        <div className="max-w-xl mx-auto">
          <KidsCard className="p-6 text-center bg-yellow-50">
            <h3 className="font-bold text-xl">Search blocked</h3>
            <p className="mt-2 text-muted-foreground">{reason}</p>
          </KidsCard>
        </div>
      )}

      {!!error && !loading && (
        <div className="max-w-xl mx-auto">
          <KidsCard className="p-6 text-center bg-red-50">
            <h3 className="font-bold text-xl">Error</h3>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </KidsCard>
        </div>
      )}

      {source && !loading && (
        <div className="max-w-xl mx-auto">
          <p className="text-sm text-muted-foreground text-center">Results provided by: <strong>{source}</strong></p>
        </div>
      )}

      {!loading && !blocked && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">No results yet. Try a different search!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((r) => (
          <KidsCard key={r.url} className="p-4 hover:shadow-md">
            <div className="flex justify-between items-start gap-2">
              <div>
                <a href={r.url} target="_blank" rel="noreferrer" className="font-bold text-lg hover:underline">
                  {r.title}
                </a>
                <p className="mt-2 text-muted-foreground text-sm line-clamp-3">{r.content}</p>
              </div>
              <a href={r.url} target="_blank" rel="noreferrer" className="ml-2 p-2 rounded-md hover:bg-slate-50">
                <ExternalLink className="w-5 h-5 text-slate-600" />
              </a>
            </div>
          </KidsCard>
        ))}
      </div>
    </div>
  );
}
