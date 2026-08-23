/**
 * Default categories seeded into a new space.
 *
 * Deliberately Nigeria-first. "Family support", "Data & Airtime",
 * "Savings & Ajo" and "School fees" are real lines in a real Nigerian
 * budget that imported budgeting apps do not model, and their absence
 * is why those apps get abandoned in week two.
 *
 * Each carries an emoji (what the design shows) and an SF Symbol (kept for
 * anywhere a monochrome glyph reads better, such as the tab bar).
 */
export type CategoryKind = "expense" | "income";

export type CategorySeed = {
  key: string;
  name: string;
  /** Index into the theme's category palette. */
  colorKey: ColorKey;
  /** Shown in lists and pickers. */
  emoji: string;
  /** SF Symbol name, for monochrome contexts. */
  symbol: string;
  kind: CategoryKind;
};

export const CATEGORY_COLORS = {
  coral: "#E8643A",
  blue: "#3570E2",
  amber: "#D4860A",
  violet: "#7B5CE8",
  pink: "#D4477A",
  emerald: "#00A860",
  brown: "#92400E",
  teal: "#0D7D8A",
  purple: "#6240D4",
  crimson: "#C0293A",
} as const;

export type ColorKey = keyof typeof CATEGORY_COLORS;

export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { key: "food",      name: "Food",           colorKey: "coral",   emoji: "🍲", symbol: "fork.knife",                        kind: "expense" },
  { key: "transport", name: "Transport",      colorKey: "blue",    emoji: "🚗", symbol: "car.fill",                          kind: "expense" },
  { key: "bills",     name: "Bills & PHCN",   colorKey: "amber",   emoji: "⚡", symbol: "bolt.fill",                         kind: "expense" },
  { key: "data",      name: "Data & Airtime", colorKey: "violet",  emoji: "📱", symbol: "antenna.radiowaves.left.and.right", kind: "expense" },
  { key: "shopping",  name: "Shopping",       colorKey: "pink",    emoji: "🛍️", symbol: "bag.fill",                          kind: "expense" },
  { key: "savings",   name: "Savings & Ajo",  colorKey: "emerald", emoji: "💰", symbol: "banknote.fill",                     kind: "expense" },
  { key: "rent",      name: "Rent",           colorKey: "brown",   emoji: "🏠", symbol: "house.fill",                        kind: "expense" },
  { key: "school",    name: "School Fees",    colorKey: "teal",    emoji: "📚", symbol: "graduationcap.fill",                kind: "expense" },
  { key: "family",    name: "Family Support", colorKey: "purple",  emoji: "👨‍👩‍👧", symbol: "figure.2.and.child.holdinghands",   kind: "expense" },
  { key: "health",    name: "Health",         colorKey: "crimson", emoji: "🏥", symbol: "cross.case.fill",                   kind: "expense" },
  { key: "salary",    name: "Salary",         colorKey: "emerald", emoji: "💼", symbol: "creditcard.fill",                   kind: "income"  },
  { key: "other-in",  name: "Other Income",   colorKey: "teal",    emoji: "💵", symbol: "arrow.down.circle.fill",            kind: "income"  },
] as const;

/** Emoji by colour key, for rows whose category row was deleted server-side. */
export const FALLBACK_EMOJI = "💸";
