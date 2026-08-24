import {
  AccessibilityInfo,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "@/lib/motion";
import { color, CONTINUOUS, radius, space, type } from "@/theme/tokens";

type ToastTone = "info" | "success" | "error";
type ToastOptions = { tone?: ToastTone; duration?: number };
type ToastItem = { id: number; message: string; tone: ToastTone };
type ToastValue = { show: (message: string, options?: ToastOptions) => void };

const ToastContext = createContext<ToastValue | null>(null);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const TOAST_ENTER = FadeInDown.duration(300).easing(EASE_OUT);
const TOAST_EXIT = FadeOutDown.duration(250).easing(EASE_OUT);
const TOAST_FADE_IN = FadeIn.duration(200).easing(EASE_OUT);
const TOAST_FADE_OUT = FadeOut.duration(180).easing(EASE_OUT);
const TOAST_LAYOUT = LinearTransition.duration(200).easing(EASE_IN_OUT);
const MAX_TOASTS = 3;

export function useToast(): ToastValue {
  const value = use(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message: string, options?: ToastOptions) => {
    const id = nextId.current++;
    const duration = Math.max(1_000, options?.duration ?? 3_200);
    setToasts((current) => [
      ...current,
      { id, message, tone: options?.tone ?? "info" },
    ].slice(-MAX_TOASTS));
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
    AccessibilityInfo.announceForAccessibility(message);
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={value}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext>
  );
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: space.base,
        right: space.base,
        bottom: insets.bottom + 76,
        zIndex: 100,
        gap: space.sm,
      }}
    >
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          entering={reduced ? TOAST_FADE_IN : TOAST_ENTER}
          exiting={reduced ? TOAST_FADE_OUT : TOAST_EXIT}
          layout={reduced ? undefined : TOAST_LAYOUT}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={toastStyle}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: toneColor(toast.tone),
            }}
          />
          <Text style={{ ...type.body, flex: 1, fontWeight: "600", color: color.onAccent }}>
            {toast.message}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

function toneColor(tone: ToastTone): string {
  if (tone === "error") return color.danger;
  if (tone === "success") return color.positive;
  return color.fainter;
}

const toastStyle: ViewStyle = {
  ...CONTINUOUS,
  minHeight: 48,
  flexDirection: "row",
  alignItems: "center",
  gap: space.md,
  paddingHorizontal: space.base,
  paddingVertical: space.md,
  borderRadius: radius.card,
  backgroundColor: color.ink,
  boxShadow: "0 8px 24px rgba(17, 17, 20, 0.18)",
};
