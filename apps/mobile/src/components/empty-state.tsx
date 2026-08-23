import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";

export function EmptyState({
  symbol, title, body, action,
}: {
  symbol: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <View
      style={{
        backgroundColor: color.card, borderRadius: radius.card, ...CONTINUOUS,
        padding: space.xl, alignItems: "center", gap: space.sm,
      }}
    >
      <View
        style={{
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: tint(color.accent, 0.1),
          alignItems: "center", justifyContent: "center", marginBottom: space.xs,
        }}
      >
        <Image source={`sf:${symbol}`} tintColor={color.accent} style={{ width: 24, height: 24 }} />
      </View>
      <Text style={{ ...type.heading, color: color.ink }}>{title}</Text>
      <Text style={{ ...type.caption, color: color.muted, textAlign: "center", lineHeight: 18 }}>
        {body}
      </Text>
      {action && (
        <Link href={action.href as never} asChild>
          <Pressable
            style={{
              marginTop: space.sm, paddingVertical: 10, paddingHorizontal: space.lg,
              borderRadius: radius.pill, backgroundColor: color.accent,
            }}
          >
            <Text style={{ ...type.label, fontWeight: "600", color: color.onAccent }}>
              {action.label}
            </Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}
