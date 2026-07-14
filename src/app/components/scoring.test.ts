import { describe, it, expect } from "vitest";
import { scoreSUS, scoreNPS, scoreSAT, scoreSEQ } from "./scoring";

describe("scoreSUS", () => {
  it("returns null when there are not exactly 10 items", () => {
    expect(scoreSUS([4, 3, 4])).toBeNull();
    expect(scoreSUS([])).toBeNull();
  });

  it("scores a perfect-usability response (odd=5, even=1) as 100", () => {
    expect(scoreSUS([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
  });

  it("scores a worst-case response (odd=1, even=5) as 0", () => {
    expect(scoreSUS([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
  });
});

describe("scoreNPS", () => {
  it("returns a null score with zero-n sentinels for no responses", () => {
    expect(scoreNPS([])).toEqual({ promoters: 0, passives: 0, detractors: 0, score: null });
  });

  it("buckets promoters/passives/detractors and computes -100..100 score", () => {
    expect(scoreNPS([9, 9, 2, 6, 10])).toEqual({
      promoters: 3,
      passives: 0,
      detractors: 2,
      score: 20,
    });
  });
});

describe("scoreSAT", () => {
  it("returns null for no responses, never a fabricated zero", () => {
    expect(scoreSAT([])).toBeNull();
  });

  it("averages raw values", () => {
    expect(scoreSAT([4, 5, 3])).toBeCloseTo(4);
  });
});

describe("scoreSEQ", () => {
  it("returns a null mean with n=0 for no responses", () => {
    expect(scoreSEQ([])).toEqual({ mean: null, n: 0 });
  });

  it("computes mean and raw n", () => {
    expect(scoreSEQ([7, 6, 5])).toEqual({ mean: 6, n: 3 });
  });
});
