/**
 * Live scraper: pulls skills from multiple sources and writes data/skills.json
 * Run: npx tsx scripts/scrape-skills.ts
 *
 * Sources:
 *  1. skills.sh — parse initialSkills from SSR HTML (~600)
 *  2. Curated GitHub repos — fetch SKILL.md or directory listings (~300)
 *  3. ClawHub (openclaw/skills) — top 500 by recency
 *  4. VoltAgent/awesome-agent-skills — parse README markdown links (~549)
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

interface RawSkill {
  name: string;
  author: string;
  repo: string;
  installs: number;
  category: string;
  desc: string;
  tags: string[];
  source: string;
}

const GITHUB_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "skills-map-scraper",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {}),
};

// ─── Category Inference ─────────────────────────────────────────────────────

const TAG_TO_CATEGORY: Record<string, string> = {
  react: "Frontend",
  nextjs: "Frontend",
  vue: "Frontend",
  angular: "Frontend",
  svelte: "Frontend",
  css: "Frontend",
  tailwind: "Frontend",
  typescript: "Frontend",
  frontend: "Frontend",
  ui: "Design",
  ux: "Design",
  design: "Design",
  accessibility: "Design",
  a11y: "Design",
  figma: "Design",
  python: "Python",
  django: "Python",
  flask: "Python",
  fastapi: "Python",
  node: "Backend",
  express: "Backend",
  api: "Backend",
  graphql: "Backend",
  rest: "Backend",
  backend: "Backend",
  rails: "Backend",
  ruby: "Backend",
  go: "Backend",
  rust: "Backend",
  java: "Backend",
  docker: "DevOps",
  kubernetes: "DevOps",
  ci: "DevOps",
  cd: "DevOps",
  devops: "DevOps",
  terraform: "DevOps",
  aws: "Cloud",
  azure: "Cloud",
  gcp: "Cloud",
  cloud: "Cloud",
  vercel: "Cloud",
  sql: "Database",
  postgres: "Database",
  mysql: "Database",
  mongodb: "Database",
  redis: "Database",
  database: "Database",
  supabase: "Database",
  testing: "Testing",
  test: "Testing",
  jest: "Testing",
  playwright: "Testing",
  cypress: "Testing",
  security: "Security",
  auth: "Security",
  jwt: "Security",
  oauth: "Security",
  marketing: "Marketing",
  seo: "Marketing",
  content: "Marketing",
  analytics: "Data",
  data: "Data",
  ml: "AI/ML",
  ai: "AI/ML",
  llm: "AI/ML",
  agent: "AI/ML",
  automation: "Automation",
  workflow: "Automation",
  n8n: "Automation",
  finance: "Finance",
  accounting: "Accounting",
  hr: "HR",
  recruiting: "HR",
  legal: "Legal",
  compliance: "Legal",
  sales: "Sales",
  crm: "Sales",
  ops: "Operations",
  operations: "Operations",
  management: "Management",
  project: "Management",
  docs: "Documentation",
  documentation: "Documentation",
  readme: "Documentation",
  pdf: "Documents",
  excel: "Documents",
  spreadsheet: "Documents",
  office: "Office",
  slack: "Integrations",
  github: "Integrations",
  stripe: "Integrations",
  integration: "Integrations",
  media: "Media",
  video: "Media",
  image: "Media",
  audio: "Media",
};

function inferCategory(name: string, desc: string, tags: string[]): string {
  // Check tags first
  for (const tag of tags) {
    const cat = TAG_TO_CATEGORY[tag.toLowerCase()];
    if (cat) return cat;
  }
  // Check name and desc words
  const words = `${name} ${desc}`.toLowerCase().split(/\W+/);
  for (const word of words) {
    const cat = TAG_TO_CATEGORY[word];
    if (cat) return cat;
  }
  return "Uncategorized";
}

// ─── Source 1: skills.sh ────────────────────────────────────────────────────

async function scrapeSkillsSh(): Promise<RawSkill[]> {
  console.log("  Fetching skills.sh...");
  const res = await fetch("https://skills.sh");
  if (!res.ok) throw new Error(`skills.sh returned ${res.status}`);
  const html = await res.text();

  // Find initialSkills array in the Next.js SSR data
  const idx = html.indexOf("initialSkills");
  if (idx === -1) throw new Error("Could not find initialSkills in skills.sh HTML");

  const start = html.indexOf("[", idx);
  let depth = 0;
  let end = start;
  for (let i = start; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  const arrStr = html.slice(start, end).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const skills: { source: string; skillId: string; name: string; installs: number }[] =
    JSON.parse(arrStr);

  if (skills.length < 100) {
    console.warn(`  WARNING: Only ${skills.length} skills parsed from skills.sh (expected 400+)`);
  }

  console.log(`  skills.sh: ${skills.length} skills`);

  const rawSkills: (RawSkill & { _sourceRepo: string; _skillId: string })[] = skills.map((s) => {
    const [author, repo] = s.source.split("/");
    return {
      name: s.name || s.skillId,
      author,
      repo,
      installs: s.installs || 0,
      category: "",
      desc: "",
      tags: [] as string[],
      source: "skills.sh",
      _sourceRepo: s.source,
      _skillId: s.skillId || s.name,
    };
  });

  // Enrich with SKILL.md descriptions from raw.githubusercontent.com
  console.log(`  Enriching ${rawSkills.length} skills.sh entries with SKILL.md descriptions...`);
  const BATCH_SIZE = 25;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < rawSkills.length; i += BATCH_SIZE) {
    const batch = rawSkills.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (s) => {
        // Try multiple path patterns since repos vary in structure
        // Strip common prefixes from skillId to get the directory name
        const skillId = s._skillId;
        const author = s._sourceRepo.split("/")[0];
        const strippedId = skillId.startsWith(author + "-")
          ? skillId.slice(author.length + 1)
          : skillId.startsWith(author.toLowerCase() + "-")
            ? skillId.slice(author.toLowerCase().length + 1)
            : skillId;

        const urls = [
          `https://raw.githubusercontent.com/${s._sourceRepo}/main/skills/${skillId}/SKILL.md`,
          `https://raw.githubusercontent.com/${s._sourceRepo}/main/skills/${strippedId}/SKILL.md`,
          `https://raw.githubusercontent.com/${s._sourceRepo}/main/${skillId}/SKILL.md`,
          `https://raw.githubusercontent.com/${s._sourceRepo}/main/SKILL.md`,
        ];

        for (const url of urls) {
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": "skills-map-scraper" },
            });
            if (!res.ok) continue;
            const content = await res.text();
            return { skill: s, content };
          } catch {
            continue;
          }
        }
        return null;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const { skill, content } = result.value;
        // Parse description from SKILL.md
        const lines = content.split("\n");
        let inFrontmatter = false;
        let desc = "";
        let tags: string[] = [];

        for (const line of lines) {
          if (line.trim() === "---") {
            inFrontmatter = !inFrontmatter;
            continue;
          }
          if (inFrontmatter) {
            // Try to extract description from frontmatter
            const descMatch = line.match(/^description:\s*["']?(.+?)["']?\s*$/);
            if (descMatch) desc = descMatch[1].trim();
            // Try to extract tags
            const tagMatch = line.match(/^tags:\s*\[(.+)\]/);
            if (tagMatch) {
              tags = tagMatch[1].split(",").map((t) => t.trim().replace(/["']/g, ""));
            }
          }
          if (!inFrontmatter && !desc && line.trim() && !line.startsWith("#")) {
            desc = line.trim().slice(0, 250);
          }
        }

        if (desc) {
          skill.desc = desc;
          enriched++;
        }
        if (tags.length > 0) {
          skill.tags = tags;
        }
      } else {
        failed++;
      }
    }

    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= rawSkills.length) {
      console.log(`    ${Math.min(i + BATCH_SIZE, rawSkills.length)}/${rawSkills.length} checked, ${enriched} enriched`);
    }
  }

  console.log(`  skills.sh enrichment: ${enriched} descriptions found, ${failed} failed`);

  // Strip internal fields
  return rawSkills.map(({ _sourceRepo, _skillId, ...rest }) => rest);
}

// ─── Source 2: Curated GitHub Repos ─────────────────────────────────────────

const CURATED_REPOS = [
  { owner: "ComposioHQ", repo: "awesome-claude-skills", source: "composio" },
  { owner: "alirezarezvani", repo: "claude-skills", source: "alirezarezvani" },
  { owner: "get-zeked", repo: "perplexity-super-skills", source: "get-zeked" },
  { owner: "claude-office-skills", repo: "skills-hub", source: "claude-office-skills" },
  { owner: "coreyhaines31", repo: "marketingskills", source: "coreyhaines31" },
  { owner: "gtmagents", repo: "gtm-agents", source: "gtmagents" },
  { owner: "EveryInc", repo: "charlie-cfo-skill", source: "every" },
  { owner: "tuanductran", repo: "hr-skills", source: "tuanductran" },
  { owner: "sickn33", repo: "antigravity-awesome-skills", source: "sickn33" },
  { owner: "refoundai", repo: "lenny-skills", source: "refoundai" },
];

async function scrapeGithubRepo(
  owner: string,
  repo: string,
  sourceName: string
): Promise<RawSkill[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents`,
      { headers: GITHUB_HEADERS }
    );
    if (!res.ok) return [];
    const contents: { name: string; type: string }[] = await res.json();

    const dirs = contents.filter(
      (c) => c.type === "dir" && !c.name.startsWith(".")
    );

    const skills: RawSkill[] = [];
    for (const dir of dirs) {
      // Try to fetch SKILL.md for description
      let desc = "";
      try {
        const skillRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${dir.name}/SKILL.md`,
          { headers: GITHUB_HEADERS }
        );
        if (skillRes.ok) {
          const skillFile: { content: string } = await skillRes.json();
          const content = Buffer.from(skillFile.content, "base64").toString();
          // Extract first non-frontmatter paragraph as description
          const lines = content.split("\n");
          let inFrontmatter = false;
          for (const line of lines) {
            if (line.trim() === "---") {
              inFrontmatter = !inFrontmatter;
              continue;
            }
            if (!inFrontmatter && line.trim() && !line.startsWith("#")) {
              desc = line.trim().slice(0, 200);
              break;
            }
          }
        }
      } catch {
        // Skip SKILL.md fetch errors
      }

      skills.push({
        name: dir.name,
        author: owner,
        repo,
        installs: 0,
        category: "",
        desc,
        tags: [],
        source: sourceName,
      });
    }

    return skills;
  } catch {
    return [];
  }
}

async function scrapeCuratedRepos(): Promise<RawSkill[]> {
  console.log("  Fetching curated GitHub repos...");
  const results: RawSkill[] = [];

  for (const { owner, repo, source } of CURATED_REPOS) {
    const skills = await scrapeGithubRepo(owner, repo, source);
    console.log(`    ${owner}/${repo}: ${skills.length} skills`);
    results.push(...skills);
  }

  return results;
}

// ─── Source 3: ClawHub (openclaw/skills) ────────────────────────────────────

async function scrapeClawHub(): Promise<RawSkill[]> {
  console.log("  Fetching ClawHub (openclaw/skills) tree...");

  try {
    const res = await fetch(
      "https://api.github.com/repos/openclaw/skills/git/trees/main?recursive=1",
      { headers: GITHUB_HEADERS }
    );
    if (!res.ok) {
      console.warn(`  ClawHub tree API returned ${res.status}`);
      return [];
    }

    const tree: { tree: { path: string; type: string }[] } = await res.json();
    const metaPaths = tree.tree
      .filter((t) => t.path.endsWith("_meta.json"))
      .map((t) => t.path);

    console.log(`  ClawHub: ${metaPaths.length} total _meta.json files`);

    // We need to fetch some _meta.json files to get publishedAt for sorting.
    // But fetching 8000+ is too many API calls. Instead, take the most recently
    // modified paths (the tree is sorted) and grab a sample.
    // Since we can't sort by date without fetching, just take the last 500 in the tree
    // (which tend to be newer since git trees are somewhat chronological)
    const sampled = metaPaths.slice(-600);

    const skills: RawSkill[] = [];
    let fetched = 0;

    // Fetch in batches to stay under rate limits
    for (const path of sampled) {
      if (skills.length >= 500) break;

      try {
        const metaRes = await fetch(
          `https://raw.githubusercontent.com/openclaw/skills/main/${path}`,
          { headers: { "User-Agent": "skills-map-scraper" } }
        );
        if (!metaRes.ok) continue;

        const meta: {
          owner: string;
          slug: string;
          displayName?: string;
          latest?: { publishedAt?: number };
        } = await metaRes.json();

        skills.push({
          name: meta.slug || path.split("/").slice(-2, -1)[0],
          author: meta.owner || path.split("/")[1],
          repo: "openclaw/skills",
          installs: 0,
          category: "",
          desc: meta.displayName || "",
          tags: [],
          source: "openclaw",
        });
        fetched++;
      } catch {
        // Skip individual fetch errors
      }
    }

    console.log(`  ClawHub: fetched ${fetched} _meta.json, kept ${skills.length} skills`);
    return skills;
  } catch (err) {
    console.warn("  ClawHub scrape failed:", err);
    return [];
  }
}

// ─── Source 4: VoltAgent/awesome-agent-skills ────────────────────────────────

async function scrapeVoltAgent(): Promise<RawSkill[]> {
  console.log("  Fetching VoltAgent/awesome-agent-skills README...");

  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md",
      { headers: { "User-Agent": "skills-map-scraper" } }
    );
    if (!res.ok) return [];
    const readme = await res.text();

    // Parse markdown links: **[author/skill-name](URL)** - description
    // Also handles: - [**skill-name**](URL) - description
    const skills: RawSkill[] = [];
    const lines = readme.split("\n");
    let currentSection = "";

    for (const line of lines) {
      // Track section headers for category inference
      if (line.startsWith("##")) {
        currentSection = line.replace(/^#+\s*/, "").trim();
      }

      // Match patterns like: - **[owner/name](url)** - description
      // or: - [**name**](url) - description
      const match = line.match(
        /[-*]\s+\*?\*?\[?\*?\*?([^\]]*?)\*?\*?\]?\(https:\/\/github\.com\/([^/]+)\/([^/)]+)\/?[^)]*\)\*?\*?\s*[-–—]\s*(.*)/
      );
      if (match) {
        const [, displayName, owner, repo, desc] = match;
        const name = displayName.includes("/")
          ? displayName.split("/").pop()!.trim()
          : displayName.trim();

        skills.push({
          name: name.replace(/\*\*/g, "").trim(),
          author: owner,
          repo,
          installs: 0,
          category: inferCategory(name, desc, [currentSection.toLowerCase()]),
          desc: desc.trim().slice(0, 200),
          tags: [],
          source: "voltagent",
        });
      }
    }

    console.log(`  VoltAgent: ${skills.length} skills`);
    return skills;
  } catch {
    return [];
  }
}

