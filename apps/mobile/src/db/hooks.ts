import { useEffect, useState } from "react";
import type { Query, Model } from "@nozbe/watermelondb";

/**
 * Subscribe to a WatermelonDB query. Re-renders whenever matching rows change,
 * including changes that arrive from sync rather than from this device.
 *
 * `deps` must contain everything the query was built from — the query object is
 * recreated each render, so it cannot be the dependency itself.
 */
export function useQuery<T extends Model>(
  build: () => Query<T>,
  deps: React.DependencyList
): T[] {
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    const query = build();
    const columns = query.collection.schema.columnArray.map((column) => column.name);
    const sub = query.observeWithColumns(columns).subscribe(setRows);
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rows;
}

/** Same, but for a query whose results feed a total rather than a list. */
export function useQueryCount<T extends Model>(
  build: () => Query<T>,
  deps: React.DependencyList
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sub = build().observeCount().subscribe(setCount);
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return count;
}
