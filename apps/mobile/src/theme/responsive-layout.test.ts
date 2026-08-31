import { describe, expect, it } from "vitest";
import {
  ACTION_ITEM_MIN_WIDTH,
  COMPACT_ACTION_ITEM_MIN_WIDTH,
  SCREEN_CONTENT_MAX_WIDTH,
  actionItemStyle,
  centeredScreenContentStyle,
  compactActionItemStyle,
  createWrappingRowItemStyle,
  wrappingRowStyle
} from "./responsive-layout";

describe("responsive layout invariants", () => {
  it("centers a readable single-column screen without narrowing phones", () => {
    expect(centeredScreenContentStyle).toEqual({
      width: "100%",
      maxWidth: SCREEN_CONTENT_MAX_WIDTH,
      alignSelf: "center"
    });
    expect(SCREEN_CONTENT_MAX_WIDTH).toBeGreaterThanOrEqual(600);
    expect(SCREEN_CONTENT_MAX_WIDTH).toBeLessThanOrEqual(840);
  });

  it("allows action rows to wrap instead of compressing below their safe width", () => {
    expect(wrappingRowStyle).toEqual({
      flexDirection: "row",
      flexWrap: "wrap"
    });
    expect(actionItemStyle).toEqual({
      flexGrow: 1,
      flexBasis: ACTION_ITEM_MIN_WIDTH,
      minWidth: ACTION_ITEM_MIN_WIDTH
    });
    expect(compactActionItemStyle).toEqual({
      flexGrow: 1,
      flexBasis: COMPACT_ACTION_ITEM_MIN_WIDTH,
      minWidth: COMPACT_ACTION_ITEM_MIN_WIDTH
    });
  });

  it("keeps a custom row item's flex basis and minimum width in sync", () => {
    expect(createWrappingRowItemStyle(152)).toEqual({
      flexGrow: 1,
      flexBasis: 152,
      minWidth: 152
    });
  });
});
