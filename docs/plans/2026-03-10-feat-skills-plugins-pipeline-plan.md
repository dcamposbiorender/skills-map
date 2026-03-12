---
title: "Skills & Plugins Pipeline + Two-Tab UI"
type: feat
date: 2026-03-10
---

# Skills & Plugins Pipeline + Two-Tab UI

## Overview

Replace the stale 287-skill snapshot with a live multi-source scraper that pulls ~1,000+ skills and ~50+ plugins from 15+ sources. Add a Plugins tab to the UI. Strip Supabase. Automate weekly updates via GitHub Action.

## Problem Statement

The current `data/skills.json` was seeded once from a static HTML file and is frozen at 287 skills. skills.sh alone now has 600. The app has unused Supabase plumbing (ratings, bans, admin) that adds complexity without value. There's no plugins view at all despite a rich plugin ecosystem (Anthropic official, Composio, community).

## Proposed Solution

Four phases, each independently shippable:

1. **Phase 1: Strip Supabase** — Remove all database dependencies, clean the UI
2. **Phase 2: Build scraper pipeline** — Multi-source TypeScript scraper for skills + plugins
3. **Phase 3: Add Plugins tab** — Second tab in the UI with plugin-specific layout
4. **Phase 4: GitHub Action** — Weekly cron to auto-update

## Technical Approach

### Phase 1: Strip Supabase (13 files)

**DELETE these 7 files entirely:**

```
lib/supabase.ts
app/api/rate/route.ts
app/api/ban/route.ts
app/admin/page.tsx
components/rating-buttons.tsx
components/banned-banner.tsx
supabase/migration.sql
```

**EDIT these 7 files:**

| File | Change |
|------|--------|
| `package.json` | Remove `@supabase/supabase-js` from dependencies |
| `lib/types.ts` | Remove `Rating`, `Ban`, `UpdateLog` interfaces. Remove `banned`, `banReason`, `ratings` from `SkillWithMeta` |
| `lib/search.ts` | Remove `hideBanned` filter logic |
| `components/detail-panel.tsx` | Remove `RatingButtons` and `BannedBanner` imports + usage |
| `app/skill/[id]/page.tsx` | Remove ban check, `BannedBanner` import |
| `app/page.tsx` | Remove `/admin` link from footer |
| `app/globals.css` | Remove `--color-ban-bg` and `--color-ban-border` theme tokens |

**Also remove from `.env.local`:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Acceptance Criteria:**
- [ ] `npm run build` passes with zero Supabase references
- [ ] No `@supabase` in `node_modules` after `npm install`
- [ ] Detail panel shows skill info without rating buttons
- [ ] `/admin` route returns 404

---

### Phase 2: Build Scraper Pipeline

Two TypeScript scripts in `scripts/`:

#### `scripts/scrape-skills.ts`

Adapter-based architecture. Each source has a function that returns `Skill[]`:

```typescript
// scripts/scrape-skills.ts
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
```

**Source adapters (run in parallel where possible):**

| Adapter | Source | Strategy | Expected Count |
|---------|--------|----------|----------------|
| `scrapeSkillsSh()` | skills.sh | Fetch HTML, regex `initialSkills` JSON from `__next_f` data, parse | ~600 |
| `scrapeGithubRepo(owner, repo)` | Each curated repo | GitHub API: list dirs, fetch SKILL.md frontmatter for each | ~300 total |
| `scrapeClawHub()` | openclaw/skills | GitHub tree API for all `_meta.json` paths, sort by `publishedAt` desc, take top 500, cross-ref installs from skills.sh | ~500 |
| `scrapeVoltAgent()` | VoltAgent/awesome-agent-skills | Fetch README.md, parse markdown links with regex `\*\*\[(.*?)\]\((.*?)\)\*\* - (.*)` | ~549 |

**Curated GitHub repos to scrape:**

```typescript
const CURATED_REPOS = [
  { owner: "ComposioHQ", repo: "awesome-claude-skills" },
  { owner: "alirezarezvani", repo: "claude-skills" },
  { owner: "get-zeked", repo: "perplexity-super-skills" },
  { owner: "claude-office-skills", repo: "skills-hub" },
  { owner: "coreyhaines31", repo: "marketingskills" },
  { owner: "gtmagents", repo: "gtm-agents" },
  { owner: "EveryInc", repo: "charlie-cfo-skill" },
  { owner: "tuanductran", repo: "hr-skills" },
  { owner: "sickn33", repo: "antigravity-awesome-skills" },
  { owner: "refoundai", repo: "lenny-skills" },
];
```

**Deduplication logic (priority order):**

