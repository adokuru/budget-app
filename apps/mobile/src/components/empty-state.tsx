import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export function EmptyState({
  symbol, title, body, action,
}: {
  /** Emoji, to match the rest of the design's iconography. */
  symbol?: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxl, gap: space.sm }}>
      {symbol && <Text style={{ fontSize: 30, marginBottom: space.xs }}>{symbol}</Text>}
      <Text style={{ ...type.screenTitle, color: color.ink }}>{title}</Text>
      <Text style={{ ...type.meta, textAlign: "center", lineHeight: 18, maxWidth: 280 }}>
        {body}
      </Text>
      {action && (
        <Link href={action.href as never} asChild>
          <Pressable
            style={{
              marginTop: space.md, paddingVertical: 10, paddingHorizontal: space.lg,
              borderRadius: radius.pill, backgroundColor: color.accent,
            }}
          >
            <Text style={{ ...type.body, fontWeight: "700", color: color.onAccent }}>
              {action.label}
            </Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}
