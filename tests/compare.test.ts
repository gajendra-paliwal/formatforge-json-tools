import { describe, expect, it } from "vitest";
import { compareJson, diffJson, isDeepEqual } from "../src";

describe("isDeepEqual", () => {
  it("ignores object property order", () => {
    expect(isDeepEqual({ a: 1, nested: { b: true } }, { nested: { b: true }, a: 1 })).toBe(true);
  });

  it("treats array order as significant", () => {
    expect(isDeepEqual([1, 2], [2, 1])).toBe(false);
  });

  it("compares primitive and root values", () => {
    expect(isDeepEqual(null, null)).toBe(true);
    expect(isDeepEqual("1", 1)).toBe(false);
  });

  it("rejects non-JSON values", () => {
    expect(() => isDeepEqual(new Date(), {})).toThrow(TypeError);
    expect(() => isDeepEqual(Number.NaN, 0)).toThrow(TypeError);
  });
});

describe("diffJson", () => {
  it("returns no differences for equal values", () => {
    expect(diffJson({ a: [1, 2] }, { a: [1, 2] })).toEqual([]);
  });

  it("reports changed primitive values", () => {
    expect(diffJson({ enabled: false }, { enabled: true })).toEqual([
      { type: "changed", path: "/enabled", left: false, right: true }
    ]);
  });

  it("reports added and removed object properties deterministically", () => {
    expect(diffJson({ keep: 1, removed: 2 }, { added: 3, keep: 1 })).toEqual([
      { type: "added", path: "/added", right: 3 },
      { type: "removed", path: "/removed", left: 2 }
    ]);
  });

  it("reports nested array changes and additions", () => {
    expect(diffJson({ items: ["a"] }, { items: ["b", "c"] })).toEqual([
      { type: "changed", path: "/items/0", left: "a", right: "b" },
      { type: "added", path: "/items/1", right: "c" }
    ]);
  });

  it("reports array removals", () => {
    expect(diffJson([1, 2, 3], [1])).toEqual([
      { type: "removed", path: "/1", left: 2 },
      { type: "removed", path: "/2", left: 3 }
    ]);
  });

  it("uses an empty pointer for a changed root value", () => {
    expect(diffJson(1, 2)).toEqual([
      { type: "changed", path: "", left: 1, right: 2 }
    ]);
  });

  it("escapes JSON Pointer path segments", () => {
    expect(diffJson({ "a/b~c": 1 }, { "a/b~c": 2 })).toEqual([
      { type: "changed", path: "/a~1b~0c", left: 1, right: 2 }
    ]);
  });

  it("reports a type change at the containing path", () => {
    expect(diffJson({ value: [] }, { value: {} })).toEqual([
      { type: "changed", path: "/value", left: [], right: {} }
    ]);
  });

  it("limits the number of returned differences", () => {
    expect(diffJson({ a: 1, b: 2 }, { a: 3, b: 4 }, { maxDifferences: 1 })).toHaveLength(1);
  });

  it("rejects invalid difference limits", () => {
    expect(() => diffJson({}, {}, { maxDifferences: 0 })).toThrow(RangeError);
    expect(() => diffJson({}, {}, { maxDifferences: 1.5 })).toThrow(RangeError);
  });
});

describe("compareJson", () => {
  it("returns summary counts", () => {
    expect(compareJson({ a: 1, old: true }, { a: 2, next: true })).toEqual({
      equal: false,
      differences: [
        { type: "changed", path: "/a", left: 1, right: 2 },
        { type: "added", path: "/next", right: true },
        { type: "removed", path: "/old", left: true }
      ],
      added: 1,
      removed: 1,
      changed: 1
    });
  });

  it("returns an equal result", () => {
    expect(compareJson([1], [1])).toEqual({
      equal: true,
      differences: [],
      added: 0,
      removed: 0,
      changed: 0
    });
  });
});
