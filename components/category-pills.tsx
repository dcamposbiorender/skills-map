"use client";

export function CategoryPills({
  categories,
  counts,
  active,
  onSelect,
}: {
  categories: string[];
  counts: Record<string, number>;
  active: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 py-3">
      <button
        className={`cat-pill ${active === "" ? "active" : ""}`}
        onClick={() => onSelect("")}
      >
        all ({Object.values(counts).reduce((a, b) => a + b, 0)})
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          className={`cat-pill ${active === cat ? "active" : ""}`}
          onClick={() => onSelect(cat)}
        >
          {cat.toLowerCase()} ({counts[cat] || 0})
        </button>
      ))}
    </div>
  );
}
