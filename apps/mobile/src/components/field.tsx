import { Text, TextInput, View } from "react-native";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export function Field({
  label, value, onChange, secureTextEntry, keyboardType, autoComplete, onSubmit, placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoComplete?: "email" | "current-password" | "new-password" | "name";
  onSubmit?: () => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: space.xs }}>
      {label && <Text style={type.eyebrow}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.fainter}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        autoCorrect={false}
        accessibilityLabel={label}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? "go" : "next"}
        style={{
          fontSize: 15, color: color.ink,
          borderWidth: 1, borderColor: color.hairline,
          borderRadius: radius.chip, ...CONTINUOUS,
          paddingHorizontal: space.base, paddingVertical: 13,
        }}
      />
    </View>
  );
}
