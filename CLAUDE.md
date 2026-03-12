# Skills Map

Agent Skills Ecosystem Map - a Next.js app for browsing 450+ curated agent skills.

## Tech Stack
- Next.js 15 + App Router
- Tailwind CSS v4
- Vercel AI SDK + Claude Haiku (for AI search via AI gateway)
- No database — `data/skills.json` is the source of truth
- GitHub Action for weekly auto-updates (scrape → commit → Vercel deploys)

## Key Files
- `data/skills.json` - Source of truth for all skills
- `scripts/scrape-skills.ts` - Live scraper: pulls from skills.sh API + GitHub repos
- `lib/types.ts` - Core TypeScript types
- `lib/search.ts` - Client-side filtering and sorting
- `app/page.tsx` - Main skills browser (SSR)
- `app/api/search/route.ts` - AI-powered search using Claude Haiku
- `.github/workflows/update-skills.yml` - Weekly auto-update cron

## Environment Variables
- `ANTHROPIC_API_KEY` - For AI search
- `GITHUB_TOKEN` - For GitHub API scraping (optional, avoids rate limits)

## Conventions
- Font: EB Garamond (serif) for editorial feel
- Colors: warm cream bg (#fffff8), red accent (#a00)
- No database, no Supabase — curate via git
- Ratings/bans removed — just curate the JSON directly
