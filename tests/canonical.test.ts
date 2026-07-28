import { describe, expect, it } from "vitest";

import {
  canonicalize,
  canonicalizeJson,
  isCanonicalJson,
  JsonCanonicalizationError,
  stableStringify
} from "../src";

describe("stableStringify", () => {
  it("sorts object keys recursively", () => {
    expect(
      stableStringify({ z: 1, nested: { y: 2, a: 3 }, a: 4 })
    ).toBe('{"a":4,"nested":{"a":3,"y":2},"z":1}');
  });

  it("preserves array order", () => {
    expect(stableStringify([{ z: 1, a: 2 }, 3, 1])).toBe(
      '[{"a":2,"z":1},3,1]'
    );
  });

  it("serializes primitive root values", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(-0)).toBe("0");
  });

  it("supports numeric indentation", () => {
    expect(stableStringify({ b: 2, a: 1 }, { space: 2 })).toBe(
      '{\n  "a": 1,\n  "b": 2\n}'
    );
  });

  it("supports string indentation capped at ten characters", () => {
    expect(stableStringify({ a: { b: 1 } }, { space: "............" })).toBe(
      '{\n.........."a": {\n...................."b": 1\n..........}\n}'
    );
  });

  it("supports a custom key comparator", () => {
    expect(
      stableStringify(
        { a: 1, c: 3, b: 2 },
        { comparator: (left, right) => right.localeCompare(left) }
      )
    ).toBe('{"c":3,"b":2,"a":1}');
  });

  it("does not mutate the input", () => {
    const input = { z: { b: 2, a: 1 }, a: [3, 2, 1] };
    const snapshot = JSON.parse(JSON.stringify(input));

    stableStringify(input);

    expect(input).toEqual(snapshot);
    expect(Object.keys(input)).toEqual(["z", "a"]);
  });

  it("rejects non-finite numbers with the value path", () => {
    expect(() => stableStringify({ nested: [1, Number.NaN] } as never)).toThrowError(
      expect.objectContaining({
        name: "JsonCanonicalizationError",
        path: "$.nested[1]"
      })
    );
  });

  it("rejects unsupported values", () => {
    expect(() => stableStringify({ value: undefined } as never)).toThrow(
      "Unsupported JSON value of type undefined at $.value"
    );
  });

  it("rejects non-plain objects", () => {
    expect(() => stableStringify({ date: new Date() } as never)).toThrow(
      "Only plain objects and arrays are supported at $.date"
    );
  });

  it("detects circular object references", () => {
    const input: Record<string, unknown> = {};
    input.self = input;

    expect(() => stableStringify(input as never)).toThrowError(
      expect.objectContaining({
        name: "JsonCanonicalizationError",
        path: "$.self"
      })
    );
  });

  it("allows repeated non-circular references", () => {
    const shared = { b: 2, a: 1 };
    expect(stableStringify({ left: shared, right: shared })).toBe(
      '{"left":{"a":1,"b":2},"right":{"a":1,"b":2}}'
    );
  });

  it("reports bracket paths for unusual property names", () => {
    expect(() => stableStringify({ "a.b": Number.POSITIVE_INFINITY } as never)).toThrow(
      'JSON numbers must be finite at $["a.b"]'
    );
  });
});

describe("canonical JSON helpers", () => {
  it("canonicalizes JSON values", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("canonicalizes JSON text", () => {
    expect(canonicalizeJson('{ "z": 2, "a": { "d": 4, "c": 3 } }')).toBe(
      '{"a":{"c":3,"d":4},"z":2}'
    );
  });

  it("wraps malformed JSON errors", () => {
    expect(() => canonicalizeJson('{"a":}')).toThrow(JsonCanonicalizationError);
  });

  it("rejects non-string canonicalizeJson input at runtime", () => {
    expect(() => canonicalizeJson(42 as never)).toThrow(TypeError);
  });

  it("identifies canonical JSON text", () => {
    expect(isCanonicalJson('{"a":1,"b":2}')).toBe(true);
    expect(isCanonicalJson('{"b":2,"a":1}')).toBe(false);
    expect(isCanonicalJson('{ "a": 1, "b": 2 }')).toBe(false);
  });

  it("returns false for invalid JSON or non-string input", () => {
    expect(isCanonicalJson("{" )).toBe(false);
    expect(isCanonicalJson(null as never)).toBe(false);
  });
});
