# Skills & Plugins Pipeline Brainstorm

**Date**: 2026-03-10
**Status**: Decided

## What We're Building

A two-tab browsable directory: **Skills** (reusable agent capabilities) and **Plugins** (Claude Code plugin bundles). Backed by two static JSON files (`skills.json` + `plugins.json`) updated weekly via GitHub Action. No database.

## Why This Approach

The ecosystem has wildly different source types — curated leaderboards (skills.sh, 600), massive archives (ClawHub, 8K+), GitHub repos with SKILL.md files, official Anthropic plugin marketplaces, and simple awesome-lists. A single scraping strategy won't work. We need source-specific adapters that all write to the same output format.

## Key Decisions

### 1. Two Separate Data Models

**Skills** (`data/skills.json`): Flat list. Fields: name, author, repo, installs, category, desc, tags, source.

**Plugins** (`data/plugins.json`): Separate file, different shape. Fields: name, author, repo, category, description, source, skills (inline array with name + description per skill), install command, MCP servers/connectors if available.

Rationale: Plugins are hierarchical (a plugin contains multiple skills + commands + connectors). Mixing them into the skills table would be confusing. Two tabs, two data files, two pipeline stages.

### 2. Curation Strategy: Top 500 by Installs for Large Catalogs

- **ClawHub (8K+)**: Top 500 by some quality signal. Problem: ClawHub has no install counts. Options: sort by recency (_meta.json has publishedAt), or cross-reference with skills.sh install data, or use version count as a proxy for quality.
- **SkillsMP (350K)**: Skip indexing. Link as external resource.
- **Everything else**: Index fully (all are under ~600 entries).

### 3. Deduplication: Prefer Curated Sources Over Catalogs

Priority order for the same skill appearing in multiple places:
1. Official Anthropic repos (highest trust)
2. Curated repos (ComposioHQ, alirezarezvani, get-zeked, claude-office-skills, etc.)
3. skills.sh (good install data but less metadata)
4. VoltAgent awesome-list (links only)
5. ClawHub (lowest trust, unaudited)

When deduping: keep the entry from the highest-priority source, merge install count from skills.sh if available.

### 4. Weekly GitHub Action for All Updates

Single cron job, weekly. The scraper runs as a Node/TypeScript script:
1. Fetch skills.sh HTML, parse `initialSkills` array (600 skills)
2. Fetch each curated GitHub repo via API, parse SKILL.md / marketplace.json
3. Fetch ClawHub top 500 (by recency or cross-ref installs)
4. Fetch plugin repos (anthropics/knowledge-work-plugins, ComposioHQ/awesome-claude-plugins, etc.)
5. Deduplicate, categorize, write `skills.json` + `plugins.json`
6. Git commit + push (triggers Vercel deploy)

### 5. No Supabase

Strip all Supabase dependencies. Ratings, bans, update logs — all removed. Curate the JSON directly in the repo. AI search stays (uses Anthropic API directly via AI gateway).

## Source Inventory

### Skills Sources

| Source | Size | Access Method | Has Installs | Has Categories | Priority |
|--------|------|---------------|-------------|----------------|----------|
| skills.sh | ~600 | Parse HTML `initialSkills` | Yes | No (infer) | 3 |
| ClawHub (openclaw/skills) | 8,140 | GitHub tree API + _meta.json | No | No (infer) | 5 |
| VoltAgent/awesome-agent-skills | ~549 | Parse README markdown | No | Yes (sections) | 4 |
| VoltAgent/awesome-openclaw-skills | ~5,494 | Parse README / repo | No | Partial | 4 |
| ComposioHQ/awesome-claude-skills | ~31 dirs | GitHub API + SKILL.md | No | Partial | 2 |
| alirezarezvani/claude-skills | ~17 dirs | GitHub API + SKILL.md | No | No | 2 |
| get-zeked/perplexity-super-skills | ~10 | GitHub API | No | No | 2 |
| claude-office-skills/skills-hub | ~136 | GitHub API | No | No | 2 |
| coreyhaines31/marketingskills | ? | GitHub API | No | No | 2 |
| gtmagents/gtm-agents | ? | GitHub API | No | No | 2 |
| EveryInc/charlie-cfo-skill | 1 | GitHub API | No | No | 2 |
| tuanductran/hr-skills | ? | GitHub API | No | No | 2 |
| OpenAI/skills | ? | GitHub API | No | No | 2 |
| agentskills.io | ? | Website | No | No | 4 |
| claude.ai/connectors | ? | Website/docs | No | No | 1 |

### Plugin Sources

| Source | Size | Access Method | Notes |
|--------|------|---------------|-------|
| anthropics/knowledge-work-plugins | ~15 plugins, ~110 skills | marketplace.json + plugin.json + SKILL.md | MOST IMPORTANT. Official Anthropic. Has partner-built (Apollo, Slack, Common Room) |
| anthropics/financial-services-plugins | ? | Same structure | Official Anthropic vertical |
| ComposioHQ/awesome-claude-plugins | ~25 plugins | marketplace.json | Has categories + tags |
| nabeelhyatt/coworkpowers | ? | GitHub API | Community |
| jeremylongshore/claude-code-plugins-plus-skills | ? | GitHub API | Community |
| Chat2AnyLLM/awesome-claude-plugins | ? | GitHub API | Community |
| anthropics/claude-cookbooks/skills/notebooks/ | ? | GitHub API | Official examples/tutorials |

## Data Shapes

### skills.json entry
```json
{
  "name": "react-best-practices",
  "author": "vercel-labs",
  "repo": "agent-skills",
  "installs": 179100,
  "category": "Frontend",
  "desc": "40+ React/Next.js performance rules...",
  "tags": ["react", "nextjs", "performance"],
  "source": "skills.sh"
}
```

### plugins.json entry
```json
{
  "name": "finance",
  "author": "anthropics",
  "repo": "knowledge-work-plugins",
  "category": "Finance",
  "desc": "Financial analysis, reporting, and close management for accounting teams.",
  "source": "anthropics/knowledge-work-plugins",
  "installCmd": "claude plugin add anthropics/knowledge-work-plugins/finance",
  "skills": [
    { "name": "audit-support", "desc": "Audit preparation and evidence gathering" },
    { "name": "close-management", "desc": "Month-end close workflow management" },
    { "name": "financial-statements", "desc": "Financial statement analysis" },
    { "name": "journal-entry-prep", "desc": "Journal entry preparation" },
    { "name": "reconciliation", "desc": "Account reconciliation" },
    { "name": "variance-analysis", "desc": "Budget variance analysis" }
  ],
  "mcpServers": [],
  "connectors": []
}
```

## Open Questions

1. **ClawHub quality signal**: With no install counts, how do we pick the "top 500"? Best proxy: cross-reference with skills.sh installs, fall back to recency (publishedAt). May need AI categorization for ClawHub skills that have no category.
2. **Category inference**: Many sources lack categories. Do we run a one-time AI categorization pass (Claude Haiku on the description) or manually assign?
3. **agentskills.io**: Is this a scrapeable site or just a spec doc? Need to investigate.
4. **claude.ai/connectors**: Partner integrations (Atlassian, Ramp, Stripe, Figma) — is there a public list to scrape or is this manual?

## Next Steps

Run `/workflows:plan` to design the implementation: scraper architecture, GitHub Action config, UI changes for two tabs, Supabase removal.
