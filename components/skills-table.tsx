"use client";

import { useState, useMemo } from "react";
import type { SkillWithMeta } from "@/lib/types";
import { filterSkills, sortSkills } from "@/lib/search";
import { SearchBar } from "./search-bar";
import { CategoryPills } from "./category-pills";
import { DetailPanel } from "./detail-panel";

const SOURCE_COLORS: Record<string, string> = {
  "skills.sh": "bg-blue-50 text-blue-700",
  composio: "bg-purple-50 text-purple-700",
  alirezarezvani: "bg-amber-50 text-amber-700",
  "get-zeked": "bg-green-50 text-green-700",
  "claude-office-skills": "bg-rose-50 text-rose-700",
  every: "bg-teal-50 text-teal-700",
  refoundai: "bg-indigo-50 text-indigo-700",
  microsoft: "bg-sky-50 text-sky-700",
  openclaw: "bg-orange-50 text-orange-700",
};

type SortKey = "installs" | "name" | "author" | "category";

export function SkillsTable({ skills }: { skills: SkillWithMeta[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [author, setAuthor] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("installs");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selected, setSelected] = useState<SkillWithMeta | null>(null);

  const categories = useMemo(
    () => [...new Set(skills.map((s) => s.category))].sort(),
    [skills]
  );
  const authors = useMemo(
    () => [...new Set(skills.map((s) => s.author))].sort(),
    [skills]
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const visible = filterSkills(skills, {  });
    for (const s of visible) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [skills]);

  const filtered = useMemo(() => {
    const f = filterSkills(skills, {
      search,
      category,
      author,
    });
    return sortSkills(f, sortKey, sortDir);
  }, [skills, search, category, author, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === "installs" ? -1 : 1);
    }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === 1 ? " \u25B2" : " \u25BC";
  }

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
        {(["installs", "name", "author", "category"] as SortKey[]).map(
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
          skills
        </span>
        <span>
          <strong className="text-ink-light font-medium">
            {new Set(filtered.map((s) => s.category)).size}
          </strong>{" "}
          categories
        </span>
        <span>
          <strong className="text-ink-light font-medium">
            {new Set(filtered.map((s) => s.author)).size}
          </strong>{" "}
          authors
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
                  ["name", "skill"],
                  ["author", "author"],
                  ["installs", "installs"],
                  ["category", "category"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`font-medium text-left p-[0.4rem_0.6rem] border-b-[1.5px] border-ink text-ink-light text-[0.78rem] tracking-wide cursor-pointer select-none sticky top-0 bg-bg z-2 whitespace-nowrap hover:text-ink ${
                    key === "installs" ? "text-right" : ""
                  }`}
                  style={{ fontVariant: "small-caps", letterSpacing: "0.06em" }}
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
            {filtered.map((skill, i) => (
              <tr
                key={skill.id}
                className="skill-row border-b border-rule-light"
                onClick={() => setSelected(skill)}
              >
                <td className="p-[0.5rem_0.6rem] text-right pr-4 text-ink-faint text-[0.8rem]">
                  {i + 1}
                </td>
                <td className="p-[0.5rem_0.6rem] font-medium text-[0.88rem] min-w-[180px]">
                  <span className="border-b border-rule/50 hover:border-ink transition-colors">
                    {skill.name}
                  </span>
                  <span
                    className={`source-badge ml-2 ${SOURCE_COLORS[skill.source] || "bg-gray-50 text-gray-700"}`}
                  >
                    {skill.source}
                  </span>
                </td>
                <td className="p-[0.5rem_0.6rem] text-ink-light text-[0.82rem] whitespace-nowrap">
                  {skill.author}
                </td>
                <td className="p-[0.5rem_0.6rem] text-right whitespace-nowrap font-mono text-[0.78rem] tracking-tight">
                  {skill.installs.toLocaleString()}
                </td>
                <td
                  className="p-[0.5rem_0.6rem] text-[0.78rem] text-ink-light whitespace-nowrap"
                  style={{
                    fontVariant: "small-caps",
                    letterSpacing: "0.04em",
                  }}
                >
                  {skill.category}
                </td>
                <td className="p-[0.5rem_0.6rem] text-ink-light text-[0.82rem] max-w-[420px]">
                  {skill.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-ink-faint text-[0.9rem]">
          No skills match your filters. Try broadening your search.
        </div>
      )}

      {/* Detail panel */}
      <DetailPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
