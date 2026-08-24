import { forwardRef, useState, type ComponentRef } from "react";
import {
  Pressable,
  Easing,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useReducedMotion } from "@/lib/motion";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const MOTION = {
  transform: [{ scale: 1 }],
  transitionProperty: "transform",
  transitionDuration: "120ms",
  transitionTimingFunction: EASE_OUT,
} as const;
const PRESSED = { transform: [{ scale: 0.97 }] } as const;

/** Near-imperceptible press-in feedback shared by intentional app actions. */
export const PressableScale = forwardRef<ComponentRef<typeof Pressable>, PressableProps>(
  function PressableScale({ disabled, onPressIn, onPressOut, style, ...props }, ref) {
    const [pressed, setPressed] = useState(false);
    const reduced = useReducedMotion();

    return (
      <Pressable
        {...props}
        ref={ref}
        accessibilityRole={props.accessibilityRole ?? "button"}
        disabled={disabled}
        pressRetentionOffset={props.pressRetentionOffset ?? 16}
        onPressIn={(event) => {
          setPressed(true);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          setPressed(false);
          onPressOut?.(event);
        }}
        style={(state: PressableStateCallbackType) => [
          typeof style === "function" ? style(state) : style,
          !reduced && MOTION,
          pressed && !disabled && !reduced && PRESSED,
        ]}
      />
    );
  }
);
