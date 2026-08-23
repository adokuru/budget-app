import { Q } from "@nozbe/watermelondb";
import { database } from "./index";
import { Space, Category } from "./models";

/**
 * Spaces and their categories are created by the server at signup and arrive
 * on first sync. Nothing is seeded locally, so membership has exactly one
 * source of truth and a device can never invent a space nobody belongs to.
 */
export async function firstSpace(preferredId: string | null): Promise<Space | null> {
  const spaces = database.get<Space>("spaces");

  if (preferredId) {
    const match = await spaces.query(Q.where("id", preferredId)).fetch();
    if (match[0]) return match[0];
  }

  const all = await spaces.query(Q.sortBy("created_at", Q.asc)).fetch();
  return all[0] ?? null;
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
