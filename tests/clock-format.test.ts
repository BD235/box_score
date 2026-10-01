import { describe, it, expect } from "vitest";
import { formatTime } from "../src/lib/utils";

describe("Clock Format Resolution (FR-CLK-002)", () => {
  it("formats times >= 60 seconds as MM:SS", () => {
    expect(formatTime(600)).toBe("10:00");
    expect(formatTime(125)).toBe("02:05");
    expect(formatTime(60)).toBe("01:00");
  });

  it("formats sub-minute times < 60 seconds as SS.s with tenth of a second precision", () => {
    expect(formatTime(59.9)).toBe("59.9");
    expect(formatTime(14.5)).toBe("14.5");
    expect(formatTime(9.2)).toBe("09.2");
    expect(formatTime(0.0)).toBe("00.0");
  });

  it("clamps negative times to 00.0", () => {
    expect(formatTime(-5)).toBe("00.0");
  });
});