// ─── Deduplication & Merge ──────────────────────────────────────────────────

const SOURCE_PRIORITY: Record<string, number> = {
  composio: 1,
  alirezarezvani: 1,
  "get-zeked": 1,
  "claude-office-skills": 1,
  coreyhaines31: 1,
  gtmagents: 1,
  every: 1,
  tuanductran: 1,
  sickn33: 1,
  refoundai: 1,
  "skills.sh": 2,
  voltagent: 3,
  openclaw: 4,
};

function deduplicate(allSkills: RawSkill[]): RawSkill[] {
  const map = new Map<string, RawSkill>();
  const installsMap = new Map<string, number>();

  // First pass: collect install counts from skills.sh
  for (const s of allSkills) {
    if (s.source === "skills.sh" && s.installs > 0) {
      installsMap.set(`${s.author.toLowerCase()}/${s.name.toLowerCase()}`, s.installs);
    }
  }

  // Second pass: deduplicate by priority
  for (const s of allSkills) {
    const key = `${s.author.toLowerCase()}/${s.name.toLowerCase()}`;
    const existing = map.get(key);
    const existingPriority = existing ? (SOURCE_PRIORITY[existing.source] || 99) : 99;
    const newPriority = SOURCE_PRIORITY[s.source] || 99;

    if (!existing || newPriority < existingPriority) {
      // Merge install count from skills.sh
      const installs = installsMap.get(key) || s.installs;
      map.set(key, { ...s, installs });
    } else if (existing) {
      // Keep existing entry but merge in missing fields from lower-priority sources
      let updated = false;
      if (!existing.desc && s.desc) {
        existing.desc = s.desc;
        updated = true;
      }
      if (existing.tags.length === 0 && s.tags.length > 0) {
        existing.tags = s.tags;
        updated = true;
      }
      if (s.installs > existing.installs) {
        existing.installs = s.installs;
        updated = true;
      }
      if (updated) map.set(key, existing);
    }
  }

  return Array.from(map.values());
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Skills Scraper ===\n");

  const allSkills: RawSkill[] = [];
  const sourceStats: Record<string, number> = {};

  // Run scrapers (sequential to avoid rate limits)
  const scrapers: [string, () => Promise<RawSkill[]>][] = [
    ["skills.sh", scrapeSkillsSh],
    ["curated repos", scrapeCuratedRepos],
    ["ClawHub", scrapeClawHub],
    ["VoltAgent", scrapeVoltAgent],
  ];

  for (const [name, scraper] of scrapers) {
    try {
      const skills = await scraper();
      sourceStats[name] = skills.length;
      allSkills.push(...skills);
    } catch (err) {
      console.error(`  FAILED: ${name}:`, err);
      sourceStats[name] = 0;
    }
  }

  console.log(`\nTotal raw skills: ${allSkills.length}`);

  // Deduplicate
  const deduped = deduplicate(allSkills);
  console.log(`After deduplication: ${deduped.length}`);

  // Infer categories for skills without one
  for (const s of deduped) {
    if (!s.category || s.category === "Uncategorized") {
      s.category = inferCategory(s.name, s.desc, s.tags);
    }
  }

  // Sort by installs desc, then name
  deduped.sort((a, b) => {
    if (b.installs !== a.installs) return b.installs - a.installs;
    return a.name.localeCompare(b.name);
  });

  // Write output
  const outPath = resolve(__dirname, "../data/skills.json");
  writeFileSync(outPath, JSON.stringify(deduped, null, 2));

  // Print stats
  const categories = [...new Set(deduped.map((s) => s.category))].sort();
  const sources = [...new Set(deduped.map((s) => s.source))].sort();
  const authors = [...new Set(deduped.map((s) => s.author))].sort();

  console.log(`\n=== Results ===`);
  console.log(`Total unique skills: ${deduped.length}`);
  console.log(`Categories (${categories.length}): ${categories.join(", ")}`);
  console.log(`Sources (${sources.length}): ${sources.join(", ")}`);
  console.log(`Authors: ${authors.length}`);
  console.log(`\nSource fetch stats:`);
  for (const [name, count] of Object.entries(sourceStats)) {
    console.log(`  ${name}: ${count}`);
  }
  console.log(`\nCategory breakdown:`);
  for (const cat of categories) {
    const count = deduped.filter((s) => s.category === cat).length;
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`\nWritten to: ${outPath}`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
