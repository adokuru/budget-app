import { File, Paths } from "expo-file-system";

/**
 * Tiny device-local JSON store.
 *
 * ponytail: expo-file-system is already in the native build, so this replaces
 * an AsyncStorage dependency (and a native rebuild) with ~20 lines. Only used
 * for device-local state — anything that must reach other devices belongs in
 * WatermelonDB so it syncs.
 */
export function readJson<T>(name: string): T | null {
  try {
    const f = new File(Paths.document, name);
    if (!f.exists) return null;
    return JSON.parse(f.textSync()) as T;
  } catch {
    return null;
  }
}

export function writeJson(name: string, value: unknown): void {
  try {
    const f = new File(Paths.document, name);
    if (!f.exists) f.create({ intermediates: true });
    f.write(JSON.stringify(value));
  } catch (e) {
    console.warn(`[store] failed to write ${name}`, e);
  }
}
