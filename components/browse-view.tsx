"use client";

import { useState } from "react";
import type { SkillWithMeta, Plugin } from "@/lib/types";
import { SkillsTable } from "./skills-table";
import { PluginsTable } from "./plugins-table";

type Tab = "skills" | "plugins";

export function BrowseView({
  skills,
  plugins,
}: {
  skills: SkillWithMeta[];
  plugins: Plugin[];
}) {
  const [tab, setTab] = useState<Tab>("skills");

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-6 pt-3 pb-1 text-[0.9rem]">
        {(
          [
            ["skills", `skills (${skills.length})`],
            ["plugins", `plugins (${plugins.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`font-serif pb-1 border-b-2 transition-colors ${
              tab === key
                ? "text-ink font-semibold border-ink"
                : "text-ink-light border-dotted border-rule hover:text-ink hover:border-ink-light"
            }`}
            style={{ fontVariant: "small-caps", letterSpacing: "0.06em" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tab === "skills" ? (
        <SkillsTable skills={skills} />
      ) : (
        <PluginsTable plugins={plugins} />
      )}
    </div>
  );
}
