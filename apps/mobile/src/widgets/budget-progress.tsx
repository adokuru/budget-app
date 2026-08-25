import { createWidget } from "expo-widgets";
import { HStack, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
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
    const background = "#111A3A";
    const primary = "#F5F7FF";
    const secondary = "#C4CAD8";
    const faint = "#9AA3B8";
    const positive = "#D8FF3E";
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
        <Text modifiers={[font({ size: compact ? 22 : 26, weight: "bold", design: "rounded" }), foregroundStyle(primary), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.5)]}>
          {props.hasBudget ? props.remaining : "No budget set"}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(faint)]}>
          {props.hasBudget ? "left this month" : "Open to set one"}
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
