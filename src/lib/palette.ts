// Kitten identity colors — a colorblind-safe categorical palette, assigned in
// fixed order (a kitten keeps its color for life; new kittens take the first
// unused slot).
export const KITTEN_COLORS: { name: string; value: string }[] = [
  { name: "Blue", value: "#2a78d6" },
  { name: "Teal", value: "#1baf7a" },
  { name: "Amber", value: "#eda100" },
  { name: "Green", value: "#008300" },
  { name: "Violet", value: "#4a3aa7" },
  { name: "Red", value: "#e34948" },
  { name: "Pink", value: "#e87ba4" },
  { name: "Orange", value: "#eb6834" },
];

export function nextColor(taken: string[]): string {
  const t = new Set(taken.map((c) => c.toLowerCase()));
  const free = KITTEN_COLORS.find((c) => !t.has(c.value.toLowerCase()));
  return (free ?? KITTEN_COLORS[taken.length % KITTEN_COLORS.length]).value;
}
