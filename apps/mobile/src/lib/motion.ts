import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Honour the system Reduce Motion setting. Cheap to respect because every
 * animation reads from one place; expensive to retrofit if it is skipped.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
