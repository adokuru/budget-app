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
    return (
      <VStack
        alignment="leading"
        spacing={compact ? 8 : 10}
        modifiers={[
          containerBackground("#FAFAF8", "widget"),
          widgetURL("kobo://budget"),
        ]}
      >
        <Text modifiers={[font({ size: 11, weight: "bold" }), foregroundStyle("#00A860")]}>
          {props.month.toUpperCase()} BUDGET
        </Text>
        <Text modifiers={[font({ size: compact ? 22 : 26, weight: "bold", design: "rounded" }), monospacedDigit()]}>
          {props.hasBudget ? props.remaining : "No budget set"}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle("#777777")]}>
          {props.hasBudget ? "left this month" : "Tap to add one"}
        </Text>
        <Spacer />
        <ProgressView
          value={props.progress}
          modifiers={[progressViewStyle("linear"), tint("#00A860")]}
        />
        {!compact && (
          <HStack spacing={6}>
            <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle("#555555"), monospacedDigit()]}>
              {props.spent} spent
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 11 }), foregroundStyle("#999999"), monospacedDigit()]}>
              {props.budget} total
            </Text>
          </HStack>
        )}
      </VStack>
    );
  }
);
