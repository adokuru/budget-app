import { useColorScheme } from "react-native";
import { usePrefs } from "@/state/prefs";
import { resolveScheme, themes, type AppTheme } from "@/theme/tokens";

/** The single reactive source for semantic colours, type tones and shadows. */
export function useTheme(): AppTheme {
  const systemScheme = useColorScheme();
  const { appearance } = usePrefs();
  return themes[resolveScheme(appearance, systemScheme)];
}
