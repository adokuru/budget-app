import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Brand } from "@/components/logo";
import { space, GUTTER, radius } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";
import { sync, useSyncStatus } from "@/lib/sync";
import { useAuth } from "@/state/auth";

/**
 * The wordmark, space chip, and quiet sync state. Sits above the native large-title
 * area on every tab so the brand is present without a second nav bar.
 */
export function AppHeader({
  spaceName,
  isShared,
}: {
  spaceName: string;
  isShared: boolean;
}) {
  const { color, shadow, type } = useTheme();
  const syncStatus = useSyncStatus();
  const { signOut } = useAuth();
  const syncLabel = {
    idle: undefined,
    ok: undefined,
    syncing: "Syncing",
    offline: "Offline. Saved on phone.",
    conflict: "Changes not synced",
    unauthenticated: "Sign in again",
    error: "Could not sync",
  }[syncStatus.status];

  return (
    <View
      style={{
        paddingHorizontal: GUTTER,
        paddingVertical: space.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Brand markSize={32} wordSize={17} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/spaces");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.xs,
              backgroundColor: color.surface,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: color.hairline,
              paddingHorizontal: 10,
              paddingVertical: 6,
              ...shadow.card,
            }}
          >
            <Text style={{ fontSize: 12 }}>{isShared ? "👨‍👩‍👧" : "👤"}</Text>
            <Text style={{ ...type.body, fontWeight: "600", color: color.ink }} numberOfLines={1}>
              {spaceName}
            </Text>
            <Image source="sf:chevron.down" tintColor={color.faint} style={{ width: 9, height: 9 }} />
          </Pressable>
        </View>
      </View>

      {syncLabel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={syncStatus.status === "syncing"
            ? syncLabel
            : syncStatus.status === "unauthenticated"
              ? "Session expired. Tap to sign in again."
              : `${syncLabel}. Tap to try again.`}
          disabled={syncStatus.status === "syncing"}
          onPress={() => {
            if (syncStatus.status === "unauthenticated") void signOut();
            else void sync();
          }}
          style={{
            alignSelf: "flex-end",
            marginTop: space.xs,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: radius.pill,
            backgroundColor: syncStatus.status === "offline" ? color.surface : color.surfaceStrong,
            borderWidth: 1,
            borderColor: syncStatus.status === "offline" ? color.hairline : color.surfaceStrong,
          }}
        >
          <Text
            style={{
              ...type.meta,
              fontWeight: "700",
              color: syncStatus.status === "offline" ? color.faint : color.onStrong,
            }}
          >
            {syncLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