```
1. Curated repos (highest trust)
2. skills.sh (has install counts)
3. VoltAgent awesome-list (curated links)
4. ClawHub (lowest trust)
```

Key: `lowercase(author/name)`. When deduping, keep the higher-priority entry but merge `installs` from skills.sh if available.

**Category inference:** Most sources lack categories. For skills without categories:
- If they have tags, map common tags to categories (e.g., "react" -> "Frontend")
- Otherwise, assign "Uncategorized" and let the weekly run accumulate

**Output:** Writes `data/skills.json` sorted by installs desc. Prints stats summary.

**Error handling:** Each adapter is wrapped in try/catch. If one source fails, others still run. Partial results are fine. Script logs which sources succeeded/failed.

**GitHub API rate limiting:** Use `GITHUB_TOKEN` env var if available (5,000 req/hr authenticated vs 60/hr unauthenticated). The ClawHub tree API is a single call. Each curated repo needs ~2-10 API calls. Total: ~100-150 API calls per run.

#### `scripts/scrape-plugins.ts`

```typescript
interface Plugin {
  name: string;
  author: string;
  repo: string;
  category: string;
  desc: string;
  source: string;
  installCmd: string;
  skills: { name: string; desc: string }[];
  mcpServers: string[];
  connectors: string[];
}
```

**Source adapters:**

| Adapter | Source | Strategy |
|---------|--------|----------|
| `scrapeAnthropicPlugins(repo)` | anthropics/knowledge-work-plugins, anthropics/financial-services-plugins | Fetch marketplace.json, then fetch each plugin.json + list SKILL.md files |
| `scrapeComposioPlugins()` | ComposioHQ/awesome-claude-plugins | Fetch marketplace.json (has categories + tags) |
| `scrapeCommunityPlugins(owner, repo)` | nabeelhyatt/coworkpowers, jeremylongshore/claude-code-plugins-plus-skills, Chat2AnyLLM/awesome-claude-plugins | Fetch repo contents, look for .claude-plugin dirs or README listing |

**Output:** Writes `data/plugins.json` sorted by source priority (Anthropic first, then Composio, then community).

#### Package.json scripts

```json
{
  "scripts": {
    "scrape": "npx tsx scripts/scrape-skills.ts && npx tsx scripts/scrape-plugins.ts",
    "scrape:skills": "npx tsx scripts/scrape-skills.ts",
    "scrape:plugins": "npx tsx scripts/scrape-plugins.ts"
  }
}
```

**Acceptance Criteria:**
- [ ] `npm run scrape:skills` produces `data/skills.json` with 800+ unique skills
- [ ] `npm run scrape:plugins` produces `data/plugins.json` with 30+ plugins
- [ ] Script completes in < 2 minutes
- [ ] Script works without `GITHUB_TOKEN` (uses unauthenticated API, slower)
- [ ] Script prints stats: total skills, by source, by category, duplicates removed
- [ ] `npm run build` still passes after new data

---

### Phase 3: Add Plugins Tab to UI

#### New types in `lib/types.ts`

```typescript
export interface Plugin {
  name: string;
  author: string;
  repo: string;
  category: string;
  desc: string;
  source: string;
  installCmd: string;
  skills: { name: string; desc: string }[];
  mcpServers: string[];
  connectors: string[];
}
```

#### New/modified files

| File | Change |
|------|--------|
| `app/page.tsx` | Add tab state (Skills \| Plugins), load both JSON files, pass active dataset to table |
| `components/skills-table.tsx` | Add tab switcher at the top. Reuse category pills + search bar for both. Render different columns for plugins (name, author, skill count, category, desc) |
| `components/detail-panel.tsx` | Handle both skill and plugin detail. If plugin: show expandable skills list, install command, MCP servers, connectors |
| `components/search-bar.tsx` | AI search includes plugins in its catalog when Plugins tab is active |
| `app/api/search/route.ts` | Load both skills.json and plugins.json, include both in the prompt when searching |
| `lib/search.ts` | Add `filterPlugins()` and `sortPlugins()` functions |
| `lib/types.ts` | Add `Plugin` interface |

#### Tab UI design

Consistent with the editorial/newspaper aesthetic. Two small-caps labels at the top of the page:

```
skills (847)  |  plugins (52)
```

Active tab gets the `border-ink` bottom border + font-weight 600. Inactive is `text-ink-light` with dotted bottom border.

When switching tabs:
- Category pills update to show categories for that tab
- Summary stats update
- Table columns change
- Search/filter state resets

#### Plugin table columns

| # | plugin | author | skills | category | description |
|---|--------|--------|--------|----------|-------------|

