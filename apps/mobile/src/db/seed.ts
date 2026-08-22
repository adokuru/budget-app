import { Q } from "@nozbe/watermelondb";
import { DEFAULT_CATEGORIES, type Currency } from "@budget/shared";
import { database } from "./index";
import { Space, Category, User, Membership } from "./models";

/** Stand-in owner until Phase 2 replaces it with the signed-in account. */
export const LOCAL_USER_ID = "local-user";

/**
 * Creates the Personal space and its Nigerian default categories on first run.
 * Idempotent — safe to call on every launch.
 */
export async function ensureSeeded(baseCurrency: Currency = "NGN"): Promise<Space> {
  const spaces = database.get<Space>("spaces");
  const existing = await spaces.query().fetch();
  if (existing.length > 0) return existing[0]!;

  return database.write(async () => {
    const user = await database.get<User>("users").create((u) => {
      u._raw.id = LOCAL_USER_ID;
      u.name = "You";
      u.email = "";
      u.avatarUrl = null;
    });

    const space = await spaces.create((s) => {
      s.name = "Personal";
      s.baseCurrency = baseCurrency;
      s.createdBy = user.id;
    });

    await database.get<Membership>("memberships").create((m) => {
      m.userId = user.id;
      m.spaceId = space.id;
      m.role = "owner";
      m.joinedAt = new Date();
    });

    const categories = database.get<Category>("categories");
    await database.batch(
      ...DEFAULT_CATEGORIES.map((seed, i) =>
        categories.prepareCreate((c) => {
          c.spaceId = space.id;
          c.name = seed.name;
          c.colorKey = seed.colorKey;
          c.symbol = seed.symbol;
          c.kind = seed.kind;
          c.sort = i;
          c.archived = false;
        })
      )
    );

    return space;
  });
}

export async function categoriesFor(spaceId: string, kind?: "expense" | "income") {
  return database
    .get<Category>("categories")
    .query(
      Q.where("space_id", spaceId),
      Q.where("archived", false),
      ...(kind ? [Q.where("kind", kind)] : []),
      Q.sortBy("sort", Q.asc)
    )
    .fetch();
}
