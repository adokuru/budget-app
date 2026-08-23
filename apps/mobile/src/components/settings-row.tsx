import { Switch, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { color, space, GUTTER, type } from "@/theme/tokens";

export function SettingsNavRow({
  label, sub, href,
}: {
  label: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: GUTTER, paddingVertical: space.base,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.rowTitleLg, color: color.ink }}>{label}</Text>
          {sub && <Text style={type.rowSub}>{sub}</Text>}
        </View>
        <Image source="sf:chevron.right" tintColor={color.fainter} style={{ width: 12, height: 12 }} />
      </Pressable>
    </Link>
  );
}

export function SettingsToggleRow({
  label, sub, value, onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md,
        paddingHorizontal: GUTTER, paddingVertical: space.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.rowTitleLg, color: color.ink }}>{label}</Text>
        <Text style={{ ...type.rowSub, lineHeight: 15 }}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(next) => { Haptics.selectionAsync(); onChange(next); }}
        trackColor={{ true: color.accent, false: color.border }}
      />
    </View>
  );
}
