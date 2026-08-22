/**
 * Default categories seeded into a new space.
 *
 * Deliberately Nigeria-first. "Family support", "Data & Airtime",
 * "Savings & Ajo" and "School fees" are real lines in a real Nigerian
 * budget that imported budgeting apps do not model, and their absence
 * is why those apps get abandoned in week two.
 */
export type CategoryKind = "expense" | "income";

export type CategorySeed = {
  key: string;
  name: string;
  /** Index into the theme's category palette. */
  colorKey: ColorKey;
  /** SF Symbol name, rendered via expo-image "sf:" source. */
  symbol: string;
  kind: CategoryKind;
};

export const CATEGORY_COLORS = {
  coral: "#FF6B5A",
  violet: "#7C6BFF",
  emerald: "#2E9E6B",
  blue: "#3B82F6",
  amber: "#F5A524",
  teal: "#14B8A6",
  purple: "#8B5CF6",
  pink: "#EC4899",
  orange: "#F97316",
  cyan: "#06B6D4",
} as const;

export type ColorKey = keyof typeof CATEGORY_COLORS;

export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { key: "food",      name: "Food & Drink",    colorKey: "coral",   symbol: "fork.knife",                            kind: "expense" },
  { key: "transport", name: "Transport",       colorKey: "violet",  symbol: "car.fill",                              kind: "expense" },
  { key: "bills",     name: "Bills & PHCN",    colorKey: "emerald", symbol: "bolt.fill",                             kind: "expense" },
  { key: "data",      name: "Data & Airtime",  colorKey: "blue",    symbol: "antenna.radiowaves.left.and.right",     kind: "expense" },
  { key: "shopping",  name: "Shopping",        colorKey: "amber",   symbol: "bag.fill",                              kind: "expense" },
  { key: "savings",   name: "Savings & Ajo",   colorKey: "teal",    symbol: "banknote.fill",                         kind: "expense" },
  { key: "rent",      name: "Rent",            colorKey: "purple",  symbol: "house.fill",                            kind: "expense" },
  { key: "school",    name: "School fees",     colorKey: "pink",    symbol: "graduationcap.fill",                    kind: "expense" },
  { key: "family",    name: "Family support",  colorKey: "orange",  symbol: "figure.2.and.child.holdinghands",       kind: "expense" },
  { key: "health",    name: "Health",          colorKey: "cyan",    symbol: "cross.case.fill",                       kind: "expense" },
  { key: "salary",    name: "Salary",          colorKey: "emerald", symbol: "creditcard.fill",                       kind: "income"  },
  { key: "other-in",  name: "Other income",    colorKey: "teal",    symbol: "arrow.down.circle.fill",                kind: "income"  },
] as const;
