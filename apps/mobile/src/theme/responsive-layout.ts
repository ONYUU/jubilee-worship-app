import type { ViewStyle } from "react-native";

export const SCREEN_CONTENT_MAX_WIDTH = 720;
export const ACTION_ITEM_MIN_WIDTH = 136;
export const COMPACT_ACTION_ITEM_MIN_WIDTH = 104;

export const centeredScreenContentStyle = {
  width: "100%",
  maxWidth: SCREEN_CONTENT_MAX_WIDTH,
  alignSelf: "center"
} satisfies ViewStyle;

export const wrappingRowStyle = {
  flexDirection: "row",
  flexWrap: "wrap"
} satisfies ViewStyle;

export function createWrappingRowItemStyle(minWidth: number): ViewStyle {
  return {
    flexGrow: 1,
    flexBasis: minWidth,
    minWidth
  };
}

export const actionItemStyle = createWrappingRowItemStyle(ACTION_ITEM_MIN_WIDTH);
export const compactActionItemStyle = createWrappingRowItemStyle(
  COMPACT_ACTION_ITEM_MIN_WIDTH
);
