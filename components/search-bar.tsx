"use client";

import { useState, useRef } from "react";

interface SearchResult {
  name: string;
  author: string;
  reason: string;
}

export function SearchBar({
  onTextSearch,
}: {
  onTextSearch: (q: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [aiResults, setAiResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleInput(val: string) {
    setQuery(val);
    // Debounced text search
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onTextSearch(val), 150);
  }

  async function handleAISearch() {
    if (!query.trim()) return;
    setLoading(true);
    setShowAI(true);
    setAiResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResults(data.results);
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-baseline gap-3">
        <label className="text-ink-faint text-[0.8rem] tracking-widest font-[small-caps]">
          search
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
          placeholder='Type to filter, or press Enter for AI search...'
          className="font-serif text-[0.9rem] border border-rule bg-white px-3 py-1 rounded-sm text-ink w-[320px] focus:outline-none focus:border-ink-light"
        />
        <button
          onClick={handleAISearch}
          disabled={loading || !query.trim()}
          className="font-serif text-[0.8rem] text-accent border-b border-dotted border-accent hover:text-ink disabled:opacity-40 disabled:cursor-default"
        >
          {loading ? "searching..." : "AI search"}
        </button>
      </div>

      {showAI && (
        <div className="absolute top-full left-0 mt-2 w-[500px] bg-white border border-rule shadow-lg z-50 p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[0.75rem] text-ink-faint tracking-widest uppercase">
              AI Recommendations
            </span>
            <button
              onClick={() => setShowAI(false)}
              className="text-ink-faint hover:text-ink text-sm"
            >
              close
            </button>
          </div>
          {loading && (
            <p className="text-ink-faint text-[0.85rem] italic">
              Analyzing skills...
            </p>
          )}
          {aiResults && aiResults.length === 0 && (
            <p className="text-ink-faint text-[0.85rem]">
              No matching skills found.
            </p>
          )}
          {aiResults &&
            aiResults.map((r, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-rule-light last:border-0">
                <div className="text-[0.9rem] font-medium">
                  {r.author}/{r.name}
                </div>
                <p className="text-[0.8rem] text-ink-light mt-0.5">
                  {r.reason}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
