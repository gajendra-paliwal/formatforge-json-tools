import { describe, expect, it } from "vitest";
import {
  exists,
  find,
  first,
  JsonPathError,
  parseJsonPath,
  query,
  select
} from "../src";

const document = {
  store: {
    books: [
      { title: "JSON Basics", price: 10, tags: ["json", "beginner"] },
      { title: "TypeScript", price: 20, tags: ["typescript"] }
    ],
    open: true
  },
  "a.b": { "slash/key": "escaped" },
  empty: [],
  nullable: null
} as const;

describe("JSONPath", () => {
  it("selects the root value", () => {
    expect(query(document, "$" as never)).toEqual([document]);
  });

  it("selects a property using dot notation", () => {
    expect(query(document, "$.store.open" as never)).toEqual([true]);
  });

  it("selects an array index", () => {
    expect(query(document, "$.store.books[1].title" as never)).toEqual(["TypeScript"]);
  });

  it("selects every array item with a wildcard", () => {
    expect(query(document, "$.store.books[*].price" as never)).toEqual([10, 20]);
  });

  it("supports dot wildcards for objects", () => {
    expect(query({ a: 1, b: 2 }, "$.*")).toEqual([1, 2]);
  });

  it("supports bracket wildcards for objects", () => {
    expect(query({ a: 1, b: 2 }, "$[*]")).toEqual([1, 2]);
  });

  it("supports nested wildcards", () => {
    expect(query(document, "$.store.books[*].tags[*]" as never)).toEqual(["json", "beginner", "typescript"]);
  });

  it("returns an empty array for a missing property", () => {
    expect(query(document, "$.missing" as never)).toEqual([]);
  });

  it("returns an empty array for an out-of-range index", () => {
    expect(query(document, "$.store.books[9]" as never)).toEqual([]);
  });

  it("returns an empty array when traversing a primitive", () => {
    expect(query(document, "$.store.open.value" as never)).toEqual([]);
  });

  it("handles empty arrays", () => {
    expect(query(document, "$.empty[*]" as never)).toEqual([]);
  });

  it("handles null values", () => {
    expect(query(document, "$.nullable" as never)).toEqual([null]);
  });

  it("supports double-quoted bracket properties", () => {
    expect(query(document, '$["a.b"]["slash/key"]' as never)).toEqual(["escaped"]);
  });

  it("supports single-quoted bracket properties", () => {
    expect(query(document, "$['a.b']['slash/key']" as never)).toEqual(["escaped"]);
  });

  it("supports escaped quotes and Unicode in bracket properties", () => {
    const value = { 'a"b': 1, "snowman☃": 2 };
    expect(query(value, '$["a\\"b"]')).toEqual([1]);
    expect(query(value, '$["snowman\\u2603"]')).toEqual([2]);
  });

  it("first returns the first wildcard match", () => {
    expect(first(document, "$.store.books[*].title" as never)).toBe("JSON Basics");
  });

  it("first returns undefined when nothing matches", () => {
    expect(first(document, "$.unknown" as never)).toBeUndefined();
  });

  it("exists reports matches", () => {
    expect(exists(document, "$.store.books[0]" as never)).toBe(true);
    expect(exists(document, "$.store.books[8]" as never)).toBe(false);
  });

  it("select returns RFC 6901 pointers", () => {
    expect(select(document, "$.store.books[*].title" as never)).toEqual([
      { pointer: "/store/books/0/title", value: "JSON Basics" },
      { pointer: "/store/books/1/title", value: "TypeScript" }
    ]);
  });

  it("escapes pointer tokens in select results", () => {
    expect(select(document, '$["a.b"]["slash/key"]' as never)).toEqual([
      { pointer: "/a.b/slash~1key", value: "escaped" }
    ]);
  });

  it("uses an empty pointer for the root match", () => {
    expect(select(document, "$" as never)).toEqual([{ pointer: "", value: document }]);
  });

  it("find returns the first match object", () => {
    expect(find(document, "$.store.books[*].price" as never)).toEqual({ pointer: "/store/books/0/price", value: 10 });
  });

  it("find returns undefined for no match", () => {
    expect(find(document, "$.nope" as never)).toBeUndefined();
  });

  it("does not mutate the document", () => {
    const input = { values: [{ id: 1 }] };
    query(input, "$.values[*].id");
    expect(input).toEqual({ values: [{ id: 1 }] });
  });

  it("parses the supported selector types", () => {
    expect(parseJsonPath('$.store[0]["name"]')).toEqual([
      { type: "property", key: "store", position: 2 },
      { type: "index", index: 0, position: 8 },
      { type: "property", key: "name", position: 11 }
    ]);
  });

  it.each([
    "",
    "store",
    "$.",
    "$..name",
    "$[",
    "$[]",
    "$[01]",
    "$[-1]",
    "$[1:2]",
    "$[?(@.price)]",
    "$['unterminated]",
    '$["bad\\x"]',
    "$.name trailing"
  ])("rejects invalid expression %s", (expression) => {
    expect(() => query(document, expression as never)).toThrow(JsonPathError);
  });

  it("provides expression and position on syntax errors", () => {
    try {
      query(document, "$.store[" as never);
      throw new Error("expected query to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(JsonPathError);
      expect(error).toMatchObject({ expression: "$.store[", position: 7 });
    }
  });

  it("rejects non-string expressions", () => {
    expect(() => query(document, null as never)).toThrow(TypeError);
  });
});
