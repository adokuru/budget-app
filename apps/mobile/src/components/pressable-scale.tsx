import { forwardRef, useState, type ComponentRef } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useReducedMotion } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
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
      <AnimatedPressable
        {...props}
        ref={ref}
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
