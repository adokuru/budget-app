import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { space, radius, CONTINUOUS } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";

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
  const { color, type } = useTheme();
  const [hidden, setHidden] = useState(secureTextEntry ?? false);
  return (
    <View style={{ gap: space.xs }}>
      {label && <Text style={type.eyebrow}>{label}</Text>}
      <View>
        <TextInput
          testID={label ? `field-${label.toLowerCase()}` : undefined}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={color.fainter}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
          autoCorrect={false}
          accessibilityLabel={label}
          onSubmitEditing={onSubmit}
          returnKeyType={onSubmit ? "go" : "next"}
          style={{
            fontSize: 15, color: color.ink,
            backgroundColor: color.surface,
            borderWidth: 1, borderColor: color.hairline,
            borderRadius: radius.chip, ...CONTINUOUS,
            paddingLeft: space.base, paddingRight: secureTextEntry ? 70 : space.base, paddingVertical: 13,
          }}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            onPress={() => setHidden((current) => !current)}
            style={{ position: "absolute", right: space.base, top: 0, bottom: 0, justifyContent: "center" }}
          >
            <Text style={{ ...type.rowSub, fontWeight: "700", color: color.accent }}>
              {hidden ? "Show" : "Hide"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
