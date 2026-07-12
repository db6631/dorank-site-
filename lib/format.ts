const HUES = [
  "from-emerald-700 to-emerald-950",
  "from-cyan-700 to-cyan-950",
  "from-sky-700 to-sky-950",
  "from-rose-700 to-rose-950",
  "from-amber-700 to-amber-950",
  "from-fuchsia-700 to-fuchsia-950",
  "from-indigo-700 to-indigo-950",
  "from-teal-700 to-teal-950",
];

export function hueForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}

export function formatViews(n: number): string {
  if (!n || n <= 0) return "-";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
