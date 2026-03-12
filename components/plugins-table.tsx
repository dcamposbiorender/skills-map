"use client";

import { useState, useMemo } from "react";
import type { Plugin } from "@/lib/types";
import { filterPlugins, sortPlugins } from "@/lib/search";
import { SearchBar } from "./search-bar";
import { CategoryPills } from "./category-pills";
import { DetailPanel } from "./detail-panel";

const SOURCE_COLORS: Record<string, string> = {
  "anthropics/knowledge-work-plugins": "bg-emerald-50 text-emerald-700",
  "anthropics/financial-services-plugins": "bg-emerald-50 text-emerald-700",
  "ComposioHQ/awesome-claude-plugins": "bg-purple-50 text-purple-700",
};

type PluginSortKey = "name" | "author" | "skills" | "category";

export function PluginsTable({ plugins }: { plugins: Plugin[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [author, setAuthor] = useState("");
  const [sortKey, setSortKey] = useState<PluginSortKey>("skills");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selected, setSelected] = useState<Plugin | null>(null);

  const categories = useMemo(
    () => [...new Set(plugins.map((p) => p.category))].sort(),
    [plugins]
  );
  const authors = useMemo(
    () => [...new Set(plugins.map((p) => p.author))].sort(),
    [plugins]
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of plugins) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [plugins]);

  const filtered = useMemo(() => {
    const f = filterPlugins(plugins, { search, category, author });
    return sortPlugins(f, sortKey, sortDir);
  }, [plugins, search, category, author, sortKey, sortDir]);

  function handleSort(key: PluginSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === "skills" ? -1 : 1);
    }
  }

  function arrow(key: PluginSortKey) {
    if (sortKey !== key) return "";
    return sortDir === 1 ? " \u25B2" : " \u25BC";
  }

  const totalSkills = filtered.reduce((sum, p) => sum + p.skills.length, 0);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-baseline py-3 border-b border-rule-light mb-1 text-[0.85rem]">
        <SearchBar onTextSearch={setSearch} />
        <label className="text-ink-faint text-[0.8rem] tracking-widest ml-auto">
          author
        </label>
        <select
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="font-serif text-[0.9rem] border border-rule bg-white px-2 py-1 rounded-sm text-ink focus:outline-none focus:border-ink-light"
        >
          <option value="">all authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="text-ink-faint">|</span>
        <span className="text-ink-faint text-[0.8rem] tracking-widest">
          sort
        </span>
        {(["skills", "name", "author", "category"] as PluginSortKey[]).map(
          (key) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`font-serif text-[0.85rem] px-1 py-0.5 border-b transition-colors ${
                sortKey === key
                  ? "text-ink font-semibold border-ink"
                  : "text-ink-light border-dotted border-rule hover:text-ink"
              }`}
            >
              {key}
            </button>
          )
        )}
      </div>

      {/* Category pills */}
      <CategoryPills
        categories={categories}
        counts={categoryCounts}
        active={category}
        onSelect={setCategory}
      />

      {/* Summary */}
      <div className="flex gap-8 py-2 text-[0.8rem] text-ink-faint tabular-nums">
        <span>
          <strong className="text-ink-light font-medium">
            {filtered.length}
          </strong>{" "}
          plugins
        </span>
        <span>
          <strong className="text-ink-light font-medium">{totalSkills}</strong>{" "}
          skills
        </span>
        <span>
          <strong className="text-ink-light font-medium">
            {new Set(filtered.map((p) => p.category)).size}
          </strong>{" "}
          categories
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr>
              <th className="font-medium text-left p-[0.4rem_0.6rem] border-b-[1.5px] border-ink text-ink-light text-[0.78rem] tracking-wide sticky top-0 bg-bg z-2 w-10 text-right pr-4 cursor-default">
                #
              </th>
              {(
                [
                  ["name", "plugin"],
                  ["author", "author"],
                  ["skills", "skills"],
                  ["category", "category"],
                ] as [PluginSortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`font-medium text-left p-[0.4rem_0.6rem] border-b-[1.5px] border-ink text-ink-light text-[0.78rem] tracking-wide cursor-pointer select-none sticky top-0 bg-bg z-2 whitespace-nowrap hover:text-ink ${
                    key === "skills" ? "text-right" : ""
                  }`}
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                  <span className="text-[0.65rem] ml-0.5">{arrow(key)}</span>
                </th>
              ))}
              <th
                className="font-medium text-left p-[0.4rem_0.6rem] border-b-[1.5px] border-ink text-ink-light text-[0.78rem] tracking-wide sticky top-0 bg-bg z-2"
                style={{ fontVariant: "small-caps", letterSpacing: "0.06em" }}
              >
                description
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((plugin, i) => (
              <tr
                key={`${plugin.author}/${plugin.name}`}
                className="skill-row border-b border-rule-light"
                onClick={() => setSelected(plugin)}
              >
                <td className="p-[0.5rem_0.6rem] text-right pr-4 text-ink-faint text-[0.8rem]">
                  {i + 1}
                </td>
                <td className="p-[0.5rem_0.6rem] font-medium text-[0.88rem] min-w-[180px]">
                  <span className="border-b border-rule/50 hover:border-ink transition-colors">
                    {plugin.name}
                  </span>
                  <span
                    className={`source-badge ml-2 ${SOURCE_COLORS[plugin.source] || "bg-gray-50 text-gray-700"}`}
                  >
                    {plugin.source.split("/").pop()}
                  </span>
                </td>
                <td className="p-[0.5rem_0.6rem] text-ink-light text-[0.82rem] whitespace-nowrap">
                  {plugin.author}
                </td>
                <td className="p-[0.5rem_0.6rem] text-right whitespace-nowrap font-mono text-[0.78rem] tracking-tight">
                  {plugin.skills.length}
                </td>
                <td
                  className="p-[0.5rem_0.6rem] text-[0.78rem] text-ink-light whitespace-nowrap"
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.04em",
                  }}
                >
                  {plugin.category}
                </td>
                <td className="p-[0.5rem_0.6rem] text-ink-light text-[0.82rem] max-w-[420px]">
                  {plugin.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-ink-faint text-[0.9rem]">
          No plugins match your filters. Try broadening your search.
        </div>
      )}

      {/* Detail panel */}
      <DetailPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
