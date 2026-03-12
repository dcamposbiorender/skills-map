import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import skillsData from "@/data/skills.json";
import pluginsData from "@/data/plugins.json";
import type { Skill, Plugin } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { query, tab } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const skills = skillsData as unknown as Skill[];
    const plugins = pluginsData as unknown as Plugin[];

    // Build catalog based on active tab (or both)
    let catalog = "";

    if (tab !== "plugins") {
      // Include skills (limit to top 500 by installs to keep prompt manageable)
      const topSkills = [...skills]
        .sort((a, b) => b.installs - a.installs)
        .slice(0, 500);
      catalog += "SKILLS:\n";
      catalog += topSkills
        .map(
          (s) =>
            `${s.author}/${s.name} [${s.category}] (${s.installs} installs): ${s.desc}`
        )
        .join("\n");
    }

    if (tab === "plugins" || tab === "all") {
      catalog += "\n\nPLUGINS:\n";
      catalog += plugins
        .map(
          (p) =>
            `${p.author}/${p.name} [${p.category}] (${p.skills.length} skills): ${p.desc}. Skills: ${p.skills.map((s) => s.name).join(", ")}`
        )
        .join("\n");
    }

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: `You are a recommender for an agent skills and plugins ecosystem. Given a user's need, find the top 5 most relevant items from the catalog below. Return ONLY a JSON array of objects with fields: name, author, type ("skill" or "plugin"), reason (1-sentence explanation). No markdown, no extra text.

CATALOG:
${catalog}`,
      prompt: query,
      maxTokens: 1000,
    });

    let results;
    try {
      results = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      results = match ? JSON.parse(match[0]) : [];
    }

    return NextResponse.json({ results, query });
  } catch (error) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
