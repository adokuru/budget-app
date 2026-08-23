import { Stack } from "expo-router/stack";
import { useReducedMotion } from "@/lib/motion";

export default function AuthLayout() {
  const reduced = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduced ? "fade" : "default" }} />;
}