"skills" column shows count like "6 skills". Clicking a row opens the detail panel.

#### Plugin detail panel

Same slide-out panel, but shows:
- Plugin name + author
- Category + source badge
- Description
- Install command box
- **Skills list** (expandable, shows name + description for each)
- MCP servers (if any)
- Connectors (if any)
- GitHub repo link

**Acceptance Criteria:**
- [ ] Two tabs visible: "skills (N)" and "plugins (N)"
- [ ] Switching tabs updates the table, pills, and stats
- [ ] Plugin detail panel shows nested skills list
- [ ] AI search works across both tabs
- [ ] Build passes

---

### Phase 4: GitHub Action for Weekly Auto-Updates

#### `.github/workflows/update-skills.yml`

```yaml
name: Update Skills & Plugins Data
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday 6am UTC
  workflow_dispatch: {}  # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run scrape
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Commit and push if changed
        run: |
          git diff --quiet data/ && exit 0
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/skills.json data/plugins.json
          git commit -m "chore: weekly skills & plugins data update"
          git push
```

**Also:**
- Remove `vercel.json` cron config (no longer needed)
- Delete `app/api/cron/refresh/route.ts` (replaced by GitHub Action)
- Delete `lib/scraper.ts` (old repo checker, replaced by new scripts)

**Acceptance Criteria:**
- [ ] Workflow file exists and is valid YAML
- [ ] Manual trigger (`workflow_dispatch`) works
- [ ] If no data changes, no commit is created
- [ ] Vercel auto-deploys when new commit is pushed

---

## File Change Summary

### DELETE (10 files)
1. `lib/supabase.ts`
2. `app/api/rate/route.ts`
3. `app/api/ban/route.ts`
4. `app/api/cron/refresh/route.ts`
5. `app/admin/page.tsx`
6. `components/rating-buttons.tsx`
7. `components/banned-banner.tsx`
8. `supabase/migration.sql`
9. `lib/scraper.ts`
10. `scripts/seed-skills.ts`

### CREATE (4 files)
1. `scripts/scrape-skills.ts`
2. `scripts/scrape-plugins.ts`
3. `data/plugins.json`
4. `.github/workflows/update-skills.yml`

### EDIT (12 files)
1. `package.json` — Remove supabase dep, add scrape scripts
2. `lib/types.ts` — Remove Supabase types, add Plugin type
3. `lib/search.ts` — Remove ban logic, add plugin filter/sort
4. `components/skills-table.tsx` — Add tab switcher, plugin columns
5. `components/detail-panel.tsx` — Remove ratings/bans, add plugin detail
6. `components/search-bar.tsx` — No change needed (works as-is)
7. `app/page.tsx` — Load both JSONs, add tab state, remove admin link
8. `app/skill/[id]/page.tsx` — Remove ban logic
9. `app/api/search/route.ts` — Include plugins in AI search
10. `app/globals.css` — Remove ban colors, add tab styles
11. `app/layout.tsx` — Update metadata description
12. `CLAUDE.md` — Already updated
13. `vercel.json` — Remove cron config

## Edge Cases

1. **GitHub API rate limits**: Unauthenticated = 60 req/hr. Scraper needs ~100-150 calls. Must work with `GITHUB_TOKEN` in CI. Locally, may need to run in two batches or use a token.
2. **skills.sh HTML structure changes**: The `initialSkills` parsing is fragile. If skills.sh changes their SSR format, the adapter breaks silently. Add a count validation: if < 100 skills parsed, warn loudly.
3. **ClawHub _meta.json missing fields**: Some entries may lack `displayName` or have empty `SKILL.md`. Default to slug as name, empty desc.
4. **Duplicate categories**: "AI/ML" vs "AI" vs "Machine Learning" may appear across sources. Need a normalization map.
5. **Large JSON files**: 1,000+ skills at ~15 lines each = ~15K lines. Still fine for static import in Next.js (built at deploy time).
6. **GitHub Action permissions**: The `GITHUB_TOKEN` default in Actions has write permissions to the repo. The `git push` will work without additional setup.

## References

- Brainstorm: `docs/brainstorms/2026-03-10-skills-plugins-pipeline-brainstorm.md`
- Current data model: `lib/types.ts`
- Current table component: `components/skills-table.tsx`
- skills.sh data format: `initialSkills` array in SSR HTML (fields: source, skillId, name, installs)
- Anthropic plugins: `marketplace.json` + `plugin.json` + `SKILL.md` structure
- ClawHub: `_meta.json` per skill (fields: owner, slug, displayName, latest.publishedAt)
