import { createWidget } from "expo-widgets";
import { HStack, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  monospacedDigit,
  progressViewStyle,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";

export type BudgetWidgetProps = {
  month: string;
  budget: string;
  spent: string;
  remaining: string;
  progress: number;
  hasBudget: boolean;
};

export const BudgetProgressWidget = createWidget<BudgetWidgetProps>(
  "BudgetProgress",
  (props, environment) => {
    "widget";
    const compact = environment.widgetFamily === "systemSmall";
    const dark = environment.colorScheme === "dark";
    const background = dark ? "#11172A" : "#FAFAF8";
    const primary = dark ? "#F5F7FF" : "#11162A";
    const secondary = dark ? "#C4CAD8" : "#555555";
    const faint = dark ? "#9AA3B8" : "#777777";
    const positive = dark ? "#3AD995" : "#008A50";
    return (
      <VStack
        alignment="leading"
        spacing={compact ? 8 : 10}
        modifiers={[
          containerBackground(background, "widget"),
          widgetURL("kobo://budget"),
        ]}
      >
        <Text modifiers={[font({ size: 11, weight: "bold" }), foregroundStyle(positive)]}>
          {props.month.toUpperCase()} BUDGET
        </Text>
        <Text modifiers={[font({ size: compact ? 22 : 26, weight: "bold", design: "rounded" }), foregroundStyle(primary), monospacedDigit()]}>
          {props.hasBudget ? props.remaining : "No budget set"}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(faint)]}>
          {props.hasBudget ? "left this month" : "Tap to add one"}
        </Text>
        <Spacer />
        <ProgressView
          value={props.progress}
          modifiers={[progressViewStyle("linear"), tint(positive)]}
        />
        {!compact && (
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(secondary), monospacedDigit()]}>
              {props.spent} spent
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 11 }), foregroundStyle(faint), monospacedDigit()]}>
              {props.budget} total
            </Text>
          </HStack>
        )}
      </VStack>
    );
  }
);
