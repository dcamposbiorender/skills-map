import { BrowseView } from "@/components/browse-view";
import type { SkillWithMeta, Skill, Plugin } from "@/lib/types";
import skillsData from "@/data/skills.json";
import pluginsData from "@/data/plugins.json";

export default function HomePage() {
  const skills: SkillWithMeta[] = (skillsData as unknown as Skill[]).map((s) => ({
    ...s,
    id: `${s.author}/${s.name}`,
  }));

  const plugins = pluginsData as unknown as Plugin[];

  const skillSources = new Set(skills.map((s) => s.source)).size;

  return (
    <>
      <header className="border-b border-ink pb-3 mb-2">
        <h1 className="text-3xl font-normal tracking-wide mb-0.5">
          Agent Skills &amp; Plugins Map
        </h1>
        <p className="text-[0.9rem] text-ink-light italic">
          {skills.length} skills, {plugins.length} plugins across{" "}
          {new Set(skills.map((s) => s.category)).size} categories,{" "}
          {new Set(skills.map((s) => s.author)).size} authors &mdash;{" "}
          {skillSources} sources, March 2026
        </p>
      </header>

      <BrowseView skills={skills} plugins={plugins} />

      <footer className="mt-8 pt-4 border-t border-rule-light text-[0.8rem] text-ink-faint">
        Install any skill:{" "}
        <code className="font-mono text-[0.75rem] bg-bg-warm px-1.5 py-0.5 rounded-sm">
          npx skills add owner/repo
        </code>{" "}
        &middot; Source:{" "}
        <a
          href="https://skills.sh"
          className="border-b border-dotted border-rule hover:border-ink hover:text-ink"
        >
          skills.sh
        </a>
      </footer>
    </>
  );
}
