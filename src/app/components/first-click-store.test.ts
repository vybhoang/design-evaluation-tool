import { describe, it, expect } from "vitest";
import { isHit } from "./first-click-store";

describe("isHit", () => {
  const region = { x: 0.2, y: 0.3, w: 0.1, h: 0.05 };

  it("is true for a point inside the region", () => {
    expect(isHit({ x: 0.25, y: 0.32 }, region)).toBe(true);
  });

  it("is true exactly on the region's edges", () => {
    expect(isHit({ x: 0.2, y: 0.3 }, region)).toBe(true);
    expect(isHit({ x: 0.3, y: 0.35 }, region)).toBe(true);
  });

  it("is false just outside the region", () => {
    expect(isHit({ x: 0.19, y: 0.32 }, region)).toBe(false);
    expect(isHit({ x: 0.25, y: 0.36 }, region)).toBe(false);
  });
});
