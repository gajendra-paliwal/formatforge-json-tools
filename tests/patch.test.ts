import { describe, expect, it } from "vitest";
import {
  applyPatch,
  createPatch,
  invertPatch,
  JsonPatchError,
  validatePatch,
  type JsonPatchOperation
} from "../src";

describe("JSON Patch", () => {
  it("creates and applies an object patch", () => {
    const source = { name: "Alice", active: true, address: { city: "Paris" } };
    const target = { name: "Bob", address: { city: "London" }, age: 30 };
    const patch = createPatch(source, target);
    expect(applyPatch(source, patch).document).toEqual(target);
    expect(source.name).toBe("Alice");
  });

  it("replaces arrays deterministically", () => {
    const patch = createPatch({ items: [1, 2] }, { items: [1, 3, 4] });
    expect(patch).toEqual([{ op: "replace", path: "/items", value: [1, 3, 4] }]);
  });

  it("escapes JSON Pointer keys", () => {
    const patch = createPatch({ "a/b": 1, "x~y": 2 }, { "a/b": 3, "x~y": 2 });
    expect(patch[0]?.path).toBe("/a~1b");
  });

  it("supports add, remove, and replace", () => {
    const patch: JsonPatchOperation[] = [
      { op: "add", path: "/age", value: 30 },
      { op: "replace", path: "/name", value: "Bob" },
      { op: "remove", path: "/active" }
    ];
    expect(applyPatch({ name: "Alice", active: true }, patch).document)
      .toEqual({ name: "Bob", age: 30 });
  });

  it("supports array append and insertion", () => {
    const result = applyPatch(["a", "c"], [
      { op: "add", path: "/1", value: "b" },
      { op: "add", path: "/-", value: "d" }
    ]).document;
    expect(result).toEqual(["a", "b", "c", "d"]);
  });

  it("supports copy and move", () => {
    const result = applyPatch({ a: { value: 1 }, list: ["x", "y"] }, [
      { op: "copy", from: "/a", path: "/b" },
      { op: "move", from: "/list/0", path: "/list/1" }
    ]).document;
    expect(result).toEqual({ a: { value: 1 }, b: { value: 1 }, list: ["y", "x"] });
  });

  it("supports successful test operations", () => {
    const result = applyPatch({ status: "ready" }, [
      { op: "test", path: "/status", value: "ready" }
    ]);
    expect(result.applied).toBe(1);
  });

  it("throws JsonPatchError when a test fails", () => {
    expect(() => applyPatch({ status: "ready" }, [
      { op: "test", path: "/status", value: "done" }
    ])).toThrow(JsonPatchError);
  });

  it("supports replacing the root document", () => {
    expect(applyPatch({ a: 1 }, [{ op: "replace", path: "", value: [1, 2] }]).document)
      .toEqual([1, 2]);
  });

  it("validates patch operation structure", () => {
    expect(validatePatch([{ op: "add", path: "/x", value: 1 }]).valid).toBe(true);
    const invalid = validatePatch([{ op: "replace", path: "x" }]);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid array indexes", () => {
    expect(() => applyPatch([1], [{ op: "remove", path: "/01" }])).toThrow(JsonPatchError);
  });

  it("prevents moving a value into its own child", () => {
    expect(() => applyPatch({ a: { b: 1 } }, [
      { op: "move", from: "/a", path: "/a/c" }
    ])).toThrow(JsonPatchError);
  });


  it("inverts array insertion without replacing the previous item", () => {
    const original = { tags: ["a", "c"] };
    const patch: JsonPatchOperation[] = [
      { op: "add", path: "/tags/1", value: "b" }
    ];
    const changed = applyPatch(original, patch).document;
    const inverse = invertPatch(original, patch);

    expect(changed).toEqual({ tags: ["a", "b", "c"] });
    expect(inverse).toEqual([{ op: "remove", path: "/tags/1" }]);
    expect(applyPatch(changed, inverse).document).toEqual(original);
  });

  it("creates an inverse patch", () => {
    const original = { name: "Alice", active: true, tags: ["a"] };
    const patch: JsonPatchOperation[] = [
      { op: "replace", path: "/name", value: "Bob" },
      { op: "remove", path: "/active" },
      { op: "add", path: "/age", value: 30 },
      { op: "add", path: "/tags/-", value: "b" }
    ];
    const changed = applyPatch(original, patch).document;
    const inverse = invertPatch(original, patch);
    expect(applyPatch(changed, inverse).document).toEqual(original);
  });
});
