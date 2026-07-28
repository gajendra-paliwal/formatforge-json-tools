import { describe, expect, it } from "vitest";
import {
  isValidJson,
  JsonParseError,
  parseJson,
  validateJson
} from "../src";

describe("isValidJson", () => {
  it("accepts objects, arrays, and JSON primitives", () => {
    expect(isValidJson('{"name":"FormatForge"}')).toBe(true);
    expect(isValidJson("[1,2,3]")).toBe(true);
    expect(isValidJson("null")).toBe(true);
    expect(isValidJson("false")).toBe(true);
    expect(isValidJson("42")).toBe(true);
  });

  it("rejects malformed or empty input", () => {
    expect(isValidJson('{"name":}')).toBe(false);
    expect(isValidJson("")).toBe(false);
    expect(isValidJson("   ")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(() => isValidJson(null as unknown as string)).toThrow(TypeError);
  });
});

describe("parseJson", () => {
  it("returns a typed parsed value", () => {
    const result = parseJson<{ name: string }>('{"name":"FormatForge"}');

    expect(result.name).toBe("FormatForge");
  });

  it("throws JsonParseError with location information", () => {
    const input = '{\n  "name": "FormatForge",\n  "active": tru\n}';

    try {
      parseJson(input);
      throw new Error("Expected parseJson to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(JsonParseError);
      const e = error as JsonParseError;
      expect(e.name).toBe("JsonParseError");
      expect(e.line).toBeGreaterThan(0);
      expect(e.column).toBeGreaterThan(0);
      expect(e.position).toBeGreaterThanOrEqual(0);
      expect(e.message.length).toBeGreaterThan(0);
    }
  });
});

describe("validateJson", () => {
  it("returns a discriminated success result", () => {
    const result = validateJson<{ count: number }>('{"count":3}');

    expect(result).toEqual({
      valid: true,
      value: { count: 3 },
      error: null
    });
  });

  it("returns structured error information without throwing", () => {
    const result = validateJson('{\n  "name": "FormatForge",\n}');

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.value).toBeNull();
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(result.error.line).toBeGreaterThan(0);
      expect(result.error.column).toBeGreaterThan(0);
      expect(result.error.position).toBeGreaterThan(0);
    }
  });
});
