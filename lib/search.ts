import type { SkillWithMeta, Plugin } from "./types";

export function filterSkills(
  skills: SkillWithMeta[],
  opts: {
    search?: string;
    category?: string;
    author?: string;
    source?: string;
  }
): SkillWithMeta[] {
  let filtered = skills;

  if (opts.category) {
    filtered = filtered.filter((s) => s.category === opts.category);
  }

  if (opts.author) {
    filtered = filtered.filter((s) => s.author === opts.author);
  }

  if (opts.source) {
    filtered = filtered.filter((s) => s.source === opts.source);
  }

  if (opts.search) {
    const q = opts.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export function sortSkills(
  skills: SkillWithMeta[],
  key: "installs" | "name" | "author" | "category",
  dir: 1 | -1
): SkillWithMeta[] {
  return [...skills].sort((a, b) => {
    if (key === "installs") return (a.installs - b.installs) * dir;
    const av = a[key].toLowerCase();
    const bv = b[key].toLowerCase();
    return av < bv ? -dir : av > bv ? dir : 0;
  });
}

export function filterPlugins(
  plugins: Plugin[],
  opts: {
    search?: string;
    category?: string;
    author?: string;
    source?: string;
  }
): Plugin[] {
  let filtered = plugins;

  if (opts.category) {
    filtered = filtered.filter((p) => p.category === opts.category);
  }

  if (opts.author) {
    filtered = filtered.filter((p) => p.author === opts.author);
  }

  if (opts.source) {
    filtered = filtered.filter((p) => p.source === opts.source);
  }

  if (opts.search) {
    const q = opts.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.skills.some((s) => s.name.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export function sortPlugins(
  plugins: Plugin[],
  key: "name" | "author" | "category" | "skills",
  dir: 1 | -1
): Plugin[] {
  return [...plugins].sort((a, b) => {
    if (key === "skills") return (a.skills.length - b.skills.length) * dir;
    const av = a[key].toLowerCase();
    const bv = b[key].toLowerCase();
    return av < bv ? -dir : av > bv ? dir : 0;
  });
}
