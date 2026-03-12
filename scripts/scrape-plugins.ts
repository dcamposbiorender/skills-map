/**
 * Live scraper: pulls plugins from Anthropic + community repos, writes data/plugins.json
 * Run: npx tsx scripts/scrape-plugins.ts
 *
 * Sources:
 *  1. anthropics/knowledge-work-plugins — Official Anthropic plugins
 *  2. anthropics/financial-services-plugins — Official Anthropic vertical
 *  3. ComposioHQ/awesome-claude-plugins — Community plugins
 *  4. Community repos (nabeelhyatt, jeremylongshore, Chat2AnyLLM)
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

interface PluginSkill {
  name: string;
  desc: string;
}

interface Plugin {
  name: string;
  author: string;
  repo: string;
  category: string;
  desc: string;
  source: string;
  installCmd: string;
  skills: PluginSkill[];
  mcpServers: string[];
  connectors: string[];
}

const GITHUB_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "skills-map-scraper",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {}),
};

// ─── Anthropic Plugin Repos ──────────────────────────────────────────────────

async function scrapeAnthropicPlugins(
  owner: string,
  repo: string
): Promise<Plugin[]> {
  console.log(`  Fetching ${owner}/${repo}...`);
  const plugins: Plugin[] = [];

  try {
    // Fetch marketplace.json for the plugin index
    const marketRes = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/.claude-plugin/marketplace.json`,
      { headers: { "User-Agent": "skills-map-scraper" } }
    );

    let pluginDirs: string[] = [];

    if (marketRes.ok) {
      const marketData = await marketRes.json();
      // marketplace.json can be { plugins: [...] } or [...]
      const marketplace: { name: string; source: string; description?: string }[] =
        Array.isArray(marketData) ? marketData : (marketData.plugins || []);
      pluginDirs = marketplace.map((p) => {
        const src = p.source || p.name;
        return src.replace(/^\.\//, ""); // strip leading ./
      });
    } else {
      // Fallback: list top-level directories
      const contentsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents`,
        { headers: GITHUB_HEADERS }
      );
      if (!contentsRes.ok) return [];
      const contents: { name: string; type: string }[] = await contentsRes.json();
      pluginDirs = contents
        .filter((c) => c.type === "dir" && !c.name.startsWith(".") && c.name !== "node_modules")
        .map((c) => c.name);
    }

    for (const dir of pluginDirs) {
      try {
        // Fetch plugin.json
        const pluginRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/main/${dir}/.claude-plugin/plugin.json`,
          { headers: { "User-Agent": "skills-map-scraper" } }
        );

        let pluginName = dir;
        let pluginDesc = "";
        let pluginAuthor = owner;

        if (pluginRes.ok) {
          const pluginJson: {
            name?: string;
            description?: string;
            author?: { name?: string };
          } = await pluginRes.json();
          pluginName = pluginJson.name || dir;
          pluginDesc = pluginJson.description || "";
          pluginAuthor = pluginJson.author?.name || owner;
        }

        // List skills in this plugin
        const skillsRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${dir}/skills`,
          { headers: GITHUB_HEADERS }
        );

        const skills: PluginSkill[] = [];
        if (skillsRes.ok) {
          const skillDirs: { name: string; type: string }[] = await skillsRes.json();
          for (const skillDir of skillDirs.filter((s) => s.type === "dir")) {
            // Try to get SKILL.md for description
            let skillDesc = "";
            try {
              const skillMdRes = await fetch(
                `https://raw.githubusercontent.com/${owner}/${repo}/main/${dir}/skills/${skillDir.name}/SKILL.md`,
                { headers: { "User-Agent": "skills-map-scraper" } }
              );
              if (skillMdRes.ok) {
                const content = await skillMdRes.text();
                // Extract description from frontmatter or first paragraph
                const descMatch = content.match(/description:\s*["']?(.+?)["']?\s*$/m);
                if (descMatch) {
                  skillDesc = descMatch[1].trim();
                } else {
                  const lines = content.split("\n");
                  let inFrontmatter = false;
                  for (const line of lines) {
                    if (line.trim() === "---") {
                      inFrontmatter = !inFrontmatter;
                      continue;
                    }
                    if (!inFrontmatter && line.trim() && !line.startsWith("#")) {
                      skillDesc = line.trim().slice(0, 200);
                      break;
                    }
                  }
                }
              }
            } catch {
              // Skip
            }

            skills.push({
              name: skillDir.name,
              desc: skillDesc,
            });
          }
        }

        // Infer category from directory name
        const categoryMap: Record<string, string> = {
          finance: "Finance",
          sales: "Sales",
          marketing: "Marketing",
          engineering: "Engineering",
          design: "Design",
          legal: "Legal",
          "human-resources": "HR",
          "product-management": "Product",
          data: "Data",
          operations: "Operations",
          "customer-support": "Support",
          productivity: "Productivity",
          "enterprise-search": "Search",
          "bio-research": "Research",
          "cowork-plugin-management": "Meta",
        };

        plugins.push({
          name: pluginName,
          author: pluginAuthor,
          repo,
          category: categoryMap[dir] || dir,
          desc: pluginDesc,
          source: `${owner}/${repo}`,
          installCmd: `claude plugin add ${owner}/${repo}/${dir}`,
          skills,
          mcpServers: [],
          connectors: [],
        });
      } catch {
        // Skip individual plugin errors
      }
    }

    console.log(`    ${owner}/${repo}: ${plugins.length} plugins`);
    return plugins;
  } catch (err) {
    console.warn(`  Failed to scrape ${owner}/${repo}:`, err);
    return [];
  }
}

// ─── Composio Plugins ────────────────────────────────────────────────────────

async function scrapeComposioPlugins(): Promise<Plugin[]> {
  console.log("  Fetching ComposioHQ/awesome-claude-plugins...");

  try {
    // Try marketplace.json first
    const marketRes = await fetch(
      "https://raw.githubusercontent.com/ComposioHQ/awesome-claude-plugins/main/marketplace.json",
      { headers: { "User-Agent": "skills-map-scraper" } }
    );

    if (marketRes.ok) {
      const marketData = await marketRes.json();
      const marketplace: {
        name: string;
        source: string;
        description?: string;
        category?: string;
        tags?: string[];
        author?: { name?: string };
      }[] = Array.isArray(marketData) ? marketData : (marketData.plugins || []);

      const plugins: Plugin[] = marketplace.map((p) => ({
        name: p.name,
        author: p.author?.name || "ComposioHQ",
        repo: "awesome-claude-plugins",
        category: p.category || "Integrations",
        desc: p.description || "",
        source: "ComposioHQ/awesome-claude-plugins",
        installCmd: `claude plugin add ComposioHQ/awesome-claude-plugins/${p.source || p.name}`,
        skills: [],
        mcpServers: [],
        connectors: [],
      }));

      console.log(`    ComposioHQ/awesome-claude-plugins: ${plugins.length} plugins`);
      return plugins;
    }

    // Fallback: list directories
    const contentsRes = await fetch(
      "https://api.github.com/repos/ComposioHQ/awesome-claude-plugins/contents",
      { headers: GITHUB_HEADERS }
    );
    if (!contentsRes.ok) return [];

    const contents: { name: string; type: string }[] = await contentsRes.json();
    const dirs = contents.filter(
      (c) => c.type === "dir" && !c.name.startsWith(".") && c.name !== "node_modules"
    );

    const plugins: Plugin[] = dirs.map((d) => ({
      name: d.name,
      author: "ComposioHQ",
      repo: "awesome-claude-plugins",
      category: "Integrations",
      desc: "",
      source: "ComposioHQ/awesome-claude-plugins",
      installCmd: `claude plugin add ComposioHQ/awesome-claude-plugins/${d.name}`,
      skills: [],
      mcpServers: [],
      connectors: [],
    }));

    console.log(`    ComposioHQ/awesome-claude-plugins: ${plugins.length} plugins`);
    return plugins;
  } catch {
    return [];
  }
}

// ─── Community Plugin Repos ──────────────────────────────────────────────────

const COMMUNITY_REPOS = [
  { owner: "nabeelhyatt", repo: "coworkpowers" },
  { owner: "jeremylongshore", repo: "claude-code-plugins-plus-skills" },
  { owner: "Chat2AnyLLM", repo: "awesome-claude-plugins" },
];

async function scrapeCommunityPlugins(): Promise<Plugin[]> {
  console.log("  Fetching community plugin repos...");
  const plugins: Plugin[] = [];

  for (const { owner, repo } of COMMUNITY_REPOS) {
    try {
      const contentsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents`,
        { headers: GITHUB_HEADERS }
      );
      if (!contentsRes.ok) continue;

      const contents: { name: string; type: string }[] = await contentsRes.json();
      const dirs = contents.filter(
        (c) =>
          c.type === "dir" &&
          !c.name.startsWith(".") &&
          c.name !== "node_modules" &&
          c.name !== ".github"
      );

      for (const dir of dirs) {
        // Check if it has a .claude-plugin directory
        try {
          const pluginCheck = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${dir.name}/.claude-plugin`,
            { headers: GITHUB_HEADERS }
          );
          if (pluginCheck.ok) {
            plugins.push({
              name: dir.name,
              author: owner,
              repo,
              category: "Community",
              desc: "",
              source: `${owner}/${repo}`,
              installCmd: `claude plugin add ${owner}/${repo}/${dir.name}`,
              skills: [],
              mcpServers: [],
              connectors: [],
            });
          }
        } catch {
          // Not a plugin directory
        }
      }

      console.log(`    ${owner}/${repo}: ${plugins.filter((p) => p.source === `${owner}/${repo}`).length} plugins`);
    } catch {
      console.log(`    ${owner}/${repo}: failed`);
    }
  }

  return plugins;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Plugins Scraper ===\n");

  const allPlugins: Plugin[] = [];

  // 1. Anthropic official
  const anthroKW = await scrapeAnthropicPlugins("anthropics", "knowledge-work-plugins");
  allPlugins.push(...anthroKW);

  const anthroFS = await scrapeAnthropicPlugins("anthropics", "financial-services-plugins");
  allPlugins.push(...anthroFS);

  // 2. Composio
  const composio = await scrapeComposioPlugins();
  allPlugins.push(...composio);

  // 3. Community
  const community = await scrapeCommunityPlugins();
  allPlugins.push(...community);

  // Deduplicate by name
  const seen = new Set<string>();
  const deduped = allPlugins.filter((p) => {
    const key = `${p.author.toLowerCase()}/${p.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: Anthropic first, then Composio, then community
  const sourcePriority: Record<string, number> = {
    "anthropics/knowledge-work-plugins": 1,
    "anthropics/financial-services-plugins": 2,
    "ComposioHQ/awesome-claude-plugins": 3,
  };
  deduped.sort((a, b) => {
    const pa = sourcePriority[a.source] || 99;
    const pb = sourcePriority[b.source] || 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  // Write output
  const outPath = resolve(__dirname, "../data/plugins.json");
  writeFileSync(outPath, JSON.stringify(deduped, null, 2));

  // Stats
  const sources = [...new Set(deduped.map((p) => p.source))].sort();
  const totalSkills = deduped.reduce((sum, p) => sum + p.skills.length, 0);

  console.log(`\n=== Results ===`);
  console.log(`Total unique plugins: ${deduped.length}`);
  console.log(`Total skills across plugins: ${totalSkills}`);
  console.log(`Sources: ${sources.join(", ")}`);
  console.log(`\nBy source:`);
  for (const src of sources) {
    const count = deduped.filter((p) => p.source === src).length;
    console.log(`  ${src}: ${count}`);
  }
  console.log(`\nWritten to: ${outPath}`);
}

main().catch((err) => {
  console.error("Plugin scraper failed:", err);
  process.exit(1);
});
