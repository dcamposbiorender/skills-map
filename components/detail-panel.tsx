"use client";

import type { SkillWithMeta, Plugin } from "@/lib/types";

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
  "anthropics/knowledge-work-plugins": "bg-emerald-50 text-emerald-700",
  "anthropics/financial-services-plugins": "bg-emerald-50 text-emerald-700",
  "ComposioHQ/awesome-claude-plugins": "bg-purple-50 text-purple-700",
};

function isPlugin(item: SkillWithMeta | Plugin): item is Plugin {
  return "skills" in item && Array.isArray((item as Plugin).skills);
}

export function DetailPanel({
  item,
  onClose,
}: {
  item: SkillWithMeta | Plugin | null;
  onClose: () => void;
}) {
  if (!item) return null;

  const badgeClass = SOURCE_COLORS[item.source] || "bg-gray-50 text-gray-700";

  if (isPlugin(item)) {
    return (
      <div className="fixed inset-0 z-40" onClick={onClose}>
        <div className="absolute inset-0 bg-black/10" />
        <div
          className="detail-panel open absolute right-0 top-0 h-full w-[480px] bg-bg border-l border-ink shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink text-xl leading-none"
            >
              &times;
            </button>

            <div className="mb-4">
              <h2 className="text-xl font-medium">{item.name}</h2>
              <p className="text-ink-light text-[0.85rem]">
                by{" "}
                <a
                  href={`https://github.com/${item.author}`}
                  target="_blank"
                  rel="noopener"
                  className="border-b border-dotted border-rule hover:border-ink"
                >
                  {item.author}
                </a>
              </p>
            </div>

            <div className="flex items-center gap-3 mb-4 text-[0.8rem]">
              <span className="font-mono text-ink-light">
                {item.skills.length} skills
              </span>
              <span
                className="text-[0.7rem] tracking-wide uppercase text-ink-light"
                style={{ fontVariant: "small-caps" }}
              >
                {item.category}
              </span>
              <span className={`source-badge ${badgeClass}`}>
                {item.source}
              </span>
            </div>

            <p className="text-[0.9rem] leading-relaxed mb-4">{item.desc}</p>

            {/* Install command */}
            <div className="bg-bg-warm border border-rule-light rounded-sm p-3 mb-5">
              <label className="text-[0.7rem] text-ink-faint uppercase tracking-wider block mb-1">
                Install
              </label>
              <code className="font-mono text-[0.78rem] text-ink select-all">
                {item.installCmd}
              </code>
            </div>

            {/* Skills list */}
            <div className="mb-5">
              <label className="text-[0.7rem] text-ink-faint uppercase tracking-wider block mb-2">
                Skills ({item.skills.length})
              </label>
              <div className="space-y-2">
                {item.skills.map((s) => (
                  <div
                    key={s.name}
                    className="border border-rule-light rounded-sm p-2"
                  >
                    <div className="text-[0.85rem] font-medium">{s.name}</div>
                    {s.desc && (
                      <p className="text-[0.78rem] text-ink-light mt-0.5">
                        {s.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* MCP Servers */}
            {item.mcpServers.length > 0 && (
              <div className="mb-5">
                <label className="text-[0.7rem] text-ink-faint uppercase tracking-wider block mb-2">
                  MCP Servers
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {item.mcpServers.map((s) => (
                    <span
                      key={s}
                      className="text-[0.7rem] px-2 py-0.5 border border-rule-light text-ink-faint rounded-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connectors */}
            {item.connectors.length > 0 && (
              <div className="mb-5">
                <label className="text-[0.7rem] text-ink-faint uppercase tracking-wider block mb-2">
                  Connectors
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {item.connectors.map((c) => (
                    <span
                      key={c}
                      className="text-[0.7rem] px-2 py-0.5 border border-rule-light text-ink-faint rounded-sm"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-4 text-[0.85rem]">
              <a
                href={`https://github.com/${item.author}/${item.repo}`}
                target="_blank"
                rel="noopener"
                className="text-accent border-b border-dotted border-accent hover:border-ink hover:text-ink"
              >
                GitHub repo
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Skill detail (existing behavior, minus ratings/bans)
  const skill = item;
  const repoUrl = `https://github.com/${skill.author}/${skill.repo}`;
  const installCmd = `npx skills add ${skill.author}/${skill.name}`;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/10" />
      <div
        className="detail-panel open absolute right-0 top-0 h-full w-[480px] bg-bg border-l border-ink shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-ink-faint hover:text-ink text-xl leading-none"
          >
            &times;
          </button>

          <div className="mb-4">
            <h2 className="text-xl font-medium">{skill.name}</h2>
            <p className="text-ink-light text-[0.85rem]">
              by{" "}
              <a
                href={`https://github.com/${skill.author}`}
                target="_blank"
                rel="noopener"
                className="border-b border-dotted border-rule hover:border-ink"
              >
                {skill.author}
              </a>
            </p>
          </div>

          <div className="flex items-center gap-3 mb-4 text-[0.8rem]">
            <span className="font-mono text-ink-light">
              {skill.installs.toLocaleString()} installs
            </span>
            <span
              className="text-[0.7rem] tracking-wide uppercase text-ink-light"
              style={{ fontVariant: "small-caps" }}
            >
              {skill.category}
            </span>
            <span className={`source-badge ${badgeClass}`}>
              {skill.source}
            </span>
          </div>

          <p className="text-[0.9rem] leading-relaxed mb-4">{skill.desc}</p>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="text-[0.7rem] px-2 py-0.5 border border-rule-light text-ink-faint rounded-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="bg-bg-warm border border-rule-light rounded-sm p-3 mb-5">
            <label className="text-[0.7rem] text-ink-faint uppercase tracking-wider block mb-1">
              Install
            </label>
            <code className="font-mono text-[0.78rem] text-ink select-all">
              {installCmd}
            </code>
          </div>

          <div className="flex gap-4 text-[0.85rem]">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener"
              className="text-accent border-b border-dotted border-accent hover:border-ink hover:text-ink"
            >
              GitHub repo
            </a>
            <a
              href={`https://skills.sh/skills/${skill.author}/${skill.name}`}
              target="_blank"
              rel="noopener"
              className="text-ink-light border-b border-dotted border-rule hover:border-ink hover:text-ink"
            >
              skills.sh
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
