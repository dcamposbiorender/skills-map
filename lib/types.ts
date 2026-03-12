export interface Skill {
  name: string;
  author: string;
  repo: string;
  installs: number;
  category: string;
  desc: string;
  tags: string[];
  source: string;
}

export interface SkillWithMeta extends Skill {
  id: string; // `${author}/${name}`
}

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

export const CATEGORIES = [
  "Accounting",
  "AI/ML",
  "Automation",
  "Backend",
  "Cloud",
  "Data",
  "Database",
  "Design",
  "DevOps",
  "Documents",
  "Documentation",
  "Finance",
  "Frontend",
  "HR",
  "Integrations",
  "Legal",
  "Management",
  "Marketing",
  "Media",
  "Meta",
  "Methodology",
  "Office",
  "Operations",
  "Python",
  "Sales",
  "Security",
  "Testing",
] as const;

export type Category = (typeof CATEGORIES)[number];
