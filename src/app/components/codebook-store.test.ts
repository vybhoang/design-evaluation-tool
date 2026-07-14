import { describe, it, expect } from "vitest";
import { renameCode, mergeCodes, type Code } from "./codebook-store";

const codes: Code[] = [
  { id: "a", label: "Confusing nav", createdAt: 1 },
  { id: "b", label: "Nav feedback", createdAt: 2 },
];

describe("renameCode", () => {
  it("relabels only the matching code", () => {
    expect(renameCode(codes, "a", "Renamed")).toEqual([
      { id: "a", label: "Renamed", createdAt: 1 },
      { id: "b", label: "Nav feedback", createdAt: 2 },
    ]);
  });
});

describe("mergeCodes", () => {
  it("drops the merged-away code from the codebook", () => {
    expect(mergeCodes(codes, "a")).toEqual([{ id: "b", label: "Nav feedback", createdAt: 2 }]);
  });

  it("leaves the codebook untouched if fromId isn't found", () => {
    expect(mergeCodes(codes, "missing")).toEqual(codes);
  });
});
