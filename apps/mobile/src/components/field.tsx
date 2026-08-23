import { Text, TextInput, View } from "react-native";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export function Field({
  label, value, onChange, secureTextEntry, keyboardType, autoComplete, onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoComplete?: "email" | "current-password" | "new-password" | "name";
  onSubmit?: () => void;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={{ ...type.micro, color: color.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? "go" : "next"}
        style={{
          ...type.body, color: color.ink,
          backgroundColor: color.card, borderRadius: radius.row, ...CONTINUOUS,
          paddingHorizontal: space.base, paddingVertical: 14,
        }}
      />
    </View>
  );
}
