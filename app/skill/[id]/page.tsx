import { notFound } from "next/navigation";
import skillsData from "@/data/skills.json";
import type { Skill } from "@/lib/types";

// Dynamic route: /skill/author/name encoded as /skill/[id]
// where id = "author--name" (double dash separator)

export default async function SkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [author, ...nameParts] = id.split("--");
  const name = nameParts.join("--");

  const skill = (skillsData as Skill[]).find(
    (s) =>
      s.author.toLowerCase() === author.toLowerCase() &&
      s.name.toLowerCase() === name.toLowerCase()
  );

  if (!skill) return notFound();

  const repoUrl = `https://github.com/${skill.author}/${skill.repo}`;
  const installCmd = `npx skills add ${skill.author}/${skill.name}`;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <a
        href="/"
        className="text-[0.85rem] text-ink-light border-b border-dotted border-rule hover:text-ink"
      >
        &larr; Back to all skills
      </a>

      <div className="mt-6">
        <h1 className="text-2xl font-medium mb-1">{skill.name}</h1>
        <p className="text-ink-light text-[0.9rem] mb-4">
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

        <div className="flex gap-4 mb-4 text-[0.8rem] text-ink-light">
          <span className="font-mono">
            {skill.installs.toLocaleString()} installs
          </span>
          <span style={{ fontVariant: "small-caps" }}>{skill.category}</span>
        </div>

        <p className="text-[0.95rem] leading-relaxed mb-6">{skill.desc}</p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="text-[0.7rem] px-2 py-0.5 border border-rule-light text-ink-faint rounded-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="bg-bg-warm border border-rule-light rounded-sm p-4 mb-6">
          <label className="text-[0.7rem] text-ink-faint uppercase tracking-wider block mb-1">
            Install
          </label>
          <code className="font-mono text-[0.85rem] text-ink select-all">
            {installCmd}
          </code>
        </div>

        <a
          href={repoUrl}
          target="_blank"
          rel="noopener"
          className="text-accent text-[0.9rem] border-b border-dotted border-accent hover:border-ink hover:text-ink"
        >
          View on GitHub &rarr;
        </a>
      </div>
    </div>
  );
}
