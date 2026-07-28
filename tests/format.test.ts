import { describe, expect, it } from "vitest";
import { formatJson } from "../src";

describe("formatJson", () => {
  it("formats a JSON string", () => {
    const result = formatJson('{"name":"FormatForge","active":true}');

    expect(result).toBe(
      '{\n  "name": "FormatForge",\n  "active": true\n}'
    );
  });

  it("supports custom indentation", () => {
    const result = formatJson('{"name":"FormatForge"}', {
      indent: 4
    });

    expect(result).toContain('    "name"');
  });

  it("sorts nested object keys without reordering arrays", () => {
    const result = formatJson(
      {
        z: 1,
        a: {
          y: 2,
          b: 3
        },
        items: [{ z: 1, a: 2 }, { c: 3, b: 4 }]
      },
      {
        sortKeys: true
      }
    );

    const parsed = JSON.parse(result) as {
      items: Array<Record<string, number>>;
    };

    expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"z"'));
    expect(result.indexOf('"b"')).toBeLessThan(result.indexOf('"y"'));
    expect(Object.keys(parsed.items[0] ?? {})).toEqual(["a", "z"]);
    expect(Object.keys(parsed.items[1] ?? {})).toEqual(["b", "c"]);
  });

  it("formats valid JSON primitive strings", () => {
    expect(formatJson("true")).toBe("true");
    expect(formatJson("null")).toBe("null");
    expect(formatJson("42")).toBe("42");
  });

  it("throws for invalid JSON", () => {
    expect(() => formatJson('{"name":}')).toThrow(SyntaxError);
  });

  it("rejects invalid indentation", () => {
    expect(() =>
      formatJson('{"name":"FormatForge"}', {
        indent: 20
      })
    ).toThrow(RangeError);
  });

  it("rejects root values that JSON.stringify cannot represent", () => {
    expect(() => formatJson(undefined)).toThrow(TypeError);
    expect(() => formatJson(() => undefined)).toThrow(TypeError);
    expect(() => formatJson(Symbol("value"))).toThrow(TypeError);
  });
});
